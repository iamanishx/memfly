import { Hono } from "hono";
import { getDatabaseById } from "../services/database-service";
import { authMiddleware, getAccount } from "../middleware/auth";
import { config } from "../config";

const connectionRoutes = new Hono();

connectionRoutes.use("*", authMiddleware);

connectionRoutes.get("/:id/connection", async (c) => {
  const account = getAccount(c);
  const databaseId = c.req.param("id");
  const database = getDatabaseById(databaseId);
  
  if (!database || database.account_id !== account.id) {
    return c.json({ success: false, error: { code: "NOT_FOUND", message: "Database not found" } }, 404);
  }
  
  const protocol = c.req.header("x-forwarded-proto") || "http";
  const host = c.req.header("host") || `localhost:${config.port}`;
  const baseUrl = `${protocol}://${host}`;
  
  const authHeader = c.req.header("Authorization") || "";
  const apiKey = authHeader.replace("Bearer ", "");
  
  return c.json({
    success: true,
    data: {
      database_id: databaseId,
      name: database.name,
      http_endpoint: `${baseUrl}/api/databases/${databaseId}`,
      websocket_endpoint: `${baseUrl.replace("http", "ws")}/ws/databases/${databaseId}`,
      api_key: apiKey,
      connection_examples: {
        curl: `curl -X POST ${baseUrl}/api/databases/${databaseId}/query \\\n  -H "Authorization: Bearer ${apiKey}" \\\n  -H "Content-Type: application/json" \\\n  -d '{"query": "SELECT * FROM users"}'`,
        javascript: `const response = await fetch("${baseUrl}/api/databases/${databaseId}/query", {
  method: "POST",
  headers: {
    "Authorization": "Bearer ${apiKey}",
    "Content-Type": "application/json"
  },
  body: JSON.stringify({ query: "SELECT * FROM users" })
});
const result = await response.json();`,
        python: `import requests

response = requests.post(
    "${baseUrl}/api/databases/${databaseId}/query",
    headers={"Authorization": "Bearer ${apiKey}"},
    json={"query": "SELECT * FROM users"}
)
result = response.json()`,
      },
      orm_configs: {
        drizzle: {
          description: "Use a custom driver to connect via HTTP API",
          example: `import { drizzle } from "drizzle-orm/bun-sqlite";

// For remote SQLite SaaS, use the HTTP API client
export const db = {
  async query(sql: string, params?: any[]) {
    const res = await fetch("${baseUrl}/api/databases/${databaseId}/query", {
      method: "POST",
      headers: {
        "Authorization": "Bearer ${apiKey}",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ query: sql, params })
    });
    return res.json();
  }
};`,
        },
        prisma: {
          description: "Prisma requires local file access. Use the HTTP API instead.",
          example: `// Prisma doesn't support remote SQLite directly
// Use the HTTP API for remote access:
const response = await fetch("${baseUrl}/api/databases/${databaseId}/query", {
  method: "POST",
  headers: { "Authorization": "Bearer ${apiKey}" },
  body: JSON.stringify({ query: "SELECT * FROM User" })
});`,
        },
      },
    },
  });
});

export default connectionRoutes;
