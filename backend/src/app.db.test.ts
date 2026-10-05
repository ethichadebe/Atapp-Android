import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import { buildApp } from "./app.js";
import { importDataset } from "./import/run.js";
import { imageRow, objectRow, source } from "./test/fixtures.js";
import type { Palette } from "./palette.js";

const db = new PrismaClient();
afterAll(() => db.$disconnect());

beforeEach(async () => {
  await db.$executeRawUnsafe("TRUNCATE daily_picks, artworks, dataset_imports RESTART IDENTITY CASCADE");
});

const collection = (ids: number[]) =>
  source(
    ids.map((id) => imageRow({ uuid: `img-${id}`, objectId: id, alt: `Picture ${id}` })),
    ids.map((id) => objectRow({ objectId: id, title: `Work ${id}` })),
  );

let paletteCalls = 0;
const fakePalette = async (): Promise<Palette> => {
  paletteCalls++;
  return { vibrant: "#c81e1e", muted: "#6e737d" };
};

async function app(now = "2026-10-04T12:00:00Z", palette = fakePalette) {
  return buildApp({ db, now: () => new Date(now), palette });
}

describe("GET /health", () => {
  it("answers 200", async () => {
    const res = await (await app()).inject("/health");
    expect(res.statusCode).toBe(200);
  });
});

describe("GET /artworks/today", () => {
  it("answers 200 with no artwork before the first import", async () => {
    const res = await (await app()).inject("/artworks/today");
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ date: "2026-10-04", artwork: null });
  });

  it("serves the same artwork all day, with its colours", async () => {
    await importDataset(db, collection([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]));
    const morning = (await (await app("2026-10-04T00:00:01Z")).inject("/artworks/today")).json();
    const night = (await (await app("2026-10-04T23:59:59Z")).inject("/artworks/today")).json();
    expect(morning.artwork.objectId).toBe(night.artwork.objectId);
    expect(morning.artwork).toMatchObject({
      title: `Work ${morning.artwork.objectId}`,
      artist: "Mary Cassatt",
      description: `Picture ${morning.artwork.objectId}`,
      link: `https://www.nga.gov/collection/art-object-page.${morning.artwork.objectId}.html`,
      colours: { vibrant: "#c81e1e", muted: "#6e737d" },
    });
    expect(morning.artwork.image.sizes[0].url).toBe(
      `https://api.nga.gov/iiif/img-${morning.artwork.objectId}/full/!480,480/0/default.jpg`,
    );
  });

  it("works out an artwork's colours once and keeps them", async () => {
    await importDataset(db, collection([1, 2, 3]));
    paletteCalls = 0;
    await (await app()).inject("/artworks/today");
    await (await app()).inject("/artworks/today");
    expect(paletteCalls).toBe(1);
  });

  it("still serves the artwork when its colours cannot be worked out", async () => {
    await importDataset(db, collection([1, 2, 3]));
    const res = await (await app(undefined, async () => null)).inject("/artworks/today");
    expect(res.statusCode).toBe(200);
    expect(res.json().artwork.colours).toBeNull();
  });

  it("does not change mid-day when the dataset is refreshed", async () => {
    await importDataset(db, collection([1, 2, 3, 4, 5, 6, 7, 8]));
    const before = (await (await app()).inject("/artworks/today")).json().artwork.objectId;
    // A refresh that removes today's piece and adds others.
    const others = [1, 2, 3, 4, 5, 6, 7, 8, 20, 21, 22].filter((id) => id !== before);
    await importDataset(db, collection(others));
    const after = (await (await app()).inject("/artworks/today")).json().artwork.objectId;
    expect(after).toBe(before);
  });
});

describe("GET /artworks/recent", () => {
  it("lists the days already shown, newest first, starting with today", async () => {
    await importDataset(db, collection([1, 2, 3, 4, 5, 6, 7, 8]));
    for (const d of ["2026-10-01", "2026-10-02", "2026-10-03"]) {
      await (await app(`${d}T09:00:00Z`)).inject("/artworks/today");
    }
    const res = await (await app("2026-10-04T09:00:00Z")).inject("/artworks/recent?limit=3");
    expect(res.statusCode).toBe(200);
    expect(res.json().days.map((d: { date: string }) => d.date)).toEqual(["2026-10-04", "2026-10-03", "2026-10-02"]);
  });

  it("is empty before the first import", async () => {
    const res = await (await app()).inject("/artworks/recent");
    expect(res.json()).toEqual({ days: [] });
  });
});

describe("importing", () => {
  it("is safe to run again, and marks what left the dataset as removed", async () => {
    expect(await importDataset(db, collection([1, 2, 3, 4]))).toEqual({ imported: 4, removed: 0 });
    expect(await importDataset(db, collection([1, 2, 3, 5]))).toEqual({ imported: 4, removed: 1 });
    const live = await db.artwork.findMany({ where: { removedAt: null }, orderBy: { objectId: "asc" } });
    expect(live.map((a) => a.objectId)).toEqual([1, 2, 3, 5]);
    // Back in a later export: live again.
    await importDataset(db, collection([1, 2, 3, 4, 5]));
    expect(await db.artwork.count({ where: { removedAt: null } })).toBe(5);
  });

  it("keeps colours unless the image itself changed", async () => {
    await importDataset(db, collection([1, 2]));
    await db.artwork.updateMany({ data: { vibrant: "#111111", muted: "#222222" } });
    await importDataset(
      db,
      source(
        [imageRow({ uuid: "img-1", objectId: 1 }), imageRow({ uuid: "new-scan", objectId: 2 })],
        [objectRow({ objectId: 1, title: "Work 1" }), objectRow({ objectId: 2, title: "Work 2" })],
      ),
    );
    const [one, two] = await db.artwork.findMany({ orderBy: { objectId: "asc" } });
    expect(one.vibrant).toBe("#111111");
    expect(two.vibrant).toBeNull();
  });

  it("refuses to mark artworks removed when an export looks truncated", async () => {
    await importDataset(db, collection([1, 2, 3, 4, 5, 6]));
    await expect(importDataset(db, collection([1, 2]))).rejects.toThrow(/refusing/);
    expect(await db.artwork.count({ where: { removedAt: null } })).toBe(6);
    const last = await db.datasetImport.findFirst({ orderBy: { id: "desc" } });
    expect(last?.error).toMatch(/refusing/);
  });
});
