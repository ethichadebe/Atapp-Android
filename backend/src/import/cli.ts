import { createReadStream } from "node:fs";
import { join } from "node:path";
import { Readable } from "node:stream";
import { prisma } from "../db.js";
import { importDataset, type ImportSource } from "./run.js";

// Import or refresh the collection from the NGA open data.
//
//   node dist/import/cli.js               download the current export from GitHub
//   node dist/import/cli.js --from DIR    use CSVs already on disk
//
// In production, inside the running stack (see README.md):
//   docker compose -f docker-compose.prod.yml run --rm --entrypoint node backend dist/import/cli.js

// NGA's public open-data repository. Not a server of ours.
const DEFAULT_BASE = "https://raw.githubusercontent.com/NationalGalleryOfArt/opendata/main/data";

function sourceFromArgs(argv: string[]): ImportSource {
  const i = argv.indexOf("--from");
  if (i !== -1) {
    const dir = argv[i + 1];
    if (!dir) throw new Error("--from needs a directory");
    return { label: `dir:${dir}`, open: async (file) => createReadStream(join(dir, file)) };
  }
  const base = (process.env.NGA_DATA_URL ?? DEFAULT_BASE).replace(/\/+$/, "");
  return {
    label: base,
    open: async (file) => {
      const res = await fetch(`${base}/${file}`);
      if (!res.ok || !res.body) throw new Error(`downloading ${file}: HTTP ${res.status}`);
      return Readable.fromWeb(res.body as import("node:stream/web").ReadableStream);
    },
  };
}

const started = Date.now();
try {
  const result = await importDataset(prisma, sourceFromArgs(process.argv.slice(2)), (m) =>
    console.log(`[import] ${m}`),
  );
  console.log(
    `[import] done in ${Math.round((Date.now() - started) / 1000)}s: ${result.imported} artworks, ${result.removed} removed`,
  );
} catch (err) {
  console.error(`[import] failed: ${err instanceof Error ? err.message : err}`);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
