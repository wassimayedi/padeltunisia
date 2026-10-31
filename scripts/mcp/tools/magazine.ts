import { desc, gte, isNotNull, sql } from "drizzle-orm";
import { z } from "zod";

import { magazine } from "../../../src/db/schema.ts";
import { db, siteUrl } from "../config.ts";
import { renderCover } from "../cover.ts";
import { saveImage, toWebp } from "../images.ts";
import { stockCover } from "../stock.ts";
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
      "Add an original editorial article (shown at /articles/:slug). Written in French; the body is Markdown (GFM tables allowed). A future publishedOn schedules it: it stays hidden until that day. Without imageUrl, the cover is a real photo found on Pixabay with coverQuery (credited under it), or a branded cover with the title when no photo is found.",
    inputSchema: {
      slug,
      title: z.string(),
      category: z.enum(["Tunisie", "International", "Guide"]),
      excerpt: z
        .string()
        .describe("Lead paragraph, shown on cards and under the title"),
      content: z
        .string()
        .describe(
          "Article body in Markdown, starting at ## headings (the title is rendered separately)",
        ),
      imageUrl: z
        .string()
        .optional()
        .describe("Omit to get a stock photo (see coverQuery)"),
      imageAlt: z.string().optional(),
      coverQuery: z
        .string()
        .optional()
        .describe(
          "2 to 4 English words for the cover photo search, about what the photo should show (e.g. 'padel racket ball', 'padel court night', 'padel players doubles'); no names",
        ),
      metaTitle: z.string().optional(),
      metaDescription: z.string().optional(),
      keywords: z.array(z.string()).optional(),
      sources: z
        .array(z.object({ label: z.string(), url: z.string().url() }))
        .optional(),
      publishedOn: day,
    },
    handler: async ({ coverQuery, ...article }) => {
      // The cover is written before the row, so a failed write never leaves an article pointing to a
      // missing file (on a duplicate slug it stays as an unused file, which is harmless).
      let cover: Awaited<ReturnType<typeof toWebp>> | null = null;
      let imageCredit: { name: string; url: string } | null = null;
      // Which cover was used, and why the photo was skipped: returned so it lands in the run's report.
      let coverNote = "image given by the caller";
      if (!article.imageUrl) {
        // A real photo no article uses yet; the branded title cover whenever Pixabay can't give one.
        const used = await db
          .select({ url: sql<string>`${magazine.imageCredit}->>'url'` })
          .from(magazine)
          .where(isNotNull(magazine.imageCredit));
        let failure: string | null = null;
        const photo = await stockCover(
          coverQuery,
          new Set(used.map((u) => u.url)),
        ).catch((error: unknown) => {
          failure = error instanceof Error ? error.message : String(error);
          return null;
        });
        imageCredit = photo?.credit ?? null;
        coverNote = photo
          ? `Pixabay photo by ${photo.credit.name} (${photo.credit.url})`
          : `generated title cover: ${
              failure ??
              (process.env["PIXABAY_API_KEY"]
                ? "no new Pixabay photo for this search"
                : "PIXABAY_API_KEY is not set")
            }`;
        cover = await toWebp(
          photo?.data ?? (await renderCover(article)),
          "magazine",
          article.slug,
        );
        await saveImage(cover);
      }
      const [row] = await db
        .insert(magazine)
        .values(
          cover
            ? {
                ...article,
                imageUrl: cover.url,
                imageAlt:
                  article.imageAlt ??
                  (imageCredit
                    ? `Photo d'illustration : ${article.title}`
                    : `Couverture : ${article.title}`),
                imageCredit,
              }
            : article,
        )
        .onConflictDoNothing({ target: magazine.slug })
        .returning({
          id: magazine.id,
          slug: magazine.slug,
          publishedOn: magazine.publishedOn,
        });
      if (!row)
        return fail(`An article with slug "${article.slug}" already exists`);
      return reply({
        ...row,
        page: `${siteUrl}/articles/${row.slug}`,
        cover: coverNote,
      });
    },
  }),
];
