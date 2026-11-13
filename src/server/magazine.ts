// Magazine queries. Server-only: never import from client code.
import { and, desc, eq, lte, ne, sql } from "drizzle-orm";
import { marked } from "marked";

import { magazine } from "@/db/schema";
import { readingMinutes, type ArticleSummary } from "@/lib/magazine";
import { db } from "@/server/db";

// Articles with a future publication date stay hidden until that day.
const isPublished = lte(magazine.publishedOn, sql`current_date`);

// Shown (cards, article page, og:image) for articles saved without a cover.
const defaultImage = "/og-default.png";

const summaryColumns = {
  slug: magazine.slug,
  title: magazine.title,
  category: magazine.category,
  excerpt: magazine.excerpt,
  imageUrl: magazine.imageUrl,
  imageAlt: magazine.imageAlt,
  publishedOn: magazine.publishedOn,
  content: magazine.content,
};

const toSummary = ({ content, ...a }: { content: string } & Omit<ArticleSummary, "readingMinutes">): ArticleSummary => ({
  ...a,
  imageUrl: a.imageUrl ?? defaultImage,
  readingMinutes: readingMinutes(content),
});

export async function publishedArticles({ limit, excludeSlug }: { limit?: number | undefined; excludeSlug?: string | undefined } = {}) {
  const query = db()
    .select(summaryColumns)
    .from(magazine)
    .where(and(isPublished, excludeSlug ? ne(magazine.slug, excludeSlug) : undefined))
    .orderBy(desc(magazine.publishedOn), desc(magazine.id));
  return (await (limit ? query.limit(limit) : query)).map(toSummary);
}

/**
 * "À lire aussi" for one article: same category first, then the closest publication dates.
 * Unlike "latest 3", this spreads internal links over every article instead of the newest ones.
 */
export async function relatedArticles({ slug, category, publishedOn, limit = 3 }: { slug: string; category: string; publishedOn: string; limit?: number }) {
  const day = (iso: string) => new Date(`${iso}T00:00:00Z`).getTime();
  const others = await publishedArticles({ excludeSlug: slug });
  return others
    .map((a) => ({ a, sameCategory: a.category === category, distance: Math.abs(day(a.publishedOn) - day(publishedOn)) }))
    .sort((x, y) => Number(y.sameCategory) - Number(x.sameCategory) || x.distance - y.distance)
    .slice(0, limit)
    .map(({ a }) => a);
}

/** Markdown → HTML. Content is written by the site's editors, so it is trusted. */
function render(markdown: string) {
  return (marked.parse(markdown, { async: false, gfm: true }) as string)
    .replace(/<a href="(https?:[^"]+)"/g, '<a href="$1" target="_blank" rel="noopener noreferrer"')
    .replace(/<table>/g, '<div class="table-scroll"><table>')
    .replace(/<\/table>/g, "</table></div>");
}

export async function publishedArticle(slug: string) {
  const [article] = await db().select().from(magazine).where(and(eq(magazine.slug, slug), isPublished)).limit(1);
  if (!article) return null;
  const { content, ...rest } = article;
  return { ...rest, imageUrl: rest.imageUrl ?? defaultImage, html: render(content), readingMinutes: readingMinutes(content) };
}
