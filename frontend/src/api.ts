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
  colours: { vibrant: string; muted: string } | null;
}

export interface Day {
  date: string;
  artwork: Artwork;
}

export async function fetchRecent(limit = 10, signal?: AbortSignal): Promise<Day[]> {
  const res = await fetch(`/api/artworks/recent?limit=${limit}`, { signal });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const body = (await res.json()) as { days: Day[] };
  return body.days;
}
