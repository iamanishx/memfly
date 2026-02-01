import { Database } from "bun:sqlite";

export const config = {
  port: parseInt(process.env.PORT || "3000"),
  nodeEnv: process.env.NODE_ENV || "development",
  dataDir: process.env.DATA_DIR || "./data",
  databasesDir: process.env.DATABASES_DIR || "./data/databases",
  metadataDbPath: process.env.METADATA_DB_PATH || "./data/metadata.db",
  jwtSecret: process.env.JWT_SECRET || "default-secret-change-in-production",
  apiKeyPrefix: process.env.API_KEY_PREFIX || "sk_sqlite_",
  defaultMaxDatabasesPerAccount: parseInt(process.env.DEFAULT_MAX_DATABASES_PER_ACCOUNT || "10"),
  defaultMaxDbSizeBytes: parseInt(process.env.DEFAULT_MAX_DB_SIZE_BYTES || "104857600"),
  defaultMaxTablesPerDb: parseInt(process.env.DEFAULT_MAX_TABLES_PER_DB || "100"),
  defaultMaxRowsPerTable: parseInt(process.env.DEFAULT_MAX_ROWS_PER_TABLE || "100000"),
  defaultQueriesPerHour: parseInt(process.env.DEFAULT_QUERIES_PER_HOUR || "10000"),
  queryTimeoutMs: parseInt(process.env.QUERY_TIMEOUT_MS || "30000"),
  maxQueryLength: parseInt(process.env.MAX_QUERY_LENGTH || "100000"),
};

export function ensureDirectories() {
  const fs = require("fs");
  const path = require("path");
  
  if (!fs.existsSync(config.dataDir)) {
    fs.mkdirSync(config.dataDir, { recursive: true });
  }
  if (!fs.existsSync(config.databasesDir)) {
    fs.mkdirSync(config.databasesDir, { recursive: true });
  }
}

let metadataDb: Database | null = null;

export function getMetadataDb(): Database {
  if (!metadataDb) {
    ensureDirectories();
    metadataDb = new Database(config.metadataDbPath);
    metadataDb.exec("PRAGMA journal_mode = WAL;");
  }
  return metadataDb;
}
