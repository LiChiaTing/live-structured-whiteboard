import { describe, it, expect } from "vitest";
import { generateDSL } from "../lib/llm";
import { opsToRenderInput } from "../render";
import { EVAL_SET } from "./eval-set";

/**
 * Live eval — calls the real model, so it's gated: only runs when RUN_EVAL=1
 * AND an API key is present (`npm run eval`). Skipped during `npm test`.
 *
 * Runs as ONE sequential, paced test: the free Gemini tier allows ~5 requests
 * per minute, so we space calls ~14s apart to stay under the limit (firing all
 * 8 at once just trips rate limits). It logs a per-case breakdown and asserts
 * the aggregate "structure correctness" score meets the target.
 */

const ENABLED = Boolean(
  process.env.RUN_EVAL && (process.env.GEMINI_API_KEY || process.env.ANTHROPIC_API_KEY),
);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const PACE_MS = 14000; // stay under the free 5/min limit
const TARGET = 0.7; // aggregate structure-correctness threshold

describe.skipIf(!ENABLED)("LLM eval — transcript -> DSL structure", () => {
  it(
    "structure correctness across the eval set",
    async () => {
      const rows: { name: string; nodes: number; edges: number; coverage: number; ok: boolean }[] = [];

      for (let i = 0; i < EVAL_SET.length; i++) {
        if (i > 0) await sleep(PACE_MS); // pace to respect the free-tier rate limit
        const c = EVAL_SET[i];
        const out = await generateDSL(c.transcript);
        const { nodes, edges } = opsToRenderInput(out);
        const labels = nodes.map((n) => n.label.toLowerCase());

        const countOk = nodes.length >= c.minNodes && nodes.length <= c.maxNodes;
        const found = c.concepts.filter((k) => labels.some((l) => l.includes(k.toLowerCase())));
        const coverage = found.length / c.concepts.length;
        const edgesOk = !c.expectEdges || edges.length > 0;
        const headingsOk = nodes.filter((n) => n.role === "heading").length <= 1;
        const ok = countOk && coverage >= 0.6 && edgesOk && headingsOk;

        rows.push({ name: c.name, nodes: nodes.length, edges: edges.length, coverage, ok });
        // eslint-disable-next-line no-console
        console.log(
          `  ${ok ? "✓" : "✗"} ${c.name}: ${nodes.length} nodes, ${edges.length} edges, concepts ${(coverage * 100).toFixed(0)}%`,
        );
      }

      const score = rows.filter((r) => r.ok).length / rows.length;
      // eslint-disable-next-line no-console
      console.log(`\n  Structure correctness: ${(score * 100).toFixed(0)}% (${rows.filter((r) => r.ok).length}/${rows.length})`);
      expect(score, "aggregate structure correctness").toBeGreaterThanOrEqual(TARGET);
    },
    240000, // 8 cases, paced ~14s apart
  );
});
