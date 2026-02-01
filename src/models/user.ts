export interface Account {
  id: string;
  name: string;
  email: string;
  password_hash: string | null;
  created_at: string;
  max_databases: number;
  total_storage_limit_bytes: number;
}

export interface ApiKey {
  id: string;
  account_id: string;
  key_hash: string;
  name: string | null;
  created_at: string;
  last_used_at: string | null;
  expires_at: string | null;
  is_active: boolean;
}

export interface CreateAccountRequest {
  name: string;
  email: string;
  password?: string;
}

export interface CreateApiKeyRequest {
  name?: string;
  expires_at?: string;
}

export interface ApiKeyResponse {
  id: string;
  name: string | null;
  key: string;
  created_at: string;
  expires_at: string | null;
}
