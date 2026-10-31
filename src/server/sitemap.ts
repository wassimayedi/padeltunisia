// Builds /sitemap.xml from the database. Server-only.
import { count, lte, max, sql } from "drizzle-orm";

import { clubs, events, magazine } from "@/db/schema";
import { citySlug, MIN_CLUBS_FOR_CITY_PAGE } from "@/lib/clubs";
import { absoluteUrl } from "@/lib/site";
import { db } from "@/server/db";

type Entry = { path: string; lastmod?: Date | string | null | undefined };

const iso = (d: Date | string | null | undefined) => (d ? new Date(d).toISOString().slice(0, 10) : undefined);
const escape = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export async function sitemapXml() {
  const [clubRows, cityRows, eventRows, articleRows] = await Promise.all([
    db().select({ slug: clubs.slug, updatedAt: clubs.updatedAt }).from(clubs),
    db().select({ city: clubs.city, clubs: count(), updatedAt: max(clubs.updatedAt) }).from(clubs).groupBy(clubs.city),
    db().select({ slug: events.slug, updatedAt: events.updatedAt }).from(events),
    db().select({ slug: magazine.slug, updatedAt: magazine.updatedAt, publishedOn: magazine.publishedOn }).from(magazine).where(lte(magazine.publishedOn, sql`current_date`)),
  ]);
  const newest = (rows: { updatedAt: Date | null }[]) => rows.map((r) => r.updatedAt).sort((a, b) => +(b ?? 0) - +(a ?? 0))[0];
  const entries: Entry[] = [
    { path: "/", lastmod: newest([...clubRows, ...eventRows]) },
    { path: "/clubs", lastmod: newest(clubRows) },
    { path: "/terrains" },
    { path: "/evenements", lastmod: newest(eventRows) },
    { path: "/articles", lastmod: articleRows.map((a) => a.publishedOn).sort().at(-1) },
    { path: "/guide" },
    { path: "/contact" },
    ...clubRows.map((c) => ({ path: `/clubs/${c.slug}`, lastmod: c.updatedAt })),
    ...cityRows.filter((c) => c.clubs >= MIN_CLUBS_FOR_CITY_PAGE).map((c) => ({ path: `/clubs/ville/${citySlug(c.city)}`, lastmod: c.updatedAt })),
    ...eventRows.map((e) => ({ path: `/evenements/${e.slug}`, lastmod: e.updatedAt })),
    ...articleRows.map((a) => ({ path: `/articles/${a.slug}`, lastmod: a.updatedAt })),
  ];
  const urls = entries.map(({ path, lastmod }) => {
    const mod = iso(lastmod);
    return `  <url><loc>${escape(absoluteUrl(path))}</loc>${mod ? `<lastmod>${mod}</lastmod>` : ""}</url>`;
  });
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>\n`;
}
