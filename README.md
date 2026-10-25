# Padel Tunisia

## Development

You need Node.js 22.18+ (or [Bun](https://bun.sh)) and Docker for the database.

```sh
git clone <this-repository-url>
cd padeltunisia
npm install
cp .env.example .env        # then set a password in both lines
docker compose up -d db     # Postgres on localhost:5432
npm run db:migrate          # create tables
npm run db:seed             # load clubs, events and news
npm run dev
```

The dev server runs on http://localhost:8080.

### Database

Postgres with [Drizzle ORM](https://orm.drizzle.team). The schema is in `src/db/schema.ts`, the SQL migrations in `drizzle/`.

| Command | What it does |
|---|---|
| `npm run db:generate` | Create a migration after editing the schema |
| `npm run db:migrate` | Apply pending migrations |
| `npm run db:seed` | Insert clubs, events and news from `src/db/seed/*.json` (skips existing ones) |
| `npm run db:studio` | Browse and edit data in Drizzle Studio |

## Build & deploy

```sh
npm run build
```

The server bundle is produced by [Nitro](https://nitro.build). The deploy target is auto-detected on Vercel, Netlify and Cloudflare, or can be set with the `NITRO_PRESET` environment variable (it defaults to a Node.js server in `.output/`).

### Docker

`docker-compose.yml` runs Postgres, applies migrations and the seed, then serves the app over plain HTTP on port 80. HTTPS is handled by Cloudflare: the domain's DNS record points at the server with the proxy (orange cloud) enabled, and SSL/TLS mode is set to **Flexible**.

On the server, create a `.env` with a strong `POSTGRES_PASSWORD`, then:

```sh
docker compose up -d --build
```

To deploy an update, pull the new code and run the same command again. Database data persists in the `pgdata` volume.

### Backups

The `backup` service writes `backups/padeltunisia-YYYY-MM-DD.sql.gz` every day and keeps 14 days. Copy that folder off the server (e.g. a nightly `rsync` or `rclone` to another machine or cloud storage): a backup on the same disk doesn't survive a lost server.

Restore a dump:

```sh
gunzip -c backups/padeltunisia-2026-10-25.sql.gz | docker compose exec -T db psql -U padel -d padeltunisia
```

### SEO & caching

- `/sitemap.xml` and `/robots.txt` are generated from the database. Submit `https://<domain>/sitemap.xml` in Google Search Console.
- Rendered pages send `Cache-Control: public, max-age=0, s-maxage=300, stale-while-revalidate=86400`. Cloudflare doesn't cache HTML by default: add a **Cache Rule** (Caching → Cache Rules) matching the site's hostname, with *Eligible for cache* and *Edge TTL: use cache-control header if present*. Exclude `/_serverFn/*`.
- City pages (`/clubs/ville/:city`) are indexed only for cities with at least 2 clubs; smaller ones are `noindex` and left out of the sitemap.

## Built with

- TanStack Start
- TypeScript
- React
- Tailwind CSS
- PostgreSQL + Drizzle ORM
