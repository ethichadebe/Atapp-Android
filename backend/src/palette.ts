import jpeg from "jpeg-js";

// Two colours from an artwork, standing in for the Android Palette API the old
// app used: a "vibrant" one (saturated, mid lightness) and a "muted" one (low
// saturation, mid lightness). The targets and weights follow Palette's own
// defaults so the web version lands on similar colours.

export interface Palette {
  vibrant: string;
  muted: string;
  /** The darkest and brightest of the artwork's main colours: the pair the
   *  Android app used for the page, so text always reads against background. */
  dark: string;
  light: string;
}

// The Android app asked Palette for at most 8 colours and took the darkest
// and brightest of those. The same: the 8 most common, by population.
const MAIN_COLOURS = 8;

interface Swatch {
  r: number;
  g: number;
  b: number;
  population: number;
  s: number;
  l: number;
}

interface Target {
  minS: number;
  targetS: number;
  maxS: number;
  minL: number;
  targetL: number;
  maxL: number;
}

const VIBRANT: Target = { minS: 0.35, targetS: 1, maxS: 1, minL: 0.3, targetL: 0.5, maxL: 0.7 };
const MUTED: Target = { minS: 0, targetS: 0.3, maxS: 0.4, minL: 0.3, targetL: 0.5, maxL: 0.7 };
const WEIGHT_S = 0.24;
const WEIGHT_L = 0.52;
const WEIGHT_POP = 0.24;
const MAX_SWATCHES = 24;

function toHsl(r: number, g: number, b: number): { s: number; l: number } {
  const rf = r / 255;
  const gf = g / 255;
  const bf = b / 255;
  const max = Math.max(rf, gf, bf);
  const min = Math.min(rf, gf, bf);
  const l = (max + min) / 2;
  if (max === min) return { s: 0, l };
  const d = max - min;
  return { s: d / (1 - Math.abs(2 * l - 1)), l };
}

type Rgb = { r: number; g: number; b: number };
const MIN_CONTRAST = 4.5;

function contrastOf(a: Rgb, b: Rgb): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

function towards(c: Rgb, target: number, t: number): Rgb {
  return { r: c.r + (target - c.r) * t, g: c.g + (target - c.g) * t, b: c.b + (target - c.b) * t };
}

/**
 * The darkest and brightest colours, pushed apart — the dark one deeper, the
 * light one paler, keeping their hues — until text in one reads on the other.
 * Most paintings already pass and keep their exact colours; a print, whose
 * main colours are all shades of paper, gets a deep and a pale version of its
 * paper, so dark mode is still dark.
 */
export function readablePair(dark: Rgb, light: Rgb): [Rgb, Rgb] {
  let d = dark;
  let l = light;
  for (let i = 0; i < 40 && contrastOf(d, l) < MIN_CONTRAST; i++) {
    d = towards(d, 0, 0.08);
    l = towards(l, 255, 0.08);
  }
  return [d, l];
}

/** Relative luminance (WCAG), 0 black to 1 white. */
export function luminance({ r, g, b }: { r: number; g: number; b: number }): number {
  const lin = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

export function toHex({ r, g, b }: { r: number; g: number; b: number }): string {
  return "#" + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");
}

/** Quantise RGBA pixels into at most MAX_SWATCHES averaged colours. */
export function swatches(rgba: Uint8Array, width: number, height: number): Swatch[] {
  const counts = new Map<number, { r: number; g: number; b: number; n: number }>();
  const pixels = Math.min(width * height, Math.floor(rgba.length / 4));
  for (let i = 0; i < pixels; i++) {
    const o = i * 4;
    if (rgba[o + 3] < 125) continue;
    const r = rgba[o];
    const g = rgba[o + 1];
    const b = rgba[o + 2];
    const key = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
    const c = counts.get(key);
    if (c) {
      c.r += r;
      c.g += g;
      c.b += b;
      c.n += 1;
    } else {
      counts.set(key, { r, g, b, n: 1 });
    }
  }
  return [...counts.values()]
    .map((c) => {
      const r = c.r / c.n;
      const g = c.g / c.n;
      const b = c.b / c.n;
      return { r, g, b, population: c.n, ...toHsl(r, g, b) };
    })
    // Palette ignores near-black and near-white: paper and shadow are not the
    // artwork's colour.
    .filter((s) => s.l > 0.05 && s.l < 0.95)
    .sort((a, b) => b.population - a.population)
    .slice(0, MAX_SWATCHES);
}

function best(all: Swatch[], t: Target, exclude?: Swatch): Swatch | undefined {
  const maxPop = Math.max(1, ...all.map((s) => s.population));
  let winner: Swatch | undefined;
  let winnerScore = -Infinity;
  for (const s of all) {
    if (s === exclude) continue;
    if (s.s < t.minS || s.s > t.maxS || s.l < t.minL || s.l > t.maxL) continue;
    const score =
      WEIGHT_S * (1 - Math.abs(s.s - t.targetS)) +
      WEIGHT_L * (1 - Math.abs(s.l - t.targetL)) +
      WEIGHT_POP * (s.population / maxPop);
    if (score > winnerScore) {
      winner = s;
      winnerScore = score;
    }
  }
  return winner;
}

export function paletteFromPixels(rgba: Uint8Array, width: number, height: number): Palette | null {
  const all = swatches(rgba, width, height);
  if (all.length === 0) return null;

  // Many artworks (drawings, photographs, prints) have no colour that meets
  // the strict targets. Fall back to the most and least saturated swatches so
  // there is always something to show.
  const bySaturation = [...all].sort((a, b) => b.s - a.s);
  const vibrant = best(all, VIBRANT) ?? bySaturation[0];
  const muted = best(all, MUTED, vibrant) ?? bySaturation[bySaturation.length - 1];
  const main = all.slice(0, MAIN_COLOURS).sort((a, b) => luminance(a) - luminance(b));
  const [dark, light] = readablePair(main[0], main[main.length - 1]);
  return { vibrant: toHex(vibrant), muted: toHex(muted), dark: toHex(dark), light: toHex(light) };
}

/**
 * Fetch a small rendition of the image over IIIF and take its palette.
 * Resolves to null rather than throwing: colours are decoration, and a slow or
 * failing image server must never stop the artwork being served.
 */
export async function fetchPalette(
  thumbnailUrl: string,
  opts: { timeoutMs?: number; fetchImpl?: typeof fetch } = {},
): Promise<Palette | null> {
  const doFetch = opts.fetchImpl ?? fetch;
  try {
    const res = await doFetch(thumbnailUrl, { signal: AbortSignal.timeout(opts.timeoutMs ?? 4000) });
    if (!res.ok) return null;
    const buf = new Uint8Array(await res.arrayBuffer());
    const img = jpeg.decode(buf, { useTArray: true, formatAsRGBA: true, maxResolutionInMP: 4 });
    return paletteFromPixels(img.data, img.width, img.height);
  } catch {
    return null;
  }
}
