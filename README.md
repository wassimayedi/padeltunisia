# Padel Tunisia

## Development

You need Node.js 22.18+ (or [Bun](https://bun.sh)) and Docker for the database.

```sh
git clone <this-repository-url>
cd padeltunisia
npm install
cp .env.example .env        # then set a password in both lines
docker compose up -d padeltunisia-db   # Postgres on localhost:5433
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

`docker-compose.yml` runs Postgres (`padeltunisia-db`, host port 5433) and serves the app over plain HTTP on port 3006. Cloudflare can't proxy straight to port 3006, so put a reverse proxy on the server (nginx, Caddy, Traefik…) that forwards the domain to `localhost:3006`, or use a Cloudflare Tunnel pointing at `http://localhost:3006`.

On the server, create a `.env` with a strong `POSTGRES_PASSWORD`, then:

```sh
docker compose up -d --build
npm run db:migrate && npm run db:seed   # first deploy, and after any schema change
```

Migrations aren't applied automatically: run `npm run db:migrate` (from the project folder, with `DATABASE_URL` pointing at `localhost:5433`) whenever a deploy adds files in `drizzle/`. To deploy an update, pull the new code and run the same commands again. Database data persists in the `pgdata` volume.

### Contact messages

The `/contact` form stores messages in the `contact_messages` table (status `new` → `read` → `done`). Read them with `npm run db:studio`, or on the server:

```sh
docker compose exec padeltunisia-db psql -U padel -d padeltunisia -c "select id, created_at, topic, name, email, phone, organization, message from contact_messages where status = 'new' order by created_at"
```

Spam protection: hidden honeypot field, 3-second minimum fill time, and at most 5 messages per hour per IP (stored only as a salted SHA-256 hash). The privacy page promises deletion after 12 months.

### Backups

No automatic backups. Take a dump by hand when needed:

```sh
mkdir -p backups && docker compose exec -T padeltunisia-db pg_dump -U padel -d padeltunisia | gzip > backups/padeltunisia-$(date +%F).sql.gz
```

Restore a dump:

```sh
gunzip -c backups/padeltunisia-2026-10-25.sql.gz | docker compose exec -T padeltunisia-db psql -U padel -d padeltunisia
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
