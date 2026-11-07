// Stores social post images next to the other uploads, served by the site at /uploads/social/….
// Instagram fetches the image itself, so it needs a public JPEG URL on the live site.
import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { siteUrl, uploadsDir } from "../mcp/config.ts";

/** Saves the JPEG as social/<slug>-<hash>.jpg and returns its absolute URL. */
export async function saveSocialImage(jpeg: Buffer, slug: string) {
  const file = `${slug}-${createHash("sha256").update(jpeg).digest("hex").slice(0, 8)}.jpg`;
  await mkdir(join(uploadsDir, "social"), { recursive: true });
  await writeFile(join(uploadsDir, "social", file), jpeg);
  return `${siteUrl}/uploads/social/${file}`;
}
