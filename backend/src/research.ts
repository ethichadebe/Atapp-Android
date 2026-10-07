import Anthropic from "@anthropic-ai/sdk";
import type { Artwork } from "@prisma/client";

// The story behind an artwork, researched on the web by Claude and written in
// 60–90 words for the sheet under the picture. NGA's own text describes what
// the picture shows; this says who made it, when, why, and what it meant.
//
// Only what sources support goes in: every sentence is drawn from pages Claude
// found and cited, and those pages are kept and shown as the story's sources.
// When little is known about the piece itself, the story says less — the
// artist, the series, the technique, what the subject meant then — and never
// invents.

export const STORY_MODEL = "claude-opus-5-5";
const MAX_SEARCHES = 5;
const MAX_CONTINUATIONS = 3;

export interface Source {
  title: string;
  url: string;
}

export interface Story {
  text: string;
  sources: Source[];
  model: string;
}

export interface ResearchUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  searches: number;
  /** US dollars, from the published per-token and per-search prices. */
  estimatedCost: number;
}

export interface ResearchResult {
  story: Story | null;
  usage: ResearchUsage;
  /** Why there is no story, for the logs. */
  reason?: string;
}

export type Research = (artwork: Artwork) => Promise<ResearchResult>;

// Claude Opus 5.5: $4 / $20 per million input / output tokens, $0.40 per
// million cache reads; web search is $10 per 1,000 searches.
const PRICE = { input: 4e-6, output: 20e-6, cacheRead: 0.4e-6, search: 0.01 };

const SYSTEM = `You write the short story behind an artwork for Atapp, a phone app that shows one artwork from the National Gallery of Art (Washington) at a time. The reader can see the picture; they want to know what they are looking at and why it matters.

Research the artwork with web search before you write. Look for the work itself first (the museum's own page, catalogues, scholarship, reputable encyclopaedias), then its artist, the series or publication it belongs to, and its subject. Prefer museum, academic and well-edited reference sources.

Then write 60 to 90 words that intrigue and teach: lead with the most surprising true thing, then who made it, when, and why, and what it meant to people at the time. One idea per sentence, plain words, no jargon without a gloss.

Every fact must come from your sources. If little is known about this exact piece, write about what is documented (the artist, the series, the technique, the subject in its time) and say less rather than guess. Never invent names, dates, events or motives. Do not describe what the picture visibly shows unless it explains something.

Reply with the story only: one paragraph of plain text, no title, heading, list, quotation marks around the whole, or markdown.`;

function brief(a: Artwork): string {
  const lines = [
    `Title: ${a.title}`,
    a.attribution && `Artist: ${a.attribution}`,
    a.displayDate && `Date: ${a.displayDate}`,
    a.medium && `Medium: ${a.medium}`,
    a.classification && `Type: ${a.classification}`,
    a.creditLine && `Credit line: ${a.creditLine}`,
    `National Gallery of Art object number: ${a.objectId}`,
    a.imageAltText && `The museum's description of the image: ${a.imageAltText}`,
  ];
  return lines.filter(Boolean).join("\n");
}

function usageOf(messages: Anthropic.Beta.BetaMessage[]): ResearchUsage {
  const u = { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, searches: 0 };
  for (const m of messages) {
    u.inputTokens += m.usage.input_tokens + (m.usage.cache_creation_input_tokens ?? 0);
    u.outputTokens += m.usage.output_tokens;
    u.cacheReadTokens += m.usage.cache_read_input_tokens ?? 0;
    u.searches += m.usage.server_tool_use?.web_search_requests ?? 0;
  }
  const estimatedCost =
    u.inputTokens * PRICE.input + u.outputTokens * PRICE.output + u.cacheReadTokens * PRICE.cacheRead + u.searches * PRICE.search;
  return { ...u, estimatedCost: Math.round(estimatedCost * 10000) / 10000 };
}

/**
 * The story is the text Claude writes after its last search; the sources are
 * the pages that text cites, in order, each once.
 */
export function storyFrom(content: Anthropic.Beta.BetaContentBlock[]): { text: string; sources: Source[] } {
  let start = 0;
  content.forEach((b, i) => {
    if (b.type === "server_tool_use" || b.type === "web_search_tool_result") start = i + 1;
  });
  const sources = new Map<string, Source>();
  let text = "";
  for (const b of content.slice(start)) {
    if (b.type !== "text") continue;
    text += b.text;
    for (const c of b.citations ?? []) {
      if (c.type === "web_search_result_location" && !sources.has(c.url)) {
        sources.set(c.url, { title: c.title?.trim() || new URL(c.url).hostname, url: c.url });
      }
    }
  }
  return { text: text.replace(/\s+/g, " ").trim(), sources: [...sources.values()] };
}

export function makeResearch(client: Anthropic = new Anthropic()): Research {
  return async (artwork) => {
    const messages: Anthropic.Beta.BetaMessageParam[] = [{ role: "user", content: brief(artwork) }];
    const responses: Anthropic.Beta.BetaMessage[] = [];
    for (let turn = 0; turn <= MAX_CONTINUATIONS; turn++) {
      const response = await client.beta.messages
        .stream({
          model: STORY_MODEL,
          max_tokens: 16000,
          betas: ["server-side-fallback-2026-07-01"],
          // A declined request is re-run server-side on Anthropic's recommended
          // model for that kind of decline, rather than coming back empty.
          fallbacks: "default",
          thinking: { type: "adaptive" },
          output_config: { effort: "medium" },
          system: SYSTEM,
          tools: [{ type: "web_search_20260209", name: "web_search", max_uses: MAX_SEARCHES }],
          messages,
        })
        .finalMessage();
      responses.push(response);
      if (response.stop_reason === "pause_turn") {
        // The server-side search loop paused; send the turn back to resume it.
        messages.push({ role: "assistant", content: response.content });
        continue;
      }
      const usage = usageOf(responses);
      if (response.stop_reason === "refusal") return { story: null, usage, reason: "refused" };
      if (response.stop_reason !== "end_turn") return { story: null, usage, reason: `stopped: ${response.stop_reason}` };
      const { text, sources } = storyFrom(response.content);
      const words = text.split(" ").filter(Boolean).length;
      // A story with no source behind it, or far off the length, is not shown.
      if (sources.length === 0) return { story: null, usage, reason: "no sources cited" };
      if (words < 25 || words > 140) return { story: null, usage, reason: `${words} words` };
      return { story: { text, sources, model: response.model }, usage };
    }
    return { story: null, usage: usageOf(responses), reason: "still paused" };
  };
}
