export interface QueryRequest {
  query: string;
  params?: unknown[];
}

export interface BatchQueryRequest {
  queries: QueryRequest[];
}

export interface MigrateRequest {
  queries: string[];
}

export interface QueryResult {
  success: boolean;
  data?: unknown[];
  columns?: string[];
  rowsAffected?: number;
  lastInsertRowid?: number | string;
  error?: string;
}

export interface BatchQueryResult {
  results: QueryResult[];
}

export interface QueryLog {
  id: number;
  database_id: string;
  query: string;
  executed_at: string;
  duration_ms: number | null;
  rows_affected: number | null;
  error: string | null;
}
