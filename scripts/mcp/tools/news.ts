import { desc, gte, sql } from "drizzle-orm";
import { z } from "zod";

import { news } from "../../../src/db/schema.ts";
import { db } from "../config.ts";
import { day, defineTool, fail, reply, scope } from "../tool.ts";
import { clubIdFor, clubSlug } from "./clubs.ts";
import { eventIdFor } from "./events.ts";

export const newsTools = [
  defineTool({
    name: "recent_news",
    description:
      "List news added for the last days, to avoid adding the same story again from another source.",
    inputSchema: { days: z.number().int().min(1).max(90).default(14) },
    handler: async ({ days }) => {
      const rows = await db
        .select({
          title: news.title,
          publishedOn: news.publishedOn,
          source: news.source,
          url: news.url,
        })
        .from(news)
        .where(gte(news.publishedOn, sql`current_date - ${days}::int`))
        .orderBy(desc(news.publishedOn));
      return reply(rows);
    },
  }),

  defineTool({
    name: "add_news",
    description:
      "Add a curated headline linking to an article on another site. Title and summary are in French.",
    inputSchema: {
      title: z.string(),
      summary: z.string().optional().describe("One or two sentences"),
      publishedOn: day,
      dateApproximate: z
        .boolean()
        .optional()
        .describe('The source only gave a relative date ("il y a 2 semaines")'),
      scope,
      source: z.string().describe('Publication name, e.g. "FIP", "The Padel Paper"'),
      url: z.string().url().describe("The original article"),
      imageUrl: z.string().optional().describe("URL returned by save_image"),
      clubSlug,
      eventSlug: z
        .string()
        .optional()
        .describe("Slug of the event the story is about (see find_events)"),
    },
    handler: async ({ clubSlug, eventSlug, ...item }) => {
      const [row] = await db
        .insert(news)
        .values({
          ...item,
          clubId: await clubIdFor(clubSlug),
          eventId: await eventIdFor(eventSlug),
        })
        .onConflictDoNothing({ target: news.url })
        .returning({ id: news.id, url: news.url });
      if (!row) return fail(`A news item with URL ${item.url} already exists`);
      return reply(row);
    },
  }),
];
