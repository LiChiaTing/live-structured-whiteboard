/**
 * eval-set.ts — the regression set for step 4.
 *
 * 8 short transcripts across scenarios (teaching / meeting / brainstorm) with
 * lenient, structural expectations. We don't assert an exact DSL (the model
 * varies) — we check the structure is sane: a reasonable node count, the key
 * concepts show up somewhere, and connections exist where the content implies
 * relationships. Run with `npm run eval` (needs ANTHROPIC_API_KEY).
 */

export type EvalCase = {
  name: string;
  transcript: string;
  minNodes: number;
  maxNodes: number;
  /** Keywords expected to appear (case-insensitive substring) in some node label. */
  concepts: string[];
  /** Whether the content clearly implies at least one connection. */
  expectEdges: boolean;
};

export const EVAL_SET: EvalCase[] = [
  {
    name: "photosynthesis (teaching)",
    transcript:
      "Photosynthesis: plants take in sunlight, water, and carbon dioxide. In the chloroplast these are converted into glucose and oxygen.",
    minNodes: 3,
    maxNodes: 8,
    concepts: ["sun", "water", "glucose"],
    expectEdges: true,
  },
  {
    name: "water cycle (teaching)",
    transcript:
      "The water cycle: water evaporates from the ocean, condenses into clouds, falls as precipitation, and flows back to the ocean.",
    minNodes: 3,
    maxNodes: 7,
    concepts: ["evapor", "cloud", "precipitation"],
    expectEdges: true,
  },
  {
    name: "supply and demand (teaching)",
    transcript:
      "When demand rises and supply stays flat, the price goes up. When supply rises and demand stays flat, the price goes down.",
    minNodes: 3,
    maxNodes: 7,
    concepts: ["demand", "supply", "price"],
    expectEdges: true,
  },
  {
    name: "sprint planning (meeting)",
    transcript:
      "For this sprint we have three workstreams: the checkout redesign, the search fix, and the analytics dashboard. Checkout is the priority. Search depends on the new API.",
    minNodes: 3,
    maxNodes: 8,
    concepts: ["checkout", "search", "analytics"],
    expectEdges: true,
  },
  {
    name: "go / no-go decision (meeting)",
    transcript:
      "We need to decide whether to launch on Friday. If QA passes, we ship. If not, we delay to next week.",
    minNodes: 3,
    maxNodes: 7,
    concepts: ["launch", "ship", "delay"],
    expectEdges: true,
  },
  {
    name: "roles and owners (meeting)",
    transcript:
      "Ana owns design. Ben owns the backend. Chen owns QA. Design hands off to backend, and backend hands off to QA before release.",
    minNodes: 3,
    maxNodes: 8,
    concepts: ["design", "backend", "qa"],
    expectEdges: true,
  },
  {
    name: "app feature brainstorm (brainstorm)",
    transcript:
      "Ideas for the app: offline mode, dark theme, a sharing feature, and reminders. Offline mode is the most important one.",
    minNodes: 3,
    maxNodes: 8,
    concepts: ["offline", "dark", "shar"],
    expectEdges: false,
  },
  {
    name: "pros and cons (brainstorm)",
    transcript:
      "Moving to a subscription model. Pros: predictable revenue and ongoing updates. Cons: higher churn risk and pricing pushback.",
    minNodes: 3,
    maxNodes: 8,
    concepts: ["revenue", "churn", "subscription"],
    expectEdges: false,
  },
];
