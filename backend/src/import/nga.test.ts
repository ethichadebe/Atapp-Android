import { describe, expect, it } from "vitest";
import { readArtworks, readImages } from "./nga.js";
import { imageRow, objectRow, source } from "../test/fixtures.js";

async function collect(images: string[], objects: string[]) {
  const src = source(images, objects);
  const map = await readImages(await src.open("published_images.csv"));
  const rows = [];
  for await (const r of readArtworks(await src.open("objects.csv"), map)) rows.push(r);
  return rows;
}

describe("reading the NGA CSVs", () => {
  it("joins an object to its open-access primary image", async () => {
    const rows = await collect(
      [imageRow({ uuid: "img-1", objectId: 46482, alt: 'A woman in a "pink" hat.' })],
      [objectRow({ objectId: 46482, title: "Portrait of a Lady" })],
    );
    expect(rows).toEqual([
      expect.objectContaining({
        objectId: 46482,
        title: "Portrait of a Lady",
        attribution: "Mary Cassatt",
        displayDate: "c. 1887",
        medium: "oil on canvas",
        dimensions: "overall: 72.9 x 60.3 cm\nframed: 100.3 x 84.1 cm",
        creditLine: "Chester Dale Collection",
        imageUuid: "img-1",
        iiifUrl: "https://api.nga.gov/iiif/img-1",
        imageWidth: 3000,
        imageHeight: 4000,
        imageAltText: 'A woman in a "pink" hat.',
      }),
    ]);
  });

  it("skips objects whose image is not open access, or not the primary view", async () => {
    const rows = await collect(
      [
        imageRow({ uuid: "closed", objectId: 1, openaccess: "0" }),
        imageRow({ uuid: "alt-view", objectId: 2, viewtype: "alternate" }),
      ],
      [objectRow({ objectId: 1, title: "A" }), objectRow({ objectId: 2, title: "B" }), objectRow({ objectId: 3, title: "C" })],
    );
    expect(rows).toEqual([]);
  });

  it("keeps the first primary image when an object has several", async () => {
    const rows = await collect(
      [
        imageRow({ uuid: "second", objectId: 5, sequence: 1 }),
        imageRow({ uuid: "first", objectId: 5, sequence: 0 }),
      ],
      [objectRow({ objectId: 5, title: "Diptych" })],
    );
    expect(rows.map((r) => r.imageUuid)).toEqual(["first"]);
  });
});
