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

  // Colonnes liées à l'abonnement Stripe, ajoutées après coup : on les
  // crée avec ALTER TABLE si elles n'existent pas encore (ignore
  // l'erreur "duplicate column" si elles sont déjà là).
  await safeAlter(`ALTER TABLE tenants ADD COLUMN stripe_customer_id TEXT`);
  await safeAlter(`ALTER TABLE tenants ADD COLUMN stripe_subscription_id TEXT`);
  await safeAlter(`ALTER TABLE tenants ADD COLUMN subscription_status TEXT DEFAULT 'none'`);
  await safeAlter(`ALTER TABLE tenants ADD COLUMN current_period_end TEXT`);
}

async function safeAlter(sql) {
  try {
    await db.execute(sql);
  } catch (e) {
    // Colonne déjà existante (ou autre no-op) : on ignore.
  }
}

module.exports = { db, init };
