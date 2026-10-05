import { buildApp } from "./app.js";
import { prisma } from "./db.js";

// 3001 is what the deploy dispatcher expects (BACKEND_PORT for `atapp`).
const PORT = 3001;

const app = await buildApp({ logger: true });

app.addHook("onClose", async () => {
  await prisma.$disconnect();
});

try {
  await app.listen({ port: PORT, host: "0.0.0.0" });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
