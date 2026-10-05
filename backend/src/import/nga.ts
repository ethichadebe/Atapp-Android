import type { Readable } from "node:stream";
import { parse } from "csv-parse";

// Reading the National Gallery of Art open data CSVs
// (github.com/NationalGalleryOfArt/opendata, CC0). Column names are theirs; see
// that repository's documentation/ folder for the data dictionary.
//
// Two files are enough:
//   published_images.csv — which objects have an image, and whether it is
//                          open access (only those can be shown)
//   objects.csv          — title, attribution (the artist as NGA displays it),
//                          date, medium, dimensions, credit line
// Constituents (artists) are not imported: `objects.attribution` already
// carries the display name, including "Workshop of …" and "Attributed to …".

export const NGA_FILES = ["published_images.csv", "objects.csv"] as const;

export interface ImageRow {
  uuid: string;
  iiifUrl: string;
  width: number | null;
  height: number | null;
  altText: string | null;
  sequence: number;
}

export interface ArtworkRow {
  objectId: number;
  title: string;
  attribution: string | null;
  displayDate: string | null;
  medium: string | null;
  dimensions: string | null;
  creditLine: string | null;
  classification: string | null;
  imageUuid: string;
  iiifUrl: string;
  imageWidth: number | null;
  imageHeight: number | null;
  imageAltText: string | null;
}

function csv(input: Readable) {
  return input.pipe(parse({ columns: true, bom: true, skip_empty_lines: true, relax_column_count: true }));
}

function text(value: string | undefined): string | null {
  if (value === undefined) return null;
  // Their multi-line fields use CRLF; the page only needs \n.
  const t = value.replace(/\r\n?/g, "\n").trim();
  return t === "" ? null : t;
}

function int(value: string | undefined): number | null {
  if (value === undefined || value.trim() === "") return null;
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) ? n : null;
}

/** objectid → its open-access primary image. Objects without one are absent. */
export async function readImages(input: Readable): Promise<Map<number, ImageRow>> {
  const images = new Map<number, ImageRow>();
  for await (const r of csv(input) as AsyncIterable<Record<string, string>>) {
    if (r.viewtype !== "primary" || r.openaccess !== "1") continue;
    const objectId = int(r.depictstmsobjectid);
    const iiifUrl = text(r.iiifurl);
    const uuid = text(r.uuid);
    if (objectId === null || !iiifUrl || !uuid) continue;
    // IIIF only: an image link anywhere else is not something we know how to size.
    if (!iiifUrl.startsWith("https://")) continue;
    const row: ImageRow = {
      uuid,
      iiifUrl: iiifUrl.replace(/\/+$/, ""),
      width: int(r.width),
      height: int(r.height),
      altText: text(r.assistivetext),
      sequence: int(r.sequence) ?? 0,
    };
    // A few objects have more than one primary image; keep the first in NGA's
    // own order, so the choice is stable between imports.
    const existing = images.get(objectId);
    if (!existing || row.sequence < existing.sequence || (row.sequence === existing.sequence && row.uuid < existing.uuid)) {
      images.set(objectId, row);
    }
  }
  return images;
}

/** Objects that have an open-access image, joined with that image. */
export async function* readArtworks(input: Readable, images: Map<number, ImageRow>): AsyncGenerator<ArtworkRow> {
  for await (const r of csv(input) as AsyncIterable<Record<string, string>>) {
    const objectId = int(r.objectid);
    if (objectId === null) continue;
    const image = images.get(objectId);
    if (!image) continue;
    yield {
      objectId,
      title: text(r.title) ?? "Untitled",
      attribution: text(r.attribution),
      displayDate: text(r.displaydate),
      medium: text(r.medium),
      dimensions: text(r.dimensions),
      creditLine: text(r.creditline),
      classification: text(r.classification),
      imageUuid: image.uuid,
      iiifUrl: image.iiifUrl,
      imageWidth: image.width,
      imageHeight: image.height,
      imageAltText: image.altText,
    };
  }
}
