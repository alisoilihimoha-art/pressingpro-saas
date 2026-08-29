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
    await db.execute({
      sql: 'INSERT INTO tenants (id, business_name, email, password_hash, plan, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      args: [id, businessName, emailLower, passwordHash, 'trial', createdAt]
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

// ── Données : lecture ─────────────────────────────────────────────
app.get('/api/data', authRequired, async (req, res) => {
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
app.put('/api/data', authRequired, async (req, res) => {
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
app.post('/api/import', authRequired, async (req, res) => {
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
