import type { News } from "@/db/schema";

export type NewsSummary = Pick<News, "id" | "title" | "summary" | "publishedOn" | "dateApproximate" | "scope" | "source" | "url" | "imageUrl"> & {
  club: { slug: string; name: string } | null;
  event: { slug: string; title: string } | null;
};

/** "23 oct. 2026", or "vers le 17 oct. 2026" when the source only gave a relative date. */
export function newsDate(n: Pick<NewsSummary, "publishedOn" | "dateApproximate">) {
  const d = new Date(`${n.publishedOn}T00:00:00Z`).toLocaleDateString("fr-FR", { timeZone: "UTC", day: "numeric", month: "short", year: "numeric" });
  return n.dateApproximate ? `vers le ${d}` : d;
}
