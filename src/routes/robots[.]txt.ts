import { createFileRoute } from "@tanstack/react-router";

import { absoluteUrl } from "@/lib/site";

export const Route = createFileRoute("/robots.txt")({
  server: {
    handlers: {
      GET: () =>
        new Response(["User-agent: *", "Allow: /", "Disallow: /_serverFn/", "", `Sitemap: ${absoluteUrl("/sitemap.xml")}`, ""].join("\n"), {
          headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=0, s-maxage=86400" },
        }),
    },
  },
});
