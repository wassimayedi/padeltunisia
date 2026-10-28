// Settings and DB connection shared by the MCP tools.
import { fileURLToPath } from "node:url";

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

export const serverInfo = { name: "padeltunisia", version: "1.0.0" };

/** Public site address, used to return the page URL of inserted rows. */
export const siteUrl = (process.env["VITE_SITE_URL"] ?? "https://padeltunisia.tn").replace(
  /\/$/,
  "",
);

export const db = drizzle(new Pool({ connectionString: process.env["DATABASE_URL"] }));

/**
 * Images added by the tools, served by the site at /uploads/… (routes/uploads.$.ts). Outside public/,
 * which is baked into the build: docker-compose mounts this folder into the app container.
 */
export const uploadsDir =
  process.env["UPLOADS_DIR"] ?? fileURLToPath(new URL("../../uploads", import.meta.url));
