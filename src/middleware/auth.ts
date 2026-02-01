import type { Context, Next } from "hono";
import { validateApiKey } from "../services/auth-service";
import { UnauthorizedError } from "../utils/errors";

export async function authMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header("Authorization");
  
  if (!authHeader) {
    throw new UnauthorizedError("Missing Authorization header");
  }
  
  const [scheme, token] = authHeader.split(" ");
  
  if (scheme !== "Bearer" || !token) {
    throw new UnauthorizedError("Invalid Authorization format. Use 'Bearer <api_key>'");
  }
  
  const account = await validateApiKey(token);
  c.set("account", account);
  
  await next();
}

export function getAccount(c: Context) {
  return c.get("account");
}
