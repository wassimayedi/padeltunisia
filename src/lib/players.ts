// Available players (/joueurs): shared types, schemas and pure rules. No DB code, safe for the client.
import { z } from "zod";

import type { PlayerGender } from "@/db/schema";
import { MAX_LEVEL, MAX_LEVEL_GAP } from "@/lib/matches";

/** "Rends-moi disponible" lasts this long; the player can renew or stop earlier. */
export const AVAILABILITY_DAYS = 7;

/** Clubs a player can pick as where they'd like to play. */
export const MAX_AVAILABLE_CLUBS = 3;

/** Free note on when they can play ("Que les week-ends"). */
export const MAX_NOTE_LENGTH = 120;

export const availableUntilFrom =(now = new Date()) => new Date(now.getTime() + AVAILABILITY_DAYS * 86_400_000);

/** A level filter shows players within MAX_LEVEL_GAP of it, like the level range of a match. */
export const levelWindow = (level: number) => ({ min: Math.max(1, level - MAX_LEVEL_GAP), max: Math.min(MAX_LEVEL, level + MAX_LEVEL_GAP) });

export const PLAYER_GENDERS: { value: PlayerGender; label: string }[] = [
  { value: "male", label: "Homme" },
  { value: "female", label: "Femme" },
];

export const playerGenderLabel = (g: PlayerGender) => PLAYER_GENDERS.find((x) => x.value === g)?.label ?? g;

/**
 * Filters of the list, as in the URL. City, level and gender left out mean "the viewer's profile
 * value" (like /matchs); "" and 0 mean all. Pages requested with a session cookie are never stored
 * by the CDN (server.ts), so visitors still get the cached, unfiltered list.
 */
export const availablePlayersSchema = z.object({
  city: z.string().optional(),
  /** Club slug: players who picked that club. */
  club: z.string().default(""),
  level: z.number().int().min(0).max(MAX_LEVEL).optional(),
  gender: z.enum(["", "male", "female"]).optional(),
  page: z.number().int().min(1).default(1),
});
export type AvailablePlayersInput = z.infer<typeof availablePlayersSchema>;
/** The filters actually applied, every one filled in. */
export type AvailablePlayersSearch = { [K in keyof AvailablePlayersInput]-?: NonNullable<AvailablePlayersInput[K]> };

/** Fills the filters left out of the URL from the viewer's profile, so players land on partners for them. */
export const withPlayerDefaults = (s: AvailablePlayersInput, viewer: { city: string | null; level: number | null; gender: PlayerGender | null } | null): AvailablePlayersSearch => ({
  ...s,
  city: s.city ?? viewer?.city ?? "",
  level: s.level ?? viewer?.level ?? 0,
  gender: s.gender ?? viewer?.gender ?? "",
});

export const setAvailabilitySchema = z.object({
  anonymous: z.boolean(),
  clubSlugs: z
    .array(z.string().min(1))
    .max(MAX_AVAILABLE_CLUBS, `${MAX_AVAILABLE_CLUBS} clubs au maximum.`)
    .refine((s) => new Set(s).size === s.length, "Club en double.")
    .default([]),
  /** Empty or left out means no note. */
  note: z
    .string()
    .trim()
    .max(MAX_NOTE_LENGTH, `${MAX_NOTE_LENGTH} caractères au maximum.`)
    .optional()
    .transform((s) => s || null),
});

/** One card of the public list. Never carries the phone: members fetch it on click. */
export type AvailablePlayer = {
  id: string;
  /** Null when the player chose to stay anonymous (name and photo hidden). */
  name: string | null;
  avatarUrl: string | null;
  level: number;
  gender: PlayerGender;
  city: string | null;
  /** Clubs where they'd like to play, possibly none. */
  clubs: { slug: string; name: string }[];
  /** When they can play, in their words; null when left empty. */
  note: string | null;
  availableUntil: Date;
};

/** The viewer's own state, loaded in the browser. */
export type MyAvailability = {
  /** Phone, gender and level are filled in (profileComplete). */
  profileComplete: boolean;
  availableUntil: Date | null;
  anonymous: boolean;
  /** Clubs picked last time, kept when renewing. */
  clubSlugs: string[];
  /** Note saved last time, kept when renewing. */
  note: string | null;
};
