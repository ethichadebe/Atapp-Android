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
  /**
   * The artwork's main colours (`palette`), and its darkest and brightest made
   * readable (`dark`, `light`) to fall back on. Null if not worked out yet.
   */
  colours: { dark: string; light: string; palette?: string[] } | null;
  /**
   * The story behind the artwork, researched on the web with AI, and the pages
   * it drew on. Null until written (or when research is off).
   */
  story?: { text: string; sources: { title: string; url: string }[] } | null;
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
