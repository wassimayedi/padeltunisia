// Magazine queries. Server-only: never import from client code.
import { and, desc, eq, lte, ne, sql } from "drizzle-orm";
import { marked } from "marked";

import { magazine } from "@/db/schema";
import { readingMinutes, type ArticleSummary } from "@/lib/magazine";
import { db } from "@/server/db";

// Articles with a future publication date stay hidden until that day.
const isPublished = lte(magazine.publishedOn, sql`current_date`);

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
  return { ...rest, html: render(content), readingMinutes: readingMinutes(content) };
}
