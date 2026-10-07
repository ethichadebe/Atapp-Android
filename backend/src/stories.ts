import type { Artwork, PrismaClient } from "@prisma/client";
import type { Research, Source } from "./research.js";

// Researches the stories behind the artworks being shown, in the background,
// a couple at a time. Nobody waits for it: until a story is written the app
// shows NGA's own description, and once written it is kept for good.
//
// Each artwork is claimed in the database before it is researched, so two
// servers (a deploy runs a second one briefly) never pay for the same work. A
// failed attempt is retried RETRY_AFTER later, at most MAX_ATTEMPTS times.

const CONCURRENCY = 2;
const MAX_ATTEMPTS = 3;
const RETRY_AFTER = "6 hours";
// A deploy test-runs each new backend for a moment before swapping it in, with
// the same .env. Holding off research for a newly started server keeps that
// short-lived candidate from starting work it would be killed in the middle of.
const START_AFTER_MS = 3 * 60 * 1000;

export interface StoryDto {
  text: string;
  sources: Source[];
}

export interface Logger {
  info(obj: object, msg: string): void;
  warn(obj: object, msg: string): void;
}

/** The written stories for these artworks, by objectId. */
export async function storiesFor(db: PrismaClient, objectIds: number[]): Promise<Map<number, StoryDto>> {
  if (objectIds.length === 0) return new Map();
  const rows = await db.artworkStory.findMany({ where: { objectId: { in: objectIds }, story: { not: null } } });
  return new Map(rows.map((r) => [r.objectId, { text: r.story!, sources: (r.sources ?? []) as unknown as Source[] }]));
}

export class StoryWriter {
  private waiting: Artwork[] = [];
  private queued = new Set<number>();
  private running = 0;
  private idle: (() => void)[] = [];
  private startsAt: number;
  private wake: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private db: PrismaClient,
    private research: Research,
    /** Replaced by the server's own logger once it exists. */
    public log: Logger = { info: () => {}, warn: () => {} },
    startAfterMs = START_AFTER_MS,
  ) {
    this.startsAt = Date.now() + startAfterMs;
  }

  /** Research these artworks' stories, if they have none yet. Returns at once. */
  async queue(artworks: Artwork[]): Promise<void> {
    const ids = artworks.map((a) => a.objectId).filter((id) => !this.queued.has(id));
    if (ids.length === 0) return;
    const done = new Set(
      (await this.db.artworkStory.findMany({
        where: { objectId: { in: ids }, OR: [{ story: { not: null } }, { attempts: { gte: MAX_ATTEMPTS } }] },
        select: { objectId: true },
      })).map((r) => r.objectId),
    );
    for (const a of artworks) {
      if (done.has(a.objectId) || this.queued.has(a.objectId)) continue;
      this.queued.add(a.objectId);
      this.waiting.push(a);
    }
    this.pump();
  }

  /** Resolves when nothing is queued or running. For tests and shutdown. */
  settled(): Promise<void> {
    if (this.running === 0 && this.waiting.length === 0) return Promise.resolve();
    return new Promise((resolve) => this.idle.push(resolve));
  }

  private pump() {
    const wait = this.startsAt - Date.now();
    if (wait > 0) {
      this.wake ??= setTimeout(() => {
        this.wake = null;
        this.pump();
      }, wait);
      this.wake.unref?.();
      return;
    }
    while (this.running < CONCURRENCY && this.waiting.length > 0) {
      const artwork = this.waiting.shift()!;
      this.running++;
      this.write(artwork)
        .catch((err: unknown) => this.log.warn({ objectId: artwork.objectId, err }, "story research failed"))
        .finally(() => {
          this.running--;
          this.queued.delete(artwork.objectId);
          this.pump();
          if (this.running === 0 && this.waiting.length === 0) this.idle.splice(0).forEach((r) => r());
        });
    }
  }

  /** Take the artwork for this server, unless it is written, given up on, or recently tried. */
  private async claim(objectId: number): Promise<boolean> {
    const rows = await this.db.$queryRaw<{ object_id: number }[]>`
      INSERT INTO artwork_stories (object_id, attempts, attempted_at)
      VALUES (${objectId}, 1, now())
      ON CONFLICT (object_id) DO UPDATE SET
        attempts = artwork_stories.attempts + 1,
        attempted_at = now()
      WHERE artwork_stories.story IS NULL
        AND artwork_stories.attempts < ${MAX_ATTEMPTS}
        AND artwork_stories.attempted_at < now() - ${RETRY_AFTER}::interval
      RETURNING object_id`;
    return rows.length > 0;
  }

  private async write(artwork: Artwork) {
    if (!(await this.claim(artwork.objectId))) return;
    const started = Date.now();
    const { story, usage, reason } = await this.research(artwork);
    const seconds = Math.round((Date.now() - started) / 1000);
    if (!story) {
      this.log.warn({ objectId: artwork.objectId, reason, usage, seconds }, "no story written");
      return;
    }
    await this.db.artworkStory.update({
      where: { objectId: artwork.objectId },
      data: { story: story.text, sources: story.sources as object[], model: story.model, writtenAt: new Date() },
    });
    this.log.info({ objectId: artwork.objectId, usage, seconds, sources: story.sources.length }, "story written");
  }
}
