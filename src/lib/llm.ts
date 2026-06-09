import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { LLMOutputSchema, type LLMOutput } from "../dsl";

/**
 * llm.ts — the real model call (step 4): transcript -> validated DSL.
 *
 * Uses Claude with structured outputs (output_config.format) so the response is
 * forced to match our schema, then validates with Zod (LLMOutputSchema) as the
 * gate. The endpoint (src/pages/api/generate.ts) and the eval harness both call
 * generateDSL — the API key stays server-side and never reaches the browser.
 */

// Sonnet 4.6 — the balance of quality and cost for this extraction task.
const MODEL = "claude-sonnet-4-6";

const SYSTEM_PROMPT = `You turn a transcript or set of notes into a compact whiteboard structure (a "DSL"). You describe MEANING only — never positions, colors, or sizes (a layout engine and theme handle the look).

Output a set of nodes and edges wrapped in a single op with "op": "add".

NODE fields:
- id: a short, stable, lowercase slug (e.g. "sun", "photosynthesis"). Reuse the same id if the same concept recurs.
- label: the visible text — terse, ideally 1-4 words.
- shape: "rect" (default, for most concepts), "ellipse" or "circle" (entities / actors / ideas), "diamond" (a decision or question), "text" (a free-floating note or a title with no box).
- role (this drives color/weight via the theme):
  - "heading" — the single title of the board (use at most one; shape it as "text").
  - "nodePrimary" — the central / most important concept.
  - "nodeSecondary" — supporting concepts (the default for most nodes).
  - "emphasis" — a critical point, warning, or key takeaway to make stand out.
  - "body" — a plain side note or caption.
- group (optional): a label shared by nodes that belong together; they get clustered and framed.

EDGE fields:
- from, to: node ids.
- label (optional): the relationship, very short (e.g. "causes", "yes", "needs").
- style: "arrow" (default, directed) or "line" (undirected association).

PRINCIPLES (important — this is a low-cognitive-load whiteboard, not a transcript dump):
- Prefer FEW nodes. Aim for about 3-8. Capture the structure and key relationships, not every sentence.
- Choose at most one heading, and mark the single most important concept as nodePrimary (or emphasis if it's a warning/takeaway).
- Group related nodes with the same group label.
- Use a diamond for a decision or question.
- Keep labels short. Do not invent content that isn't in the transcript.
- noteHint: one plain-text sentence summarizing the board, for post-session notes.`;

function getApiKey(): string {
  // Works in both Astro (server) and Vitest — both are Vite-based.
  const key =
    (typeof import.meta !== "undefined" && (import.meta as any).env?.ANTHROPIC_API_KEY) ||
    (typeof process !== "undefined" && process.env?.ANTHROPIC_API_KEY);
  if (!key) {
    throw new Error("Missing ANTHROPIC_API_KEY. Add it to your .env file.");
  }
  return key;
}

/**
 * Generate a validated DSL from a transcript. Throws on a missing key, an API
 * error, or output that fails the schema gate.
 */
export async function generateDSL(transcript: string): Promise<LLMOutput> {
  const client = new Anthropic({ apiKey: getApiKey() });

  const message = await client.messages.parse({
    model: MODEL,
    max_tokens: 4096,
    thinking: { type: "disabled" }, // fast, interactive — the prompt + schema do the work
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Turn this into a whiteboard structure:\n\n"""\n${transcript.trim()}\n"""`,
      },
    ],
    output_config: { format: zodOutputFormat(LLMOutputSchema) },
  });

  const parsed = message.parsed_output;
  if (!parsed) {
    // refusal, max_tokens, or schema mismatch — never send unvalidated data on.
    throw new Error(`Model did not return valid DSL (stop_reason: ${message.stop_reason}).`);
  }
  return parsed;
}
