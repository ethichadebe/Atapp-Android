import { describe, expect, it } from "vitest";
import { contrast, parseHex, themeFor } from "./colours";

const ratio = (a: string, b: string) => contrast(parseHex(a)!, parseHex(b)!);

const samples = [
  { vibrant: "#c81e1e", muted: "#6e737d" },
  { vibrant: "#ffee00", muted: "#f0f0e0" }, // pale, bright — the hard case on white
  { vibrant: "#101060", muted: "#202020" }, // dark — the hard case on black
  null,
];

describe("themeFor", () => {
  for (const dark of [false, true]) {
    for (const colours of samples) {
      it(`keeps text readable (${dark ? "dark" : "light"}, ${colours?.muted ?? "no colours"})`, () => {
        const t = themeFor(colours, dark);
        expect(ratio(t.text, t.background)).toBeGreaterThanOrEqual(7);
        expect(ratio(t.accent, t.background)).toBeGreaterThanOrEqual(3);
      });
    }
  }

  it("is dark in dark mode and light in light mode", () => {
    const c = { vibrant: "#c81e1e", muted: "#6e737d" };
    expect(ratio(themeFor(c, true).background, "#000000")).toBeLessThan(ratio(themeFor(c, false).background, "#000000"));
  });

  it("takes its tint from the artwork", () => {
    const red = themeFor({ vibrant: "#c81e1e", muted: "#a05050" }, false).background;
    const blue = themeFor({ vibrant: "#1e1ec8", muted: "#5050a0" }, false).background;
    const [r1, , b1] = parseHex(red)!;
    const [r2, , b2] = parseHex(blue)!;
    expect(r1).toBeGreaterThan(b1);
    expect(b2).toBeGreaterThan(r2);
  });
});
