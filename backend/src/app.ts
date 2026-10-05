import Fastify from "fastify";
import type { PrismaClient } from "@prisma/client";
import { prisma as defaultDb } from "./db.js";
import { dayKey, pickForDay, recentPicks } from "./dailyPick.js";
import { ensureColours, toDto } from "./artwork.js";
import type { fetchPalette } from "./palette.js";

// Paths are served without a prefix; the frontend's nginx maps /api/* here.
// The deploy probes GET /health and GET /artworks/today on the candidate
// container and needs a 200 from both before any cutover.

export interface AppOptions {
  logger?: boolean;
  db?: PrismaClient;
  now?: () => Date;
  palette?: typeof fetchPalette;
}

export async function buildApp(opts: AppOptions = {}) {
  const app = Fastify({ logger: opts.logger ?? false });
  const db = opts.db ?? defaultDb;
  const now = opts.now ?? (() => new Date());

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
      artwork: artwork ? toDto(await ensureColours(db, artwork, opts.palette)) : null,
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
    return {
      days: await Promise.all(
        picks.map(async (p) => ({
          date: dayKey(p.day),
          artwork: toDto(await ensureColours(db, p.artwork, opts.palette)),
        })),
      ),
    };
  });

  return app;
}
