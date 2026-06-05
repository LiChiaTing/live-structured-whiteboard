import { describe, it, expect } from "vitest";
import { NodeSchema, EdgeSchema, parseLLMOutput } from "./dsl";
import { computeLayout, dslToSkeletons, type Box, type RenderInput } from "./render";
import { KITS, getKit } from "./theme";

/**
 * Step 2 acceptance: given fixed DSL, the engine produces valid output, no
 * overlapping nodes, and arrows correctly bound to their from/to nodes — plus
 * the theme kit drives styling (role -> color) systematically.
 */

// --- helpers ---

/** Zod gives Node/Edge defaults (e.g. role: "concept"); apply them so fixtures
 *  stay terse and realistic (LLM output is parsed the same way). */
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

// --- fixtures (hand-written DSL sets) ---

// F1: the canonical example — sun (circle) -> plant (rect), arrow "energy".
const F1: RenderInput = {
  nodes: [
    node({ id: "sun", label: "Sun", shape: "circle" }),
    node({ id: "plant", label: "Plant", shape: "rect" }),
  ],
  edges: [edge({ from: "sun", to: "plant", label: "energy" })],
};

// F2: a small flow with a decision diamond and one "key" node.
const F2: RenderInput = {
  nodes: [
    node({ id: "input", label: "User input", shape: "rect" }),
    node({ id: "check", label: "Valid?", shape: "diamond" }),
    node({ id: "save", label: "Save", shape: "rect", role: "key" }),
    node({ id: "reject", label: "Reject", shape: "rect", role: "warning" }),
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

  it("renders the 'text' shape as a plain text element (no container)", () => {
    const note = dslToSkeletons(F3).find((s) => s.id === "note")!;
    expect(note.type).toBe("text");
    expect(note.text).toBe("free note");
    expect(note.label).toBeUndefined();
  });
});

describe("theme kit — role drives color, kit drives mood", () => {
  it("colors a node by its role, from the kit's palette", () => {
    const duotone = getKit("duotone");
    const sk = dslToSkeletons(F2, duotone);
    const save = sk.find((s) => s.id === "save")!; // role: key
    const reject = sk.find((s) => s.id === "reject")!; // role: warning
    expect(save.strokeColor).toBe(duotone.roleColors.key);
    expect(reject.strokeColor).toBe(duotone.roleColors.warning);
  });

  it("gives 'key' a heavier stroke than a normal node", () => {
    const sk = dslToSkeletons(F2, getKit("duotone"));
    const save = sk.find((s) => s.id === "save")!; // key
    const input = sk.find((s) => s.id === "input")!; // concept
    expect(save.strokeWidth as number).toBeGreaterThan(input.strokeWidth as number);
  });

  it("renders the SAME role differently across kits (systematic, not random)", () => {
    const notebook = dslToSkeletons(F2, getKit("notebook")).find((s) => s.id === "save")!;
    const editorial = dslToSkeletons(F2, getKit("editorial")).find((s) => s.id === "save")!;
    expect(notebook.strokeColor).toBe(KITS.notebook.roleColors.key);
    expect(editorial.strokeColor).toBe(KITS.editorial.roleColors.key);
    expect(notebook.strokeColor).not.toBe(editorial.strokeColor);
  });

  it("line roughness comes from the kit (clean vs hand vs sketchy)", () => {
    const clean = dslToSkeletons(F1, getKit("duotone")).find((s) => s.id === "sun")!;
    const hand = dslToSkeletons(F1, getKit("notebook")).find((s) => s.id === "sun")!;
    const sketchy = dslToSkeletons(F1, getKit("marker")).find((s) => s.id === "sun")!;
    expect(clean.roughness).toBe(0);
    expect(hand.roughness).toBe(1);
    expect(sketchy.roughness).toBe(2);
  });

  it("tints grouped nodes (and leaves ungrouped ones transparent)", () => {
    const kit = getKit("notebook");
    const sk = dslToSkeletons(F3, kit);
    const a1 = sk.find((s) => s.id === "a1")!; // group A
    const b1 = sk.find((s) => s.id === "b1")!; // group B
    expect(a1.backgroundColor).toBe(kit.groupTints[0]);
    expect(b1.backgroundColor).toBe(kit.groupTints[1]);
    expect(a1.backgroundColor).not.toBe(b1.backgroundColor); // distinct clusters
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
    expect(out!.ops[0].nodes[0].role).toBe("concept"); // default applied
    expect(out!.ops[0].edges).toEqual([]); // default applied
  });

  it("rejects malformed output (bad role) by returning null", () => {
    const out = parseLLMOutput({
      ops: [{ op: "add", nodes: [{ id: "x", label: "X", shape: "rect", role: "headline" }] }],
    });
    expect(out).toBeNull();
  });
});
