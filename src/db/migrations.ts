import { getMetadataDb } from "../config";

export function runMigrations() {
  const db = getMetadataDb();
  
  db.exec(`
    CREATE TABLE IF NOT EXISTS accounts (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      max_databases INTEGER DEFAULT 10,
      total_storage_limit_bytes INTEGER DEFAULT 1073741824
    );

    CREATE TABLE IF NOT EXISTS api_keys (
      id TEXT PRIMARY KEY,
      account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
      key_hash TEXT UNIQUE NOT NULL,
      name TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_used_at DATETIME,
      expires_at DATETIME,
      is_active BOOLEAN DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS databases (
      id TEXT PRIMARY KEY,
      account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      filename TEXT UNIQUE NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_accessed_at DATETIME,
      size_bytes INTEGER DEFAULT 0,
      max_size_bytes INTEGER DEFAULT 104857600,
      max_tables INTEGER DEFAULT 100,
      max_rows_per_table INTEGER DEFAULT 100000,
      query_count INTEGER DEFAULT 0,
      query_limit_per_hour INTEGER DEFAULT 10000,
      is_active BOOLEAN DEFAULT 1,
      UNIQUE(account_id, name)
    );

    CREATE TABLE IF NOT EXISTS query_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      database_id TEXT NOT NULL REFERENCES databases(id) ON DELETE CASCADE,
      query TEXT NOT NULL,
      executed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      duration_ms INTEGER,
      rows_affected INTEGER,
      error TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_api_keys_account ON api_keys(account_id);
    CREATE INDEX IF NOT EXISTS idx_databases_account ON databases(account_id);
    CREATE INDEX IF NOT EXISTS idx_query_logs_database ON query_logs(database_id);
  `);
}
