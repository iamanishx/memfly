import { Hono } from "hono";
import { executeQuery, executeBatch, executeMigration } from "../services/query-service";
import { getDatabaseById } from "../services/database-service";
import { authMiddleware, getAccount } from "../middleware/auth";
import { ForbiddenError } from "../utils/errors";
import type { QueryRequest, MigrateRequest } from "../models/query";

const queryRoutes = new Hono();

queryRoutes.use("*", authMiddleware);

async function verifyDatabaseAccess(c: any, databaseId: string) {
  const account = getAccount(c);
  const database = getDatabaseById(databaseId);
  
  if (!database) {
    throw new ForbiddenError("Database not found");
  }
  
  if (database.account_id !== account.id) {
    throw new ForbiddenError("Access denied");
  }
  
  return database;
}

queryRoutes.post("/:id/query", async (c) => {
  const databaseId = c.req.param("id");
  await verifyDatabaseAccess(c, databaseId);
  
  const body = await c.req.json<QueryRequest>();
  const result = executeQuery(databaseId, body);
  
  return c.json({
    success: result.success,
    data: result.data,
    rowsAffected: result.rowsAffected,
    lastInsertRowid: result.lastInsertRowid,
    error: result.error,
  });
});

queryRoutes.post("/:id/batch", async (c) => {
  const databaseId = c.req.param("id");
  await verifyDatabaseAccess(c, databaseId);
  
  const body = await c.req.json<{ queries: QueryRequest[] }>();
  const result = executeBatch(databaseId, body.queries);
  
  return c.json({
    success: true,
    data: result,
  });
});

queryRoutes.post("/:id/migrate", async (c) => {
  const databaseId = c.req.param("id");
  await verifyDatabaseAccess(c, databaseId);
  
  const body = await c.req.json<MigrateRequest>();
  const result = executeMigration(databaseId, body.queries);
  
  return c.json({
    success: result.results.every(r => r.success),
    data: result,
  });
});

export default queryRoutes;
