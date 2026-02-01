import { Hono } from "hono";
import { createAccount, createApiKey, listApiKeys, revokeApiKey } from "../services/auth-service";
import { authMiddleware, getAccount } from "../middleware/auth";
import type { CreateAccountRequest, CreateApiKeyRequest } from "../models/user";

const authRoutes = new Hono();

authRoutes.post("/register", async (c) => {
  const body = await c.req.json<CreateAccountRequest>();
  const account = await createAccount(body);
  return c.json({
    success: true,
    data: {
      id: account.id,
      name: account.name,
      email: account.email,
      created_at: account.created_at,
    },
  }, 201);
});

authRoutes.post("/keys", authMiddleware, async (c) => {
  const account = getAccount(c);
  const body = await c.req.json<CreateApiKeyRequest>();
  const apiKey = await createApiKey(account.id, body);
  return c.json({
    success: true,
    data: apiKey,
  }, 201);
});

authRoutes.get("/keys", authMiddleware, async (c) => {
  const account = getAccount(c);
  const keys = listApiKeys(account.id);
  return c.json({
    success: true,
    data: keys,
  });
});

authRoutes.delete("/keys/:id", authMiddleware, async (c) => {
  const account = getAccount(c);
  const keyId = c.req.param("id");
  revokeApiKey(account.id, keyId);
  return c.json({
    success: true,
    message: "API key revoked",
  });
});

export default authRoutes;
