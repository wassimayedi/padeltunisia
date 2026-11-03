// Marks matches that have ended as played, so "Mes matchs" history and the creators' lists stay
// accurate. Usage: npm run matches:close. Crontab example (every hour):
//   0 * * * * cd /path/to/padeltunisia && npm run matches:close
import { and, inArray, lt } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import { matches } from "../src/db/schema.ts";

const pool = new Pool({ connectionString: process.env["DATABASE_URL"] });
const rows = await drizzle(pool)
  .update(matches)
  .set({ status: "played" })
  .where(and(inArray(matches.status, ["open", "full"]), lt(matches.endsAt, new Date())))
  .returning({ id: matches.id });
await pool.end();
console.log(`${rows.length} match(es) marked as played`);
