import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// What the deploy dispatcher assumes about docker-compose.prod.yml. Breaking
// any of these fails a deploy on the server, so they are checked here first.
// Comments stripped: only what compose actually reads counts.
const compose = readFileSync(new URL("../../docker-compose.prod.yml", import.meta.url), "utf8")
  .split("\n")
  .filter((line) => !/^\s*#/.test(line))
  .join("\n");

function service(name: string): string {
  const m = compose.match(new RegExp(`^  ${name}:\\n((?:    .*\\n|\\s*\\n)*)`, "m"));
  if (!m) throw new Error(`no ${name} service`);
  return m[1];
}

describe("docker-compose.prod.yml", () => {
  it("runs the backend and frontend from images the deploy chooses, never building", () => {
    expect(service("backend")).toMatch(/^\s+image: \$\{BACKEND_IMAGE\}$/m);
    expect(service("frontend")).toMatch(/^\s+image: \$\{FRONTEND_IMAGE\}$/m);
    expect(compose).not.toMatch(/^\s+build:/m);
  });

  it("keeps the database on a fixed image, so a deploy never recreates it", () => {
    const db = service("postgres");
    // A literal tag, not a variable the deploy could rewrite.
    expect(db).toMatch(/^\s+image: postgres:16-alpine$/m);
    expect(db).toMatch(/postgres_data:\/var\/lib\/postgresql\/data/);
  });

  it("pins the project name, so the live network is atapp_default", () => {
    expect(compose).toMatch(/^name: atapp$/m);
  });

  it("never binds the deploy's candidate ports", () => {
    expect(compose).not.toMatch(/\b13001\b|\b18082\b/);
  });

  it("gives the backend its database URL straight from .env, as the candidate gets it", () => {
    // The candidate is started with `docker run --env-file .env`, not through
    // compose, so anything the backend needs must be a plain .env value.
    expect(service("backend")).toMatch(/DATABASE_URL: \$\{DATABASE_URL\}/);
  });

  it("passes the optional Anthropic API key from .env, empty when unset", () => {
    expect(service("backend")).toMatch(/ANTHROPIC_API_KEY: \$\{ANTHROPIC_API_KEY:-\}/);
  });
});
