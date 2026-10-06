// The page's colours, taken from the artwork.
//
// randomTheme: each time a page is shown, two of the artwork's colours that
// contrast are picked at random — so every swipe brings a different pair. The
// pool is the artwork's distinct main colours plus its darkest and brightest
// (made readable on the server), so even a print in paper and ink has a few
// pairs to pick from. The darker of the two is the background in dark mode,
// the lighter in light mode. If the pair is a little short of readable, the
// text is nudged towards white or black, just far enough; the background is
// always one of the artwork's colours.
//
// themeFor: the fixed pair the Android app used — the darkest and brightest —
// for when there are no colours to pick from.

export interface Theme {
  background: string;
  text: string;
}

type Rgb = [number, number, number];

const MIN_CONTRAST = 4.5; // WCAG AA for body text
// Two main colours at least this far apart count as contrasting: close enough
// to readable that only a small nudge to the text is needed.
const PAIR_CONTRAST = 3;
const WHITE: Rgb = [255, 255, 255];
const BLACK: Rgb = [0, 0, 0];

// For a piece whose colours haven't been worked out yet: the brown and pale
// yellow of the native screen recording.
export const FALLBACK = { dark: "#4d3d38", light: "#e4dc8c" };

export function parseHex(hex: string): Rgb | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function toHex(c: Rgb): string {
  return "#" + c.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");
}

function mix(a: Rgb, b: Rgb, t: number): Rgb {
  return [0, 1, 2].map((i) => a[i] + (b[i] - a[i]) * t) as Rgb;
}

function luminance([r, g, b]: Rgb): number {
  const lin = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

export function contrast(a: Rgb, b: Rgb): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** Move `c` towards `target` only as far as it takes to reach the contrast. */
function readableAgainst(c: Rgb, background: Rgb, target: Rgb): Rgb {
  for (let t = 0; t <= 1.0001; t += 0.05) {
    const m = mix(c, target, t);
    if (contrast(m, background) >= MIN_CONTRAST) return m;
  }
  return target;
}

type Colours = { dark: string; light: string; palette?: string[] } | null;

export function themeFor(colours: Colours, darkMode: boolean): Theme {
  const dark = parseHex(colours?.dark ?? "") ?? parseHex(FALLBACK.dark)!;
  const light = parseHex(colours?.light ?? "") ?? parseHex(FALLBACK.light)!;
  return readable(darkMode ? dark : light, darkMode ? light : dark, darkMode);
}

/** Every pair of the artwork's main colours that contrast, as [darker, lighter]. */
export function contrastingPairs(palette: string[]): [Rgb, Rgb][] {
  const cs = palette.map(parseHex).filter((c): c is Rgb => c !== null);
  const pairs: [Rgb, Rgb][] = [];
  for (let i = 0; i < cs.length; i++) {
    for (let j = i + 1; j < cs.length; j++) {
      if (contrast(cs[i], cs[j]) < PAIR_CONTRAST) continue;
      pairs.push(luminance(cs[i]) <= luminance(cs[j]) ? [cs[i], cs[j]] : [cs[j], cs[i]]);
    }
  }
  return pairs;
}

export function randomTheme(colours: Colours, darkMode: boolean, random: () => number = Math.random): Theme {
  const pool = colours ? [...new Set([...(colours.palette ?? []), colours.dark, colours.light])] : [];
  // Dark mode keeps light text on a dark background, light mode the reverse:
  // a background is only picked if text of that kind can be read on it.
  const pairs = contrastingPairs(pool).filter(([darker, lighter]) =>
    darkMode ? contrast(darker, WHITE) >= MIN_CONTRAST : contrast(lighter, BLACK) >= MIN_CONTRAST,
  );
  if (pairs.length === 0) return themeFor(colours, darkMode);
  const [darker, lighter] = pairs[Math.min(pairs.length - 1, Math.floor(random() * pairs.length))];
  return readable(darkMode ? darker : lighter, darkMode ? lighter : darker, darkMode);
}

function readable(background: Rgb, text: Rgb, darkMode: boolean): Theme {
  if (contrast(text, background) < MIN_CONTRAST) {
    // Towards white in dark mode, black in light — unless the background is
    // so pale (or so deep) that only the other way can reach contrast.
    const [first, second]: Rgb[] = darkMode ? [[255, 255, 255], [0, 0, 0]] : [[0, 0, 0], [255, 255, 255]];
    const nudged = readableAgainst(text, background, first);
    text = contrast(nudged, background) >= MIN_CONTRAST ? nudged : readableAgainst(text, background, second);
  }
  return { background: toHex(background), text: toHex(text) };
}
