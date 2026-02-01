# SQLite Cloud

SQLite-as-a-Service for serverless edge functions. Run SQLite databases on a VM and connect from Cloudflare Workers, Deno Deploy, Vercel Edge, or any HTTP client.

## Features

- **HTTP API** for SQLite operations (queries, migrations, batch)
- **Multi-tenant** with API key authentication
- **Quotas & Limits** per database (size, tables, query rate)
- **Edge SDKs** for Cloudflare Workers, Deno, Bun
- **Lightweight** - Single VM deployment with Bun + Hono

## Quick Start

### 1. Start the Server

```bash
bun install
bun run dev
```

Server runs on `http://localhost:3000`

### 2. Create an Account & API Key

```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name": "My Account", "email": "user@example.com"}'

curl -X POST http://localhost:3000/auth/keys \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{"name": "Production Key"}'
```

### 3. Create a Database

```bash
curl -X POST http://localhost:3000/api/databases \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"name": "my-app-db"}'
```

### 4. Run Queries

```bash
curl -X POST http://localhost:3000/api/databases/DATABASE_ID/query \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"query": "CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT)"}'
```

## Using from Edge Functions

### Cloudflare Worker

```typescript
import { createClient } from "sqlite-saas-edge";

const client = createClient({
  baseUrl: env.SQLITE_SAAS_URL,
  apiKey: env.SQLITE_SAAS_API_KEY,
});

const result = await client.query(env.DATABASE_ID, {
  query: "SELECT * FROM users WHERE id = ?",
  params: [1],
});
```

### Deno Deploy

```typescript
import { createClient } from "sqlite-saas-edge";

const client = createClient({
  baseUrl: Deno.env.get("SQLITE_SAAS_URL"),
  apiKey: Deno.env.get("SQLITE_SAAS_API_KEY"),
});

const result = await client.query(DATABASE_ID, {
  query: "SELECT * FROM users",
});
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/register` | Create account |
| POST | `/auth/keys` | Generate API key |
| POST | `/api/databases` | Create database |
| GET | `/api/databases` | List databases |
| GET | `/api/databases/:id` | Get database info |
| DELETE | `/api/databases/:id` | Delete database |
| POST | `/api/databases/:id/query` | Execute query |
| POST | `/api/databases/:id/batch` | Batch queries |
| POST | `/api/databases/:id/migrate` | Run migrations |

## Configuration

Copy `.env.example` to `.env` and configure:

```bash
PORT=3000
DEFAULT_MAX_DATABASES_PER_ACCOUNT=10
DEFAULT_MAX_DB_SIZE_BYTES=104857600
JWT_SECRET=your-secret-key
```

## Project Structure

```
sqlite-cloud/
├── src/              # Server source code
│   ├── index.ts      # Entry point
│   ├── routes/       # API routes
│   ├── services/     # Business logic
│   ├── middleware/   # Auth, error handling
│   └── db/           # Database layer
├── sdk/
│   ├── edge/         # Edge runtime SDK
│   └── typescript/   # Node.js/Bun SDK
├── examples/         # Usage examples
└── data/             # SQLite databases
```

Made with kimi k2.5 
