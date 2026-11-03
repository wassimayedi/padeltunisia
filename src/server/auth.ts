// Who is viewing: the Supabase session (cookies) mapped to a row of `players`. Server-only.
import { setResponseStatus } from "@tanstack/react-start/server";
import { eq } from "drizzle-orm";

import { players, type Player } from "@/db/schema";
import { db } from "@/server/db";
import { supabaseServer } from "@/server/supabase";

export class AuthError extends Error {}

/** The logged-in player, created on first login from the Google profile; null when logged out. */
export async function currentPlayer(): Promise<Player | null> {
  // getUser() checks the token with Supabase (getSession() alone would trust the cookie).
  const { data, error } = await supabaseServer().auth.getUser();
  if (error || !data.user) return null;
  const user = data.user;

  const [existing] = await db().select().from(players).where(eq(players.authUserId, user.id)).limit(1);
  if (existing) return existing;

  const meta = user.user_metadata as { full_name?: string; name?: string; avatar_url?: string; picture?: string };
  const [created] = await db()
    .insert(players)
    .values({
      authUserId: user.id,
      email: user.email ?? null,
      name: meta.full_name ?? meta.name ?? user.email?.split("@")[0] ?? "Joueur",
      avatarUrl: meta.avatar_url ?? meta.picture ?? null,
    })
    // Two first requests at once: the other one inserted the row.
    .onConflictDoUpdate({ target: players.authUserId, set: { email: user.email ?? null } })
    .returning();
  return created!;
}

export async function requirePlayer(): Promise<Player> {
  const player = await currentPlayer();
  if (!player) {
    setResponseStatus(401);
    throw new AuthError("Connectez-vous pour continuer.");
  }
  return player;
}

export const profileComplete = (p: Player): p is Player & { phone: string; gender: NonNullable<Player["gender"]>; level: number } =>
  p.profileCompletedAt !== null && p.phone !== null && p.gender !== null && p.level !== null;
