// Turning an artwork's two colours into a page theme, the job MainActivity did
// with setForeGround/setBackground. The old app used the raw swatches, which
// could leave text unreadable on some artworks; here the background is shifted
// until body text has at least a 7:1 contrast ratio (WCAG AAA), and the accent
// until it has 3:1.

export interface Theme {
  background: string;
  text: string;
  subtle: string;
  accent: string;
}

type Rgb = [number, number, number];

const BLACK: Rgb = [0, 0, 0];
const WHITE: Rgb = [255, 255, 255];
const INK: Rgb = [17, 17, 17];
const PAPER: Rgb = [245, 243, 238];

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

/** Move `c` towards `target` just far enough to reach `ratio` against `against`. */
function untilContrast(c: Rgb, target: Rgb, against: Rgb, ratio: number): Rgb {
  for (let t = 0; t <= 1; t += 0.05) {
    const m = mix(c, target, t);
    if (contrast(m, against) >= ratio) return m;
  }
  return target;
}

const FALLBACK = { vibrant: "#b0894f", muted: "#6b6660" };

/**
 * Light mode: a pale wash of the muted colour, dark text, vibrant accent.
 * Dark mode: a deep shade of the muted colour, light text, vibrant accent.
 */
export function themeFor(colours: { vibrant: string; muted: string } | null, dark: boolean): Theme {
  const muted = parseHex(colours?.muted ?? "") ?? parseHex(FALLBACK.muted)!;
  const vibrant = parseHex(colours?.vibrant ?? "") ?? parseHex(FALLBACK.vibrant)!;
  const text = dark ? PAPER : INK;
  const towards = dark ? BLACK : WHITE;

  const background = untilContrast(mix(muted, towards, dark ? 0.55 : 0.7), towards, text, 7);
  const accent = untilContrast(vibrant, dark ? WHITE : BLACK, background, 3);
  const subtle = mix(text, background, 0.3);

  return { background: toHex(background), text: toHex(text), subtle: toHex(subtle), accent: toHex(accent) };
}
