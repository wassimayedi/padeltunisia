// Server functions for the available players (/joueurs) (see functions/clubs.ts for the pattern).
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { availablePlayersSchema, setAvailabilitySchema } from "@/lib/players";
import { currentPlayer, requirePlayer } from "@/server/auth";
import { availablePlayersFor, myAvailability, playerContact, setAvailable, stopAvailable } from "@/server/players";

/**
 * The list, for logged-in players only: null for visitors, before any query, so names, cities and
 * clubs never leave the server without a session. Filters left out of the URL come from the profile.
 */
export const getAvailablePlayers = createServerFn()
  .validator(availablePlayersSchema)
  .handler(async ({ data }) => availablePlayersFor(data, await currentPlayer()));

/** The viewer's own state; null for visitors who aren't logged in. */
export const getMyAvailability = createServerFn().handler(async () => {
  const player = await currentPlayer();
  return player ? myAvailability(player) : null;
});

export const makeMeAvailable = createServerFn({ method: "POST" })
  .validator(setAvailabilitySchema)
  .handler(async ({ data }) => setAvailable(await requirePlayer(), data.anonymous, data.clubSlugs, data.note));

export const stopMyAvailability = createServerFn({ method: "POST" }).handler(async () => stopAvailable(await requirePlayer()));

/** POST so the number is never cached; members with a complete profile only (see playerContact). */
export const getPlayerContact = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => playerContact(await requirePlayer(), data.id));
