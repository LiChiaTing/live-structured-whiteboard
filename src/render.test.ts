import { describe, it, expect } from "vitest";
import { NodeSchema, EdgeSchema, parseLLMOutput } from "./dsl";
import { computeLayout, dslToSkeletons, opsToRenderInput, type Box, type RenderInput } from "./render";
import { THEMES, getTheme } from "./theme";
import { mockGenerate, EXAMPLES } from "./lib/mock-llm";

/**
 * Step 2 acceptance: given fixed DSL, the engine produces valid output, no
 * overlapping nodes, and arrows correctly bound — plus the theme's role table
 * drives styling systematically (role -> style, theme -> look).
 */

// --- helpers ---

/** Zod gives Node/Edge defaults (e.g. role: "nodeSecondary"); apply them so
 *  fixtures stay terse (LLM output is parsed the same way). */
const node = (n: Record<string, unknown>) => NodeSchema.parse(n);
const edge = (e: Record<string, unknown>) => EdgeSchema.parse(e);

function overlaps(a: Box, b: Box): boolean {
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

// --- fixtures ---

const F1: RenderInput = {
  nodes: [
    node({ id: "sun", label: "Sun", shape: "circle" }),
    node({ id: "plant", label: "Plant", shape: "rect" }),
  ],
  edges: [edge({ from: "sun", to: "plant", label: "energy" })],
};

const F2: RenderInput = {
  nodes: [
    node({ id: "input", label: "User input", shape: "rect" }),
    node({ id: "check", label: "Valid?", shape: "diamond" }),
    node({ id: "save", label: "Save", shape: "rect", role: "nodePrimary" }),
    node({ id: "reject", label: "Reject", shape: "rect", role: "emphasis" }),
  ],
  edges: [
    edge({ from: "input", to: "check" }),
    edge({ from: "check", to: "save", label: "yes" }),
    edge({ from: "check", to: "reject", label: "no" }),
  ],
};

const F3: RenderInput = {
  nodes: [
    node({ id: "a1", label: "Idea A1", shape: "ellipse", group: "A" }),
    node({ id: "a2", label: "Idea A2", shape: "ellipse", group: "A" }),
    node({ id: "b1", label: "Idea B1", shape: "ellipse", group: "B" }),
    node({ id: "note", label: "free note", shape: "text", role: "body" }),
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
    expect(boxes.get("plant")!.x).toBeGreaterThan(boxes.get("sun")!.x);
  });
});

describe("representation drives the layout", () => {
  it("flow lays out top-to-bottom (target below the source)", () => {
    const boxes = computeLayout(F1, undefined, "flow");
    expect(boxes.get("plant")!.y).toBeGreaterThan(boxes.get("sun")!.y);
  });

  it("concept lays out left-to-right (target right of the source)", () => {
    const boxes = computeLayout(F1, undefined, "concept");
    expect(boxes.get("plant")!.x).toBeGreaterThan(boxes.get("sun")!.x);
  });

  it("comparison places groups as side-by-side columns", () => {
    const boxes = computeLayout(F3, undefined, "comparison");
    const aRight = Math.max(
      boxes.get("a1")!.x + boxes.get("a1")!.width,
      boxes.get("a2")!.x + boxes.get("a2")!.width,
    );
    const bLeft = boxes.get("b1")!.x;
    expect(aRight).toBeLessThanOrEqual(bLeft); // group A column sits left of group B column
    expect(Math.abs(boxes.get("a1")!.x - boxes.get("a2")!.x)).toBeLessThan(boxes.get("a1")!.width); // stacked in one column
  });

  it.each(["flow", "concept", "comparison", "hierarchy", "timeline", "cycle"] as const)(
    "%s lays out without overlaps",
    (rep) => {
      expectNoOverlaps(computeLayout(F3, undefined, rep));
    },
  );
});

describe("dslToSkeletons — valid, well-formed output", () => {
  it("emits one skeleton per node plus one per edge (no groups -> no frames)", () => {
    const sk = dslToSkeletons(F2);
    expect(sk).toHaveLength(F2.nodes.length + F2.edges.length);
  });

  it("maps DSL shapes to Excalidraw element types", () => {
    const byId = new Map(dslToSkeletons(F2).filter((s) => s.id).map((s) => [s.id, s]));
    expect(byId.get("input")!.type).toBe("rectangle");
    expect(byId.get("check")!.type).toBe("diamond");
    expect(dslToSkeletons(F1).find((s) => s.id === "sun")!.type).toBe("ellipse"); // circle -> ellipse
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

describe("theme — role drives style, theme drives look", () => {
  it("styles a node from its role in the theme's table", () => {
    const theme = getTheme("duotone-flat");
    const save = dslToSkeletons(F2, theme).find((s) => s.id === "save")!; // nodePrimary
    expect(save.strokeColor).toBe(theme.roles.nodePrimary.strokeColor);
    expect(save.backgroundColor).toBe(theme.roles.nodePrimary.backgroundColor);
  });

  it("renders the SAME role differently across themes (systematic, not random)", () => {
    const duotone = dslToSkeletons(F2, getTheme("duotone-flat")).find((s) => s.id === "save")!;
    const editorial = dslToSkeletons(F2, getTheme("editorial-geometric")).find((s) => s.id === "save")!;
    expect(duotone.strokeColor).toBe(THEMES["duotone-flat"].roles.nodePrimary.strokeColor);
    expect(editorial.strokeColor).toBe(THEMES["editorial-geometric"].roles.nodePrimary.strokeColor);
    expect(duotone.strokeColor).not.toBe(editorial.strokeColor);
  });

  it("a heavier role (heading) gets a thicker stroke than body", () => {
    const theme = getTheme("duotone-flat");
    expect(theme.roles.heading.strokeWidth).toBeGreaterThan(theme.roles.body.strokeWidth);
  });

  it("roughness comes from the theme (clean / natural / sketchy)", () => {
    expect(dslToSkeletons(F1, getTheme("duotone-flat")).find((s) => s.id === "sun")!.roughness).toBe(0);
    expect(dslToSkeletons(F1, getTheme("handwritten-notes")).find((s) => s.id === "sun")!.roughness).toBe(1);
    expect(dslToSkeletons(F1, getTheme("doodle-sketch")).find((s) => s.id === "sun")!.roughness).toBe(2);
  });

  it("styles connectors from the theme's connector role", () => {
    const theme = getTheme("editorial-geometric");
    const arrow = dslToSkeletons(F2, theme).find((s) => s.type === "arrow")!;
    expect(arrow.strokeColor).toBe(theme.roles.connector.strokeColor);
  });

  it("draws a frame behind each group, styled by the frame role", () => {
    const theme = getTheme("handwritten-notes");
    const sk = dslToSkeletons(F3, theme);
    const frames = sk.filter((s) => s.type === "rectangle" && !s.id);
    expect(frames).toHaveLength(2); // groups A and B
    expect(frames[0].strokeColor).toBe(theme.roles.frame.strokeColor);
    // frames come before the nodes (drawn behind)
    const firstNodeIdx = sk.findIndex((s) => s.id);
    expect(sk.indexOf(frames[0])).toBeLessThan(firstNodeIdx);
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
    expect(Math.hypot(dx, dy)).toBeGreaterThan(20);
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
    expect(dslToSkeletons(input).filter((s) => s.start)).toHaveLength(0);
  });
});

describe("dsl validation gate", () => {
  it("accepts well-formed LLM output and applies defaults", () => {
    const out = parseLLMOutput({
      ops: [{ op: "add", nodes: [{ id: "x", label: "X", shape: "rect" }] }],
    });
    expect(out).not.toBeNull();
    expect(out!.representation).toBe("concept"); // default applied
    expect(out!.ops[0].nodes[0].role).toBe("nodeSecondary"); // default applied
    expect(out!.ops[0].edges).toEqual([]); // default applied
  });

  it("rejects malformed output (bad role) by returning null", () => {
    const out = parseLLMOutput({
      ops: [{ op: "add", nodes: [{ id: "x", label: "X", shape: "rect", role: "headline" }] }],
    });
    expect(out).toBeNull();
  });
});

describe("opsToRenderInput — flatten ops to a board", () => {
  it("merges nodes (by id) and appends edges across ops", () => {
    const out = parseLLMOutput({
      ops: [
        { op: "add", nodes: [{ id: "a", label: "A", shape: "rect" }], edges: [] },
        { op: "connect", nodes: [{ id: "b", label: "B", shape: "rect" }], edges: [{ from: "a", to: "b" }] },
      ],
    })!;
    const input = opsToRenderInput(out);
    expect(input.nodes.map((n) => n.id).sort()).toEqual(["a", "b"]);
    expect(input.edges).toHaveLength(1);
  });

  it("removes nodes named in a remove op", () => {
    const out = parseLLMOutput({
      ops: [
        { op: "add", nodes: [{ id: "a", label: "A", shape: "rect" }, { id: "b", label: "B", shape: "rect" }] },
        { op: "remove", removeIds: ["a"] },
      ],
    })!;
    expect(opsToRenderInput(out).nodes.map((n) => n.id)).toEqual(["b"]);
  });
});

describe("step 3 pipeline — mock LLM through the gate and into skeletons", () => {
  it("every example transcript yields valid, renderable output", () => {
    for (const ex of EXAMPLES) {
      const out = parseLLMOutput(mockGenerate(ex.transcript));
      expect(out, ex.label).not.toBeNull();
      const sk = dslToSkeletons(opsToRenderInput(out!));
      expect(sk.length, ex.label).toBeGreaterThan(0);
    }
  });

  it("free-text falls back to a chained list (first line is the heading)", () => {
    const out = parseLLMOutput(mockGenerate("First line\nSecond line\nThird line"))!;
    const input = opsToRenderInput(out);
    expect(input.nodes).toHaveLength(3);
    expect(input.nodes[0].role).toBe("heading");
    expect(input.edges).toHaveLength(2); // chained
  });

  it("empty input produces no ops (nothing to draw)", () => {
    const out = parseLLMOutput(mockGenerate("   \n  "))!;
    expect(opsToRenderInput(out).nodes).toHaveLength(0);
  });
});
