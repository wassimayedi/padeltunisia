import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        // Imported inside the handler so the DB code stays out of the client bundle.
        const { sitemapXml } = await import("@/server/sitemap");
        return new Response(await sitemapXml(), {
          headers: { "content-type": "application/xml; charset=utf-8", "cache-control": "public, max-age=0, s-maxage=3600" },
        });
      },
    },
  },
});
