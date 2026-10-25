import type { MagazineArticle } from "@/db/schema";

/** What article cards need. */
export type ArticleSummary = Pick<MagazineArticle, "slug" | "title" | "category" | "excerpt" | "imageUrl" | "imageAlt" | "publishedOn"> & {
  readingMinutes: number;
};

/** "24 octobre 2026" — calendar dates, formatted in UTC so no timezone shifts the day. */
export const articleDate = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("fr-FR", { timeZone: "UTC", day: "numeric", month: "long", year: "numeric" });

/** About 200 words a minute, never less than one minute. */
export const readingMinutes = (markdown: string) => Math.max(1, Math.round(markdown.split(/\s+/).filter(Boolean).length / 200));
