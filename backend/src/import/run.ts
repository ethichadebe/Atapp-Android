import type { Readable } from "node:stream";
import { Prisma, type PrismaClient } from "@prisma/client";
import { readArtworks, readImages, type ArtworkRow } from "./nga.js";

// Loads the NGA open data into `artworks`. Safe to run again at any time: rows
// are upserted by objectid, so a re-run picks up NGA's daily changes without
// touching the days already shown.
//
//   - Every artwork in this export is written with imported_at = this run's
//     start, and un-removed if it had been removed.
//   - Its colours are kept unless its image changed.
//   - Anything not in this export is marked removed (never deleted), so it is
//     no longer picked but past days that showed it still load.
//
// If an export looks truncated — far fewer artworks than are live now — the
// run stops before marking anything removed.

const BATCH = 500;
const MIN_FRACTION_OF_CURRENT = 0.5;

export interface ImportSource {
  label: string;
  open(file: "published_images.csv" | "objects.csv"): Promise<Readable>;
}

export interface ImportResult {
  imported: number;
  removed: number;
}

async function upsert(db: PrismaClient, rows: ArtworkRow[], at: Date) {
  const values = rows.map(
    (r) => Prisma.sql`(${r.objectId}, ${r.title}, ${r.attribution}, ${r.displayDate}, ${r.medium},
      ${r.dimensions}, ${r.creditLine}, ${r.classification}, ${r.imageUuid}, ${r.iiifUrl},
      ${r.imageWidth}::integer, ${r.imageHeight}::integer, ${r.imageAltText}, ${at}::timestamp)`,
  );
  await db.$executeRaw`
    INSERT INTO artworks (object_id, title, attribution, display_date, medium,
      dimensions, credit_line, classification, image_uuid, iiif_url,
      image_width, image_height, image_alt_text, imported_at)
    VALUES ${Prisma.join(values)}
    ON CONFLICT (object_id) DO UPDATE SET
      title = EXCLUDED.title,
      attribution = EXCLUDED.attribution,
      display_date = EXCLUDED.display_date,
      medium = EXCLUDED.medium,
      dimensions = EXCLUDED.dimensions,
      credit_line = EXCLUDED.credit_line,
      classification = EXCLUDED.classification,
      vibrant = CASE WHEN artworks.image_uuid = EXCLUDED.image_uuid THEN artworks.vibrant END,
      muted = CASE WHEN artworks.image_uuid = EXCLUDED.image_uuid THEN artworks.muted END,
      image_uuid = EXCLUDED.image_uuid,
      iiif_url = EXCLUDED.iiif_url,
      image_width = EXCLUDED.image_width,
      image_height = EXCLUDED.image_height,
      image_alt_text = EXCLUDED.image_alt_text,
      imported_at = EXCLUDED.imported_at,
      removed_at = NULL`;
}

export async function importDataset(
  db: PrismaClient,
  source: ImportSource,
  log: (msg: string) => void = () => {},
): Promise<ImportResult> {
  const run = await db.datasetImport.create({ data: { source: source.label } });
  // Both this and imported_at are millisecond timestamps, so "written by this
  // run" is an exact comparison.
  const startedAt = run.startedAt;

  try {
    const liveBefore = await db.artwork.count({ where: { removedAt: null } });

    log("reading published_images.csv");
    const images = await readImages(await source.open("published_images.csv"));
    log(`${images.size} objects have an open-access primary image`);

    log("reading objects.csv");
    let imported = 0;
    let batch: ArtworkRow[] = [];
    for await (const row of readArtworks(await source.open("objects.csv"), images)) {
      batch.push(row);
      if (batch.length >= BATCH) {
        await upsert(db, batch, startedAt);
        imported += batch.length;
        batch = [];
        if (imported % 10000 === 0) log(`${imported} artworks written`);
      }
    }
    if (batch.length > 0) {
      await upsert(db, batch, startedAt);
      imported += batch.length;
    }
    log(`${imported} artworks written`);

    if (imported === 0 || imported < liveBefore * MIN_FRACTION_OF_CURRENT) {
      throw new Error(
        `only ${imported} artworks in this export against ${liveBefore} live; ` +
          "refusing to mark the rest removed. Nothing was removed.",
      );
    }

    const removed = await db.artwork.updateMany({
      where: { importedAt: { lt: startedAt }, removedAt: null },
      data: { removedAt: startedAt },
    });
    log(`${removed.count} artworks no longer in the dataset, marked removed`);

    await db.datasetImport.update({
      where: { id: run.id },
      data: { finishedAt: new Date(), imported, removed: removed.count },
    });
    return { imported, removed: removed.count };
  } catch (err) {
    await db.datasetImport.update({
      where: { id: run.id },
      data: { finishedAt: new Date(), error: String(err instanceof Error ? err.message : err) },
    });
    throw err;
  }
}
