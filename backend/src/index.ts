import { buildApp } from "./app.js";
import { prisma } from "./db.js";
import { dayKey, setForDay } from "./dailyPick.js";
import { makeResearch } from "./research.js";
import { StoryWriter } from "./stories.js";

// 3001 is what the deploy dispatcher expects (BACKEND_PORT for `atapp`).
const PORT = 3001;
// How often to check that today's artworks have their stories.
const PREPARE_EVERY_MS = 30 * 60 * 1000;

// Stories are researched only when an Anthropic API key is set
// (ANTHROPIC_API_KEY in the server's .env). Without one, the app shows NGA's
// own descriptions, as before.
const stories = process.env.ANTHROPIC_API_KEY ? new StoryWriter(prisma, makeResearch()) : null;

const app = await buildApp({ logger: true, stories });

// Research today's artworks ahead of the first visitor, and catch the new day
// soon after midnight UTC.
async function prepareToday() {
  try {
    await stories?.queue(await setForDay(prisma, dayKey(new Date())));
  } catch (err) {
    app.log.warn({ err }, "could not prepare today's stories");
  }
}
const timer = stories ? setInterval(prepareToday, PREPARE_EVERY_MS) : null;
app.log.info(stories ? "story research on" : "story research off: no ANTHROPIC_API_KEY");

app.addHook("onClose", async () => {
  if (timer) clearInterval(timer);
  await prisma.$disconnect();
});

try {
  await app.listen({ port: PORT, host: "0.0.0.0" });
  void prepareToday();
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
