# --- Build: install with the Bun lockfile and produce the Nitro .output bundle ---
FROM oven/bun:1.3.5 AS build
WORKDIR /app
COPY package.json bun.lock bunfig.toml ./
RUN bun install --frozen-lockfile
COPY . .
ENV NITRO_PRESET=node-server
# Public origin baked into canonical URLs and structured data.
ARG VITE_SITE_URL
ENV VITE_SITE_URL=$VITE_SITE_URL
RUN bun run build

# --- Runtime: .output is self-contained, so only Node is needed ---
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3000
COPY --from=build --chown=node:node /app/.output ./
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/ >/dev/null || exit 1
CMD ["node", "server/index.mjs"]
