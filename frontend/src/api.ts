// The backend's response shapes (backend/src/artwork.ts, backend/src/app.ts).

export interface Artwork {
  objectId: number;
  title: string;
  artist: string | null;
  date: string | null;
  medium: string | null;
  dimensions: string | null;
  classification: string | null;
  creditLine: string | null;
  description: string | null;
  link: string;
  image: {
    alt: string;
    width: number | null;
    height: number | null;
    thumbnail: string;
    sizes: { width: number; url: string }[];
  };
  /** The darkest and brightest of the artwork's main colours, or null if not worked out yet. */
  colours: { dark: string; light: string } | null;
}

export interface DailySet {
  date: string;
  artworks: Artwork[];
}

/** Today's 10, the same for everyone; the first is the art of the day. */
export async function fetchDaily(signal?: AbortSignal): Promise<DailySet> {
  const res = await fetch("/api/artworks/daily", { signal });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as DailySet;
}
