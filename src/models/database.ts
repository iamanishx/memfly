export interface DatabaseRecord {
  id: string;
  account_id: string;
  name: string;
  filename: string;
  created_at: string;
  updated_at: string;
  last_accessed_at: string | null;
  size_bytes: number;
  max_size_bytes: number;
  max_tables: number;
  max_rows_per_table: number;
  query_count: number;
  query_limit_per_hour: number;
  is_active: boolean;
}

export interface CreateDatabaseRequest {
  name: string;
  max_size_bytes?: number;
  max_tables?: number;
  max_rows_per_table?: number;
  query_limit_per_hour?: number;
}

export interface UpdateDatabaseRequest {
  name?: string;
  max_size_bytes?: number;
  max_tables?: number;
  max_rows_per_table?: number;
  query_limit_per_hour?: number;
}

export interface DatabaseResponse {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
  last_accessed_at: string | null;
  size_bytes: number;
  max_size_bytes: number;
  max_tables: number;
  max_rows_per_table: number;
  query_count: number;
  query_limit_per_hour: number;
}

export interface DatabaseListResponse {
  databases: DatabaseResponse[];
  total: number;
}
