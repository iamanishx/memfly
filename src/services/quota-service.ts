import { getMetadataDb } from "../config";
import { getDatabaseSize, getTableCount } from "../db/connection";
import { QuotaExceededError } from "../utils/errors";

export function checkDatabaseQuota(accountId: string): void {
  const db = getMetadataDb();
  
  const account = db.query(`
    SELECT max_databases, total_storage_limit_bytes 
    FROM accounts 
    WHERE id = ?
  `).get(accountId) as { max_databases: number; total_storage_limit_bytes: number } | undefined;
  
  if (!account) {
    throw new QuotaExceededError("Account not found");
  }
  
  const dbCount = db.query(`
    SELECT COUNT(*) as count 
    FROM databases 
    WHERE account_id = ? AND is_active = 1
  `).get(accountId) as { count: number };
  
  if (dbCount.count >= account.max_databases) {
    throw new QuotaExceededError(`Maximum database limit (${account.max_databases}) reached`);
  }
}

export function checkStorageQuota(accountId: string, newDbSize: number = 0): void {
  const db = getMetadataDb();
  
  const account = db.query(`
    SELECT total_storage_limit_bytes 
    FROM accounts 
    WHERE id = ?
  `).get(accountId) as { total_storage_limit_bytes: number } | undefined;
  
  if (!account) {
    throw new QuotaExceededError("Account not found");
  }
  
  const totalUsed = db.query(`
    SELECT COALESCE(SUM(size_bytes), 0) as total 
    FROM databases 
    WHERE account_id = ? AND is_active = 1
  `).get(accountId) as { total: number };
  
  if (totalUsed.total + newDbSize > account.total_storage_limit_bytes) {
    throw new QuotaExceededError(`Storage quota exceeded. Used: ${totalUsed.total} bytes, Limit: ${account.total_storage_limit_bytes} bytes`);
  }
}

export function checkDatabaseLimits(databaseId: string, operation: "write" | "schema"): void {
  const db = getMetadataDb();
  
  const database = db.query(`
    SELECT max_size_bytes, max_tables, query_limit_per_hour, query_count
    FROM databases 
    WHERE id = ?
  `).get(databaseId) as { 
    max_size_bytes: number; 
    max_tables: number; 
    query_limit_per_hour: number;
    query_count: number;
  } | undefined;
  
  if (!database) {
    throw new QuotaExceededError("Database not found");
  }
  
  if (database.query_count >= database.query_limit_per_hour) {
    throw new QuotaExceededError(`Hourly query limit (${database.query_limit_per_hour}) exceeded`);
  }
  
  const currentSize = getDatabaseSize(databaseId);
  if (currentSize > database.max_size_bytes) {
    throw new QuotaExceededError(`Database size limit (${database.max_size_bytes} bytes) exceeded`);
  }
  
  if (operation === "schema") {
    const tableCount = getTableCount(databaseId);
    if (tableCount >= database.max_tables) {
      throw new QuotaExceededError(`Maximum table limit (${database.max_tables}) reached`);
    }
  }
}

export function incrementQueryCount(databaseId: string): void {
  const db = getMetadataDb();
  db.query(`
    UPDATE databases 
    SET query_count = query_count + 1, last_accessed_at = CURRENT_TIMESTAMP 
    WHERE id = ?
  `).run(databaseId);
}

export function updateDatabaseSize(databaseId: string): void {
  const size = getDatabaseSize(databaseId);
  const db = getMetadataDb();
  db.query("UPDATE databases SET size_bytes = ? WHERE id = ?").run(size, databaseId);
}

export function resetHourlyQueryCounts(): void {
  const db = getMetadataDb();
  db.query("UPDATE databases SET query_count = 0").run();
}
