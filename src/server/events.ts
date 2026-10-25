// Event queries shared by server functions. Server-only: never import from client code.
import { and, asc, desc, eq, gte, sql } from "drizzle-orm";

import { clubs, events } from "@/db/schema";
import type { EventSummary } from "@/lib/events";
import { db } from "@/server/db";

const summary = {
  slug: events.slug,
  title: events.title,
  startDate: events.startDate,
  endDate: events.endDate,
  venue: events.venue,
  country: events.country,
  scope: events.scope,
  level: events.level,
  url: events.url,
  posterUrl: events.posterUrl,
  clubSlug: clubs.slug,
  clubName: clubs.name,
  ongoing: sql<boolean>`${events.startDate} <= current_date`,
};

/** Upcoming and ongoing events (not yet finished), soonest first. */
export async function upcomingEvents({ limit, clubId, city, tunisiaFirst = false }: { limit?: number | undefined; clubId?: number | undefined; city?: string | undefined; tunisiaFirst?: boolean | undefined } = {}) {
  const query = db()
    .select(summary)
    .from(events)
    .leftJoin(clubs, eq(clubs.id, events.clubId))
    .where(and(gte(events.endDate, sql`current_date`), clubId == null ? undefined : eq(events.clubId, clubId), city == null ? undefined : eq(clubs.city, city)))
    .orderBy(...(tunisiaFirst ? [desc(sql`${events.scope} = 'tn'`)] : []), asc(events.startDate), asc(events.title));
  const rows = await (limit ? query.limit(limit) : query);
  return rows.map(({ clubSlug, clubName, ...e }): EventSummary => ({
    ...e,
    club: clubSlug && clubName ? { slug: clubSlug, name: clubName } : null,
  }));
}

/** Full event with its hosting club, for the event page. Past events included. */
export async function eventBySlug(slug: string) {
  const [row] = await db()
    .select({ event: events, club: { slug: clubs.slug, name: clubs.name, city: clubs.city, address: clubs.address, logoUrl: clubs.logoUrl } })
    .from(events)
    .leftJoin(clubs, eq(clubs.id, events.clubId))
    .where(eq(events.slug, slug))
    .limit(1);
  if (!row) return null;
  const today = new Date().toISOString().slice(0, 10);
  const status = row.event.endDate < today ? "past" : row.event.startDate <= today ? "ongoing" : "upcoming";
  return { ...row.event, club: row.club?.slug ? row.club : null, status } as const;
}
