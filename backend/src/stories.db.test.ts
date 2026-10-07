import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { PrismaClient, type Artwork } from "@prisma/client";
import { buildApp } from "./app.js";
import { importDataset } from "./import/run.js";
import { imageRow, objectRow, source } from "./test/fixtures.js";
import type { Palette } from "./palette.js";
import type { Research, ResearchResult } from "./research.js";
import { StoryWriter } from "./stories.js";

const db = new PrismaClient();
afterAll(() => db.$disconnect());

beforeEach(async () => {
  await db.$executeRawUnsafe(
    "TRUNCATE artwork_stories, daily_set_items, daily_picks, artworks, dataset_imports RESTART IDENTITY CASCADE",
  );
});

const collection = (ids: number[]) =>
  source(
    ids.map((id) => imageRow({ uuid: `img-${id}`, objectId: id, alt: `Picture ${id}` })),
    ids.map((id) => objectRow({ objectId: id, title: `Work ${id}` })),
  );

const palette = async (): Promise<Palette> => ({ vibrant: "#c81e1e", muted: "#6e737d", dark: "#3a2f2a", light: "#e8dfa0", main: [] });
const usage = { inputTokens: 1, outputTokens: 1, cacheReadTokens: 0, searches: 1, estimatedCost: 0.01 };

/** Research that writes "The story of Work N", counting its calls. */
function fakeResearch(result?: (a: Artwork) => ResearchResult) {
  const calls: number[] = [];
  const research: Research = async (a) => {
    calls.push(a.objectId);
    await new Promise((r) => setTimeout(r, 20));
    return (
      result?.(a) ?? {
        story: {
          text: `The story of ${a.title}.`,
          sources: [{ title: "NGA", url: `https://www.nga.gov/${a.objectId}` }],
          model: "claude-opus-5-5",
        },
        usage,
      }
    );
  };
  return { research, calls };
}

const writer = (research: Research) => new StoryWriter(db, research, undefined, 0);

describe("story research", () => {
  it("researches today's artworks in the background, and serves their stories once written", async () => {
    await importDataset(db, collection([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]));
    const { research, calls } = fakeResearch();
    const stories = writer(research);
    const app = await buildApp({ db, palette, stories, now: () => new Date("2026-10-07T08:00:00Z") });

    const first = (await app.inject("/artworks/daily")).json();
    // Nobody waits for research: the first answer carries NGA's description only.
    expect(first.artworks.every((a: { story: unknown }) => a.story === null)).toBe(true);
    await stories.settled();
    expect(calls.sort((a, b) => a - b)).toEqual(first.artworks.map((a: { objectId: number }) => a.objectId).sort((a: number, b: number) => a - b));

    const later = (await app.inject("/artworks/daily")).json();
    const a = later.artworks[0];
    expect(a.story).toEqual({
      text: `The story of Work ${a.objectId}.`,
      sources: [{ title: "NGA", url: `https://www.nga.gov/${a.objectId}` }],
    });
    expect(a.description).toBe(`Picture ${a.objectId}`);
    await stories.settled();
    expect(calls).toHaveLength(10); // written once, never again
  });

  it("never researches the same artwork twice at once, even from two servers", async () => {
    await importDataset(db, collection([1, 2, 3]));
    const artworks = await db.artwork.findMany();
    const { research, calls } = fakeResearch();
    const one = writer(research);
    const two = writer(research);
    await Promise.all([one.queue(artworks), two.queue(artworks), one.queue(artworks)]);
    await Promise.all([one.settled(), two.settled()]);
    expect(calls.sort()).toEqual([1, 2, 3]);
  });

  it("retries a failed artwork only hours later, and gives up after three tries", async () => {
    await importDataset(db, collection([1]));
    const [artwork] = await db.artwork.findMany();
    const { research, calls } = fakeResearch(() => ({ story: null, usage, reason: "no sources cited" }));
    const stories = writer(research);

    await stories.queue([artwork]);
    await stories.settled();
    await stories.queue([artwork]);
    await stories.settled();
    expect(calls).toHaveLength(1); // too soon to try again

    for (let i = 0; i < 4; i++) {
      await db.artworkStory.update({ where: { objectId: 1 }, data: { attemptedAt: new Date("2026-01-01") } });
      await stories.queue([artwork]);
      await stories.settled();
    }
    expect(calls).toHaveLength(3);
    expect((await db.artworkStory.findUniqueOrThrow({ where: { objectId: 1 } })).story).toBeNull();
  });

  it("survives research throwing, and tries again later", async () => {
    await importDataset(db, collection([1]));
    const [artwork] = await db.artwork.findMany();
    const stories = writer(async () => {
      throw new Error("overloaded");
    });
    await stories.queue([artwork]);
    await stories.settled();
    expect((await db.artworkStory.findUniqueOrThrow({ where: { objectId: 1 } })).attempts).toBe(1);
  });

  it("does not research past days from /artworks/recent", async () => {
    await importDataset(db, collection([1, 2, 3]));
    const { research, calls } = fakeResearch();
    const stories = writer(research);
    const app = await buildApp({ db, palette, stories });
    expect((await app.inject("/artworks/recent")).statusCode).toBe(200);
    await stories.settled();
    expect(calls).toEqual([]);
  });

  it("is off without a writer: no stories, nothing researched", async () => {
    await importDataset(db, collection([1, 2, 3]));
    const app = await buildApp({ db, palette });
    const body = (await app.inject("/artworks/today")).json();
    expect(body.artwork.story).toBeNull();
    expect(await db.artworkStory.count()).toBe(0);
  });
});
