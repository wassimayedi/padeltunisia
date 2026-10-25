// Inserts the initial club directory, event calendar, news and magazine articles (from
// padel_clubs_tunisia.xlsx, padel_events_2026.xlsx, padel_news_2026-10-24.xlsx and bandeja-articles.xlsx). Usage: npm run db:seed
// Existing slugs are skipped, so re-running never overwrites rows edited since.
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import { clubs, events, magazine, news, type NewClub, type NewEvent, type NewMagazineArticle, type NewNews } from "../src/db/schema.ts";
import clubSeed from "../src/db/seed/clubs.json" with { type: "json" };
import eventSeed from "../src/db/seed/events.json" with { type: "json" };
import magazineSeed from "../src/db/seed/magazine.json" with { type: "json" };
import newsSeed from "../src/db/seed/news.json" with { type: "json" };

const pool = new Pool({ connectionString: process.env["DATABASE_URL"] });
const db = drizzle(pool);

const newClubs = await db
  .insert(clubs)
  .values(clubSeed as NewClub[])
  .onConflictDoNothing({ target: clubs.slug })
  .returning({ slug: clubs.slug });
console.log(`Clubs: ${newClubs.length} new (${clubSeed.length - newClubs.length} already present)`);

// Events reference their hosting club by slug in the seed file.
const clubIds = new Map((await db.select({ id: clubs.id, slug: clubs.slug }).from(clubs)).map((c) => [c.slug, c.id]));
const eventRows: NewEvent[] = eventSeed.map(({ clubSlug, ...e }) => ({
  ...(e as Omit<NewEvent, "clubId">),
  clubId: clubSlug ? (clubIds.get(clubSlug) ?? null) : null,
}));
const newEvents = await db
  .insert(events)
  .values(eventRows)
  .onConflictDoNothing({ target: events.slug })
  .returning({ slug: events.slug });
console.log(`Events: ${newEvents.length} new (${eventSeed.length - newEvents.length} already present)`);

// News reference clubs and events by slug; existing articles are matched on their URL.
const eventIds = new Map((await db.select({ id: events.id, slug: events.slug }).from(events)).map((e) => [e.slug, e.id]));
const newsRows: NewNews[] = newsSeed.map(({ clubSlug, eventSlug, ...n }) => ({
  ...(n as Omit<NewNews, "clubId" | "eventId">),
  clubId: clubSlug ? (clubIds.get(clubSlug) ?? null) : null,
  eventId: eventSlug ? (eventIds.get(eventSlug) ?? null) : null,
}));
const newNews = await db.insert(news).values(newsRows).onConflictDoNothing({ target: news.url }).returning({ id: news.id });
console.log(`News: ${newNews.length} new (${newsSeed.length - newNews.length} already present)`);

const newArticles = await db
  .insert(magazine)
  .values(magazineSeed as NewMagazineArticle[])
  .onConflictDoNothing({ target: magazine.slug })
  .returning({ slug: magazine.slug });
console.log(`Magazine: ${newArticles.length} new (${magazineSeed.length - newArticles.length} already present)`);

await pool.end();
