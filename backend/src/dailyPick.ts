import { createHash } from "node:crypto";
import type { PrismaClient } from "@prisma/client";

// The art of the day is a pure function of the date: every artwork gets a
// score from hash(day, objectId), and the lowest score wins. Nothing has to run
// at midnight, and every visitor — and every container, the deploy candidate
// included — arrives at the same answer.
//
// Scoring each artwork independently (rendezvous hashing), rather than taking
// `hash(day) % count`, matters when the dataset is refreshed: adding or
// removing an artwork changes the day's winner only if that artwork *is* the
// winner, instead of reshuffling every day at once.
//
// The day is the UTC calendar date, so the piece changes at 00:00 UTC for
// everyone.

/** "YYYY-MM-DD" for the UTC calendar day containing `now`. */
export function dayKey(now: Date): string {
  return now.toISOString().slice(0, 10);
}

export function isDayKey(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && dayKey(parsed) === value;
}

function score(day: string, objectId: number): string {
  return createHash("sha256").update(`atapp:${day}:${objectId}`).digest("hex");
}

/**
 * The day's `n` artworks: the lowest `n` scores, best first. Position 0 is
 * the same piece `pickObjectId` chooses.
 */
export function pickObjectIds(day: string, objectIds: Iterable<number>, n: number): number[] {
  return [...objectIds]
    .map((id) => ({ id, s: score(day, id) }))
    .sort((a, b) => (a.s < b.s ? -1 : a.s > b.s ? 1 : a.id - b.id))
    .slice(0, n)
    .map((x) => x.id);
}

/** The winning objectId for `day`, or null when there is nothing to pick from. */
export function pickObjectId(day: string, objectIds: Iterable<number>): number | null {
  let best: number | null = null;
  let bestScore = "";
  for (const id of objectIds) {
    const s = score(day, id);
    if (best === null || s < bestScore || (s === bestScore && id < best)) {
      best = id;
      bestScore = s;
    }
  }
  return best;
}

/**
 * The pick for `day`, computing and pinning it if nobody has asked yet.
 * Returns null only when the collection is empty (nothing imported yet).
 *
 * Two requests racing on the first visit of the day compute the same answer,
 * so whichever insert loses the race changes nothing.
 */
export async function pickForDay(db: PrismaClient, day: string) {
  const date = new Date(`${day}T00:00:00Z`);
  const pinned = await db.dailyPick.findUnique({ where: { day: date }, include: { artwork: true } });
  if (pinned) return pinned.artwork;

  const rows = await db.artwork.findMany({ where: { removedAt: null }, select: { objectId: true } });
  const objectId = pickObjectId(day, rows.map((r) => r.objectId));
  if (objectId === null) return null;

  await db.dailyPick.createMany({ data: [{ day: date, objectId }], skipDuplicates: true });
  const stored = await db.dailyPick.findUniqueOrThrow({ where: { day: date }, include: { artwork: true } });
  return stored.artwork;
}

export const SET_SIZE = 10;

/**
 * The day's set of artworks, computing and pinning it if nobody has asked
 * yet. Starts with the day's art of the day (pinned first if need be), so
 * the slider and /artworks/today always agree. Empty only before the first
 * import.
 */
export async function setForDay(db: PrismaClient, day: string, size = SET_SIZE) {
  const date = new Date(`${day}T00:00:00Z`);
  const pinned = await db.dailySetItem.findMany({ where: { day: date }, orderBy: { position: "asc" }, include: { artwork: true } });
  if (pinned.length > 0) return pinned.map((p) => p.artwork);

  const first = await pickForDay(db, day);
  if (!first) return [];
  const rows = await db.artwork.findMany({ where: { removedAt: null }, select: { objectId: true } });
  const rest = pickObjectIds(day, rows.map((r) => r.objectId).filter((id) => id !== first.objectId), size - 1);
  const ids = [first.objectId, ...rest];
  await db.dailySetItem.createMany({
    data: ids.map((objectId, position) => ({ day: date, position, objectId })),
    skipDuplicates: true,
  });
  const stored = await db.dailySetItem.findMany({ where: { day: date }, orderBy: { position: "asc" }, include: { artwork: true } });
  return stored.map((p) => p.artwork);
}

/** Days already pinned, newest first, up to and including `today`. */
export async function recentPicks(db: PrismaClient, today: string, limit: number) {
  return db.dailyPick.findMany({
    where: { day: { lte: new Date(`${today}T00:00:00Z`) } },
    orderBy: { day: "desc" },
    take: limit,
    include: { artwork: true },
  });
}
