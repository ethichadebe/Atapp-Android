# Atapp

One artwork from the National Gallery of Art, Washington, every day.

This repository holds two versions:

- **Android** — the original app, in `app/` (Gradle, Java). It scrapes nga.gov
  pages at random and is kept as the reference for what the app does. It is not
  built or deployed from here.
- **Web** — `backend/` and `frontend/`, so iPhone users can use it too. It does
  not scrape anything: it serves the National Gallery's own
  [open data](https://github.com/NationalGalleryOfArt/opendata) (CC0) from our
  own database, and hotlinks their open-access images (CC0) from their IIIF
  image server.

## Web layout

| Path | What |
| --- | --- |
| `backend/` | Fastify + Prisma on Postgres. Listens on **3001**. |
| `backend/prisma/` | Schema and migrations. **Migrations must be additive** — see below. |
| `backend/src/import/` | The NGA CSV importer. |
| `frontend/` | React + Vite, served by nginx, which proxies `/api/*` to the backend. |
| `docker-compose.prod.yml` | Production stack: `postgres`, `backend`, `frontend`. |
| `.github/workflows/deploy.yml` | Deploys on merge to `main` via `ethichadebe/workflows`. |

### API

| Route | |
| --- | --- |
| `GET /health` | `{"status":"ok"}` |
| `GET /artworks/today` | `{"date":"YYYY-MM-DD","artwork":{…}}` — `artwork` is `null` until the first import. |
| `GET /artworks/recent?limit=10` | The days already shown, newest first. |

### Art of the day

A pure function of the date (`backend/src/dailyPick.ts`): every artwork is
scored by `sha256(day, objectId)` and the lowest wins. No scheduled job; every
visitor and every container gets the same answer. The day is the **UTC** date.
The first time a day is asked for, its pick is written to `daily_picks`, so a
dataset refresh later that day cannot change it.

### Colours

The Android app used the Palette API for a vibrant and a muted colour. The
backend does the same job (`backend/src/palette.ts`) on a 100px rendition from
IIIF the first time an artwork is served, and stores the result. The frontend
turns them into a theme with readable contrast (`frontend/src/colours.ts`).

## Running locally

```bash
npm ci
docker run -d --name atapp-db -e POSTGRES_USER=atapp -e POSTGRES_PASSWORD=atapp \
  -e POSTGRES_DB=atapp -p 127.0.0.1:5432:5432 postgres:16-alpine
export DATABASE_URL=postgresql://atapp:atapp@localhost:5432/atapp
npm run db:generate -w backend
npx -w backend prisma migrate deploy
npm run import -w backend     # downloads ~170 MB of CSV from NGA's GitHub, ~1 min
npm run dev                   # frontend on :5173, backend on :3001
```

## Checks

Run from the repo root:

- `npm run lint`
- `npm run typecheck` (run `npm run db:generate -w backend` first)
- `npm test` — frontend tests and the backend's pure suite
- `npm run test:db -w backend` — needs a Postgres with the migrations applied;
  set `DATABASE_URL_TEST` (default `postgresql://atapp:atapp@localhost:5432/atapp_test`)
- `npm run build`

## Deploying

Merging to `main` runs `.github/workflows/deploy.yml`, which hands over to
[`compose-deploy.yml`](https://github.com/ethichadebe/workflows/blob/main/docs/compose-destination.md):
CI builds both images, the server pulls them by digest, refuses any destructive
migration, checks a candidate on local-only ports (`/health` and
`/artworks/today` must return 200), and only then cuts over. The `postgres`
container is never recreated by a deploy.

**Migrations must be additive.** The candidate shares the live database, so a
migration that drops, renames, retypes or adds `NOT NULL` to an existing column
is refused. Add nullable columns or columns with defaults; do destructive steps
by hand, later. `backend/src/migrations.test.ts` applies the deploy's own check.

Server values live in `.env` beside `docker-compose.prod.yml` on the server;
`.env.example` lists them. Never commit a server address, IP or key.

### Loading and refreshing the collection

The importer is safe to run at any time: it upserts by NGA `objectid`, marks
artworks that left the dataset as removed (never deletes them), and refuses to
remove anything if an export looks truncated. On the server:

```bash
docker compose -f docker-compose.prod.yml run --rm --entrypoint node backend dist/import/cli.js
```

## Credit

Artwork images and data courtesy of the National Gallery of Art, Washington,
released under CC0. Credit is not required, but it is given. The National
Gallery's logo is not used, and this project is not affiliated with or endorsed
by the National Gallery of Art.
