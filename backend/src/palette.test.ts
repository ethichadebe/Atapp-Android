import { describe, expect, it } from "vitest";
import jpeg from "jpeg-js";
import { fetchPalette, luminance, paletteFromPixels } from "./palette.js";

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

  it("takes the darkest and brightest main colours for the page", () => {
    const px = bands(40, 40, [
      { rgb: [60, 40, 30], share: 0.3 }, // dark brown
      { rgb: [120, 110, 90], share: 0.4 }, // mid
      { rgb: [225, 215, 160], share: 0.3 }, // pale yellow
    ]);
    const p = paletteFromPixels(px, 40, 40)!;
    expect(p.dark).toMatch(/^#3[0-9a-f]2[0-9a-f]1[0-9a-f]$/);
    expect(p.light).toMatch(/^#e[0-9a-f]d[0-9a-f]a[0-9a-f]$/);
  });

  it("pushes a print's paper tones apart until they read, keeping their hue", () => {
    const px = bands(40, 40, [
      { rgb: [197, 187, 164], share: 0.5 }, // paper
      { rgb: [209, 198, 177], share: 0.5 }, // lighter paper
    ]);
    const p = paletteFromPixels(px, 40, 40)!;
    const lum = (h: string) => luminance({ r: parseInt(h.slice(1, 3), 16), g: parseInt(h.slice(3, 5), 16), b: parseInt(h.slice(5, 7), 16) });
    expect((lum(p.light) + 0.05) / (lum(p.dark) + 0.05)).toBeGreaterThanOrEqual(4.5);
    const [r, b] = [1, 5].map((i) => parseInt(p.dark.slice(i, i + 2), 16));
    expect(r).toBeGreaterThan(b); // still a warm, paper-coloured brown
  });

  it("ignores a speck of colour outside the main 8", () => {
    const parts = [
      { rgb: [250, 30, 30] as Rgb, share: 0.004 }, // a speck: not one of the main colours
      ...Array.from({ length: 8 }, (_, i) => ({ rgb: [60 + i * 20, 60 + i * 20, 70 + i * 20] as Rgb, share: 0.12 })),
    ];
    const p = paletteFromPixels(bands(50, 250, parts), 50, 250)!;
    expect(hue(p.light)).toBe("grey");
  });

  it("keeps the main colours exactly, most common first, for the app to pair", () => {
    const px = bands(40, 100, [
      { rgb: [200, 30, 30], share: 0.5 },
      { rgb: [30, 30, 200], share: 0.3 },
      { rgb: [240, 230, 160], share: 0.2 },
    ]);
    const p = paletteFromPixels(px, 40, 100)!;
    expect(p.main).toEqual(["#c81e1e", "#1e1ec8", "#f0e6a0"]);
  });

  it("keeps distinct colours, not eight shades of the same paper, and no specks", () => {
    const px = bands(50, 200, [
      ...Array.from({ length: 6 }, (_, i) => ({ rgb: [214 + i * 3, 200 + i * 3, 170 + i * 3] as Rgb, share: 0.15 })),
      { rgb: [90, 70, 50], share: 0.095 }, // the ink
      { rgb: [30, 90, 200], share: 0.005 }, // a speck
    ]);
    const p = paletteFromPixels(px, 50, 200)!;
    expect(p.main).toHaveLength(2);
    expect(hue(p.main[1])).toBe("red"); // brown ink, after the paper
    expect(p.main.some((c) => hue(c) === "blue")).toBe(false);
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
