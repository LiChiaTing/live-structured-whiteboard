/**
 * mock-llm.ts — a stand-in for the real LLM (step 3).
 *
 * Step 3's goal is to wire the whole pipeline in the real UI without touching
 * a real model yet: text -> DSL -> validation gate -> render. So this returns
 * a fixed/deterministic DSL (raw LLMOutput shape). The real model arrives in
 * step 4; nothing downstream changes when we swap it in.
 *
 * Returns a plain object on purpose — it flows through `parseLLMOutput`
 * (the Zod gate) exactly like real model output would.
 */

export type Example = { label: string; transcript: string; output: unknown };

export const EXAMPLES: Example[] = [
  {
    label: "Photosynthesis",
    transcript:
      "Today: photosynthesis.\nInputs are sunlight, water, and CO2.\nIn the chloroplast they become glucose and oxygen.\nKey takeaway: plants turn light into food.",
    output: {
      ops: [
        {
          op: "add",
          nodes: [
            { id: "title", label: "Photosynthesis", shape: "text", role: "heading" },
            { id: "sun", label: "Sunlight", shape: "rect", role: "nodeSecondary", group: "inputs" },
            { id: "water", label: "Water", shape: "rect", role: "nodeSecondary", group: "inputs" },
            { id: "co2", label: "CO2", shape: "rect", role: "nodeSecondary", group: "inputs" },
            { id: "chloro", label: "Chloroplast", shape: "rect", role: "nodePrimary" },
            { id: "glucose", label: "Glucose + O2", shape: "rect", role: "nodePrimary" },
            { id: "key", label: "Light into food", shape: "rect", role: "emphasis" },
          ],
          edges: [
            { from: "title", to: "chloro" },
            { from: "sun", to: "chloro" },
            { from: "water", to: "chloro" },
            { from: "co2", to: "chloro" },
            { from: "chloro", to: "glucose", label: "produces" },
            { from: "glucose", to: "key", label: "so" },
          ],
        },
      ],
      noteHint: "Photosynthesis turns sunlight, water, and CO2 into glucose and oxygen.",
    },
  },
  {
    label: "Water cycle",
    transcript:
      "The water cycle.\nWater evaporates from the ocean.\nIt condenses into clouds.\nThen it falls as precipitation.\nAnd collects back into the ocean.",
    output: {
      ops: [
        {
          op: "add",
          nodes: [
            { id: "title", label: "The Water Cycle", shape: "text", role: "heading" },
            { id: "ocean", label: "Ocean", shape: "rect", role: "nodePrimary" },
            { id: "evap", label: "Evaporation", shape: "rect", role: "nodeSecondary" },
            { id: "cloud", label: "Clouds", shape: "ellipse", role: "nodeSecondary" },
            { id: "rain", label: "Precipitation", shape: "rect", role: "nodeSecondary" },
          ],
          edges: [
            { from: "ocean", to: "evap", label: "evaporates" },
            { from: "evap", to: "cloud", label: "condenses" },
            { from: "cloud", to: "rain", label: "falls" },
            { from: "rain", to: "ocean", label: "collects" },
          ],
        },
      ],
      noteHint: "Water cycles: evaporation -> clouds -> precipitation -> back to the ocean.",
    },
  },
];

/**
 * The mock "model." If the text matches a known example, return its prepared
 * DSL. Otherwise do a naive deterministic extraction: each non-empty line
 * becomes a node (first line is the heading), chained in order. This is NOT
 * real understanding — it just proves the pipeline end to end.
 */
export function mockGenerate(text: string): unknown {
  const match = EXAMPLES.find((e) => e.transcript.trim() === text.trim());
  if (match) return match.output;

  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return { ops: [] };

  const nodes = lines.map((line, i) => ({
    id: `n${i}`,
    label: line.length > 30 ? line.slice(0, 28) + "…" : line,
    shape: i === 0 ? "text" : "rect",
    role: i === 0 ? "heading" : "nodeSecondary",
  }));
  const edges = nodes.slice(1).map((n, i) => ({ from: nodes[i].id, to: n.id }));

  return { ops: [{ op: "add", nodes, edges }] };
}
