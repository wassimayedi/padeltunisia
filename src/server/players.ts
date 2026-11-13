// Available players (/joueurs): list, own state, make available / stop, contact. Server-only:
// never import from client code. The phone is only read in playerContact, after its checks.
import { and, asc, desc, eq, exists, gt, inArray, isNotNull, sql } from "drizzle-orm";

import { clubs, playerAvailableClubs, players, type Player } from "@/db/schema";
import { areaCities, GRAND_TUNIS } from "@/lib/clubs";
import type { Contact } from "@/lib/matches";
import { availableUntilFrom, levelWindow, withPlayerDefaults, type AvailablePlayer, type AvailablePlayersInput, type AvailablePlayersSearch, type MyAvailability } from "@/lib/players";
import { profileComplete } from "@/server/auth";
import { db } from "@/server/db";

export const PAGE_SIZE = 24;

/** Refused action, with a message meant for the player. */
export class AvailabilityError extends Error {}

const INCOMPLETE = "Complétez votre profil (téléphone, genre, niveau) pour apparaître dans les joueurs disponibles.";

/** Same areas as the club filter (Grand Tunis, a governorate or one city), on the player's profile. */
const playerInArea = (area: string) => (!area ? undefined : area === GRAND_TUNIS ? eq(players.region, area) : inArray(players.city, areaCities(area)));

/** Available now, with the fields a card needs; a profile emptied since stays out of the list. */
const isListed = () =>
  and(gt(players.availableUntil, sql`now()`), isNotNull(players.profileCompletedAt), isNotNull(players.phone), isNotNull(players.gender), isNotNull(players.level));

/** The player picked the club with this slug. */
const pickedClub = (slug: string) =>
  exists(
    db()
      .select({ one: sql`1` })
      .from(playerAvailableClubs)
      .innerJoin(clubs, eq(clubs.id, playerAvailableClubs.clubId))
      .where(and(eq(playerAvailableClubs.playerId, players.id), eq(clubs.slug, slug))),
  );

/** Clubs picked by each of `playerIds`, by club name. */
async function clubsOf(playerIds: string[]) {
  const byPlayer = new Map<string, { slug: string; name: string }[]>();
  if (playerIds.length === 0) return byPlayer;
  const rows = await db()
    .select({ playerId: playerAvailableClubs.playerId, slug: clubs.slug, name: clubs.name })
    .from(playerAvailableClubs)
    .innerJoin(clubs, eq(clubs.id, playerAvailableClubs.clubId))
    .where(inArray(playerAvailableClubs.playerId, playerIds))
    .orderBy(asc(clubs.name));
  for (const { playerId, ...club } of rows) byPlayer.set(playerId, [...(byPlayer.get(playerId) ?? []), club]);
  return byPlayer;
}

export async function availablePlayers(s: AvailablePlayersSearch) {
  const window = s.level ? levelWindow(s.level) : null;
  const rows = await db()
    .select({
      id: players.id,
      name: players.name,
      avatarUrl: players.avatarUrl,
      anonymous: players.availableAnonymous,
      level: players.level,
      gender: players.gender,
      city: players.city,
      note: players.availableNote,
      availableUntil: players.availableUntil,
    })
    .from(players)
    .where(
      and(
        isListed(),
        playerInArea(s.city),
        s.club ? pickedClub(s.club) : undefined,
        window ? sql`${players.level} between ${window.min} and ${window.max}` : undefined,
        s.gender ? eq(players.gender, s.gender) : undefined,
      ),
    )
    // Latest to make themselves available first (their availability ends last).
    .orderBy(desc(players.availableUntil), desc(players.id))
    .limit(PAGE_SIZE + 1)
    .offset((s.page - 1) * PAGE_SIZE);
  const page = rows.slice(0, PAGE_SIZE);
  const picked = await clubsOf(page.map((p) => p.id));
  return {
    players: page.map(
      ({ anonymous, ...p }): AvailablePlayer => ({
        id: p.id,
        name: anonymous ? null : p.name,
        avatarUrl: anonymous ? null : p.avatarUrl,
        level: p.level!,
        gender: p.gender!,
        city: p.city,
        clubs: picked.get(p.id) ?? [],
        note: p.note,
        availableUntil: p.availableUntil!,
      }),
    ),
    hasMore: rows.length > PAGE_SIZE,
  };
}

/**
 * The list as /joueurs gets it: null for visitors, before any query (names, cities and clubs are for
 * members only); otherwise filters left out of the URL come from the viewer's profile.
 */
export async function availablePlayersFor(input: AvailablePlayersInput, viewer: Player | null) {
  if (!viewer) return null;
  const filters = withPlayerDefaults(input, viewer);
  const [list, availability] = await Promise.all([availablePlayers(filters), myAvailability(viewer)]);
  // The viewer comes with the page, so their button, card and criteria are right on first paint.
  const me = { id: viewer.id, level: viewer.level, gender: viewer.gender, city: viewer.city, availability };
  return { ...list, filters, me };
}

export async function myAvailability(player: Player): Promise<MyAvailability> {
  const active = player.availableUntil !== null && player.availableUntil > new Date();
  const picked = (await clubsOf([player.id])).get(player.id) ?? [];
  return {
    profileComplete: profileComplete(player),
    availableUntil: active ? player.availableUntil : null,
    anonymous: player.availableAnonymous,
    clubSlugs: picked.map((c) => c.slug),
    note: player.availableNote,
  };
}

/** Makes the player available for AVAILABILITY_DAYS from now with these clubs and note; calling it again renews. */
export async function setAvailable(player: Player, anonymous: boolean, clubSlugs: string[], note: string | null): Promise<MyAvailability> {
  if (!profileComplete(player)) throw new AvailabilityError(INCOMPLETE);
  const picked = clubSlugs.length ? await db().select({ id: clubs.id }).from(clubs).where(inArray(clubs.slug, clubSlugs)) : [];
  if (picked.length !== new Set(clubSlugs).size) throw new AvailabilityError("Un des clubs choisis n'existe pas.");
  const row = await db().transaction(async (tx) => {
    const [updated] = await tx
      .update(players)
      .set({ availableUntil: availableUntilFrom(), availableAnonymous: anonymous, availableNote: note })
      .where(eq(players.id, player.id))
      .returning();
    await tx.delete(playerAvailableClubs).where(eq(playerAvailableClubs.playerId, player.id));
    if (picked.length) await tx.insert(playerAvailableClubs).values(picked.map((c) => ({ playerId: player.id, clubId: c.id })));
    return updated!;
  });
  return myAvailability(row);
}

export async function stopAvailable(player: Player): Promise<MyAvailability> {
  const row = await db().transaction(async (tx) => {
    const [updated] = await tx.update(players).set({ availableUntil: null, availableNote: null }).where(eq(players.id, player.id)).returning();
    await tx.delete(playerAvailableClubs).where(eq(playerAvailableClubs.playerId, player.id));
    return updated!;
  });
  return myAvailability(row);
}

/** WhatsApp number of a listed player, for a viewer whose own profile is complete. */
export async function playerContact(viewer: Player, id: string): Promise<Contact> {
  if (!profileComplete(viewer)) throw new AvailabilityError("Complétez votre profil (téléphone, genre, niveau) pour contacter un joueur.");
  const [row] = await db()
    .select({ phone: players.phone, phoneCountryCode: players.phoneCountryCode })
    .from(players)
    .where(and(eq(players.id, id), isListed()))
    .limit(1);
  if (!row?.phone) throw new AvailabilityError("Ce joueur n'est plus disponible.");
  return { phone: row.phone, phoneCountryCode: row.phoneCountryCode };
}
