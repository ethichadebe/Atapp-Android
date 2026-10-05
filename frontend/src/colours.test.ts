import { describe, expect, it } from "vitest";
import { FALLBACK, contrast, parseHex, themeFor } from "./colours";

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
