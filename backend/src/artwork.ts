import type { Artwork, PrismaClient } from "@prisma/client";
import { fetchPalette } from "./palette.js";

// What the API sends for one artwork. Images are hotlinked from NGA's IIIF
// image server, which renders any size on request, so the browser can pick a
// size from `srcset` rather than download the full scan.

export interface ArtworkDto {
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

const SIZES = [480, 800, 1200, 1800];

/** An IIIF Image API URL for a rendition that fits in size × size. */
export function iiifImage(iiifUrl: string, size: number): string {
  return `${iiifUrl}/full/!${size},${size}/0/default.jpg`;
}

/**
 * The artwork's page on nga.gov. This is the address pattern the Android app
 * linked to; it is built from the objectid in one place so it is easy to move
 * if NGA changes it.
 */
export function ngaLink(objectId: number): string {
  return `https://www.nga.gov/collection/art-object-page.${objectId}.html`;
}

export function toDto(a: Artwork): ArtworkDto {
  const longest = Math.max(a.imageWidth ?? 0, a.imageHeight ?? 0);
  // Never ask for a rendition larger than the scan itself.
  const sizes = SIZES.filter((s, i) => longest === 0 || s <= longest || i === 0);
  return {
    objectId: a.objectId,
    title: a.title,
    artist: a.attribution,
    date: a.displayDate,
    medium: a.medium,
    dimensions: a.dimensions,
    classification: a.classification,
    creditLine: a.creditLine,
    description: a.imageAltText,
    link: ngaLink(a.objectId),
    image: {
      alt: a.imageAltText ?? (a.attribution ? `${a.title}, by ${a.attribution}` : a.title),
      width: a.imageWidth,
      height: a.imageHeight,
      thumbnail: iiifImage(a.iiifUrl, 200),
      sizes: sizes.map((width) => ({ width, url: iiifImage(a.iiifUrl, width) })),
    },
    colours: a.vibrant && a.muted ? { vibrant: a.vibrant, muted: a.muted } : null,
  };
}

// After a failed attempt, wait this long before fetching that image again, so
// an unreachable image server costs one slow request, not every request.
const RETRY_AFTER_MS = 10 * 60 * 1000;
const lastFailure = new Map<number, number>();

/**
 * Fill in the artwork's colours if they have never been worked out. Done once
 * per artwork, the first time it is served, and stored; a failure leaves them
 * empty so a later request tries again.
 */
export async function ensureColours(
  db: PrismaClient,
  artwork: Artwork,
  palette: typeof fetchPalette = fetchPalette,
): Promise<Artwork> {
  if (artwork.vibrant && artwork.muted) return artwork;
  const failedAt = lastFailure.get(artwork.objectId);
  if (failedAt !== undefined && Date.now() - failedAt < RETRY_AFTER_MS) return artwork;
  const found = await palette(iiifImage(artwork.iiifUrl, 100));
  if (!found) {
    lastFailure.set(artwork.objectId, Date.now());
    return artwork;
  }
  lastFailure.delete(artwork.objectId);
  return db.artwork.update({
    where: { objectId: artwork.objectId },
    data: { vibrant: found.vibrant, muted: found.muted },
  });
}
