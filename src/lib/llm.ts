import { parseLLMOutput, type LLMOutput } from "../dsl";
import { envVar } from "./env";
import { generateWithClaude } from "./providers/claude";
import { generateWithGemini } from "./providers/gemini";

/**
 * llm.ts — transcript -> validated DSL, provider-agnostic.
 *
 * Picks a provider (Gemini = free tier, or Claude = paid), calls it, then runs
 * the result through the Zod gate (parseLLMOutput) — the single place that
 * guarantees valid DSL before anything downstream renders it. Both providers
 * run server-side; the API key never reaches the browser.
 *
 * Pick the provider with the LLM_PROVIDER env var ("gemini" | "claude").
 * If unset, prefer whichever key is present (Gemini first, since it's free).
 */

export const SYSTEM_PROMPT = `You turn a transcript or set of notes into a compact whiteboard structure (a "DSL"). You describe MEANING only — never positions, colors, or sizes (a layout engine and theme handle the look).

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
- Prefer FEW nodes. Aim for about 3-8 main concepts. Capture the structure and key relationships, not every sentence. (Concrete examples below don't count against this — keep them.)
- KEEP concrete examples and analogies the speaker uses to make a point (e.g. "like a concert with limited tickets", "a bakery with leftover bread"). Add the example as its own node (shape "text" or a small box, role "body") connected to the concept it illustrates (edge label "e.g."). Real examples aid understanding — don't abstract them away.
- Choose at most one heading, and mark the single most important concept as nodePrimary (or emphasis if it's a warning/takeaway).
- Group related nodes with the same group label.
- Use a diamond for a decision or question.
- For a step-by-step process or user flow, chain the steps with arrows in order so the sequence reads clearly.
- Keep labels short. Do not invent content that isn't in the transcript.
- noteHint: one plain-text sentence summarizing the board, for post-session notes.`;

export type Provider = "gemini" | "claude";

export function activeProvider(): Provider {
  const p = (envVar("LLM_PROVIDER") || "").toLowerCase();
  if (p === "claude" || p === "anthropic") return "claude";
  if (p === "gemini" || p === "google") return "gemini";
  // No explicit choice: prefer whichever key exists, Gemini first (it's free).
  if (envVar("GEMINI_API_KEY")) return "gemini";
  if (envVar("ANTHROPIC_API_KEY")) return "claude";
  return "gemini";
}

/** Generate a validated DSL from a transcript. Throws on missing key, API error,
 *  or output that fails the schema gate. */
export async function generateDSL(transcript: string): Promise<LLMOutput> {
  const provider = activeProvider();
  const raw =
    provider === "claude"
      ? await generateWithClaude(transcript, SYSTEM_PROMPT)
      : await generateWithGemini(transcript, SYSTEM_PROMPT);

  const out = parseLLMOutput(raw); // the single validation gate
  if (!out) throw new Error("Model output failed schema validation.");
  return out;
}
