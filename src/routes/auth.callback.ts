import { createFileRoute } from "@tanstack/react-router";

import { NEXT_COOKIE, safeNextPath } from "@/lib/matches";
import type { CookieToSet } from "@/server/supabase";

// Google sends players back here (through Supabase) with a one-time code; the session is stored in cookies.
export const Route = createFileRoute("/auth/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        // Imported inside the handler so the auth code stays out of the client bundle.
        const { supabaseServer } = await import("@/server/supabase");
        const { serializeCookieHeader } = await import("@supabase/ssr");
        const { getCookie, getCookies } = await import("@tanstack/react-start/server");
        const url = new URL(request.url);
        const next = safeNextPath(getCookie(NEXT_COOKIE));
        const code = url.searchParams.get("code");
        const clear = { path: "/", maxAge: 0 };
        // The login is over either way: drop the return path and every PKCE verifier left by earlier attempts.
        const stale = Object.keys(getCookies()).filter((n) => /^sb-.*-auth-token-flow-.*-code-verifier/.test(n));
        const cookies: CookieToSet[] = [NEXT_COOKIE, ...stale].map((name) => ({ name, value: "", options: clear }));
        let target = next;
        const { error } = code ? await supabaseServer(cookies).auth.exchangeCodeForSession(code) : { error: true };
        if (error) target = `/connexion?erreur=1&next=${encodeURIComponent(next)}`;
        const headers = new Headers({ location: target, "cache-control": "no-store" });
        for (const c of cookies) headers.append("set-cookie", serializeCookieHeader(c.name, c.value, c.options));
        return new Response(null, { status: 302, headers });
      },
    },
  },
});
