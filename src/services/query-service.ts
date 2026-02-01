import { getConnection } from "../db/connection";
import type { QueryRequest, QueryResult, BatchQueryResult } from "../models/query";
import { validateQuery, checkForbiddenQuery } from "../utils/validators";
import { config } from "../config";
import { incrementQueryCount, updateDatabaseSize, checkDatabaseLimits } from "./quota-service";
import { getMetadataDb } from "../config";

function isWriteQuery(query: string): boolean {
  const writeKeywords = ["INSERT", "UPDATE", "DELETE", "REPLACE", "MERGE"];
  const upperQuery = query.trim().toUpperCase();
  return writeKeywords.some(kw => upperQuery.startsWith(kw));
}

function isSchemaQuery(query: string): boolean {
  const schemaKeywords = ["CREATE", "ALTER", "DROP", "TRUNCATE"];
  const upperQuery = query.trim().toUpperCase();
  return schemaKeywords.some(kw => upperQuery.startsWith(kw));
}

function isSelectQuery(query: string): boolean {
  const upperQuery = query.trim().toUpperCase();
  return upperQuery.startsWith("SELECT") || upperQuery.startsWith("WITH");
}

function logQuery(databaseId: string, query: string, durationMs: number, rowsAffected: number | null, error: string | null): void {
  const db = getMetadataDb();
  db.query(`
    INSERT INTO query_logs (database_id, query, duration_ms, rows_affected, error)
    VALUES (?, ?, ?, ?, ?)
  `).run(databaseId, query.substring(0, 10000), durationMs, rowsAffected, error);
}

export function executeQuery(databaseId: string, request: QueryRequest): QueryResult {
  validateQuery(request.query, config.maxQueryLength);
  checkForbiddenQuery(request.query);
  
  const isSchema = isSchemaQuery(request.query);
  const isWrite = isWriteQuery(request.query);
  
  if (isSchema || isWrite) {
    checkDatabaseLimits(databaseId, isSchema ? "schema" : "write");
  }
  
  const db = getConnection(databaseId);
  const startTime = Date.now();
  
  try {
    const stmt = db.prepare(request.query);
    
    if (isSelectQuery(request.query)) {
      const params = (request.params || []) as string[] | number[];
      const rows = stmt.all(...params) as Record<string, unknown>[];
      const duration = Date.now() - startTime;
      
      incrementQueryCount(databaseId);
      logQuery(databaseId, request.query, duration, rows.length, null);
      
      return {
        success: true,
        data: rows,
      };
    } else {
      const params = (request.params || []) as string[] | number[];
      const result = stmt.run(...params);
      const duration = Date.now() - startTime;
      
      incrementQueryCount(databaseId);
      if (isWrite || isSchema) {
        updateDatabaseSize(databaseId);
      }
      logQuery(databaseId, request.query, duration, result.changes || 0, null);
      
      return {
        success: true,
        rowsAffected: result.changes,
        lastInsertRowid: typeof result.lastInsertRowid === "bigint" ? Number(result.lastInsertRowid) : result.lastInsertRowid,
      };
    }
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    logQuery(databaseId, request.query, duration, null, errorMessage);
    
    return {
      success: false,
      error: errorMessage,
    };
  }
}

export function executeBatch(databaseId: string, requests: QueryRequest[]): BatchQueryResult {
  const results: QueryResult[] = [];
  
  for (const request of requests) {
    const result = executeQuery(databaseId, request);
    results.push(result);
    if (!result.success) {
      break;
    }
  }
  
  return { results };
}

export function executeMigration(databaseId: string, queries: string[]): BatchQueryResult {
  const db = getConnection(databaseId);
  const results: QueryResult[] = [];
  
  checkDatabaseLimits(databaseId, "schema");
  
  try {
    db.exec("BEGIN TRANSACTION;");
    
    for (const query of queries) {
      validateQuery(query, config.maxQueryLength);
      checkForbiddenQuery(query);
      
      const startTime = Date.now();
      try {
        const stmt = db.prepare(query);
        const result = stmt.run();
        const duration = Date.now() - startTime;
        
        logQuery(databaseId, query, duration, result.changes || 0, null);
        results.push({
          success: true,
          rowsAffected: result.changes,
          lastInsertRowid: typeof result.lastInsertRowid === "bigint" ? Number(result.lastInsertRowid) : result.lastInsertRowid,
        });
      } catch (error) {
        const duration = Date.now() - startTime;
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        logQuery(databaseId, query, duration, null, errorMessage);
        
        db.exec("ROLLBACK;");
        results.push({
          success: false,
          error: errorMessage,
        });
        return { results };
      }
    }
    
    db.exec("COMMIT;");
    incrementQueryCount(databaseId);
    updateDatabaseSize(databaseId);
    
  } catch (error) {
    db.exec("ROLLBACK;");
    const errorMessage = error instanceof Error ? error.message : "Transaction failed";
    results.push({
      success: false,
      error: errorMessage,
    });
  }
  
  return { results };
}
