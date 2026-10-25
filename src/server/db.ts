import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as schema from "../db/schema";

// One pool per server process; created on first query so builds and SSR of
// DB-free pages don't need DATABASE_URL.
let instance: ReturnType<typeof create> | undefined;

function create() {
  const connectionString = process.env["DATABASE_URL"];
  if (!connectionString) throw new Error("DATABASE_URL is not set");
  return drizzle(new Pool({ connectionString, max: 10 }), { schema });
}

export function db() {
  return (instance ??= create());
}
