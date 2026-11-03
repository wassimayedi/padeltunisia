// Find match: shared types, form schemas and the pure rules (level range, gender, Tunis time).
import { z } from "zod";

import type { MatchGender, MatchPlayerStatus, MatchStatus, PlayerGender } from "@/db/schema";

export const MIN_LEVEL = 1;
export const MAX_LEVEL = 8;
export const MAX_SPOTS = 3;
export const MAX_MATCHES_PER_DAY = 3;
/** A match must start at least this long after it is created. */
export const MIN_LEAD_MINUTES = 60;
export const TIMEZONE = "Africa/Tunis";

export const LEVELS = [
  { value: 1, label: "Débutant", hint: "Premiers matchs, découvre les règles." },
  { value: 2, label: "Débutant +", hint: "Échanges courts, peu de vitre." },
  { value: 3, label: "Initié", hint: "Tient l'échange, commence à jouer la vitre." },
  { value: 4, label: "Intermédiaire", hint: "Volée et lob réguliers." },
  { value: 5, label: "Intermédiaire +", hint: "Bandeja, jeu en équipe placé." },
  { value: 6, label: "Confirmé", hint: "Vibora, sorties de vitre maîtrisées." },
  { value: 7, label: "Avancé", hint: "Smash par 3, tournois régionaux." },
  { value: 8, label: "Compétition", hint: "Joueur classé, tournois FTT/FIP." },
] as const;

export const levelLabel = (level: number) => LEVELS.find((l) => l.value === level)?.label ?? `Niveau ${level}`;

export const GENDERS: { value: MatchGender; label: string }[] = [
  { value: "male", label: "Hommes" },
  { value: "female", label: "Femmes" },
  { value: "mixed", label: "Mixte" },
];

export const genderLabel = (g: MatchGender) => GENDERS.find((x) => x.value === g)?.label ?? g;

export const DATE_FILTERS = [
  { value: "", label: "Toutes les dates" },
  { value: "today", label: "Aujourd'hui" },
  { value: "tomorrow", label: "Demain" },
  { value: "weekend", label: "Ce week-end" },
] as const;
/** A preset, or one day as "YYYY-MM-DD" (Tunis). */
export type DateFilter = (typeof DATE_FILTERS)[number]["value"] | (string & {});
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;
export const dateFilterSchema = z.union([z.enum(["", "today", "tomorrow", "weekend"]), z.string().regex(ISO_DAY)]);

export const levelRangeLabel = (m: { levelMin: number; levelMax: number }) => (m.levelMin === m.levelMax ? `Niveau ${m.levelMin}` : `Niveau ${m.levelMin} à ${m.levelMax}`);

export const levelInRange = (level: number, m: { levelMin: number; levelMax: number }) => level >= m.levelMin && level <= m.levelMax;

/** How far from their own level a creator can open a match: a level-4 player can accept 3 to 5. */
export const MAX_LEVEL_GAP = 1;

/** The range a creator may pick: it contains their level and stays within MAX_LEVEL_GAP of it. */
export const rangeAllowedFor = (level: number, m: { levelMin: number; levelMax: number }) =>
  levelInRange(level, m) && m.levelMin >= level - MAX_LEVEL_GAP && m.levelMax <= level + MAX_LEVEL_GAP;

export const genderAllowed = (player: PlayerGender, match: MatchGender) => match === "mixed" || match === player;

export const overlaps = (a: { startsAt: Date; endsAt: Date }, b: { startsAt: Date; endsAt: Date }) => a.startsAt < b.endsAt && b.startsAt < a.endsAt;

// --- Tunis time. Tunisia is UTC+1 all year (no daylight saving). ---
const OFFSET_MS = 60 * 60 * 1000;

/** "YYYY-MM-DD" of `d` in Tunis. */
export const tunisDate = (d: Date) => new Date(d.getTime() + OFFSET_MS).toISOString().slice(0, 10);

/** The UTC instant of `date` ("YYYY-MM-DD") at `time` ("HH:MM") in Tunis. */
export const tunisInstant = (date: string, time: string) => new Date(new Date(`${date}T${time}:00Z`).getTime() - OFFSET_MS);

const addDays = (date: string, n: number) => {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

/** [from, to) instants for a date filter, in Tunis days; null for no filter. */
export function dateWindow(filter: DateFilter, now = new Date()): { from: Date; to: Date } | null {
  const today = tunisDate(now);
  const day = (date: string, days = 1) => ({ from: tunisInstant(date, "00:00"), to: tunisInstant(addDays(date, days), "00:00") });
  if (filter === "today") return day(today);
  if (filter === "tomorrow") return day(addDays(today, 1));
  if (ISO_DAY.test(filter)) return day(filter);
  if (filter === "weekend") {
    const weekday = new Date(`${today}T00:00:00Z`).getUTCDay(); // 0 Sunday … 6 Saturday
    if (weekday === 0) return day(today);
    return day(addDays(today, (6 - weekday) % 7), 2);
  }
  return null;
}

/** [from, to) instants of the Tunis day containing `now`, for the daily creation limit. */
export const tunisDay = (now = new Date()) => dateWindow("today", now)!;

export const formatMatchDay = (d: Date) => new Intl.DateTimeFormat("fr-TN", { weekday: "long", day: "numeric", month: "long", timeZone: TIMEZONE }).format(d);
export const formatTime = (d: Date) => new Intl.DateTimeFormat("fr-TN", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: TIMEZONE }).format(d);

/** Cookie holding the page to return to after the Google login. */
export const NEXT_COOKIE = "login_next";

/** Where to go after login: same-site paths only, so the link can't send players to another site. */
export const safeNextPath = (next: string | null | undefined) => (next && /^\/(?![/\\])/.test(next) ? next : "/matchs");

/** wa.me link for a number stored as country code + local digits. */
export const whatsappLink = (countryCode: string, phone: string) => `https://wa.me/${countryCode}${phone.replace(/\D/g, "").replace(/^0+/, "")}`;

// --- Schemas shared by forms and server functions. ---
const level = z.number().int().min(MIN_LEVEL).max(MAX_LEVEL);

export const profileSchema = z.object({
  name: z.string().trim().min(2, "Indiquez votre nom.").max(80),
  phoneCountryCode: z.string().regex(/^\d{1,4}$/, "Indicatif invalide.").default("216"),
  phone: z.string().trim().regex(/^[\d\s]{6,15}$/, "Numéro invalide (chiffres uniquement)."),
  gender: z.enum(["male", "female"], { message: "Choisissez." }),
  level,
  region: z.string().trim().max(80).optional(),
  city: z.string().trim().min(1, "Choisissez votre ville.").max(80),
});
export type ProfileInput = z.infer<typeof profileSchema>;

export const createMatchSchema = z
  .object({
    clubSlug: z.string().min(1, "Choisissez un club."),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date invalide."),
    start: z.string().regex(/^\d{2}:\d{2}$/, "Heure invalide."),
    durationMin: z.union([z.literal(60), z.literal(90), z.literal(120)]),
    gender: z.enum(["male", "female", "mixed"]),
    levelMin: level,
    levelMax: level,
    spots: z.number().int().min(1).max(MAX_SPOTS),
    courtBooked: z.boolean().default(false),
    membersOnly: z.boolean().default(true),
    note: z.string().trim().max(300).optional(),
  })
  .refine((m) => m.levelMin <= m.levelMax, { message: "Le niveau minimum dépasse le maximum.", path: ["levelMax"] });
export type CreateMatchInput = z.infer<typeof createMatchSchema>;

/** City, level and gender left out mean "the viewer's profile value"; "" and 0 mean all. */
export const searchSchema = z.object({
  city: z.string().optional(),
  date: dateFilterSchema.default(""),
  level: z.number().int().min(0).max(MAX_LEVEL).optional(),
  gender: z.enum(["", "male", "female", "mixed"]).optional(),
  page: z.number().int().min(1).default(1),
});
export type MatchSearchInput = z.infer<typeof searchSchema>;
export type MatchSearch = { [K in keyof MatchSearchInput]-?: NonNullable<MatchSearchInput[K]> };

/** Fills the filters left out of the URL from the viewer's profile, so players land on matches they can join. */
export const withProfileDefaults = (s: MatchSearchInput, viewer: { city: string | null; level: number | null; gender: PlayerGender | null } | null): MatchSearch => ({
  ...s,
  city: s.city ?? viewer?.city ?? "",
  level: s.level ?? viewer?.level ?? 0,
  gender: s.gender ?? viewer?.gender ?? "",
});

// --- What pages receive. Contacts are only filled in for the match's creator and accepted players. ---
export type PublicPlayer = { id: string; name: string; avatarUrl: string | null; level: number | null };
export type Contact = { phone: string; phoneCountryCode: string };

export type MatchSummary = {
  id: string;
  startsAt: Date;
  endsAt: Date;
  gender: MatchGender;
  levelMin: number;
  levelMax: number;
  spots: number;
  accepted: number;
  status: MatchStatus;
  courtBooked: boolean;
  membersOnly: boolean;
  /** True when this viewer may not see the players: `creator` is then a blank stand-in. */
  playersHidden: boolean;
  club: { slug: string; name: string; city: string; region: string; logoUrl: string | null };
  creator: PublicPlayer;
};

export type MatchRequest = PublicPlayer & { status: MatchPlayerStatus; levelAtJoin: number; contact: Contact | null };

export type MatchDetail = MatchSummary & {
  note: string | null;
  creatorContact: Contact | null;
  /** Accepted players for everyone; pending and refused requests only for the creator. */
  players: MatchRequest[];
  /** The viewer's relation to the match. */
  viewer: { role: "creator" | "player" | "none"; status: MatchPlayerStatus | null; canJoin: boolean; reason: string | null } | null;
};

export const spotsLeft = (m: { spots: number; accepted: number }) => Math.max(0, m.spots - m.accepted);
