import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// One pool per Node.js process, not one pool per HTTP request.
// DATABASE_URL may target a managed pooler; validate its driver/prepared-statement
// compatibility before enabling transaction pooling.
let database: ReturnType<typeof createDatabase> | undefined;
function createDatabase() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is required for server database access");
  const pool = postgres(url, { max: 10, prepare: false });
  return drizzle(pool, { schema });
}
export function getDb() {
  database ??= createDatabase();
  return database;
}
