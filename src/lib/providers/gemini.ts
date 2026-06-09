import { GoogleGenAI } from "@google/genai";
import { envVar } from "../env";

/**
 * Gemini provider — free-tier real AI (Google AI Studio key).
 *
 * Returns a raw parsed object; the caller (llm.ts) runs it through the Zod gate
 * (parseLLMOutput). We use responseJsonSchema to force JSON shaped like our DSL.
 */

// gemini-2.5-flash is available on the free tier and is fast/capable enough here.
const MODEL = "gemini-2.5-flash";

// Hand-written JSON schema in Gemini's supported subset (type/enum/items/
// properties/required) — mirrors LLMOutputSchema. The Zod gate fills any
// defaults afterward.
const NODE_SCHEMA = {
  type: "object",
  properties: {
    id: { type: "string", description: "stable lowercase slug" },
    label: { type: "string", description: "short visible text, 1-4 words" },
    shape: { type: "string", enum: ["circle", "rect", "diamond", "text", "ellipse"] },
    group: { type: "string", description: "optional shared cluster label" },
    role: { type: "string", enum: ["heading", "body", "nodePrimary", "nodeSecondary", "emphasis"] },
  },
  required: ["id", "label", "shape", "role"],
} as const;

const EDGE_SCHEMA = {
  type: "object",
  properties: {
    from: { type: "string" },
    to: { type: "string" },
    label: { type: "string", description: "optional short relationship" },
    style: { type: "string", enum: ["arrow", "line"] },
  },
  required: ["from", "to", "style"],
} as const;

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    ops: {
      type: "array",
      items: {
        type: "object",
        properties: {
          op: { type: "string", enum: ["add", "connect", "update", "remove"] },
          nodes: { type: "array", items: NODE_SCHEMA },
          edges: { type: "array", items: EDGE_SCHEMA },
          removeIds: { type: "array", items: { type: "string" } },
        },
        required: ["op", "nodes", "edges"],
      },
    },
    noteHint: { type: "string", description: "one-line plain-text summary for notes" },
  },
  required: ["ops"],
} as const;

export async function generateWithGemini(transcript: string, system: string): Promise<unknown> {
  const apiKey = envVar("GEMINI_API_KEY");
  if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY. Get a free key at https://aistudio.google.com/apikey and add it to .env.");
  }

  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: MODEL,
    contents: `Turn this into a whiteboard structure:\n\n"""\n${transcript.trim()}\n"""`,
    config: {
      systemInstruction: system,
      responseMimeType: "application/json",
      responseJsonSchema: RESPONSE_SCHEMA,
    },
  });

  const text = response.text;
  if (!text) throw new Error("Gemini returned an empty response.");
  try {
    return JSON.parse(text);
  } catch {
    throw new Error("Gemini returned output that wasn't valid JSON.");
  }
}
