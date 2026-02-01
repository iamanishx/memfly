import type { QueryRequest, QueryResult, SQLiteSaaSConfig } from "./client";
import { SQLiteSaaSClient } from "./client";

export interface DrizzleSQLiteSaaSConfig extends SQLiteSaaSConfig {
  databaseId: string;
}

export class DrizzleSQLiteSaaSDriver {
  private client: SQLiteSaaSClient;
  private databaseId: string;

  constructor(config: DrizzleSQLiteSaaSConfig) {
    this.client = new SQLiteSaaSClient({
      baseUrl: config.baseUrl,
      apiKey: config.apiKey,
    });
    this.databaseId = config.databaseId;
  }

  async query(sql: string, params?: unknown[]): Promise<QueryResult> {
    return this.client.query(this.databaseId, {
      query: sql,
      params: params as (string | number | boolean | null)[],
    });
  }

  async batch(queries: { sql: string; params?: unknown[] }[]): Promise<QueryResult[]> {
    const result = await this.client.batch(
      this.databaseId,
      queries.map(q => ({
        query: q.sql,
        params: q.params as (string | number | boolean | null)[],
      }))
    );
    return result.results;
  }

  async migrate(sql: string[]): Promise<QueryResult[]> {
    const result = await this.client.migrate(this.databaseId, sql);
    return result.results;
  }
}

export function createDrizzleDriver(config: DrizzleSQLiteSaaSConfig): DrizzleSQLiteSaaSDriver {
  return new DrizzleSQLiteSaaSDriver(config);
}
