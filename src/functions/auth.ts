// Login through Supabase (Google). The OAuth exchange runs on the server so the session lands in cookies.
import { createServerFn } from "@tanstack/react-start";
import { getCookies, getRequestUrl, setCookie } from "@tanstack/react-start/server";
import { z } from "zod";

import { NEXT_COOKIE, safeNextPath } from "@/lib/matches";
import { currentPlayer, profileComplete } from "@/server/auth";
import { supabaseServer } from "@/server/supabase";

/** The viewing player, or null: what the header and the match pages need to know. */
export const getViewer = createServerFn().handler(async () => {
  const player = await currentPlayer();
  if (!player) return null;
  return { id: player.id, name: player.name, avatarUrl: player.avatarUrl, level: player.level, gender: player.gender, city: player.city, complete: profileComplete(player) };
});

/** Google's consent page URL; the browser goes there, then comes back to /auth/callback. */
export const startGoogleLogin = createServerFn({ method: "POST" })
  .validator(z.object({ next: z.string() }))
  .handler(async ({ data }) => {
    const origin = getRequestUrl({ xForwardedHost: true, xForwardedProto: true }).origin;
    // Supabase only returns to URLs on its allow list, matched exactly: keep the callback free of
    // query strings and carry the page to return to in a short-lived cookie instead.
    const redirectTo = `${origin}/auth/callback`;
    // Each attempt adds a per-flow PKCE cookie that is never cleared if the login is abandoned; they
    // pile up until the request headers pass the server limit (HTTP 431).
    for (const name of Object.keys(getCookies())) if (/^sb-.*-auth-token-flow-.*-code-verifier/.test(name)) setCookie(name, "", { path: "/", maxAge: 0 });
    setCookie(NEXT_COOKIE, safeNextPath(data.next), { path: "/", httpOnly: true, sameSite: "lax", maxAge: 600, secure: origin.startsWith("https:") });
    const { data: oauth, error } = await supabaseServer().auth.signInWithOAuth({ provider: "google", options: { redirectTo, skipBrowserRedirect: true } });
    if (error || !oauth.url) throw new Error("Connexion Google indisponible, réessayez.");
    return { url: oauth.url };
  });

export const signOut = createServerFn({ method: "POST" }).handler(async () => {
  await supabaseServer().auth.signOut();
  return { ok: true as const };
});
