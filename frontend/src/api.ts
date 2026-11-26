import { apiBase, inApp, saveForOffline, savedSet } from "./native";

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
  /** In the Android app: the picture saved on the phone, for offline use. */
  localImage?: string;
}

export interface DailySet {
  date: string;
  artworks: Artwork[];
}

/**
 * Today's 10, the same for everyone; the first is the art of the day.
 *
 * In the Android app, the set and its pictures are also kept on the phone, and
 * the last one kept is shown when there is no connection.
 */
export async function fetchDaily(signal?: AbortSignal): Promise<DailySet> {
  try {
    const res = await fetch(`${await apiBase()}/api/artworks/daily`, { signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const set = (await res.json()) as DailySet;
    if (inApp) {
      // Keep the saved copy's local pictures until the new ones are in.
      const saved = await savedSet();
      if (saved?.date === set.date) {
        const local = new Map(saved.artworks.map((a) => [a.objectId, a.localImage]));
        set.artworks = set.artworks.map((a) => ({ ...a, localImage: local.get(a.objectId) }));
      }
      void saveForOffline(set).catch(() => {});
    }
    return set;
  } catch (err) {
    if (signal?.aborted) throw err;
    const saved = await savedSet();
    if (saved) return saved;
    throw err;
  }
}
