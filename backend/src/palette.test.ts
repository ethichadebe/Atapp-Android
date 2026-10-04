import { describe, expect, it } from "vitest";
import jpeg from "jpeg-js";
import { fetchPalette, paletteFromPixels } from "./palette.js";

type Rgb = [number, number, number];

/** A width×height image made of horizontal bands, `share` of the rows each. */
function bands(width: number, height: number, parts: { rgb: Rgb; share: number }[]): Uint8Array {
  const data = new Uint8Array(width * height * 4);
  let row = 0;
  for (const p of parts) {
    const rows = Math.round(height * p.share);
    for (let y = row; y < Math.min(height, row + rows); y++) {
      for (let x = 0; x < width; x++) {
        const o = (y * width + x) * 4;
        data.set([...p.rgb, 255], o);
      }
    }
    row += rows;
  }
  return data;
}

function hue(hex: string): "red" | "blue" | "grey" | "other" {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  if (Math.max(r, g, b) - Math.min(r, g, b) < 40) return "grey";
  if (r > g && r > b) return "red";
  if (b > r && b > g) return "blue";
  return "other";
}

describe("palette", () => {
  it("picks a saturated colour as vibrant and a greyish one as muted", () => {
    const px = bands(40, 40, [
      { rgb: [200, 30, 30], share: 0.2 }, // small vivid red
      { rgb: [110, 115, 125], share: 0.5 }, // large grey-blue wall
      { rgb: [250, 250, 250], share: 0.3 }, // paper, ignored
    ]);
    const p = paletteFromPixels(px, 40, 40)!;
    expect(hue(p.vibrant)).toBe("red");
    expect(hue(p.muted)).toBe("grey");
  });

  it("still returns two colours for a monochrome print", () => {
    const px = bands(20, 20, [
      { rgb: [60, 60, 60], share: 0.5 },
      { rgb: [150, 150, 150], share: 0.5 },
    ]);
    const p = paletteFromPixels(px, 20, 20)!;
    expect(p.vibrant).toMatch(/^#[0-9a-f]{6}$/);
    expect(p.muted).toMatch(/^#[0-9a-f]{6}$/);
  });

  it("gives up on an image that is only black and white", () => {
    const px = bands(10, 10, [
      { rgb: [0, 0, 0], share: 0.5 },
      { rgb: [255, 255, 255], share: 0.5 },
    ]);
    expect(paletteFromPixels(px, 10, 10)).toBeNull();
  });

  it("decodes a JPEG from the image server", async () => {
    const px = bands(32, 32, [
      { rgb: [30, 60, 200], share: 0.4 },
      { rgb: [120, 120, 110], share: 0.6 },
    ]);
    const body = jpeg.encode({ data: px, width: 32, height: 32 }, 95).data;
    const p = await fetchPalette("https://iiif.test/x/full/!100,100/0/default.jpg", {
      fetchImpl: async () => new Response(body),
    });
    expect(hue(p!.vibrant)).toBe("blue");
  });

  it("returns null, not an error, when the image server fails", async () => {
    expect(await fetchPalette("https://iiif.test/x", { fetchImpl: async () => new Response("", { status: 503 }) })).toBeNull();
    expect(
      await fetchPalette("https://iiif.test/x", {
        fetchImpl: async () => {
          throw new Error("ECONNREFUSED");
        },
      }),
    ).toBeNull();
  });
});
