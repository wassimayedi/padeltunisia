// Public runtime settings read from the server environment (not baked in at build time).
import { createServerFn } from "@tanstack/react-start";

export const getPublicConfig = createServerFn().handler(() => {
  const raw = process.env["GA_ID"]?.trim();
  // Production only, so local development doesn't pollute the statistics. The format check
  // also keeps anything unexpected out of the inline script it is written into.
  const gaId = process.env["NODE_ENV"] === "production" && raw && /^G-[A-Z0-9]+$/.test(raw) ? raw : null;
  return { gaId };
});
