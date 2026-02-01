import { createClient } from "sqlite-saas-edge";

export interface Env {
  SQLITE_SAAS_URL: string;
  SQLITE_SAAS_API_KEY: string;
  DATABASE_ID: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const client = createClient({
      baseUrl: env.SQLITE_SAAS_URL,
      apiKey: env.SQLITE_SAAS_API_KEY,
      fetch: fetch.bind(globalThis),
    });

    const url = new URL(request.url);

    if (url.pathname === "/users" && request.method === "GET") {
      const result = await client.query(env.DATABASE_ID, {
        query: "SELECT * FROM users LIMIT 10",
      });
      return Response.json(result);
    }

    if (url.pathname === "/users" && request.method === "POST") {
      const body = await request.json() as { name: string; email: string };
      const result = await client.query(env.DATABASE_ID, {
        query: "INSERT INTO users (name, email) VALUES (?, ?)",
        params: [body.name, body.email],
      });
      return Response.json(result);
    }

    return new Response("Not Found", { status: 404 });
  },
};
