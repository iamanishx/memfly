import { Hono } from "hono";
import { config } from "./config";
import { runMigrations } from "./db/migrations";
import { errorHandler } from "./middleware/error-handler";
import authRoutes from "./routes/auth";
import databaseRoutes from "./routes/databases";
import queryRoutes from "./routes/query";
import connectionRoutes from "./routes/connection";

runMigrations();

const app = new Hono();

app.use(errorHandler);

app.get("/health", (c) => {
  return c.json({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
});

app.route("/auth", authRoutes);
app.route("/api/databases", databaseRoutes);
app.route("/api/databases", queryRoutes);
app.route("/api/databases", connectionRoutes);

export default {
  port: config.port,
  fetch: app.fetch,
};
