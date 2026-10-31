// Court plannings read from the clubs' booking platforms: Balle Jaune, PadUp and Padel Society's
// own app. Server-only: the Balle Jaune widget URL carries the club's key and never reaches the client.
import { asc, isNotNull } from "drizzle-orm";

import { clubs } from "@/db/schema";
import type { CourtPlanning } from "@/lib/availability";
import type { CityGroup } from "@/lib/clubs";
import { db } from "@/server/db";

/** The widget itself refreshes every minute; a few minutes is fresh enough and spares Balle Jaune. */
const TTL_MS = 5 * 60_000;
const cache = new Map<string, { at: number; plannings: CourtPlanning[] }>();

/**
 * Courts and their slots from the planning fragment the widget loads over AJAX.
 * Only the slot state is read; who booked is ignored. Past slots of today are dropped.
 */
export function parsePlanning(html: string): CourtPlanning[] {
  return html
    .split('class="schedule-container"')
    .slice(1)
    .map((block) => ({
      court: block.match(/schedule-header-name[\s\S]*?text-ellipsis"[^>]*>([^<]+)</)?.[1]?.trim() ?? "Terrain",
      slots: [...block.matchAll(/<a class="(slot [^"]*)"[^>]*?data-timestart="(\d+)" data-duration="(\d+)"/g)]
        .filter(([, cls]) => !/\bslot-expired\b/.test(cls!))
        .map(([, cls, start, duration]) => ({ start: Number(start), duration: Number(duration), free: /\bslot-free\b/.test(cls!) })),
    }));
}

/** Clubs' public planning widget (plannings-integrated). */
async function balleJaunePlannings(target: URL): Promise<CourtPlanning[] | null> {
  const res = await fetch(target, { headers: { "X-Requested-With": "XMLHttpRequest" }, signal: AbortSignal.timeout(8000) });
  if (!res.ok) return null;
  const plannings = parsePlanning(await res.text());
  return plannings.length ? plannings : null;
}

type PadUpCourt = { establishmentDTO: { name: string }; plannings: { fromStr: string; toStr: string }[] | null };

const minutesOf = (time: string) => {
  const [h, m] = time.split(":").map(Number);
  return h! * 60 + m!;
};

/**
 * Courts from PadUp's booking search. It lists only the slots still bookable, so every one is free;
 * booked slots are simply missing. Today's list keeps slots already started: pass `nowMinutes` to drop them.
 */
export function parsePadUp(courts: PadUpCourt[], nowMinutes: number | null): CourtPlanning[] {
  return courts.map(({ establishmentDTO, plannings }) => ({
    court: establishmentDTO.name,
    slots: (plannings ?? [])
      .map((p) => {
        const start = minutesOf(p.fromStr);
        return { start, duration: (minutesOf(p.toStr) - start + 1440) % 1440 || 1440, free: true };
      })
      .filter((slot) => nowMinutes === null || slot.start >= nowMinutes),
  }));
}

/** Date and time in Tunisia, where the clubs' plannings live. */
function tunisNow(day: number) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Tunis", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
    .formatToParts(new Date(Date.now() + day * 86_400_000));
  const get = (type: string) => parts.find((p) => p.type === type)!.value;
  return { date: `${get("year")}-${get("month")}-${get("day")}`, minutes: Number(get("hour")) * 60 + Number(get("minute")) };
}

/**
 * PadUp clubs, stored as `https://padup.net/?clubId=<id>` (the clubId of the club's padup.net page).
 * Replays the public search of the club page: a search key for the date, the club's own key from the
 * results, then its courts. The key lives in the session cookie.
 */
async function padUpPlannings(target: URL, day: number): Promise<CourtPlanning[] | null> {
  let session = "";
  const post = async (path: string, body: unknown) => {
    const res = await fetch(new URL(path, target.origin), {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json", ...(session && { Cookie: session }) },
      body: typeof body === "string" ? body : JSON.stringify(body),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) throw new Error(`PadUp ${path}: ${res.status}`);
    session ||= res.headers.getSetCookie().map((c) => c.split(";")[0]).join("; ");
    return res.json();
  };
  const clubId = Number(target.searchParams.get("clubId"));
  const { date, minutes } = tunisNow(day);
  const search = await post("/api/establishments/search/init", {
    dateTime: `${date} 00:00`,
    clubId,
    activityId: null,
    cityId: null,
    iscity: false,
  });
  const results = (await post("/api/establishments/search/list", search.key)) as { id: number; key: string }[];
  const club = results.find((c) => c.id === clubId);
  if (!club) return null;
  await post("/api/establishments/search/init/booking", { argumentId: club.id, key: club.key });
  const courts = (await post("/api/establishments/search/get/booking", club.key)) as PadUpCourt[];
  return courts.length ? parsePadUp(courts, day === 0 ? minutes : null) : null;
}

type SocietyAgenda = { uuid: string; name: string; public: boolean; agenda_type: string };
type SocietyDay = { slots: { start: string; end: string; appointments: number }[] };

/**
 * Courts from Padel Society's booking app. Every slot of the day is listed, with the number of
 * appointments on it: 0 means free. Past slots of today are dropped when `nowMinutes` is given.
 */
export function parseSociety(agendas: SocietyAgenda[], days: Record<string, SocietyDay[]>, nowMinutes: number | null): CourtPlanning[] {
  return agendas.map(({ uuid, name }) => ({
    court: name.replace(/\s+/g, " ").trim(),
    slots: (days[uuid]?.[0]?.slots ?? [])
      .map((s) => {
        const start = minutesOf(s.start);
        return { start, duration: (minutesOf(s.end) - start + 1440) % 1440 || 1440, free: s.appointments === 0 };
      })
      .filter((slot) => nowMinutes === null || slot.start >= nowMinutes),
  }));
}

/**
 * Padel Society (clubpadelsociety.com), stored as `https://www.clubpadelsociety.com/api/agenda-slots`.
 * Its API answers only for a registered player's phone: PADEL_SOCIETY_PHONE (8 digits). The club's
 * agendas include staff and coaches; only the public "terrain" ones are read.
 */
async function societyPlannings(target: URL, day: number): Promise<CourtPlanning[] | null> {
  const phone = process.env["PADEL_SOCIETY_PHONE"];
  if (!phone) return null;
  const get = async <T>(path: string, params: Record<string, string>) => {
    const res = await fetch(`${new URL(path, target.origin)}?${new URLSearchParams({ ...params, phone })}`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(10_000),
    });
    const body = (await res.json()) as { ok: boolean; data: { data: T } };
    if (!res.ok || !body.ok) throw new Error(`Padel Society ${path}: ${res.status}`);
    return body.data.data;
  };
  const courts = (await get<SocietyAgenda[]>("/api/courts", {})).filter((a) => a.public && a.agenda_type === "terrain");
  if (!courts.length) return null;
  const { date, minutes } = tunisNow(day);
  const [y, m, d] = date.split("-");
  const days = await get<Record<string, SocietyDay[]>>(target.pathname, { agenda_uuid: courts.map((c) => c.uuid).join(","), day: `${d}-${m}-${y}` });
  return parseSociety(courts, days, day === 0 ? minutes : null);
}

/** Plannings of `day` (0 = today) for the planning at `url`, or null when they can't be read. */
export async function courtPlannings(url: string, day: number): Promise<CourtPlanning[] | null> {
  const target = new URL(url);
  target.searchParams.set("date", String(day));
  const key = target.toString();
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.plannings;
  try {
    const plannings = /(^|\.)(ballejaune|openresa)\.com$/.test(target.hostname)
      ? await balleJaunePlannings(target)
      : target.pathname === "/api/agenda-slots"
        ? await societyPlannings(target, day)
        : await padUpPlannings(target, day);
    if (plannings) cache.set(key, { at: Date.now(), plannings });
    return plannings;
  } catch {
    return null;
  }
}

/** Clubs whose planning we read, by region and city: the /terrains club list and city filter. */
export async function availabilityClubs() {
  return db()
    .select({ slug: clubs.slug, name: clubs.name, region: clubs.region, city: clubs.city })
    .from(clubs)
    .where(isNotNull(clubs.availabilityUrl))
    .orderBy(asc(clubs.region), asc(clubs.city), asc(clubs.name));
}

/** Their cities, by region, for the city filter. */
export async function availabilityCityGroups(list?: { region: string; city: string }[]): Promise<CityGroup[]> {
  const groups = new Map<string, Set<string>>();
  for (const c of list ?? (await availabilityClubs())) groups.set(c.region, (groups.get(c.region) ?? new Set()).add(c.city));
  return [...groups].map(([region, cities]) => ({ region, cities: [...cities] }));
}
