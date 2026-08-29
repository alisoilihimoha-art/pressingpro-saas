/* ================================================================
   PressingPro SaaS — couche base de données
   Prototype : SQLite (fichier unique). En production, remplacer par
   PostgreSQL (le schéma ci-dessous se transpose presque tel quel).
   ================================================================ */
const path = require('path');
const Database = require('better-sqlite3');

const DB_PATH = process.env.PRESSINGPRO_DB || path.join(__dirname, 'pressingpro.db');
const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');

db.exec(`
CREATE TABLE IF NOT EXISTS tenants (
  id            TEXT PRIMARY KEY,
  business_name TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  plan          TEXT NOT NULL DEFAULT 'trial',
  created_at    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tenant_data (
  tenant_id   TEXT PRIMARY KEY REFERENCES tenants(id),
  json_blob   TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);
`);

module.exports = db;
