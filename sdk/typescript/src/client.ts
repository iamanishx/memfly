export interface SQLiteSaaSConfig {
  baseUrl: string;
  apiKey: string;
}

export interface QueryRequest {
  query: string;
  params?: (string | number | boolean | null)[];
}

export interface QueryResult {
  success: boolean;
  data?: Record<string, unknown>[];
  rowsAffected?: number;
  lastInsertRowid?: number;
  error?: string;
}

export interface BatchQueryResult {
  results: QueryResult[];
}

export interface Database {
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

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: { message: string };
}

export class SQLiteSaaSClient {
  private baseUrl: string;
  private apiKey: string;

  constructor(config: SQLiteSaaSConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, "");
    this.apiKey = config.apiKey;
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        "Authorization": `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    const data = await response.json() as ApiResponse<T>;
    
    if (!response.ok || !data.success) {
      throw new Error(data.error?.message || `HTTP ${response.status}`);
    }

    return data.data as T;
  }

  async createDatabase(name: string, options?: Partial<Omit<Database, "id" | "name">>): Promise<Database> {
    return this.request<Database>("/api/databases", {
      method: "POST",
      body: JSON.stringify({ name, ...options }),
    });
  }

  async listDatabases(): Promise<{ databases: Database[]; total: number }> {
    return this.request<{ databases: Database[]; total: number }>("/api/databases");
  }

  async getDatabase(id: string): Promise<Database> {
    return this.request<Database>(`/api/databases/${id}`);
  }

  async deleteDatabase(id: string): Promise<void> {
    await this.request(`/api/databases/${id}`, { method: "DELETE" });
  }

  async query(databaseId: string, request: QueryRequest): Promise<QueryResult> {
    return this.request<QueryResult>(`/api/databases/${databaseId}/query`, {
      method: "POST",
      body: JSON.stringify(request),
    });
  }

  async batch(databaseId: string, queries: QueryRequest[]): Promise<BatchQueryResult> {
    return this.request<BatchQueryResult>(`/api/databases/${databaseId}/batch`, {
      method: "POST",
      body: JSON.stringify({ queries }),
    });
  }

  async migrate(databaseId: string, queries: string[]): Promise<BatchQueryResult> {
    return this.request<BatchQueryResult>(`/api/databases/${databaseId}/migrate`, {
      method: "POST",
      body: JSON.stringify({ queries }),
    });
  }
}

export function createClient(config: SQLiteSaaSConfig): SQLiteSaaSClient {
  return new SQLiteSaaSClient(config);
}
