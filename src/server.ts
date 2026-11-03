import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

// Let a CDN (Cloudflare) cache rendered pages: fresh for 5 minutes, then served stale
// for up to a day while it refetches in the background. Browsers always revalidate.
const PAGE_CACHE_CONTROL = "public, max-age=0, s-maxage=300, stale-while-revalidate=86400";

// Pages that depend on who is viewing (player names and contacts are for members only), and any
// page requested with a Supabase session cookie, must never be stored by the CDN.
const PERSONAL_PATHS = /^\/(matchs|mes-matchs|profil|connexion)(\/|$)/;
const SESSION_COOKIE = /(^|;\s*)sb-[^=]*-auth-token/;

function withCacheHeaders(request: Request, response: Response): Response {
  const isPage = (response.headers.get("content-type") ?? "").includes("text/html");
  if (request.method !== "GET" || response.status !== 200 || !isPage || response.headers.has("cache-control")) return response;
  const personal = PERSONAL_PATHS.test(new URL(request.url).pathname) || SESSION_COOKIE.test(request.headers.get("cookie") ?? "");
  const cached = new Response(response.body, response);
  cached.headers.set("cache-control", personal ? "private, no-store" : PAGE_CACHE_CONTROL);
  return cached;
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return withCacheHeaders(request, await normalizeCatastrophicSsrResponse(response));
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};
