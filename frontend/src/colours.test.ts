import { describe, expect, it } from "vitest";
import { FALLBACK, contrast, contrastingPairs, parseHex, randomTheme, themeFor } from "./colours";

const ratio = (a: string, b: string) => contrast(parseHex(a)!, parseHex(b)!);

describe("themeFor", () => {
  it("uses the artwork's darkest and brightest exactly, as the native app did", () => {
    const c = { dark: "#4d3d38", light: "#e4dc8c" };
    expect(themeFor(c, true)).toEqual({ background: "#4d3d38", text: "#e4dc8c" });
    expect(themeFor(c, false)).toEqual({ background: "#e4dc8c", text: "#4d3d38" });
  });

  it("only nudges the text, never the background, when the pair is too close", () => {
    const close = { dark: "#5a5a5a", light: "#8a8a8a" };
    for (const darkMode of [true, false]) {
      const t = themeFor(close, darkMode);
      expect(t.background).toBe(darkMode ? "#5a5a5a" : "#8a8a8a");
      expect(ratio(t.text, t.background)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("falls back to the native screen's brown and yellow", () => {
    expect(themeFor(null, true)).toEqual({ background: FALLBACK.dark, text: FALLBACK.light });
  });

  it("is always readable", () => {
    const samples = [
      { dark: "#000000", light: "#ffffff" },
      { dark: "#101060", light: "#202070" },
      { dark: "#f0f0e0", light: "#ffffff" },
      { dark: "#3a2f2a", light: "#e8dfa0" },
    ];
    for (const s of samples) {
      for (const darkMode of [true, false]) {
        const t = themeFor(s, darkMode);
        expect(ratio(t.text, t.background)).toBeGreaterThanOrEqual(4.5);
      }
    }
  });
});

describe("randomTheme", () => {
  const palette = ["#1b2a4a", "#c8a24a", "#f2ead8", "#7a2e22", "#2f5d3a"];
  const colours = { dark: "#1b2a4a", light: "#f2ead8", palette };

  it("pairs two of the artwork's own colours, a different pair as the roll changes", () => {
    const seen = new Set<string>();
    for (let r = 0; r < 1; r += 0.05) {
      const t = randomTheme(colours, true, () => r);
      expect(palette).toContain(t.background);
      seen.add(`${t.background}/${t.text}`);
    }
    expect(seen.size).toBeGreaterThan(2);
  });

  it("only picks pairs that contrast, darker behind in dark mode and lighter in light mode", () => {
    const pairs = contrastingPairs(palette);
    expect(pairs.length).toBeGreaterThan(0);
    for (const [darker, lighter] of pairs) expect(contrast(darker, lighter)).toBeGreaterThanOrEqual(3);
    for (let r = 0; r < 1; r += 0.05) {
      const dark = randomTheme(colours, true, () => r);
      const light = randomTheme(colours, false, () => r);
      const lum = (h: string) => contrast(parseHex(h)!, [0, 0, 0]);
      expect(lum(dark.background)).toBeLessThan(lum(dark.text));
      expect(lum(light.background)).toBeGreaterThan(lum(light.text));
    }
  });

  it("keeps dark mode dark and light mode light, even on a mid-tone colour", () => {
    const mid = { dark: "#1b1a18", light: "#f4efe4", palette: ["#837d72", "#0d0c11", "#f4efe4"] };
    const lum = (h: string) => contrast(parseHex(h)!, [0, 0, 0]);
    for (let r = 0; r < 1; r += 0.05) {
      const d = randomTheme(mid, true, () => r);
      expect(lum(d.text)).toBeGreaterThan(lum(d.background));
      expect(ratio(d.background, "#ffffff")).toBeGreaterThanOrEqual(4.5);
      const l = randomTheme(mid, false, () => r);
      expect(lum(l.text)).toBeLessThan(lum(l.background));
      expect(ratio(l.background, "#000000")).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("is always readable", () => {
    for (let r = 0; r < 1; r += 0.05) {
      for (const darkMode of [true, false]) {
        const t = randomTheme(colours, darkMode, () => r);
        expect(ratio(t.text, t.background)).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it("still has pairs to pick from when the art's own colours are all close", () => {
    // A print: paper tones only. Its darkest and brightest join the pool.
    const flat = { dark: "#3a2f2a", light: "#e8dfa0", palette: ["#c5bba4", "#d1c6b1", "#9c7c53"] };
    const seen = new Set<string>();
    for (let r = 0; r < 1; r += 0.05) {
      const t = randomTheme(flat, true, () => r);
      expect([...flat.palette, flat.dark, flat.light]).toContain(t.background);
      expect(ratio(t.text, t.background)).toBeGreaterThanOrEqual(4.5);
      seen.add(t.background + t.text);
    }
    expect(seen.size).toBeGreaterThan(1);
  });

  it("falls back to the fixed pair with no colours at all", () => {
    expect(randomTheme(null, true, () => 0.5)).toEqual(themeFor(null, true));
  });
});
