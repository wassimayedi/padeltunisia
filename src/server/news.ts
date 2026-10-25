// News queries shared by server functions. Server-only: never import from client code.
import { and, desc, eq } from "drizzle-orm";

import { clubs, events, news, type EventScope } from "@/db/schema";
import type { NewsSummary } from "@/lib/news";
import { db } from "@/server/db";

/** Most recent first. */
export async function latestNews({ limit, clubId, eventId, scope }: { limit?: number | undefined; clubId?: number | undefined; eventId?: number | undefined; scope?: EventScope | undefined } = {}) {
  const query = db()
    .select({
      id: news.id,
      title: news.title,
      summary: news.summary,
      publishedOn: news.publishedOn,
      dateApproximate: news.dateApproximate,
      scope: news.scope,
      source: news.source,
      url: news.url,
      imageUrl: news.imageUrl,
      clubSlug: clubs.slug,
      clubName: clubs.name,
      eventSlug: events.slug,
      eventTitle: events.title,
    })
    .from(news)
    .leftJoin(clubs, eq(clubs.id, news.clubId))
    .leftJoin(events, eq(events.id, news.eventId))
    .where(and(clubId == null ? undefined : eq(news.clubId, clubId), eventId == null ? undefined : eq(news.eventId, eventId), scope == null ? undefined : eq(news.scope, scope)))
    .orderBy(desc(news.publishedOn), desc(news.id));
  const rows = await (limit ? query.limit(limit) : query);
  return rows.map(({ clubSlug, clubName, eventSlug, eventTitle, ...n }): NewsSummary => ({
    ...n,
    club: clubSlug && clubName ? { slug: clubSlug, name: clubName } : null,
    event: eventSlug && eventTitle ? { slug: eventSlug, title: eventTitle } : null,
  }));
}
