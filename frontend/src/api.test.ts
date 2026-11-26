import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Artwork, DailySet } from "./api";

// fetchDaily in the Android app: the set comes from the server when it can,
// and from what was saved on the phone when it can't.

const saved: { set: DailySet | null } = { set: null };
const saveForOffline = vi.fn(async () => {});

vi.mock("./native", () => ({
  inApp: true,
  apiBase: async () => "https://example.test",
  savedSet: async () => saved.set,
  saveForOffline,
}));

const { fetchDaily } = await import("./api");

const art = (objectId: number, localImage?: string) =>
  ({ objectId, title: `Work ${objectId}`, image: { sizes: [{ width: 480, url: `https://img/${objectId}` }] }, localImage }) as unknown as Artwork;

beforeEach(() => {
  saved.set = null;
  saveForOffline.mockClear();
});
afterEach(() => vi.unstubAllGlobals());

describe("fetchDaily in the app", () => {
  it("asks the site's server, and keeps what it gets for offline use", async () => {
    const fetch = vi.fn<(url: string) => Promise<Response>>(async () => new Response(JSON.stringify({ date: "2026-11-26", artworks: [art(1)] })));
    vi.stubGlobal("fetch", fetch);
    const set = await fetchDaily();
    expect(fetch.mock.calls[0][0]).toBe("https://example.test/api/artworks/daily");
    expect(set.artworks.map((a) => a.objectId)).toEqual([1]);
    expect(saveForOffline).toHaveBeenCalledTimes(1);
  });

  it("uses the pictures already on the phone for the same day", async () => {
    saved.set = { date: "2026-11-26", artworks: [art(1, "https://localhost/_capacitor_file_/a.jpg")] };
    vi.stubGlobal("fetch", async () => new Response(JSON.stringify({ date: "2026-11-26", artworks: [art(1), art(2)] })));
    const set = await fetchDaily();
    expect(set.artworks.map((a) => a.localImage)).toEqual(["https://localhost/_capacitor_file_/a.jpg", undefined]);
  });

  it("shows the saved set when there is no connection", async () => {
    saved.set = { date: "2026-11-25", artworks: [art(7, "file")] };
    vi.stubGlobal("fetch", async () => {
      throw new TypeError("offline");
    });
    expect((await fetchDaily()).artworks[0].objectId).toBe(7);
  });

  it("still fails when offline with nothing saved", async () => {
    vi.stubGlobal("fetch", async () => new Response("", { status: 503 }));
    await expect(fetchDaily()).rejects.toThrow("HTTP 503");
  });
});
