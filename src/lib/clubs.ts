import type { Club, CourtType } from "@/db/schema";

/** The fields the club cards and the search need. */
export type ClubSummary = Pick<Club, "slug" | "name" | "region" | "city" | "area" | "courts" | "courtTypes" | "logoUrl">;

export type CityGroup = { region: string; cities: string[] };

const COURT_TYPE_LABELS: Record<CourtType, string> = {
  indoor: "intérieur",
  outdoor: "extérieur",
  covered: "couvert",
};

export function courtTypesLabel(types: CourtType[]) {
  return types.map((t) => COURT_TYPE_LABELS[t]).join(" + ");
}

export type HoursRow = { days: string; time: string };

/**
 * Splits the directory's free-text hours ("Lun–ven 07:00–22:00 · sam–dim 07:00–20:00")
 * into rows for display. Text that doesn't follow the pattern comes back as one row.
 */
export function hoursRows(text: string): HoursRow[] {
  if (/^24h\/24, 7j\/7$/.test(text)) return [{ days: "Tous les jours", time: "24h/24" }];
  return text.split(" · ").map((part) => {
    const m = part.match(/^(.*?)\s+((?:\d{2}:\d{2}|24h\/24).*)$/);
    const days = m?.[1] ?? "";
    return { days: days.charAt(0).toUpperCase() + days.slice(1), time: m?.[2] ?? part };
  });
}

/** schema.org OpeningHoursSpecification for the two unambiguous patterns; null otherwise. */
export function openingHoursSpec(text: string) {
  const dayOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  if (text === "24h/24, 7j/7") return [{ "@type": "OpeningHoursSpecification", dayOfWeek, opens: "00:00", closes: "23:59" }];
  const m = text.match(/^Tous les jours (\d{2}:\d{2})–(\d{2}:\d{2})$/);
  return m ? [{ "@type": "OpeningHoursSpecification", dayOfWeek, opens: m[1], closes: m[2] }] : null;
}

/** "Kélibia" matches "kelibia": lowercase and strip accents. */
const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export function filterClubs<T extends ClubSummary>(list: T[], q: string, city: string) {
  const s = fold(q.trim());
  return list.filter(
    (c) =>
      (!city || c.city === city) &&
      (!s || [c.name, c.city, c.area ?? "", c.region].some((field) => fold(field).includes(s))),
  );
}

/** "Hammam Sousse" → "hammam-sousse", used in /clubs/ville/:city. */
export const citySlug = (city: string) => fold(city).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/** City pages with fewer clubs are too thin to index (noindex, left out of the sitemap). */
export const MIN_CLUBS_FOR_CITY_PAGE = 2;
