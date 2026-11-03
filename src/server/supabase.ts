// Supabase is used only to log players in (Google); their data lives in our Postgres.
// Server-only: the session is kept in cookies so SSR loaders know who is viewing.
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { getCookies, setCookie } from "@tanstack/react-start/server";

export type CookieToSet = { name: string; value: string; options: CookieOptions };

/**
 * `sink` collects the cookies to set instead of writing them to the current response, for server
 * route handlers that build their own Response (the OAuth callback).
 */
export function supabaseServer(sink?: CookieToSet[]) {
  const raw = process.env["SUPABASE_URL"]?.trim();
  const key = process.env["SUPABASE_ANON_KEY"]?.trim();
  if (!raw || !key) throw new Error("SUPABASE_URL and SUPABASE_ANON_KEY must be set");
  // Accepts the project URL or just its ref ("abcdefghijklmnopqrst").
  const url = /^https?:\/\//.test(raw) ? raw : `https://${raw}.supabase.co`;
  return createServerClient(url, key, {
    auth: { flowType: "pkce" },
    cookies: {
      getAll: () => Object.entries(getCookies()).map(([name, value]) => ({ name, value })),
      setAll: (cookies) => {
        for (const c of cookies) {
          if (sink) sink.push(c);
          else setCookie(c.name, c.value, c.options);
        }
      },
    },
  });
}
