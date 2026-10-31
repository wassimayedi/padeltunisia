// Server functions for club data. Handlers run only on the server; the client
// bundle gets RPC stubs, so the database import never reaches the browser.
import { createServerFn } from "@tanstack/react-start";
import { and, asc, count, desc, eq, getTableColumns, isNotNull, ne, sql, sum } from "drizzle-orm";
import { z } from "zod";

import { clubs } from "@/db/schema";
import { citySlug, type CityGroup, type ClubSummary } from "@/lib/clubs";
import { db } from "@/server/db";
import { availabilityCityGroups } from "@/server/availability";
import { upcomingEvents } from "@/server/events";
import { latestNews } from "@/server/news";

const summary = {
  slug: clubs.slug,
  name: clubs.name,
  region: clubs.region,
  city: clubs.city,
  area: clubs.area,
  courts: clubs.courts,
  courtTypes: clubs.courtTypes,
  logoUrl: clubs.logoUrl,
};

async function cityGroups(): Promise<CityGroup[]> {
  const rows = await db()
    .selectDistinct({ region: clubs.region, city: clubs.city })
    .from(clubs)
    .orderBy(asc(clubs.region), asc(clubs.city));
  const groups = new Map<string, string[]>();
  for (const r of rows) groups.set(r.region, [...(groups.get(r.region) ?? []), r.city]);
  return [...groups].map(([region, cities]) => ({ region, cities }));
}

export const getClubDirectory = createServerFn().handler(async () => {
  const [list, groups] = await Promise.all([
    db().select(summary).from(clubs).orderBy(asc(clubs.name)) as Promise<ClubSummary[]>,
    cityGroups(),
  ]);
  return { clubs: list, cityGroups: groups };
});

export const getHomeClubs = createServerFn().handler(async () => {
  const [featured, [totals], logos, freeCourtCities] = await Promise.all([
    // Largest venues first until clubs can be featured editorially.
    db().select(summary).from(clubs).orderBy(sql`${clubs.courts} desc nulls last`, asc(clubs.name)).limit(6) as Promise<ClubSummary[]>,
    db()
      .select({ clubs: count(), courts: sum(clubs.courts).mapWith(Number), cities: sql<number>`count(distinct ${clubs.city})`.mapWith(Number) })
      .from(clubs),
    // Clubs with a logo, for the scrolling band.
    db().select({ slug: clubs.slug, name: clubs.name, logoUrl: clubs.logoUrl }).from(clubs).where(isNotNull(clubs.logoUrl)).orderBy(asc(clubs.name)),
    // For the hero's free-court search.
    availabilityCityGroups(),
  ]);
  return { featured, stats: totals!, logos: logos as { slug: string; name: string; logoUrl: string }[], freeCourtCities };
});

// Everything the club page shows; the planning widget URL carries the club's key and stays server-side.
const { availabilityUrl, ...pageColumns } = getTableColumns(clubs);

export const getClub = createServerFn()
  .validator(z.object({ slug: z.string() }))
  .handler(async ({ data }) => {
    const [club] = await db()
      .select({ ...pageColumns, hasAvailability: isNotNull(availabilityUrl).mapWith(Boolean) })
      .from(clubs)
      .where(eq(clubs.slug, data.slug))
      .limit(1);
    if (!club) return null;
    const [others, clubEvents, clubNews] = await Promise.all([
      // Same city first, then the rest of the region.
      db()
        .select(summary)
        .from(clubs)
        .where(and(eq(clubs.region, club.region), ne(clubs.id, club.id)))
        .orderBy(desc(sql`${clubs.city} = ${club.city}`), asc(clubs.name))
        .limit(3) as Promise<ClubSummary[]>,
      upcomingEvents({ clubId: club.id }),
      latestNews({ clubId: club.id, limit: 4 }),
    ]);
    return { club, others, events: clubEvents, news: clubNews };
  });

export const getCity = createServerFn()
  .validator(z.object({ slug: z.string() }))
  .handler(async ({ data }) => {
    const cities = await db().selectDistinct({ city: clubs.city, region: clubs.region }).from(clubs);
    const match = cities.find((c) => citySlug(c.city) === data.slug);
    if (!match) return null;
    const [cityClubs, cityEvents] = await Promise.all([
      db()
        .select({ ...summary, openingHours: clubs.openingHours })
        .from(clubs)
        .where(eq(clubs.city, match.city))
        .orderBy(sql`${clubs.courts} desc nulls last`, asc(clubs.name)),
      upcomingEvents({ city: match.city }),
    ]);
    // Other cities of the region, for internal links.
    const neighbours = cities.filter((c) => c.region === match.region && c.city !== match.city).map((c) => c.city).sort();
    return { ...match, clubs: cityClubs as (ClubSummary & { openingHours: string | null })[], events: cityEvents, neighbours };
  });

/** Every city with its club count, for links and the sitemap. */
export const getCities = createServerFn().handler(async () =>
  db()
    .select({ city: clubs.city, region: clubs.region, clubs: count() })
    .from(clubs)
    .groupBy(clubs.city, clubs.region)
    .orderBy(desc(count()), asc(clubs.city)),
);
