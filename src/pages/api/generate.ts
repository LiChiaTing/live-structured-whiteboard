import type { APIRoute } from "astro";
import { generateDSL } from "../../lib/llm";

// Render on demand (not prerendered) — this is a live server endpoint. The API
// key is read here, server-side, and never sent to the browser.
export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  let transcript = "";
  try {
    const body = await request.json();
    transcript = typeof body?.transcript === "string" ? body.transcript : "";
  } catch {
    return json({ error: "Invalid request body." }, 400);
  }

  if (!transcript.trim()) {
    return json({ error: "Please enter some text first." }, 400);
  }

  try {
    const output = await generateDSL(transcript);
    return json({ output }, 200);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Generation failed.";
    // Don't leak internals; surface a clean message the UI can show.
    const status = message.includes("ANTHROPIC_API_KEY") ? 500 : 502;
    return json({ error: message }, status);
  }
};

function json(data: unknown, status: number): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}
