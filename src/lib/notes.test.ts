import { describe, it, expect } from "vitest";
import { parseLLMOutput } from "../dsl";
import { boardToMarkdown } from "./notes";

const sample = parseLLMOutput({
  ops: [
    {
      op: "add",
      nodes: [
        { id: "title", label: "Photosynthesis", shape: "text", role: "heading" },
        { id: "sun", label: "Sunlight", shape: "rect", role: "nodeSecondary", group: "inputs" },
        { id: "water", label: "Water", shape: "rect", role: "nodeSecondary", group: "inputs" },
        { id: "glucose", label: "Glucose", shape: "rect", role: "nodePrimary" },
        { id: "warn", label: "Needs chlorophyll", shape: "rect", role: "emphasis" },
      ],
      edges: [{ from: "sun", to: "glucose", label: "powers" }],
    },
  ],
  noteHint: "Plants turn sunlight and water into glucose.",
})!;

describe("boardToMarkdown", () => {
  const md = boardToMarkdown(sample);

  it("uses the heading node as the title", () => {
    expect(md.startsWith("# Photosynthesis")).toBe(true);
  });

  it("includes the noteHint as a summary line", () => {
    expect(md).toContain("Plants turn sunlight and water into glucose.");
  });

  it("lists key points and nests grouped nodes under the group", () => {
    expect(md).toContain("## Key points");
    expect(md).toContain("- inputs");
    expect(md).toContain("  - Sunlight");
    expect(md).toContain("  - Water");
  });

  it("bolds primary and emphasis nodes", () => {
    expect(md).toContain("**Glucose**");
    expect(md).toContain("**Needs chlorophyll**");
  });

  it("renders connections with labels and an arrow", () => {
    expect(md).toContain("## Connections");
    expect(md).toContain("- Sunlight → Glucose (powers)");
  });

  it("falls back to a default title when there's no heading", () => {
    const noHeading = parseLLMOutput({
      ops: [{ op: "add", nodes: [{ id: "a", label: "A", shape: "rect" }] }],
    })!;
    expect(boardToMarkdown(noHeading).startsWith("# Whiteboard Notes")).toBe(true);
  });
});
