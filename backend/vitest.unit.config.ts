import { defineConfig } from "vitest/config";

// Everything that needs no database. No DATABASE_URL is set on purpose: a test
// here that reaches for the real client fails loudly.
export default defineConfig({
  test: {
    name: "unit",
    environment: "node",
    include: ["src/**/*.test.ts"],
    exclude: ["**/node_modules/**", "**/dist/**", "src/**/*.db.test.ts"],
  },
});
