import { defineConfig } from "vitest/config";

// `*.db.test.ts`: needs a Postgres with the migrations applied
// (DATABASE_URL=... npx prisma migrate deploy). Each test truncates the tables
// it uses, so files run one at a time.
export default defineConfig({
  test: {
    name: "db",
    environment: "node",
    include: ["src/**/*.db.test.ts"],
    fileParallelism: false,
    env: {
      DATABASE_URL: process.env.DATABASE_URL_TEST ?? "postgresql://atapp:atapp@localhost:5432/atapp_test",
    },
  },
});
