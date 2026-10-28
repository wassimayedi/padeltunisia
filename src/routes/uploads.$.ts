import { createFileRoute } from "@tanstack/react-router";

// Images added by the MCP tools (scripts/mcp), stored outside the build in UPLOADS_DIR. Names carry a
// content hash, so they are cached for good.
export const Route = createFileRoute("/uploads/$")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const path = params._splat ?? "";
        if (!/^(events|news|magazine)\/[a-z0-9-]+\.webp$/.test(path))
          return new Response("Not found", { status: 404 });
        const { readFile } = await import("node:fs/promises");
        const { join } = await import("node:path");
        try {
          const file = await readFile(join(process.env["UPLOADS_DIR"] ?? "uploads", path));
          return new Response(file, {
            headers: {
              "content-type": "image/webp",
              "cache-control": "public, max-age=31536000, immutable",
            },
          });
        } catch {
          return new Response("Not found", { status: 404 });
        }
      },
    },
  },
});
