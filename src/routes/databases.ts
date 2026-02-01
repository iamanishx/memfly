import { Hono } from "hono";
import { createDatabase, listDatabases, getDatabase, updateDatabase, deleteDatabase } from "../services/database-service";
import { authMiddleware, getAccount } from "../middleware/auth";
import type { CreateDatabaseRequest, UpdateDatabaseRequest } from "../models/database";

const databaseRoutes = new Hono();

databaseRoutes.use("*", authMiddleware);

databaseRoutes.post("/", async (c) => {
  const account = getAccount(c);
  const body = await c.req.json<CreateDatabaseRequest>();
  const database = createDatabase(account.id, body);
  return c.json({
    success: true,
    data: database,
  }, 201);
});

databaseRoutes.get("/", async (c) => {
  const account = getAccount(c);
  const databases = listDatabases(account.id);
  return c.json({
    success: true,
    data: {
      databases,
      total: databases.length,
    },
  });
});

databaseRoutes.get("/:id", async (c) => {
  const account = getAccount(c);
  const databaseId = c.req.param("id");
  const database = getDatabase(account.id, databaseId);
  return c.json({
    success: true,
    data: database,
  });
});

databaseRoutes.patch("/:id", async (c) => {
  const account = getAccount(c);
  const databaseId = c.req.param("id");
  const body = await c.req.json<UpdateDatabaseRequest>();
  const database = updateDatabase(account.id, databaseId, body);
  return c.json({
    success: true,
    data: database,
  });
});

databaseRoutes.delete("/:id", async (c) => {
  const account = getAccount(c);
  const databaseId = c.req.param("id");
  deleteDatabase(account.id, databaseId);
  return c.json({
    success: true,
    message: "Database deleted",
  });
});

export default databaseRoutes;
