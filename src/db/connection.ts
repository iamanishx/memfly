import { Database } from "bun:sqlite";
import { config } from "../config";
import * as fs from "fs";
import * as path from "path";

const connectionCache = new Map<string, Database>();

export function getDatabasePath(databaseId: string): string {
  const filename = `db_${databaseId}.sqlite`;
  return path.join(config.databasesDir, filename);
}

export function getConnection(databaseId: string): Database {
  if (connectionCache.has(databaseId)) {
    return connectionCache.get(databaseId)!;
  }
  
  const dbPath = getDatabasePath(databaseId);
  const db = new Database(dbPath);
  db.exec("PRAGMA journal_mode = WAL;");
  connectionCache.set(databaseId, db);
  return db;
}

export function closeConnection(databaseId: string): void {
  const db = connectionCache.get(databaseId);
  if (db) {
    db.close();
    connectionCache.delete(databaseId);
  }
}

export function createDatabaseFile(databaseId: string): void {
  const dbPath = getDatabasePath(databaseId);
  const db = new Database(dbPath);
  db.exec("PRAGMA journal_mode = WAL;");
  db.close();
}

export function deleteDatabaseFile(databaseId: string): void {
  closeConnection(databaseId);
  const dbPath = getDatabasePath(databaseId);
  if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
  }
  const walPath = dbPath + "-wal";
  const shmPath = dbPath + "-shm";
  if (fs.existsSync(walPath)) fs.unlinkSync(walPath);
  if (fs.existsSync(shmPath)) fs.unlinkSync(shmPath);
}

export function getDatabaseSize(databaseId: string): number {
  const dbPath = getDatabasePath(databaseId);
  if (!fs.existsSync(dbPath)) return 0;
  const stats = fs.statSync(dbPath);
  return stats.size;
}

export function getTableCount(databaseId: string): number {
  const db = getConnection(databaseId);
  const result = db.query("SELECT count(*) as count FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';").get() as { count: number };
  return result.count;
}

export function getRowCount(databaseId: string, tableName: string): number {
  const db = getConnection(databaseId);
  const result = db.query(`SELECT count(*) as count FROM "${tableName}";`).get() as { count: number };
  return result.count;
}
