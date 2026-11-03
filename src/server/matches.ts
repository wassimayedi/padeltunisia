// Find match: search, create, join, review, leave, cancel. Server-only: never import from client code.
// Every write that depends on how many players a match has runs in a transaction holding the
// match row lock (SELECT … FOR UPDATE), so two joins or accepts can't overfill it.
import { alias } from "drizzle-orm/pg-core";
import { and, asc, count, desc, eq, gt, gte, inArray, lt, ne, or, sql, type SQL } from "drizzle-orm";

import { clubs, matches, matchPlayers, notifications, players, type Match, type Player } from "@/db/schema";
import {
  dateWindow,
  genderAllowed,
  levelInRange,
  MAX_LEVEL_GAP,
  MAX_MATCHES_PER_DAY,
  MIN_LEAD_MINUTES,
  rangeAllowedFor,
  tunisDay,
  tunisInstant,
  type Contact,
  type CreateMatchInput,
  type MatchDetail,
  type MatchRequest,
  type MatchSearch,
  type MatchSummary,
} from "@/lib/matches";
import { clubInArea } from "@/server/areas";
import { profileComplete } from "@/server/auth";
import { db } from "@/server/db";
import { deliver, type NotificationType } from "@/server/notify";

export const PAGE_SIZE = 12;

/** Refused action, with a message meant for the player. */
export class MatchError extends Error {}

type Tx = Parameters<Parameters<ReturnType<typeof db>["transaction"]>[0]>[0];

const creator = alias(players, "creator");

/**
 * A match created "members only" hides its players from visitors who aren't logged in: the
 * creator becomes a blank stand-in and `playersHidden` tells the page to leave players out.
 */
const forViewer = <T extends MatchSummary>(m: T, viewer: Player | null): T =>
  !viewer && m.membersOnly ? { ...m, creator: { id: "", name: "", avatarUrl: null, level: null }, playersHidden: true } : m;

const acceptedCounts = () =>
  db()
    .select({ matchId: matchPlayers.matchId, n: count().as("n") })
    .from(matchPlayers)
    .where(eq(matchPlayers.status, "accepted"))
    .groupBy(matchPlayers.matchId)
    .as("accepted_counts");

async function summaries(where: SQL | undefined, order: SQL[], limit?: number, offset = 0): Promise<MatchSummary[]> {
  const acc = acceptedCounts();
  const q = db()
    .select({
      id: matches.id,
      startsAt: matches.startsAt,
      endsAt: matches.endsAt,
      gender: matches.gender,
      levelMin: matches.levelMin,
      levelMax: matches.levelMax,
      spots: matches.spots,
      accepted: sql<number>`coalesce(${acc.n}, 0)`.mapWith(Number),
      status: matches.status,
      courtBooked: matches.courtBooked,
      membersOnly: matches.membersOnly,
      playersHidden: sql<boolean>`false`.mapWith(Boolean),
      club: { slug: clubs.slug, name: clubs.name, city: clubs.city, region: clubs.region, logoUrl: clubs.logoUrl },
      creator: { id: creator.id, name: creator.name, avatarUrl: creator.avatarUrl, level: creator.level },
    })
    .from(matches)
    .innerJoin(clubs, eq(clubs.id, matches.clubId))
    .innerJoin(creator, eq(creator.id, matches.creatorId))
    .leftJoin(acc, eq(acc.matchId, matches.id))
    .where(where)
    .orderBy(...order)
    .offset(offset);
  return limit ? q.limit(limit) : q;
}

/** Open, upcoming matches; with `level`, only those whose range includes it. */
export async function searchMatches(s: MatchSearch, viewer: Player | null) {
  const window = s.date ? dateWindow(s.date) : null;
  const now = new Date();
  const rows = await summaries(
    and(
      eq(matches.status, "open"),
      gt(matches.startsAt, window && window.from > now ? window.from : now),
      window ? lt(matches.startsAt, window.to) : undefined,
      clubInArea(s.city),
      s.level ? and(sql`${matches.levelMin} <= ${s.level}`, sql`${matches.levelMax} >= ${s.level}`) : undefined,
      s.gender === "mixed" ? eq(matches.gender, "mixed") : s.gender ? inArray(matches.gender, [s.gender, "mixed"]) : undefined,
    ),
    [asc(matches.startsAt)],
    PAGE_SIZE + 1,
    (s.page - 1) * PAGE_SIZE,
  );
  const page = rows.slice(0, PAGE_SIZE);
  return { matches: page.map((m) => forViewer(m, viewer)), hasMore: rows.length > PAGE_SIZE };
}

/** Cities that have clubs, and the clubs to pick from when creating a match. */
export async function clubChoices() {
  return db().select({ slug: clubs.slug, name: clubs.name, city: clubs.city, region: clubs.region }).from(clubs).orderBy(asc(clubs.city), asc(clubs.name));
}

const contactOf = (p: Pick<Player, "phone" | "phoneCountryCode">): Contact | null => (p.phone ? { phone: p.phone, phoneCountryCode: p.phoneCountryCode } : null);

/** Why `player` can't join `m` right now, or null when they can. */
function joinRefusal(player: Player, m: Match & { accepted: number }, now = new Date()): string | null {
  if (m.creatorId === player.id) return "C'est votre match.";
  if (m.status === "cancelled") return "Ce match a été annulé.";
  if (m.status === "played" || m.startsAt <= now) return "Ce match est passé.";
  if (m.status === "full" || m.accepted >= m.spots) return "Ce match est complet.";
  if (!profileComplete(player)) return "Complétez votre profil (téléphone, genre, niveau) pour rejoindre un match.";
  if (!levelInRange(player.level, m)) return `Ce match est pour les niveaux ${m.levelMin} à ${m.levelMax} (vous êtes niveau ${player.level}).`;
  if (!genderAllowed(player.gender, m.gender)) return m.gender === "male" ? "Ce match est réservé aux hommes." : "Ce match est réservé aux femmes.";
  return null;
}

export async function matchDetail(id: string, viewer: Player | null): Promise<MatchDetail | null> {
  const [summary] = await summaries(eq(matches.id, id), []);
  if (!summary) return null;
  const [m] = await db().select().from(matches).where(eq(matches.id, id));
  const [owner] = await db().select().from(players).where(eq(players.id, m!.creatorId));
  const rows = await db()
    .select({ mp: matchPlayers, p: players })
    .from(matchPlayers)
    .innerJoin(players, eq(players.id, matchPlayers.playerId))
    .where(eq(matchPlayers.matchId, id))
    .orderBy(asc(matchPlayers.requestedAt));

  const isCreator = viewer?.id === m!.creatorId;
  const mine = viewer ? rows.find((r) => r.p.id === viewer.id)?.mp : undefined;
  // Contacts are shared only among the players who will actually be on court.
  const inside = isCreator || mine?.status === "accepted";

  const list: MatchRequest[] = rows
    .filter((r) => r.mp.status === "accepted" || (isCreator && (r.mp.status === "pending" || r.mp.status === "rejected")))
    .map(({ mp, p }) => ({
      id: p.id,
      name: p.name,
      avatarUrl: p.avatarUrl,
      level: p.level,
      status: mp.status,
      levelAtJoin: mp.levelAtJoin,
      contact: inside && mp.status === "accepted" ? contactOf(p) : isCreator && mp.status === "pending" ? contactOf(p) : null,
    }));

  let viewerInfo: MatchDetail["viewer"] = null;
  if (viewer) {
    const refusal = joinRefusal(viewer, { ...m!, accepted: summary.accepted });
    const blocked = mine?.status === "pending" || mine?.status === "accepted" ? "Demande déjà envoyée." : mine?.status === "rejected" ? "Le créateur a refusé votre demande." : null;
    viewerInfo = {
      role: isCreator ? "creator" : mine?.status === "accepted" ? "player" : "none",
      status: mine?.status ?? null,
      canJoin: !isCreator && !refusal && !blocked,
      reason: isCreator ? null : (blocked ?? refusal),
    };
  }

  const shown = forViewer(summary, viewer);
  return { ...shown, note: m!.note, creatorContact: inside ? contactOf(owner!) : null, players: shown.playersHidden ? [] : list, viewer: viewerInfo };
}

/** Matches the player created or asked to join, newest first within upcoming / past. */
export async function myMatches(player: Player) {
  const joined = db().select({ id: matchPlayers.matchId }).from(matchPlayers).where(and(eq(matchPlayers.playerId, player.id), inArray(matchPlayers.status, ["pending", "accepted", "rejected"])));
  const [rows, statuses] = await Promise.all([
    summaries(or(eq(matches.creatorId, player.id), inArray(matches.id, joined)), [desc(matches.startsAt)], 100),
    db().select({ matchId: matchPlayers.matchId, status: matchPlayers.status }).from(matchPlayers).where(eq(matchPlayers.playerId, player.id)),
  ]);
  const mine = new Map(statuses.map((s) => [s.matchId, s.status]));
  return rows.map((m) => ({ ...m, myStatus: m.creator.id === player.id ? ("creator" as const) : (mine.get(m.id) ?? null) }));
}

/** Matches `playerId` will be on court for (created or accepted) that overlap [startsAt, endsAt). */
async function clash(tx: Tx, playerId: string, startsAt: Date, endsAt: Date, exceptId?: string) {
  const accepted = tx.select({ id: matchPlayers.matchId }).from(matchPlayers).where(and(eq(matchPlayers.playerId, playerId), eq(matchPlayers.status, "accepted")));
  const [row] = await tx
    .select({ id: matches.id })
    .from(matches)
    .where(
      and(
        or(eq(matches.creatorId, playerId), inArray(matches.id, accepted)),
        inArray(matches.status, ["open", "full"]),
        lt(matches.startsAt, endsAt),
        gt(matches.endsAt, startsAt),
        exceptId ? ne(matches.id, exceptId) : undefined,
      ),
    )
    .limit(1);
  return Boolean(row);
}

/** Queues one row per channel the player can be reached on; sent by deliver() after commit. */
async function queue(tx: Tx, type: NotificationType, matchId: string, playerIds: string[]) {
  if (playerIds.length === 0) return [];
  const targets = await tx.select({ id: players.id, email: players.email, phone: players.phone }).from(players).where(inArray(players.id, playerIds));
  const values = targets.flatMap((p) => [
    ...(p.email ? [{ playerId: p.id, matchId, type, channel: "email" }] : []),
    ...(p.phone ? [{ playerId: p.id, matchId, type, channel: "whatsapp" }] : []),
  ]);
  if (values.length === 0) return [];
  const rows = await tx.insert(notifications).values(values).returning({ id: notifications.id });
  return rows.map((r) => r.id);
}

async function lockMatch(tx: Tx, id: string) {
  const [m] = await tx.select().from(matches).where(eq(matches.id, id)).for("update");
  if (!m) throw new MatchError("Ce match n'existe plus.");
  const [acc] = await tx
    .select({ n: count() })
    .from(matchPlayers)
    .where(and(eq(matchPlayers.matchId, id), eq(matchPlayers.status, "accepted")));
  return { ...m, accepted: acc?.n ?? 0 };
}

/** Runs `fn` in a transaction, then sends the notifications it queued. */
async function withNotifications<T>(fn: (tx: Tx, notify: (type: NotificationType, matchId: string, ids: string[]) => Promise<void>) => Promise<T>) {
  const queued: number[] = [];
  const result = await db().transaction((tx) => fn(tx, async (type, matchId, ids) => void queued.push(...(await queue(tx, type, matchId, ids)))));
  // Fire and forget: a failed message is marked in the table, never fails the action.
  void deliver(queued);
  return result;
}

export async function createMatch(player: Player, input: CreateMatchInput) {
  if (!profileComplete(player)) throw new MatchError("Complétez votre profil (téléphone, genre, niveau) avant de créer un match.");
  if (!rangeAllowedFor(player.level, input))
    throw new MatchError(`Avec votre niveau (${player.level}), la fourchette va de ${Math.max(1, player.level - MAX_LEVEL_GAP)} à ${Math.min(8, player.level + MAX_LEVEL_GAP)}.`);
  if (!genderAllowed(player.gender, input.gender)) throw new MatchError("Choisissez votre genre ou un match mixte.");
  const startsAt = tunisInstant(input.date, input.start);
  const endsAt = new Date(startsAt.getTime() + input.durationMin * 60_000);
  if (startsAt.getTime() < Date.now() + MIN_LEAD_MINUTES * 60_000) throw new MatchError("Le match doit commencer dans au moins une heure.");
  if (startsAt.getTime() > Date.now() + 60 * 86_400_000) throw new MatchError("Le match doit avoir lieu dans les deux prochains mois.");

  const [club] = await db().select({ id: clubs.id }).from(clubs).where(eq(clubs.slug, input.clubSlug));
  if (!club) throw new MatchError("Club introuvable.");

  return db().transaction(async (tx) => {
    // Serializes a player's creations so the daily limit can't be passed by sending several at once.
    await tx.select({ id: players.id }).from(players).where(eq(players.id, player.id)).for("update");
    const day = tunisDay();
    const [today] = await tx
      .select({ n: count() })
      .from(matches)
      .where(and(eq(matches.creatorId, player.id), gte(matches.createdAt, day.from), lt(matches.createdAt, day.to)));
    if ((today?.n ?? 0) >= MAX_MATCHES_PER_DAY) throw new MatchError(`Vous avez déjà créé ${MAX_MATCHES_PER_DAY} matchs aujourd'hui.`);
    if (await clash(tx, player.id, startsAt, endsAt)) throw new MatchError("Vous avez déjà un match sur ce créneau.");
    const [created] = await tx
      .insert(matches)
      .values({
        creatorId: player.id,
        clubId: club.id,
        startsAt,
        endsAt,
        gender: input.gender,
        levelMin: input.levelMin,
        levelMax: input.levelMax,
        spots: input.spots,
        courtBooked: input.courtBooked,
        membersOnly: input.membersOnly,
        note: input.note || null,
      })
      .returning({ id: matches.id });
    return created!;
  });
}

export async function requestJoin(player: Player, matchId: string) {
  return withNotifications(async (tx, notify) => {
    const m = await lockMatch(tx, matchId);
    const refusal = joinRefusal(player, m);
    if (refusal) throw new MatchError(refusal);
    const [existing] = await tx.select().from(matchPlayers).where(and(eq(matchPlayers.matchId, matchId), eq(matchPlayers.playerId, player.id)));
    if (existing?.status === "pending" || existing?.status === "accepted") return { status: existing.status };
    // A refused player can't ask again: the creator already answered.
    if (existing?.status === "rejected" || existing?.status === "removed") throw new MatchError("Le créateur a refusé votre demande pour ce match.");
    if (await clash(tx, player.id, m.startsAt, m.endsAt, m.id)) throw new MatchError("Vous avez déjà un match sur ce créneau.");
    const values = { matchId, playerId: player.id, status: "pending" as const, levelAtJoin: player.level!, requestedAt: new Date(), respondedAt: null };
    // A player who left can ask again.
    await tx.insert(matchPlayers).values(values).onConflictDoUpdate({ target: [matchPlayers.matchId, matchPlayers.playerId], set: values });
    await notify("join_request", matchId, [m.creatorId]);
    return { status: "pending" as const };
  });
}

export async function reviewRequest(owner: Player, matchId: string, playerId: string, accept: boolean) {
  return withNotifications(async (tx, notify) => {
    const m = await lockMatch(tx, matchId);
    if (m.creatorId !== owner.id) throw new MatchError("Seul le créateur peut répondre aux demandes.");
    if (m.status === "cancelled" || m.status === "played") throw new MatchError("Ce match n'est plus ouvert.");
    const [req] = await tx.select().from(matchPlayers).where(and(eq(matchPlayers.matchId, matchId), eq(matchPlayers.playerId, playerId)));
    if (!req || req.status !== "pending") throw new MatchError("Cette demande n'est plus en attente.");

    if (!accept) {
      await tx.update(matchPlayers).set({ status: "rejected", respondedAt: new Date() }).where(eq(matchPlayers.id, req.id));
      await notify("request_rejected", matchId, [playerId]);
      return { full: false };
    }
    if (m.accepted >= m.spots) throw new MatchError("Le match est déjà complet.");
    if (await clash(tx, playerId, m.startsAt, m.endsAt, m.id)) throw new MatchError("Ce joueur a déjà un autre match sur ce créneau.");
    await tx.update(matchPlayers).set({ status: "accepted", respondedAt: new Date() }).where(eq(matchPlayers.id, req.id));
    await notify("request_accepted", matchId, [playerId]);

    const full = m.accepted + 1 >= m.spots;
    if (full) {
      await tx.update(matches).set({ status: "full" }).where(eq(matches.id, matchId));
      // The remaining requests can't be accepted any more: answer them now rather than leave them waiting.
      // They count as withdrawn ("left"), not refused, so they can ask again if a spot reopens.
      const closed = await tx
        .update(matchPlayers)
        .set({ status: "left", respondedAt: new Date() })
        .where(and(eq(matchPlayers.matchId, matchId), eq(matchPlayers.status, "pending")))
        .returning({ playerId: matchPlayers.playerId });
      await notify("match_full", matchId, closed.map((c) => c.playerId));
    }
    return { full };
  });
}

/** Withdraws a pending request, or leaves a match the player was accepted in. */
export async function leaveMatch(player: Player, matchId: string) {
  return withNotifications(async (tx, notify) => {
    const m = await lockMatch(tx, matchId);
    const [mine] = await tx.select().from(matchPlayers).where(and(eq(matchPlayers.matchId, matchId), eq(matchPlayers.playerId, player.id)));
    if (!mine || (mine.status !== "pending" && mine.status !== "accepted")) throw new MatchError("Vous ne faites pas partie de ce match.");
    if (m.startsAt <= new Date()) throw new MatchError("Le match a déjà commencé.");
    await tx.update(matchPlayers).set({ status: "left", respondedAt: new Date() }).where(eq(matchPlayers.id, mine.id));
    if (mine.status === "accepted" && m.status === "full") await tx.update(matches).set({ status: "open" }).where(eq(matches.id, matchId));
    await notify(mine.status === "accepted" ? "player_left" : "request_cancelled", matchId, [m.creatorId]);
    return { ok: true as const };
  });
}

/** The creator removes an accepted player (e.g. who no longer answers); the spot reopens. */
export async function removePlayer(owner: Player, matchId: string, playerId: string) {
  return withNotifications(async (tx, notify) => {
    const m = await lockMatch(tx, matchId);
    if (m.creatorId !== owner.id) throw new MatchError("Seul le créateur peut retirer un joueur.");
    const [req] = await tx.select().from(matchPlayers).where(and(eq(matchPlayers.matchId, matchId), eq(matchPlayers.playerId, playerId)));
    if (!req || req.status !== "accepted") throw new MatchError("Ce joueur ne fait pas partie du match.");
    await tx.update(matchPlayers).set({ status: "removed", respondedAt: new Date() }).where(eq(matchPlayers.id, req.id));
    if (m.status === "full") await tx.update(matches).set({ status: "open" }).where(eq(matches.id, matchId));
    await notify("request_rejected", matchId, [playerId]);
    return { ok: true as const };
  });
}

/** Soft cancel: the match stays in history, everyone still waiting or accepted is told. */
export async function cancelMatch(owner: Player, matchId: string) {
  return withNotifications(async (tx, notify) => {
    const m = await lockMatch(tx, matchId);
    if (m.creatorId !== owner.id) throw new MatchError("Seul le créateur peut annuler ce match.");
    if (m.status === "cancelled" || m.status === "played") throw new MatchError("Ce match n'est plus ouvert.");
    await tx.update(matches).set({ status: "cancelled", cancelledAt: new Date() }).where(eq(matches.id, matchId));
    const told = await tx
      .select({ playerId: matchPlayers.playerId })
      .from(matchPlayers)
      .where(and(eq(matchPlayers.matchId, matchId), inArray(matchPlayers.status, ["pending", "accepted"])));
    await notify("match_cancelled", matchId, told.map((t) => t.playerId));
    return { ok: true as const };
  });
}
