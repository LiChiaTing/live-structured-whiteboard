import { GoogleGenAI } from "@google/genai";
import { envVar } from "../env";

/**
 * Gemini provider — free-tier real AI (Google AI Studio key).
 *
 * Returns a raw parsed object; the caller (llm.ts) runs it through the Zod gate
 * (parseLLMOutput). We use responseJsonSchema to force JSON shaped like our DSL.
 */

// gemini-2.5-flash is available on the free tier and is fast/capable enough.
// Overridable via GEMINI_MODEL (e.g. the eval uses gemini-2.0-flash, which has
// a separate, higher free-tier rate limit).
const MODEL = envVar("GEMINI_MODEL") || "gemini-2.5-flash";

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

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Pull the server-suggested retry delay (e.g. "17.6s") out of an error, in ms. */
function retryDelayMs(err: unknown): number | null {
  const msg = err instanceof Error ? err.message : String(err);
  const m = /retry(?:Delay|\s+in)[":\s]+([\d.]+)s/i.exec(msg);
  return m ? Math.ceil(parseFloat(m[1]) * 1000) : null;
}

function isRetryable(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /\b(429|503)\b|RESOURCE_EXHAUSTED|UNAVAILABLE|high demand/i.test(msg);
}

export async function generateWithGemini(transcript: string, system: string): Promise<unknown> {
  const apiKey = envVar("GEMINI_API_KEY");
  if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY. Get a free key at https://aistudio.google.com/apikey and add it to .env.");
  }

  const ai = new GoogleGenAI({ apiKey });
  const params = {
    model: MODEL,
    contents: `Turn this into a whiteboard structure:\n\n"""\n${transcript.trim()}\n"""`,
    config: {
      systemInstruction: system,
      responseMimeType: "application/json",
      responseJsonSchema: RESPONSE_SCHEMA,
    },
  };

  // The free tier is rate-limited. Retry on 429/503 once or twice, waiting the
  // server-suggested delay, so transient limits self-heal. Kept short so an
  // interactive request fails fast (with a clear message) rather than hanging
  // when the daily free allowance is exhausted.
  const MAX_RETRIES = 2;
  let lastErr: unknown;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await ai.models.generateContent(params);
      const text = response.text;
      if (!text) throw new Error("Gemini returned an empty response.");
      try {
        return JSON.parse(text);
      } catch {
        throw new Error("Gemini returned output that wasn't valid JSON.");
      }
    } catch (err) {
      lastErr = err;
      if (!isRetryable(err) || attempt === MAX_RETRIES) break;
      const wait = Math.min(retryDelayMs(err) ?? 3000 * 2 ** attempt, 20000) + 300;
      await sleep(wait);
    }
  }

  const msg = lastErr instanceof Error ? lastErr.message : String(lastErr);
  if (/429|RESOURCE_EXHAUSTED/i.test(msg)) {
    throw new Error("Gemini free-tier limit reached (5 requests/minute). Wait a minute and try again.");
  }
  if (/503|UNAVAILABLE|high demand/i.test(msg)) {
    throw new Error("Gemini is busy right now. Please try again in a moment.");
  }
  throw lastErr instanceof Error ? lastErr : new Error("Gemini request failed.");
}
