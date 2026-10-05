import { Readable } from "node:stream";
import type { ImportSource } from "../import/run.js";

// A few rows shaped exactly like NGA's CSVs (same headers, same quoting, CRLF
// inside quoted fields), cut down to what the importer reads.

const IMAGE_HEADER =
  "uuid,iiifurl,iiifthumburl,viewtype,sequence,width,height,maxpixels,openaccess,created,modified,depictstmsobjectid,assistivetext";
const OBJECT_HEADER =
  "objectid,uuid,accessioned,accessionnum,locationid,title,displaydate,beginyear,endyear,visualbrowsertimespan,medium,dimensions,inscription,markings,attributioninverted,attribution,provenancetext,creditline,classification,subclassification,visualbrowserclassification,parentid,isvirtual,departmentabbr,portfolio,series,volume,watermarks,lastdetectedmodification,wikidataid,customprinturl";

export function imageRow(o: {
  uuid: string;
  objectId: number;
  viewtype?: string;
  openaccess?: string;
  sequence?: number;
  alt?: string;
}): string {
  const base = `https://api.nga.gov/iiif/${o.uuid}`;
  return [
    o.uuid,
    base,
    `"${base}/full/!200,200/0/default.jpg"`,
    o.viewtype ?? "primary",
    o.sequence ?? 0,
    3000,
    4000,
    "",
    o.openaccess ?? "1",
    "2013-07-05 15:41:08-04",
    "2026-04-13 11:15:14-04",
    o.objectId,
    o.alt === undefined ? "" : `"${o.alt.replace(/"/g, '""')}"`,
  ].join(",");
}

export function objectRow(o: { objectId: number; title: string; attribution?: string; dimensions?: string }): string {
  const cols = new Array(31).fill("");
  cols[0] = String(o.objectId);
  cols[1] = `uuid-${o.objectId}`;
  cols[2] = "1";
  cols[5] = `"${o.title.replace(/"/g, '""')}"`;
  cols[6] = "c. 1887";
  cols[10] = "oil on canvas";
  cols[11] = `"${(o.dimensions ?? "overall: 72.9 x 60.3 cm\r\nframed: 100.3 x 84.1 cm").replace(/"/g, '""')}"`;
  cols[15] = o.attribution ?? "Mary Cassatt";
  cols[17] = "Chester Dale Collection";
  cols[18] = "Painting";
  return cols.join(",");
}

export function source(images: string[], objects: string[], label = "fixture"): ImportSource {
  const files = {
    "published_images.csv": [IMAGE_HEADER, ...images].join("\n") + "\n",
    "objects.csv": [OBJECT_HEADER, ...objects].join("\n") + "\n",
  };
  return { label, open: async (file) => Readable.from([files[file]]) };
}
