import { getMetadataDb, config } from "../config";
import type { DatabaseRecord, CreateDatabaseRequest, UpdateDatabaseRequest, DatabaseResponse } from "../models/database";
import { ConflictError, NotFoundError, QuotaExceededError } from "../utils/errors";
import { validateDatabaseName } from "../utils/validators";
import { createDatabaseFile, deleteDatabaseFile, getDatabaseSize } from "../db/connection";
import { randomUUID } from "crypto";

function toDatabaseResponse(record: DatabaseRecord): DatabaseResponse {
  return {
    id: record.id,
    name: record.name,
    created_at: record.created_at,
    updated_at: record.updated_at,
    last_accessed_at: record.last_accessed_at,
    size_bytes: record.size_bytes,
    max_size_bytes: record.max_size_bytes,
    max_tables: record.max_tables,
    max_rows_per_table: record.max_rows_per_table,
    query_count: record.query_count,
    query_limit_per_hour: record.query_limit_per_hour,
  };
}

export function getDatabaseCountForAccount(accountId: string): number {
  const db = getMetadataDb();
  const result = db.query("SELECT COUNT(*) as count FROM databases WHERE account_id = ? AND is_active = 1").get(accountId) as { count: number };
  return result.count;
}

export function getTotalStorageForAccount(accountId: string): number {
  const db = getMetadataDb();
  const result = db.query("SELECT COALESCE(SUM(size_bytes), 0) as total FROM databases WHERE account_id = ? AND is_active = 1").get(accountId) as { total: number };
  return result.total;
}

export function createDatabase(accountId: string, data: CreateDatabaseRequest): DatabaseResponse {
  validateDatabaseName(data.name);
  
  const db = getMetadataDb();
  
  const account = db.query("SELECT max_databases, total_storage_limit_bytes FROM accounts WHERE id = ?").get(accountId) as { max_databases: number; total_storage_limit_bytes: number } | undefined;
  if (!account) {
    throw new NotFoundError("Account not found");
  }
  
  const currentDbCount = getDatabaseCountForAccount(accountId);
  if (currentDbCount >= account.max_databases) {
    throw new QuotaExceededError(`Maximum database limit (${account.max_databases}) reached`);
  }
  
  const existing = db.query("SELECT id FROM databases WHERE account_id = ? AND name = ? AND is_active = 1").get(accountId, data.name);
  if (existing) {
    throw new ConflictError(`Database with name '${data.name}' already exists`);
  }
  
  const id = randomUUID();
  const filename = `db_${id}.sqlite`;
  
  createDatabaseFile(id);
  
  const initialSize = getDatabaseSize(id);
  
  db.query(`
    INSERT INTO databases (
      id, account_id, name, filename, size_bytes, max_size_bytes, 
      max_tables, max_rows_per_table, query_limit_per_hour
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    accountId,
    data.name,
    filename,
    initialSize,
    data.max_size_bytes ?? config.defaultMaxDbSizeBytes,
    data.max_tables ?? config.defaultMaxTablesPerDb,
    data.max_rows_per_table ?? config.defaultMaxRowsPerTable,
    data.query_limit_per_hour ?? config.defaultQueriesPerHour
  );
  
  const record = db.query("SELECT * FROM databases WHERE id = ?").get(id) as DatabaseRecord;
  return toDatabaseResponse(record);
}

export function getDatabase(accountId: string, databaseId: string): DatabaseResponse {
  const db = getMetadataDb();
  const record = db.query("SELECT * FROM databases WHERE id = ? AND account_id = ? AND is_active = 1").get(databaseId, accountId) as DatabaseRecord | undefined;
  
  if (!record) {
    throw new NotFoundError("Database not found");
  }
  
  const actualSize = getDatabaseSize(databaseId);
  if (actualSize !== record.size_bytes) {
    db.query("UPDATE databases SET size_bytes = ? WHERE id = ?").run(actualSize, databaseId);
    record.size_bytes = actualSize;
  }
  
  return toDatabaseResponse(record);
}

export function listDatabases(accountId: string): DatabaseResponse[] {
  const db = getMetadataDb();
  const records = db.query("SELECT * FROM databases WHERE account_id = ? AND is_active = 1 ORDER BY created_at DESC").all(accountId) as DatabaseRecord[];
  
  return records.map(record => {
    const actualSize = getDatabaseSize(record.id);
    if (actualSize !== record.size_bytes) {
      db.query("UPDATE databases SET size_bytes = ? WHERE id = ?").run(actualSize, record.id);
      record.size_bytes = actualSize;
    }
    return toDatabaseResponse(record);
  });
}

export function updateDatabase(accountId: string, databaseId: string, data: UpdateDatabaseRequest): DatabaseResponse {
  const db = getMetadataDb();
  
  const existing = db.query("SELECT * FROM databases WHERE id = ? AND account_id = ? AND is_active = 1").get(databaseId, accountId) as DatabaseRecord | undefined;
  if (!existing) {
    throw new NotFoundError("Database not found");
  }
  
  if (data.name && data.name !== existing.name) {
    validateDatabaseName(data.name);
    const nameExists = db.query("SELECT id FROM databases WHERE account_id = ? AND name = ? AND is_active = 1").get(accountId, data.name);
    if (nameExists) {
      throw new ConflictError(`Database with name '${data.name}' already exists`);
    }
  }
  
  const updates: string[] = [];
  const values: (string | number | null)[] = [];
  
  if (data.name !== undefined) {
    updates.push("name = ?");
    values.push(data.name);
  }
  if (data.max_size_bytes !== undefined) {
    updates.push("max_size_bytes = ?");
    values.push(data.max_size_bytes);
  }
  if (data.max_tables !== undefined) {
    updates.push("max_tables = ?");
    values.push(data.max_tables);
  }
  if (data.max_rows_per_table !== undefined) {
    updates.push("max_rows_per_table = ?");
    values.push(data.max_rows_per_table);
  }
  if (data.query_limit_per_hour !== undefined) {
    updates.push("query_limit_per_hour = ?");
    values.push(data.query_limit_per_hour);
  }
  
  if (updates.length === 0) {
    return toDatabaseResponse(existing);
  }
  
  updates.push("updated_at = CURRENT_TIMESTAMP");
  values.push(databaseId);
  
  db.query(`UPDATE databases SET ${updates.join(", ")} WHERE id = ?`).run(...values);
  
  const record = db.query("SELECT * FROM databases WHERE id = ?").get(databaseId) as DatabaseRecord;
  return toDatabaseResponse(record);
}

export function deleteDatabase(accountId: string, databaseId: string): void {
  const db = getMetadataDb();
  
  const existing = db.query("SELECT id FROM databases WHERE id = ? AND account_id = ? AND is_active = 1").get(databaseId, accountId);
  if (!existing) {
    throw new NotFoundError("Database not found");
  }
  
  db.query("UPDATE databases SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(databaseId);
  
  deleteDatabaseFile(databaseId);
}

export function getDatabaseById(databaseId: string): DatabaseRecord | undefined {
  const db = getMetadataDb();
  return db.query("SELECT * FROM databases WHERE id = ? AND is_active = 1").get(databaseId) as DatabaseRecord | undefined;
}

export function getConnectionUrl(databaseId: string, apiKey: string, baseUrl: string): string {
  return `${baseUrl}/api/databases/${databaseId}`;
}

export function generateDrizzleConfig(databaseId: string, apiKey: string, baseUrl: string): object {
  return {
    schema: "./src/db/schema.ts",
    out: "./drizzle",
    dialect: "sqlite",
    dbCredentials: {
      url: `file:./data/databases/db_${databaseId}.sqlite`,
    },
  };
}

export function generatePrismaConfig(databaseId: string): object {
  return {
    generator: {
      provider: "prisma-client-js",
    },
    datasource: {
      provider: "sqlite",
      url: `file:./data/databases/db_${databaseId}.sqlite`,
    },
  };
}
