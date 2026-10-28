import { asc, eq, ilike, or } from "drizzle-orm";
import { z } from "zod";

import { events } from "../../../src/db/schema.ts";
import { db, siteUrl } from "../config.ts";
import { day, defineTool, fail, reply, scope, slug } from "../tool.ts";
import { clubIdFor, clubSlug } from "./clubs.ts";

/** Resolves an event slug given to a tool; null when omitted. */
export async function eventIdFor(slug: string | undefined) {
  if (!slug) return null;
  const [event] = await db.select({ id: events.id }).from(events).where(eq(events.slug, slug));
  if (!event) throw new Error(`Unknown event slug "${slug}"; use find_events`);
  return event.id;
}

export const eventTools = [
  defineTool({
    name: "find_events",
    description:
      "Search events by title or slug, to check for duplicates or get the slug used to link news to an event.",
    inputSchema: { query: z.string().describe("Part of the title or slug") },
    handler: async ({ query }) => {
      const pattern = `%${query}%`;
      const rows = await db
        .select({
          slug: events.slug,
          title: events.title,
          startDate: events.startDate,
          endDate: events.endDate,
        })
        .from(events)
        .where(or(ilike(events.title, pattern), ilike(events.slug, pattern)))
        .orderBy(asc(events.startDate))
        .limit(20);
      return reply(rows);
    },
  }),

  defineTool({
    name: "add_event",
    description:
      "Add a tournament to the events calendar (shown at /evenements/:slug). Text is in French.",
    inputSchema: {
      slug,
      title: z.string(),
      startDate: day,
      endDate: day,
      venue: z
        .string()
        .optional()
        .describe("Venue or city; omit while the location is to be confirmed"),
      country: z.string().optional(),
      scope,
      level: z.string().describe('Circuit category, e.g. "FIP Bronze", "FTT P25"'),
      clubSlug: clubSlug.describe(
        "Slug of the hosting club, when it is in the directory (see find_clubs)",
      ),
      url: z.string().url().optional().describe("Official event page"),
      posterUrl: z.string().optional().describe("URL returned by save_image"),
      source: z
        .string()
        .optional()
        .describe('Site the listing was taken from, e.g. "padelfip.com"'),
      description: z.string().optional(),
      registrationUrl: z.string().url().optional(),
      registrationDeadline: day.optional(),
      drawDate: day.optional(),
      entryFee: z.string().optional().describe('Free text, e.g. "70 DT par personne"'),
      draws: z
        .array(z.string())
        .optional()
        .describe('e.g. ["Hommes : P50, P100, P250", "Femmes : P50, P100"]'),
      tournamentDirector: z.string().optional(),
      referee: z.string().optional(),
      officialBall: z.string().optional(),
    },
    handler: async ({ clubSlug, ...event }) => {
      if (event.endDate < event.startDate) return fail("endDate is before startDate");
      const [row] = await db
        .insert(events)
        .values({ ...event, clubId: await clubIdFor(clubSlug) })
        .onConflictDoNothing({ target: events.slug })
        .returning({ id: events.id, slug: events.slug });
      if (!row) return fail(`An event with slug "${event.slug}" already exists`);
      return reply({ ...row, page: `${siteUrl}/evenements/${row.slug}` });
    },
  }),
];
