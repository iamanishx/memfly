import { createClient } from "sqlite-saas-edge";

const client = createClient({
  baseUrl: Deno.env.get("SQLITE_SAAS_URL") || "",
  apiKey: Deno.env.get("SQLITE_SAAS_API_KEY") || "",
});

const DATABASE_ID = Deno.env.get("DATABASE_ID") || "";

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);

  if (url.pathname === "/users" && req.method === "GET") {
    const result = await client.query(DATABASE_ID, {
      query: "SELECT * FROM users LIMIT 10",
    });
    return Response.json(result);
  }

  if (url.pathname === "/users" && req.method === "POST") {
    const body = await req.json() as { name: string; email: string };
    const result = await client.query(DATABASE_ID, {
      query: "INSERT INTO users (name, email) VALUES (?, ?)",
      params: [body.name, body.email],
    });
    return Response.json(result);
  }

  return new Response("Not Found", { status: 404 });
});
