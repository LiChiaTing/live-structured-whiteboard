import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { LLMOutputSchema } from "../../dsl";
import { envVar } from "../env";

/**
 * Claude provider — paid Anthropic API. Uses structured outputs so the response
 * is forced to match our schema. Returns the parsed object; llm.ts runs the
 * Zod gate. Model: Sonnet 4.6 (the balance of quality and cost for extraction).
 */
const MODEL = "claude-sonnet-4-6";

export async function generateWithClaude(transcript: string, system: string): Promise<unknown> {
  const apiKey = envVar("ANTHROPIC_API_KEY");
  if (!apiKey) throw new Error("Missing ANTHROPIC_API_KEY in .env.");

  const client = new Anthropic({ apiKey });
  const message = await client.messages.parse({
    model: MODEL,
    max_tokens: 4096,
    thinking: { type: "disabled" }, // fast, interactive — the prompt + schema do the work
    system,
    messages: [
      { role: "user", content: `Turn this into a whiteboard structure:\n\n"""\n${transcript.trim()}\n"""` },
    ],
    output_config: { format: zodOutputFormat(LLMOutputSchema) },
  });

  if (!message.parsed_output) {
    throw new Error(`Claude returned no valid DSL (stop_reason: ${message.stop_reason}).`);
  }
  return message.parsed_output;
}
