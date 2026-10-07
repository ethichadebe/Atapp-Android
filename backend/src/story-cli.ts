import { prisma } from "./db.js";
import { makeResearch } from "./research.js";

// Research one artwork's story and print it with its sources and cost,
// without saving anything: to judge the writing and the spend.
//
//   node dist/story-cli.js OBJECT_ID
//
// In production, inside the running stack (see README.md):
//   docker compose -f docker-compose.prod.yml run --rm --entrypoint node backend dist/story-cli.js 26000

const objectId = Number.parseInt(process.argv[2] ?? "", 10);
if (!Number.isInteger(objectId)) {
  console.error("usage: story-cli OBJECT_ID");
  process.exit(2);
}
if (!process.env.ANTHROPIC_API_KEY) {
  console.error("ANTHROPIC_API_KEY is not set");
  process.exit(2);
}

try {
  const artwork = await prisma.artwork.findUnique({ where: { objectId } });
  if (!artwork) throw new Error(`no artwork ${objectId}`);
  console.log(`${artwork.title}, ${artwork.attribution ?? "unknown artist"} (${artwork.displayDate ?? "undated"})\n`);
  const started = Date.now();
  const { story, usage, reason } = await makeResearch()(artwork);
  if (story) {
    console.log(story.text, `\n\n(${story.text.split(" ").length} words, ${story.model})\n\nSources:`);
    for (const s of story.sources) console.log(`  ${s.title}\n    ${s.url}`);
  } else {
    console.log(`No story: ${reason}`);
  }
  console.log(
    `\n${usage.searches} searches, ${usage.inputTokens} input + ${usage.outputTokens} output tokens,` +
      ` about $${usage.estimatedCost.toFixed(3)}, ${Math.round((Date.now() - started) / 1000)}s`,
  );
} finally {
  await prisma.$disconnect();
}
