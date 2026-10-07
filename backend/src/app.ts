import Fastify from "fastify";
import type { Artwork, PrismaClient } from "@prisma/client";
import { prisma as defaultDb } from "./db.js";
import { dayKey, pickForDay, recentPicks, setForDay } from "./dailyPick.js";
import { ensureColours, toDto } from "./artwork.js";
import type { fetchPalette } from "./palette.js";
import { storiesFor, type StoryWriter } from "./stories.js";

// Paths are served without a prefix; the frontend's nginx maps /api/* here.
// The deploy probes GET /health and GET /artworks/today on the candidate
// container and needs a 200 from both before any cutover.

export interface AppOptions {
  logger?: boolean;
  db?: PrismaClient;
  now?: () => Date;
  palette?: typeof fetchPalette;
  /** Researches the stories behind artworks as they are served. Off when null. */
  stories?: StoryWriter | null;
}

export async function buildApp(opts: AppOptions = {}) {
  const app = Fastify({ logger: opts.logger ?? false });
  const db = opts.db ?? defaultDb;
  const now = opts.now ?? (() => new Date());
  if (opts.stories) opts.stories.log = app.log;

  // Artworks with their colours and any written stories, ready to send. With
  // `research`, the ones without a story are queued for it, in the background.
  async function present(artworks: Artwork[], research = true) {
    if (research) opts.stories?.queue(artworks).catch((err: unknown) => app.log.warn({ err }, "could not queue stories"));
    const stories = await storiesFor(db, artworks.map((a) => a.objectId));
    return Promise.all(
      artworks.map(async (a) => toDto(await ensureColours(db, a, opts.palette), stories.get(a.objectId) ?? null)),
    );
  }

  app.get("/health", async () => ({ status: "ok" }));

  // 200 whenever the database answers, even before the first import: an empty
  // collection is a state to show, not a broken server. `artwork` is null then.
  app.get("/artworks/today", async (_req, reply) => {
    const day = dayKey(now());
    const artwork = await pickForDay(db, day);
    // Changes at 00:00 UTC; let browsers and proxies hold it briefly only.
    reply.header("Cache-Control", "public, max-age=300");
    return {
      date: day,
      artwork: artwork ? (await present([artwork]))[0] : null,
    };
  });

  // Today's 10: the slider. Same for everyone all day; position 0 is the art
  // of the day. An empty list before the first import.
  app.get("/artworks/daily", async (_req, reply) => {
    const day = dayKey(now());
    const set = await setForDay(db, day);
    reply.header("Cache-Control", "public, max-age=300");
    return {
      date: day,
      artworks: await present(set),
    };
  });

  // The days already shown, newest first — the web version of the old app's
  // swipeable row of ten pieces.
  app.get<{ Querystring: { limit?: string } }>("/artworks/recent", async (req, reply) => {
    const limit = Math.min(Math.max(Number.parseInt(req.query.limit ?? "10", 10) || 10, 1), 30);
    const today = dayKey(now());
    // Make sure today is pinned before listing, so the list always starts there.
    await pickForDay(db, today);
    const picks = await recentPicks(db, today, limit);
    reply.header("Cache-Control", "public, max-age=300");
    // Past days are not researched from here: only what the app shows is.
    const artworks = await present(picks.map((p) => p.artwork), false);
    return { days: picks.map((p, i) => ({ date: dayKey(p.day), artwork: artworks[i] })) };
  });

  return app;
}
