import { getMetadataDb } from "../config";
import type { Account, ApiKey, CreateAccountRequest, CreateApiKeyRequest, ApiKeyResponse } from "../models/user";
import { ConflictError, UnauthorizedError, NotFoundError } from "../utils/errors";
import { validateEmail } from "../utils/validators";
import { randomUUID } from "crypto";
import { config } from "../config";

export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const passwordHash = await hashPassword(password);
  return passwordHash === hash;
}

export function generateApiKey(): string {
  const randomPart = Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
  return `${config.apiKeyPrefix}${randomPart}`;
}

export async function hashApiKey(apiKey: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(apiKey);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

export async function createAccount(data: CreateAccountRequest): Promise<Account> {
  validateEmail(data.email);
  
  const db = getMetadataDb();
  const existing = db.query("SELECT id FROM accounts WHERE email = ?").get(data.email);
  if (existing) {
    throw new ConflictError("Account with this email already exists");
  }
  
  const id = randomUUID();
  const passwordHash = data.password ? await hashPassword(data.password) : null;
  
  db.query(`
    INSERT INTO accounts (id, name, email, password_hash)
    VALUES (?, ?, ?, ?)
  `).run(id, data.name, data.email, passwordHash);
  
  return db.query("SELECT * FROM accounts WHERE id = ?").get(id) as Account;
}

export async function createApiKey(accountId: string, data: CreateApiKeyRequest): Promise<ApiKeyResponse> {
  const db = getMetadataDb();
  
  const account = db.query("SELECT id FROM accounts WHERE id = ?").get(accountId);
  if (!account) {
    throw new NotFoundError("Account not found");
  }
  
  const id = randomUUID();
  const plainKey = generateApiKey();
  const keyHash = await hashApiKey(plainKey);
  
  db.query(`
    INSERT INTO api_keys (id, account_id, key_hash, name, expires_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, accountId, keyHash, data.name || null, data.expires_at || null);
  
  const record = db.query("SELECT * FROM api_keys WHERE id = ?").get(id) as ApiKey;
  
  return {
    id: record.id,
    name: record.name,
    key: plainKey,
    created_at: record.created_at,
    expires_at: record.expires_at,
  };
}

export async function validateApiKey(plainKey: string): Promise<Account> {
  if (!plainKey.startsWith(config.apiKeyPrefix)) {
    throw new UnauthorizedError("Invalid API key format");
  }
  
  const keyHash = await hashApiKey(plainKey);
  const db = getMetadataDb();
  
  const apiKeyRecord = db.query(`
    SELECT ak.*, a.* 
    FROM api_keys ak
    JOIN accounts a ON ak.account_id = a.id
    WHERE ak.key_hash = ? AND ak.is_active = 1
  `).get(keyHash) as (ApiKey & Account) | undefined;
  
  if (!apiKeyRecord) {
    throw new UnauthorizedError("Invalid API key");
  }
  
  if (apiKeyRecord.expires_at && new Date(apiKeyRecord.expires_at) < new Date()) {
    throw new UnauthorizedError("API key has expired");
  }
  
  db.query("UPDATE api_keys SET last_used_at = CURRENT_TIMESTAMP WHERE id = ?").run(apiKeyRecord.id);
  
  return {
    id: apiKeyRecord.account_id,
    name: apiKeyRecord.name,
    email: apiKeyRecord.email,
    password_hash: apiKeyRecord.password_hash,
    created_at: apiKeyRecord.created_at,
    max_databases: apiKeyRecord.max_databases,
    total_storage_limit_bytes: apiKeyRecord.total_storage_limit_bytes,
  };
}

export function revokeApiKey(accountId: string, keyId: string): void {
  const db = getMetadataDb();
  const key = db.query("SELECT account_id FROM api_keys WHERE id = ?").get(keyId) as { account_id: string } | undefined;
  
  if (!key) {
    throw new NotFoundError("API key not found");
  }
  
  if (key.account_id !== accountId) {
    throw new UnauthorizedError("Cannot revoke key from another account");
  }
  
  db.query("UPDATE api_keys SET is_active = 0 WHERE id = ?").run(keyId);
}

export function listApiKeys(accountId: string): Omit<ApiKey, "key_hash">[] {
  const db = getMetadataDb();
  return db.query(`
    SELECT id, account_id, name, created_at, last_used_at, expires_at, is_active
    FROM api_keys
    WHERE account_id = ? AND is_active = 1
    ORDER BY created_at DESC
  `).all(accountId) as Omit<ApiKey, "key_hash">[];
}
