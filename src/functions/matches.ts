// Server functions for "Trouver un match" (see functions/clubs.ts for the pattern).
import { createServerFn } from "@tanstack/react-start";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { players } from "@/db/schema";
import { createMatchSchema, profileSchema, searchSchema, withProfileDefaults } from "@/lib/matches";
import { currentPlayer, profileComplete, requirePlayer } from "@/server/auth";
import { db } from "@/server/db";
import {
  cancelMatch as cancel,
  clubChoices,
  createMatch as create,
  leaveMatch as leave,
  matchDetail,
  myMatches,
  removePlayer as remove,
  requestJoin,
  reviewRequest,
  searchMatches,
} from "@/server/matches";

const matchId = z.object({ id: z.string().uuid() });

export const getMatches = createServerFn()
  .validator(searchSchema)
  .handler(async ({ data }) => {
    const viewer = await currentPlayer();
    const filters = withProfileDefaults(data, viewer);
    const [result, clubList] = await Promise.all([searchMatches(filters, viewer), clubChoices()]);
    return { ...result, filters, clubs: clubList };
  });

/** Clubs to pick from on /matchs/creer. */
export const getClubChoices = createServerFn().handler(() => clubChoices());

export const getMatch = createServerFn()
  .validator(matchId)
  .handler(async ({ data }) => matchDetail(data.id, await currentPlayer()));

export const getMyMatches = createServerFn().handler(async () => myMatches(await requirePlayer()));

export const createMatch = createServerFn({ method: "POST" })
  .validator(createMatchSchema)
  .handler(async ({ data }) => create(await requirePlayer(), data));

export const joinMatch = createServerFn({ method: "POST" })
  .validator(matchId)
  .handler(async ({ data }) => requestJoin(await requirePlayer(), data.id));

export const leaveMatch = createServerFn({ method: "POST" })
  .validator(matchId)
  .handler(async ({ data }) => leave(await requirePlayer(), data.id));

export const cancelMatch = createServerFn({ method: "POST" })
  .validator(matchId)
  .handler(async ({ data }) => cancel(await requirePlayer(), data.id));

export const reviewJoin = createServerFn({ method: "POST" })
  .validator(matchId.extend({ playerId: z.string().uuid(), accept: z.boolean() }))
  .handler(async ({ data }) => reviewRequest(await requirePlayer(), data.id, data.playerId, data.accept));

export const removeMatchPlayer = createServerFn({ method: "POST" })
  .validator(matchId.extend({ playerId: z.string().uuid() }))
  .handler(async ({ data }) => remove(await requirePlayer(), data.id, data.playerId));

export const getMyProfile = createServerFn().handler(async () => {
  const p = await requirePlayer();
  return {
    name: p.name,
    email: p.email,
    avatarUrl: p.avatarUrl,
    phone: p.phone ?? "",
    phoneCountryCode: p.phoneCountryCode,
    gender: p.gender,
    level: p.level,
    region: p.region ?? "",
    city: p.city ?? "",
    complete: profileComplete(p),
    updatedAt: p.updatedAt,
    clubs: await clubChoices(),
  };
});

export const updateMyProfile = createServerFn({ method: "POST" })
  .validator(profileSchema)
  .handler(async ({ data }) => {
    const p = await requirePlayer();
    await db()
      .update(players)
      .set({
        name: data.name,
        phone: data.phone.replace(/\s/g, ""),
        phoneCountryCode: data.phoneCountryCode,
        gender: data.gender,
        level: data.level,
        region: data.region || null,
        city: data.city || null,
        profileCompletedAt: p.profileCompletedAt ?? new Date(),
      })
      .where(eq(players.id, p.id));
    return { ok: true as const };
  });
