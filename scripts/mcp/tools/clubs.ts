import { asc, eq, ilike, or } from "drizzle-orm";
import { z } from "zod";

import { clubs } from "../../../src/db/schema.ts";
import { db } from "../config.ts";
import { defineTool, reply } from "../tool.ts";

export const clubSlug = z
  .string()
  .optional()
  .describe("Slug of the club involved (see find_clubs)");

/** Resolves a club slug given to a tool; null when omitted. */
export async function clubIdFor(slug: string | undefined) {
  if (!slug) return null;
  const [club] = await db.select({ id: clubs.id }).from(clubs).where(eq(clubs.slug, slug));
  if (!club) throw new Error(`Unknown club slug "${slug}"; use find_clubs`);
  return club.id;
}

export const clubTools = [
  defineTool({
    name: "find_clubs",
    description:
      "Search clubs by name, city or slug, to get the slug used to link events and news to a club.",
    inputSchema: { query: z.string().describe("Part of the name, city or slug") },
    handler: async ({ query }) => {
      const pattern = `%${query}%`;
      const rows = await db
        .select({ slug: clubs.slug, name: clubs.name, city: clubs.city })
        .from(clubs)
        .where(
          or(ilike(clubs.name, pattern), ilike(clubs.city, pattern), ilike(clubs.slug, pattern)),
        )
        .orderBy(asc(clubs.name))
        .limit(20);
      return reply(rows);
    },
  }),
];
