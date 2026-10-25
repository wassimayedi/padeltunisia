// Server functions for the magazine (see functions/clubs.ts for the pattern).
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { publishedArticle, publishedArticles } from "@/server/magazine";

export const getArticles = createServerFn()
  .validator(z.object({ limit: z.number().int().positive().optional() }).optional())
  .handler(({ data }) => publishedArticles(data ?? {}));

export const getArticle = createServerFn()
  .validator(z.object({ slug: z.string() }))
  .handler(async ({ data }) => {
    const article = await publishedArticle(data.slug);
    if (!article) return null;
    return { article, more: await publishedArticles({ limit: 3, excludeSlug: data.slug }) };
  });
