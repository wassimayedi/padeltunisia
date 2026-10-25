import type { Event } from "@/db/schema";

/** What the event lists need, plus the hosting club and a server-computed status. */
export type EventSummary = Pick<
  Event,
  "slug" | "title" | "startDate" | "endDate" | "venue" | "country" | "scope" | "level" | "url" | "posterUrl"
> & {
  club: { slug: string; name: string } | null;
  /** Computed on the server so SSR and hydration agree. */
  ongoing: boolean;
};

// Dates are calendar days ("2026-10-19"); format in UTC so no timezone shifts the day.
const day = (iso: string) => new Date(`${iso}T00:00:00Z`);
const fmt = (iso: string, opts: Intl.DateTimeFormatOptions) => day(iso).toLocaleDateString("fr-FR", { timeZone: "UTC", ...opts });

export const dayOfMonth = (iso: string) => fmt(iso, { day: "numeric" });
export const shortMonth = (iso: string) => fmt(iso, { month: "short" });
export const monthLabel = (iso: string) => fmt(iso, { month: "long", year: "numeric" });

/** "19–25 oct. 2026", "30 oct.–1 nov. 2026", "3 déc. 2026". */
export function dateRange(start: string, end: string) {
  if (start === end) return fmt(start, { day: "numeric", month: "short", year: "numeric" });
  const sameMonth = start.slice(0, 7) === end.slice(0, 7);
  const from = sameMonth ? fmt(start, { day: "numeric" }) : fmt(start, { day: "numeric", month: "short" });
  return `${from}–${fmt(end, { day: "numeric", month: "short", year: "numeric" })}`;
}

export function eventPlace(e: Pick<EventSummary, "venue" | "country" | "scope" | "club">) {
  const venue = e.club?.name ?? e.venue;
  if (!venue) return "Lieu à confirmer";
  return e.scope === "tn" || !e.country || venue === e.country ? venue : `${venue}, ${e.country}`;
}

/** "du 19 au 25 octobre 2026", "du 30 octobre au 1er novembre 2026", "le 3 décembre 2026". */
export function dateRangeLong(start: string, end: string) {
  const d = (iso: string, o: Intl.DateTimeFormatOptions) => fmt(iso, o).replace(/^1 /, "1er ");
  if (start === end) return `le ${d(start, { day: "numeric", month: "long", year: "numeric" })}`;
  const sameMonth = start.slice(0, 7) === end.slice(0, 7);
  const from = sameMonth ? fmt(start, { day: "numeric" }).replace(/^1$/, "1er") : d(start, { day: "numeric", month: "long" });
  return `du ${from} au ${d(end, { day: "numeric", month: "long", year: "numeric" })}`;
}

/** Number of days, both ends included. */
export const durationDays = (start: string, end: string) => Math.round((day(end).getTime() - day(start).getTime()) / 86_400_000) + 1;

/** The circuit an event belongs to, from its level label. */
export function circuitName(level: string) {
  if (/FTT/i.test(level)) return "le circuit national de la Fédération Tunisienne de Tennis (FTT)";
  if (/Premier Padel/i.test(level)) return "le circuit Premier Padel";
  if (/FIP|Hexagon|Promises|Finals/i.test(level)) return "le calendrier de la Fédération internationale de padel (FIP)";
  return null;
}
