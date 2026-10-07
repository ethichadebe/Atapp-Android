import type Anthropic from "@anthropic-ai/sdk";
import type { Artwork } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { makeResearch, storyFrom } from "./research.js";

type Block = Anthropic.Beta.BetaContentBlock;

const artwork = {
  objectId: 26000,
  title: "Antony Thouret",
  attribution: "Honoré Daumier",
  displayDate: "1833",
  medium: "lithograph",
  classification: "Print",
  creditLine: "Rosenwald Collection",
  imageAltText: "A full-body illustration of a man standing with his hands in his pockets.",
} as Artwork;

const cite = (url: string, title: string | null) => ({
  type: "web_search_result_location" as const,
  url,
  title,
  cited_text: "…",
  encrypted_index: "x",
});

const search: Block[] = [
  { type: "server_tool_use", id: "s1", name: "web_search", input: { query: "Daumier Thouret" } } as unknown as Block,
  { type: "web_search_tool_result", tool_use_id: "s1", content: [] } as unknown as Block,
];

const STORY_A =
  "In 1833 Honoré Daumier was fresh out of prison for mocking the king when he began sculpting clay busts of parliament's deputies,";
const STORY_B =
  " then drew them for the satirical paper La Caricature. Antony Thouret, a republican journalist and politician, appears swollen with self-importance, his belly a joke readers would have recognised at once. These caricatures made Daumier the sharpest political cartoonist of his age.";

function message(content: Block[], stop: Anthropic.Beta.BetaStopReason, searches = 1): Anthropic.Beta.BetaMessage {
  return {
    id: "m",
    type: "message",
    role: "assistant",
    model: "claude-opus-5-5",
    content,
    stop_reason: stop,
    usage: {
      input_tokens: 20000,
      output_tokens: 1000,
      cache_creation_input_tokens: 0,
      cache_read_input_tokens: 0,
      server_tool_use: { web_search_requests: searches, web_fetch_requests: 0 },
    },
  } as unknown as Anthropic.Beta.BetaMessage;
}

/** A Claude client whose replies are scripted, recording what it was sent. */
function fakeClient(replies: Anthropic.Beta.BetaMessage[]) {
  const sent: unknown[] = [];
  const client = {
    beta: {
      messages: {
        stream: (params: unknown) => {
          sent.push(structuredClone(params));
          const reply = replies.shift();
          if (!reply) throw new Error("no more replies");
          return { finalMessage: async () => reply };
        },
      },
    },
  } as unknown as Anthropic;
  return { client, sent };
}

const written = (citations: ReturnType<typeof cite>[][]) =>
  [
    { type: "thinking", thinking: "", signature: "s" } as unknown as Block,
    ...search,
    { type: "text", text: STORY_A, citations: citations[0] } as unknown as Block,
    { type: "text", text: STORY_B, citations: citations[1] } as unknown as Block,
  ] as Block[];

describe("storyFrom", () => {
  it("takes the text after the last search, and the pages it cites, each once", () => {
    const content = [
      { type: "text", text: "Let me look this up.", citations: null } as unknown as Block,
      ...written([
        [cite("https://www.nga.gov/x", "NGA"), cite("https://en.wikipedia.org/wiki/Daumier", "Honoré Daumier")],
        [cite("https://www.nga.gov/x", "NGA"), cite("https://example.org/a", null)],
      ]),
    ];
    const { text, sources } = storyFrom(content);
    expect(text.startsWith("In 1833")).toBe(true);
    expect(text).not.toContain("Let me look");
    expect(sources).toEqual([
      { title: "NGA", url: "https://www.nga.gov/x" },
      { title: "Honoré Daumier", url: "https://en.wikipedia.org/wiki/Daumier" },
      { title: "example.org", url: "https://example.org/a" },
    ]);
  });
});

describe("makeResearch", () => {
  it("researches with web search on Claude Opus 5.5 and returns a sourced story", async () => {
    const { client, sent } = fakeClient([
      message(written([[cite("https://www.nga.gov/x", "NGA")], []]), "end_turn", 4),
    ]);
    const { story, usage } = await makeResearch(client)(artwork);
    expect(story?.text).toBe((STORY_A + STORY_B).replace(/\s+/g, " "));
    expect(story?.sources).toEqual([{ title: "NGA", url: "https://www.nga.gov/x" }]);
    expect(usage).toMatchObject({ inputTokens: 20000, outputTokens: 1000, searches: 4 });
    expect(usage.estimatedCost).toBeCloseTo(20000 * 4e-6 + 1000 * 20e-6 + 4 * 0.01, 4);
    const params = sent[0] as Record<string, unknown>;
    expect(params.model).toBe("claude-opus-5-5");
    expect(params.tools).toEqual([{ type: "web_search_20260209", name: "web_search", max_uses: 5 }]);
    expect(params.fallbacks).toBe("default");
    expect(JSON.stringify(params.messages)).toContain("Antony Thouret");
    expect(JSON.stringify(params.messages)).toContain("Honoré Daumier");
  });

  it("resumes a search loop the server paused, and adds up both turns", async () => {
    const { client, sent } = fakeClient([
      message(search, "pause_turn", 3),
      message(written([[cite("https://www.nga.gov/x", "NGA")], []]), "end_turn", 2),
    ]);
    const { story, usage } = await makeResearch(client)(artwork);
    expect(story).not.toBeNull();
    expect(usage.searches).toBe(5);
    const second = (sent[1] as { messages: { role: string }[] }).messages;
    expect(second.map((m) => m.role)).toEqual(["user", "assistant"]);
  });

  it("writes nothing when declined, unsourced, or far off the length", async () => {
    const cases: [Anthropic.Beta.BetaMessage, string][] = [
      [message([], "refusal"), "refused"],
      [message(written([[], []]), "end_turn"), "no sources cited"],
      [
        message([...search, { type: "text", text: "Too short.", citations: [cite("https://a.org", "A")] } as unknown as Block], "end_turn"),
        "2 words",
      ],
      [message(written([[cite("https://a.org", "A")], []]), "max_tokens"), "stopped: max_tokens"],
    ];
    for (const [reply, reason] of cases) {
      const { client } = fakeClient([reply]);
      const result = await makeResearch(client)(artwork);
      expect(result.story).toBeNull();
      expect(result.reason).toBe(reason);
    }
  });
});
