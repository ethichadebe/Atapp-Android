import { defineConfig } from "vitest/config";

// `npm run test -w backend` runs both suites; the db one needs a Postgres.
export default defineConfig({
  test: {
    projects: ["./vitest.unit.config.ts", "./vitest.db.config.ts"],
  },
});
