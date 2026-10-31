import type { ClubSummary } from "@/lib/clubs";

export type Slot = { start: number; duration: number; free: boolean };
export type CourtPlanning = { court: string; slots: Slot[] };

export type ClubAvailability = {
  club: ClubSummary;
  /** Courts with a free slot near the requested time, with the start times on offer. */
  courts: { court: string; starts: string[] }[];
};

/** Courts are booked on each club's own grid (07:30, 09:00…), so "08:00" also accepts slots starting up to this far either side. */
export const TIME_TOLERANCE_MIN = 30;
/** Balle Jaune plannings open a week ahead. */
export const MAX_DAY = 7;

/** Bookable times offered in the search, every half hour. */
export const SEARCH_TIMES = Array.from({ length: 34 }, (_, i) => hhmm(7 * 60 + i * 30));

export function hhmm(minutes: number) {
  return `${String(Math.floor(minutes / 60) % 24).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

export function toMinutes(time: string) {
  const [h, m] = time.split(":").map(Number);
  return h! * 60 + m!;
}

/** Courts with at least one free slot starting within the tolerance of `minutes`. */
export function freeCourtsAt(plannings: CourtPlanning[], minutes: number) {
  return plannings
    .map(({ court, slots }) => ({
      court,
      starts: slots.filter((s) => s.free && Math.abs(s.start - minutes) <= TIME_TOLERANCE_MIN).map((s) => hhmm(s.start)),
    }))
    .filter((c) => c.starts.length > 0);
}

/** "Aujourd'hui", "Demain", then "sam. 2 nov." — dates in Tunisia, like the clubs' plannings. */
export function dayLabel(day: number, now = new Date()) {
  if (day === 0) return "Aujourd'hui";
  if (day === 1) return "Demain";
  const d = new Date(now.getTime() + day * 86_400_000);
  return d.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short", timeZone: "Africa/Tunis" });
}

/** Earliest time still offered today: the current half hour in Tunisia, so 19:10 keeps 19:00 (it finds 19:30 slots). */
export function earliestTimeToday(now = new Date()) {
  const [h, m] = now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: "Africa/Tunis" }).split(":").map(Number);
  return Math.floor((h! * 60 + m!) / 30) * 30;
}

/** `time`, or the first search time not already past when the search is for today. */
export function upcomingTime(day: number, time: string, earliest: number) {
  if (day !== 0 || toMinutes(time) >= earliest) return time;
  return SEARCH_TIMES.find((t) => toMinutes(t) >= earliest) ?? SEARCH_TIMES.at(-1)!;
}
