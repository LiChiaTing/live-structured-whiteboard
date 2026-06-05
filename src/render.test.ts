import { describe, it, expect } from "vitest";
import { NodeSchema, EdgeSchema, parseLLMOutput } from "./dsl";
import { computeLayout, dslToSkeletons, type Box, type RenderInput } from "./render";

/**
 * Step 2 acceptance: given fixed DSL, the engine produces valid output, no
 * overlapping nodes, and arrows correctly bound to their from/to nodes.
 */

// --- helpers ---

/** Zod gives Node/Edge defaults (e.g. emphasis: "normal"); apply them so
 *  fixtures stay terse and realistic (LLM output is parsed the same way). */
const node = (n: Record<string, unknown>) => NodeSchema.parse(n);
const edge = (e: Record<string, unknown>) => EdgeSchema.parse(e);

function overlaps(a: Box, b: Box): boolean {
  // touching edges is fine; only true area overlap counts.
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

function expectNoOverlaps(boxes: Map<string, Box>) {
  const entries = [...boxes.entries()];
  for (let i = 0; i < entries.length; i++) {
    for (let j = i + 1; j < entries.length; j++) {
      const [idA, a] = entries[i];
      const [idB, b] = entries[j];
      expect(overlaps(a, b), `"${idA}" overlaps "${idB}"`).toBe(false);
    }
  }
}

// --- fixtures (2-3 hand-written DSL sets) ---

// F1: the canonical example — sun (circle) -> plant (rect), arrow "energy".
const F1: RenderInput = {
  nodes: [
    node({ id: "sun", label: "Sun", shape: "circle" }),
    node({ id: "plant", label: "Plant", shape: "rect" }),
  ],
  edges: [edge({ from: "sun", to: "plant", label: "energy" })],
};

// F2: a small flow with a decision diamond and one emphasized node.
const F2: RenderInput = {
  nodes: [
    node({ id: "input", label: "User input", shape: "rect" }),
    node({ id: "check", label: "Valid?", shape: "diamond" }),
    node({ id: "save", label: "Save", shape: "rect", emphasis: "strong" }),
    node({ id: "reject", label: "Reject", shape: "rect" }),
  ],
  edges: [
    edge({ from: "input", to: "check" }),
    edge({ from: "check", to: "save", label: "yes" }),
    edge({ from: "check", to: "reject", label: "no" }),
  ],
};

// F3: grouped nodes (two clusters) + a plain line connector.
const F3: RenderInput = {
  nodes: [
    node({ id: "a1", label: "Idea A1", shape: "ellipse", group: "A" }),
    node({ id: "a2", label: "Idea A2", shape: "ellipse", group: "A" }),
    node({ id: "b1", label: "Idea B1", shape: "ellipse", group: "B" }),
    node({ id: "note", label: "free note", shape: "text" }),
  ],
  edges: [edge({ from: "a1", to: "b1", style: "line" })],
};

describe("computeLayout — no overlaps", () => {
  it.each([
    ["F1", F1],
    ["F2", F2],
    ["F3", F3],
  ])("%s lays out without overlapping nodes", (_name, input) => {
    const boxes = computeLayout(input);
    expect(boxes.size).toBe(input.nodes.length);
    expectNoOverlaps(boxes);
  });

  it("respects flow direction: target is placed to the right of source (LR)", () => {
    const boxes = computeLayout(F1);
    const sun = boxes.get("sun")!;
    const plant = boxes.get("plant")!;
    expect(plant.x).toBeGreaterThan(sun.x);
  });
});

describe("dslToSkeletons — valid, well-formed output", () => {
  it("emits one skeleton per node plus one per edge", () => {
    const sk = dslToSkeletons(F2);
    expect(sk).toHaveLength(F2.nodes.length + F2.edges.length);
  });

  it("maps DSL shapes to Excalidraw element types", () => {
    const byId = new Map(dslToSkeletons(F2).filter((s) => s.id).map((s) => [s.id, s]));
    expect(byId.get("input")!.type).toBe("rectangle");
    expect(byId.get("check")!.type).toBe("diamond");
    const sun = dslToSkeletons(F1).find((s) => s.id === "sun")!;
    expect(sun.type).toBe("ellipse"); // circle -> ellipse
  });

  it("renders a node's label as its bound text", () => {
    const save = dslToSkeletons(F2).find((s) => s.id === "save")!;
    expect((save.label as { text: string }).text).toBe("Save");
  });

  it("applies emphasis: strong -> thicker, accented stroke", () => {
    const sk = dslToSkeletons(F2);
    const save = sk.find((s) => s.id === "save")!; // strong
    const reject = sk.find((s) => s.id === "reject")!; // normal
    expect(save.strokeWidth).toBeGreaterThan(reject.strokeWidth as number);
    expect(save.strokeColor).not.toBe(reject.strokeColor);
  });

  it("renders the 'text' shape as a plain text element (no container)", () => {
    const note = dslToSkeletons(F3).find((s) => s.id === "note")!;
    expect(note.type).toBe("text");
    expect(note.text).toBe("free note");
    expect(note.label).toBeUndefined();
  });
});

describe("dslToSkeletons — arrows correctly bound", () => {
  it("binds every connector to existing from/to node ids", () => {
    const sk = dslToSkeletons(F2);
    const ids = new Set(sk.filter((s) => s.id).map((s) => s.id));
    const connectors = sk.filter((s) => s.type === "arrow" || s.type === "line");
    expect(connectors).toHaveLength(F2.edges.length);
    for (const c of connectors) {
      expect(ids.has((c.start as { id: string }).id)).toBe(true);
      expect(ids.has((c.end as { id: string }).id)).toBe(true);
    }
  });

  it("uses 'arrow' by default and 'line' when style=line", () => {
    expect(dslToSkeletons(F1).find((s) => s.start)!.type).toBe("arrow");
    expect(dslToSkeletons(F3).find((s) => s.start)!.type).toBe("line");
  });

  it("spans connectors between nodes (not a zero-length stub)", () => {
    const arrow = dslToSkeletons(F1).find((s) => s.type === "arrow")!;
    const pts = arrow.points as [number, number][];
    expect(pts).toHaveLength(2);
    const [, [dx, dy]] = pts;
    const length = Math.hypot(dx, dy);
    expect(length).toBeGreaterThan(20); // real span, reaches the other node
  });

  it("puts the edge label on the connector", () => {
    const arrow = dslToSkeletons(F1).find((s) => s.type === "arrow")!;
    expect((arrow.label as { text: string }).text).toBe("energy");
  });

  it("drops edges that reference unknown nodes (defensive)", () => {
    const input: RenderInput = {
      nodes: [node({ id: "a", label: "A", shape: "rect" })],
      edges: [edge({ from: "a", to: "ghost" })],
    };
    const connectors = dslToSkeletons(input).filter((s) => s.start);
    expect(connectors).toHaveLength(0);
  });
});

describe("dsl validation gate", () => {
  it("accepts well-formed LLM output and applies defaults", () => {
    const out = parseLLMOutput({
      ops: [{ op: "add", nodes: [{ id: "x", label: "X", shape: "rect" }] }],
    });
    expect(out).not.toBeNull();
    expect(out!.ops[0].nodes[0].emphasis).toBe("normal"); // default applied
    expect(out!.ops[0].edges).toEqual([]); // default applied
  });

  it("rejects malformed output (bad shape) by returning null", () => {
    const out = parseLLMOutput({
      ops: [{ op: "add", nodes: [{ id: "x", label: "X", shape: "triangle" }] }],
    });
    expect(out).toBeNull();
  });
});
