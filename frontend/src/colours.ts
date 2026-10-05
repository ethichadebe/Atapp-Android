// The page's colours, as the Android app chose them: each artwork's darkest
// and brightest main colours. In dark mode the background is the darkest and
// the text the brightest; in light mode the other way round.
//
// Those two are far apart on almost every artwork, which is what kept the
// native app readable. On the rare piece where they are too close, the text
// is nudged towards white or black — just far enough — and nothing else moves.

export interface Theme {
  background: string;
  text: string;
}

type Rgb = [number, number, number];

const MIN_CONTRAST = 4.5; // WCAG AA for body text

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

export function themeFor(colours: { dark: string; light: string } | null, darkMode: boolean): Theme {
  const dark = parseHex(colours?.dark ?? "") ?? parseHex(FALLBACK.dark)!;
  const light = parseHex(colours?.light ?? "") ?? parseHex(FALLBACK.light)!;
  const background = darkMode ? dark : light;
  let text = darkMode ? light : dark;
  if (contrast(text, background) < MIN_CONTRAST) {
    // Towards white in dark mode, black in light — unless the background is
    // so pale (or so deep) that only the other way can reach contrast.
    const [first, second]: Rgb[] = darkMode ? [[255, 255, 255], [0, 0, 0]] : [[0, 0, 0], [255, 255, 255]];
    const nudged = readableAgainst(text, background, first);
    text = contrast(nudged, background) >= MIN_CONTRAST ? nudged : readableAgainst(text, background, second);
  }
  return { background: toHex(background), text: toHex(text) };
}
