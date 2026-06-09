import { describe, it, expect } from "vitest";
import { generateDSL } from "../lib/llm";
import { opsToRenderInput } from "../render";
import { EVAL_SET } from "./eval-set";

/**
 * Live eval — calls the real model, so it's gated: only runs when RUN_EVAL=1
 * AND an API key is present (`npm run eval`). It's skipped during `npm test`
 * so unit tests stay offline and free.
 *
 * Per case we check structural sanity (valid parse, node count in range,
 * concept coverage, edges where implied) and log a per-case concept-coverage
 * score so we can track the "structure correctness" target (>= 80%) over time.
 */

const ENABLED = Boolean(process.env.RUN_EVAL && process.env.ANTHROPIC_API_KEY);

describe.skipIf(!ENABLED)("LLM eval — transcript -> DSL structure", () => {
  for (const c of EVAL_SET) {
    it(
      c.name,
      async () => {
        const out = await generateDSL(c.transcript);
        const { nodes, edges } = opsToRenderInput(out);
        const labels = nodes.map((n) => n.label.toLowerCase());

        expect(nodes.length, "node count").toBeGreaterThanOrEqual(c.minNodes);
        expect(nodes.length, "node count").toBeLessThanOrEqual(c.maxNodes);

        const found = c.concepts.filter((k) => labels.some((l) => l.includes(k.toLowerCase())));
        const coverage = found.length / c.concepts.length;
        // eslint-disable-next-line no-console
        console.log(`  ${c.name}: ${nodes.length} nodes, ${edges.length} edges, concept coverage ${(coverage * 100).toFixed(0)}% (${found.join(", ")})`);
        expect(coverage, `concept coverage for "${c.name}"`).toBeGreaterThanOrEqual(0.6);

        if (c.expectEdges) expect(edges.length, "edges").toBeGreaterThan(0);

        // exactly one heading at most
        const headings = nodes.filter((n) => n.role === "heading");
        expect(headings.length, "headings").toBeLessThanOrEqual(1);
      },
      30000,
    );
  }
});
