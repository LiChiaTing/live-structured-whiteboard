import type { LLMOutput, Node } from "../dsl";
import { opsToRenderInput } from "../render";

/**
 * notes.ts — turn a finished board (DSL) into clean, editable Markdown notes.
 *
 * Pure function, no API call: the heading becomes the title, the LLM's noteHint
 * (already produced for free during generation) becomes the summary, nodes
 * become a grouped key-points list, and edges become a connections list.
 * (A fuller "LLM writes prose notes" version can be added later as an option.)
 */
export function boardToMarkdown(output: LLMOutput): string {
  const { nodes, edges } = opsToRenderInput(output);
  const byId = new Map(nodes.map((n) => [n.id, n] as const));

  const heading = nodes.find((n) => n.role === "heading");
  const title = heading?.label?.trim() || "Whiteboard Notes";

  const emphasize = (n: Node) =>
    n.role === "emphasis" || n.role === "nodePrimary" ? `**${n.label}**` : n.label;

  const lines: string[] = [`# ${title}`];

  if (output.noteHint?.trim()) {
    lines.push("", output.noteHint.trim());
  }

  const points = nodes.filter((n) => n !== heading);
  if (points.length) {
    lines.push("", "## Key points", "");
    const groups = new Map<string, Node[]>();
    const ungrouped: Node[] = [];
    for (const n of points) {
      if (n.group) {
        if (!groups.has(n.group)) groups.set(n.group, []);
        groups.get(n.group)!.push(n);
      } else {
        ungrouped.push(n);
      }
    }
    for (const n of ungrouped) lines.push(`- ${emphasize(n)}`);
    for (const [group, members] of groups) {
      lines.push(`- ${group}`);
      for (const n of members) lines.push(`  - ${emphasize(n)}`);
    }
  }

  if (edges.length) {
    lines.push("", "## Connections", "");
    for (const e of edges) {
      const from = byId.get(e.from)?.label ?? e.from;
      const to = byId.get(e.to)?.label ?? e.to;
      const connector = e.style === "line" ? "—" : "→";
      lines.push(`- ${from} ${connector} ${to}${e.label ? ` (${e.label})` : ""}`);
    }
  }

  return lines.join("\n") + "\n";
}
