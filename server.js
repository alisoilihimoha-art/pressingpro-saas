/* ================================================================
   PressingPro SaaS — API
   Multi-tenant : chaque pressing (tenant) a son propre blob JSON,
   isolé par tenant_id. Reproduit exactement le format de données
   déjà utilisé par l'app offline (getData()/saveData()), pour que
   le frontend existant n'ait presque rien à changer.

   Les données sont stockées dans Turso (base de données hébergée à
   part, voir db.js) : elles survivent aux redéploiements du serveur.
   ================================================================ */
const express = require('express');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { db, init } = require('./db');

const app = express();
app.use(cors());

// ── Stripe (abonnement PressingPro Cloud) ────────────────────────
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || '';
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';
const STRIPE_PRICE_ID = process.env.STRIPE_PRICE_ID || '';
const APP_BASE_URL = process.env.APP_BASE_URL || 'https://pressingpro.mas-datasolution.fr';
const stripe = STRIPE_SECRET_KEY ? require('stripe')(STRIPE_SECRET_KEY) : null;

// Le webhook Stripe a besoin du corps BRUT (non parsé en JSON) pour
// vérifier la signature ; on l'enregistre donc AVANT express.json().
app.post('/api/billing/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  if (!stripe || !STRIPE_WEBHOOK_SECRET) return res.status(500).send('Webhook non configuré');
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, req.headers['stripe-signature'], STRIPE_WEBHOOK_SECRET);
  } catch (e) {
    console.error('Signature webhook Stripe invalide :', e.message);
    return res.status(400).send(`Webhook Error: ${e.message}`);
  }
  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const tenantId = session.metadata && session.metadata.tenantId;
      if (tenantId) {
        await db.execute({
          sql: `UPDATE tenants SET subscription_status = 'active', stripe_subscription_id = ?, plan = 'cloud' WHERE id = ?`,
          args: [session.subscription || null, tenantId]
        });
      }
    } else if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.deleted') {
      const sub = event.data.object;
      const periodEnd = sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null;
      await db.execute({
        sql: `UPDATE tenants SET subscription_status = ?, current_period_end = ? WHERE stripe_subscription_id = ?`,
        args: [sub.status, periodEnd, sub.id]
      });
    }
    return res.json({ received: true });
  } catch (e) {
    console.error(e);
    return res.status(500).send('Erreur serveur webhook');
  }
});

app.use(express.json({ limit: '15mb' })); // le blob JSON complet peut être volumineux

// Sert le frontend (index.html/script.js/style.css/sync.js) depuis le même
// serveur : un seul service à héberger, une seule adresse web pour tout.
// (Tous les fichiers vivent au même niveau dans ce dépôt.)
const FRONTEND_DIR = __dirname;
app.use(express.static(FRONTEND_DIR));

const JWT_SECRET = process.env.PRESSINGPRO_JWT_SECRET || 'dev-secret-CHANGE-EN-PRODUCTION';
const PORT = process.env.PORT || 4000;

function uid() {
  return crypto.randomBytes(12).toString('hex');
}
function now() {
  return new Date().toISOString();
}
function signToken(tenant) {
  return jwt.sign({ tenantId: tenant.id, email: tenant.email }, JWT_SECRET, { expiresIn: '30d' });
}

// ── Middleware d'authentification ──────────────────────────────
function authRequired(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Non authentifié' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.tenantId = payload.tenantId;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Session invalide ou expirée' });
  }
}

// ── Auth : inscription ──────────────────────────────────────────
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { businessName, email, password } = req.body || {};
    if (!businessName || !email || !password) {
      return res.status(400).json({ error: 'Nom du pressing, email et mot de passe requis' });
    }
    if (String(password).length < 6) {
      return res.status(400).json({ error: 'Le mot de passe doit faire au moins 6 caractères' });
    }
    const emailLower = String(email).toLowerCase();
    const existing = await db.execute({ sql: 'SELECT id FROM tenants WHERE email = ?', args: [emailLower] });
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Un compte existe déjà avec cet email' });
    }
    const id = uid();
    const passwordHash = bcrypt.hashSync(password, 10);
    const createdAt = now();
    // 14 jours d'essai gratuit avant qu'un abonnement soit obligatoire.
    const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
    await db.execute({
      sql: 'INSERT INTO tenants (id, business_name, email, password_hash, plan, created_at, trial_ends_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      args: [id, businessName, emailLower, passwordHash, 'trial', createdAt, trialEndsAt]
    });

    // Le blob de données démarre vide ; le frontend appliquera sa propre
    // fonction defaultData() lors du premier chargement, comme en offline.
    await db.execute({
      sql: 'INSERT INTO tenant_data (tenant_id, json_blob, updated_at) VALUES (?, ?, ?)',
      args: [id, 'null', createdAt]
    });

    const tenant = { id, email: emailLower };
    return res.status(201).json({ token: signToken(tenant), businessName });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ── Auth : connexion ─────────────────────────────────────────────
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: 'Email et mot de passe requis' });
    const emailLower = String(email).toLowerCase();
    const result = await db.execute({ sql: 'SELECT * FROM tenants WHERE email = ?', args: [emailLower] });
    const tenant = result.rows[0];
    if (!tenant || !bcrypt.compareSync(password, tenant.password_hash)) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    }
    return res.json({ token: signToken(tenant), businessName: tenant.business_name });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ── Vérifie que le compte a un abonnement actif OU un essai gratuit
//    encore valide, avant d'autoriser l'accès aux données du pressing.
function hasActiveAccess(tenant) {
  const subActive = tenant.subscription_status === 'active' || tenant.subscription_status === 'trialing';
  const trialActive = !!tenant.trial_ends_at && new Date(tenant.trial_ends_at).getTime() > Date.now();
  return subActive || trialActive;
}

async function requireActiveAccess(req, res, next) {
  try {
    const result = await db.execute({
      sql: 'SELECT subscription_status, trial_ends_at FROM tenants WHERE id = ?',
      args: [req.tenantId]
    });
    const tenant = result.rows[0];
    if (!tenant) return res.status(404).json({ error: 'Compte introuvable' });
    if (!hasActiveAccess(tenant)) {
      return res.status(402).json({
        error: "Votre essai gratuit est terminé. Abonnez-vous pour continuer à utiliser PressingPro Cloud.",
        code: 'subscription_required'
      });
    }
    return next();
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}

// ── Données : lecture ─────────────────────────────────────────────
app.get('/api/data', authRequired, requireActiveAccess, async (req, res) => {
  try {
    const result = await db.execute({
      sql: 'SELECT json_blob, updated_at FROM tenant_data WHERE tenant_id = ?',
      args: [req.tenantId]
    });
    const row = result.rows[0];
    if (!row) return res.json({ data: null, updatedAt: null });
    return res.json({ data: JSON.parse(row.json_blob), updatedAt: row.updated_at });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ── Données : écriture (sync depuis le navigateur) ────────────────
app.put('/api/data', authRequired, requireActiveAccess, async (req, res) => {
  try {
    const { data } = req.body || {};
    if (data === undefined) return res.status(400).json({ error: 'Champ data manquant' });
    const updatedAt = now();
    await db.execute({
      sql: `INSERT INTO tenant_data (tenant_id, json_blob, updated_at) VALUES (?, ?, ?)
            ON CONFLICT(tenant_id) DO UPDATE SET json_blob = excluded.json_blob, updated_at = excluded.updated_at`,
      args: [req.tenantId, JSON.stringify(data), updatedAt]
    });
    return res.json({ ok: true, updatedAt });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ── Import d'une sauvegarde JSON existante (migration offline -> SaaS) ──
app.post('/api/import', authRequired, requireActiveAccess, async (req, res) => {
  try {
    const { data } = req.body || {};
    if (!data || typeof data !== 'object') return res.status(400).json({ error: 'Fichier JSON invalide' });
    const updatedAt = now();
    await db.execute({
      sql: `INSERT INTO tenant_data (tenant_id, json_blob, updated_at) VALUES (?, ?, ?)
            ON CONFLICT(tenant_id) DO UPDATE SET json_blob = excluded.json_blob, updated_at = excluded.updated_at`,
      args: [req.tenantId, JSON.stringify(data), updatedAt]
    });
    return res.json({ ok: true, updatedAt });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ── Abonnement PressingPro Cloud (Stripe) ────────────────────────
app.post('/api/billing/create-checkout-session', authRequired, async (req, res) => {
  try {
    if (!stripe || !STRIPE_PRICE_ID) return res.status(500).json({ error: 'Paiement non configuré côté serveur' });
    const result = await db.execute({ sql: 'SELECT * FROM tenants WHERE id = ?', args: [req.tenantId] });
    const tenant = result.rows[0];
    if (!tenant) return res.status(404).json({ error: 'Compte introuvable' });

    let customerId = tenant.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: tenant.email,
        name: tenant.business_name,
        metadata: { tenantId: tenant.id }
      });
      customerId = customer.id;
      await db.execute({ sql: 'UPDATE tenants SET stripe_customer_id = ? WHERE id = ?', args: [customerId, tenant.id] });
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: STRIPE_PRICE_ID, quantity: 1 }],
      success_url: `${APP_BASE_URL}/?billing=success`,
      cancel_url: `${APP_BASE_URL}/?billing=cancel`,
      metadata: { tenantId: tenant.id }
    });
    return res.json({ url: session.url });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Erreur lors de la création du paiement' });
  }
});

app.get('/api/billing/status', authRequired, async (req, res) => {
  try {
    const result = await db.execute({
      sql: 'SELECT plan, subscription_status, current_period_end, trial_ends_at FROM tenants WHERE id = ?',
      args: [req.tenantId]
    });
    const tenant = result.rows[0];
    if (!tenant) return res.status(404).json({ error: 'Compte introuvable' });
    return res.json({
      plan: tenant.plan,
      subscriptionStatus: tenant.subscription_status,
      currentPeriodEnd: tenant.current_period_end,
      trialEndsAt: tenant.trial_ends_at,
      accessActive: hasActiveAccess(tenant)
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.post('/api/billing/portal', authRequired, async (req, res) => {
  try {
    if (!stripe) return res.status(500).json({ error: 'Paiement non configuré côté serveur' });
    const result = await db.execute({ sql: 'SELECT stripe_customer_id FROM tenants WHERE id = ?', args: [req.tenantId] });
    const tenant = result.rows[0];
    if (!tenant || !tenant.stripe_customer_id) return res.status(400).json({ error: 'Aucun abonnement Stripe pour ce compte' });
    const portal = await stripe.billingPortal.sessions.create({
      customer: tenant.stripe_customer_id,
      return_url: `${APP_BASE_URL}/`
    });
    return res.json({ url: portal.url });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.get('/api/health', (req, res) => res.json({ ok: true, time: now() }));

// Pour toute autre route GET (ex: rafraîchissement de page), renvoyer
// l'application (comportement standard d'une "single page app").
app.get(/^(?!\/api\/).*/, (req, res) => {
  res.sendFile(path.join(FRONTEND_DIR, 'index.html'));
});

init()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`PressingPro SaaS API démarrée sur le port ${PORT}`);
    });
  })
  .catch((e) => {
    console.error("Erreur d'initialisation de la base de données :", e);
    process.exit(1);
  });
