import { desc, gte, sql } from "drizzle-orm";
import { z } from "zod";

import { magazine } from "../../../src/db/schema.ts";
import { db, siteUrl } from "../config.ts";
import { renderCover } from "../cover.ts";
import { saveImage, toWebp } from "../images.ts";
import { day, defineTool, fail, reply, slug } from "../tool.ts";

export const magazineTools = [
  defineTool({
    name: "recent_articles",
    description:
      "List articles published in the last days, and those already scheduled, to avoid repeating a topic.",
    inputSchema: { days: z.number().int().min(1).max(180).default(30) },
    handler: async ({ days }) => {
      const rows = await db
        .select({
          slug: magazine.slug,
          title: magazine.title,
          category: magazine.category,
          publishedOn: magazine.publishedOn,
        })
        .from(magazine)
        .where(gte(magazine.publishedOn, sql`current_date - ${days}::int`))
        .orderBy(desc(magazine.publishedOn));
      return reply(rows);
    },
  }),

  defineTool({
    name: "add_magazine_article",
    description:
      "Add an original editorial article (shown at /articles/:slug). Written in French; the body is Markdown (GFM tables allowed). A future publishedOn schedules it: it stays hidden until that day. Without imageUrl, a branded cover with the title and category is generated.",
    inputSchema: {
      slug,
      title: z.string(),
      category: z.enum(["Tunisie", "International", "Guide"]),
      excerpt: z.string().describe("Lead paragraph, shown on cards and under the title"),
      content: z
        .string()
        .describe(
          "Article body in Markdown, starting at ## headings (the title is rendered separately)",
        ),
      imageUrl: z.string().optional().describe("Omit to generate a branded cover"),
      imageAlt: z.string().optional(),
      metaTitle: z.string().optional(),
      metaDescription: z.string().optional(),
      keywords: z.array(z.string()).optional(),
      sources: z.array(z.object({ label: z.string(), url: z.string().url() })).optional(),
      publishedOn: day,
    },
    handler: async (article) => {
      // The cover is written only once the row is in, so a duplicate slug leaves no stray file.
      const cover = article.imageUrl
        ? null
        : await toWebp(await renderCover(article), "magazine", article.slug);
      const [row] = await db
        .insert(magazine)
        .values(
          cover
            ? {
                ...article,
                imageUrl: cover.url,
                imageAlt: article.imageAlt ?? `Couverture : ${article.title}`,
              }
            : article,
        )
        .onConflictDoNothing({ target: magazine.slug })
        .returning({
          id: magazine.id,
          slug: magazine.slug,
          publishedOn: magazine.publishedOn,
        });
      if (!row) return fail(`An article with slug "${article.slug}" already exists`);
      if (cover) await saveImage(cover);
      return reply({ ...row, page: `${siteUrl}/articles/${row.slug}` });
    },
  }),
];
