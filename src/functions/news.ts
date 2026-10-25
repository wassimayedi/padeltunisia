// Server functions for the news feed (see functions/clubs.ts for the pattern).
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { latestNews } from "@/server/news";

export const getNews = createServerFn()
  .validator(z.object({ limit: z.number().int().positive().optional() }).optional())
  .handler(({ data }) => latestNews(data ?? {}));
