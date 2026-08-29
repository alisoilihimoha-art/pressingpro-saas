/* ================================================================
   PressingPro SaaS — connexion à la base de données
   ------------------------------------------------------------------
   Utilise Turso (libSQL), un service de base de données hébergé
   à part, séparé du serveur web. Contrairement à un fichier SQLite
   stocké directement sur le disque de Render (qui est effacé à
   chaque nouveau déploiement, plan gratuit), les données ici restent
   en permanence, quel que soit le nombre de mises à jour du logiciel.

   En développement local (sans les variables TURSO_*), on retombe
   automatiquement sur un fichier local, pour pouvoir tester sans
   compte Turso.
   ================================================================ */
const { createClient } = require('@libsql/client');

const db = createClient({
  url: process.env.TURSO_DATABASE_URL || 'file:local-dev.db',
  authToken: process.env.TURSO_AUTH_TOKEN || undefined
});

async function init() {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS tenants (
      id TEXT PRIMARY KEY,
      business_name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      plan TEXT NOT NULL DEFAULT 'trial',
      created_at TEXT NOT NULL
    )
  `);
  await db.execute(`
    CREATE TABLE IF NOT EXISTS tenant_data (
      tenant_id TEXT PRIMARY KEY,
      json_blob TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);
}

module.exports = { db, init };
