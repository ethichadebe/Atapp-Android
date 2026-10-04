import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// The deploy refuses any pending migration that matches this pattern, because
// the candidate runs against the live database. It is copied from
// `destructive_sql` in ethichadebe/workflows server/md-deploy-root (a
// case-insensitive grep -E there) so a refusal shows up here, in CI, rather
// than as a failed deploy. If the dispatcher's pattern changes, change this.
const DESTRUCTIVE =
  /DROP\s+TABLE|DROP\s+COLUMN|DROP\s+CONSTRAINT|DROP\s+SCHEMA|DROP\s+DATABASE|RENAME|TRUNCATE|DELETE\s+FROM|SET\s+NOT\s+NULL|ALTER\s+COLUMN[^;]*TYPE/i;

const dir = new URL("../prisma/migrations/", import.meta.url);
const migrations = readdirSync(dir, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name);

describe("migrations", () => {
  it("exist", () => {
    expect(migrations.length).toBeGreaterThan(0);
  });

  it.each(migrations)("%s is additive, so the deploy will accept it", (name) => {
    expect(name).toMatch(/^[0-9]{6,}_[A-Za-z0-9_]+$/);
    const lines = readFileSync(new URL(`${name}/migration.sql`, dir), "utf8").split("\n");
    expect(lines.filter((l) => DESTRUCTIVE.test(l))).toEqual([]);
  });
});
