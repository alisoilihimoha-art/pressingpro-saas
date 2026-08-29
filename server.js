/* ================================================================
   PressingPro SaaS — API prototype
   Multi-tenant : chaque pressing (tenant) a son propre blob JSON,
   isolé par tenant_id. Reproduit exactement le format de données
   déjà utilisé par l'app offline (getData()/saveData()), pour que
   le frontend existant n'ait presque rien à changer.
   ================================================================ */
const express = require('express');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('./db');

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
app.post('/api/auth/signup', (req, res) => {
  const { businessName, email, password } = req.body || {};
  if (!businessName || !email || !password) {
    return res.status(400).json({ error: 'Nom du pressing, email et mot de passe requis' });
  }
  if (String(password).length < 6) {
    return res.status(400).json({ error: 'Le mot de passe doit faire au moins 6 caractères' });
  }
  const existing = db.prepare('SELECT id FROM tenants WHERE email = ?').get(String(email).toLowerCase());
  if (existing) {
    return res.status(409).json({ error: 'Un compte existe déjà avec cet email' });
  }
  const id = uid();
  const passwordHash = bcrypt.hashSync(password, 10);
  const createdAt = now();
  db.prepare(
    'INSERT INTO tenants (id, business_name, email, password_hash, plan, created_at) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(id, businessName, String(email).toLowerCase(), passwordHash, 'trial', createdAt);

  // Le blob de données démarre vide ; le frontend appliquera sa propre
  // fonction defaultData() lors du premier chargement, comme en offline.
  db.prepare('INSERT INTO tenant_data (tenant_id, json_blob, updated_at) VALUES (?, ?, ?)').run(
    id,
    'null',
    createdAt
  );

  const tenant = { id, email: email.toLowerCase() };
  return res.status(201).json({ token: signToken(tenant), businessName });
});

// ── Auth : connexion ─────────────────────────────────────────────
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Email et mot de passe requis' });
  const tenant = db.prepare('SELECT * FROM tenants WHERE email = ?').get(String(email).toLowerCase());
  if (!tenant || !bcrypt.compareSync(password, tenant.password_hash)) {
    return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
  }
  return res.json({ token: signToken(tenant), businessName: tenant.business_name });
});

// ── Données : lecture ─────────────────────────────────────────────
app.get('/api/data', authRequired, (req, res) => {
  const row = db.prepare('SELECT json_blob, updated_at FROM tenant_data WHERE tenant_id = ?').get(req.tenantId);
  if (!row) return res.json({ data: null, updatedAt: null });
  return res.json({ data: JSON.parse(row.json_blob), updatedAt: row.updated_at });
});

// ── Données : écriture (sync depuis le navigateur) ────────────────
app.put('/api/data', authRequired, (req, res) => {
  const { data } = req.body || {};
  if (data === undefined) return res.status(400).json({ error: 'Champ data manquant' });
  const updatedAt = now();
  db.prepare(
    `INSERT INTO tenant_data (tenant_id, json_blob, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(tenant_id) DO UPDATE SET json_blob = excluded.json_blob, updated_at = excluded.updated_at`
  ).run(req.tenantId, JSON.stringify(data), updatedAt);
  return res.json({ ok: true, updatedAt });
});

// ── Import d'une sauvegarde JSON existante (migration offline -> SaaS) ──
app.post('/api/import', authRequired, (req, res) => {
  const { data } = req.body || {};
  if (!data || typeof data !== 'object') return res.status(400).json({ error: 'Fichier JSON invalide' });
  const updatedAt = now();
  db.prepare(
    `INSERT INTO tenant_data (tenant_id, json_blob, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(tenant_id) DO UPDATE SET json_blob = excluded.json_blob, updated_at = excluded.updated_at`
  ).run(req.tenantId, JSON.stringify(data), updatedAt);
  return res.json({ ok: true, updatedAt });
});

app.get('/api/health', (req, res) => res.json({ ok: true, time: now() }));

// Pour toute autre route GET (ex: rafraîchissement de page), renvoyer
// l'application (comportement standard d'une "single page app").
app.get(/^(?!\/api\/).*/, (req, res) => {
  res.sendFile(path.join(FRONTEND_DIR, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`PressingPro SaaS API démarrée sur le port ${PORT}`);
});
