import dagre from "@dagrejs/dagre";
import type { Edge, LLMOutput, Node, Representation } from "./dsl";
import { getTheme, type RoleStyle, type Theme } from "./theme";

/**
 * render.ts — the deterministic render layer: DSL -> Excalidraw element
 * skeletons, styled by a theme's role table.
 *
 * Pure function: same input always yields the same output, no network, no DOM
 * — that's what makes it unit-testable. It outputs lightweight Excalidraw
 * "skeletons"; the browser turns those into full elements via
 * `convertToExcalidrawElements` (which fills every field and binds arrows). We
 * don't import Excalidraw here because it pulls in browser-only code.
 *
 * Styling comes entirely from the theme (theme.ts):
 *   - each node's role -> theme.roles[role] (color, fill, stroke, font, ...)
 *   - edges            -> theme.roles.connector
 *   - groups           -> a frame drawn behind, styled by theme.roles.frame
 *   - theme.roughness  -> hand/clean/sketchy line quality
 */

const DEFAULT_FONT_SIZE = 20;
const EDGE_FONT_SIZE = 16;
const FRAME_PADDING = 18;

const SHAPE_TO_TYPE = {
  circle: "ellipse",
  ellipse: "ellipse",
  rect: "rectangle",
  diamond: "diamond",
  text: "text",
} as const;

export type Box = { x: number; y: number; width: number; height: number };
export type Skeleton = Record<string, unknown> & { type: string };
export type RenderInput = { nodes: Node[]; edges: Edge[] };

/**
 * Flatten validated LLM ops into the current board (nodes + edges) for
 * rendering. MVP cumulative handling: add/connect/update merge nodes by id
 * (last wins) and append edges; remove drops nodes by id.
 */
export function opsToRenderInput(out: LLMOutput): RenderInput {
  const nodes = new Map<string, Node>();
  const edges: Edge[] = [];
  for (const op of out.ops) {
    if (op.op === "remove") {
      for (const id of op.removeIds) nodes.delete(id);
      continue;
    }
    for (const n of op.nodes) nodes.set(n.id, n);
    for (const e of op.edges) edges.push(e);
  }
  return { nodes: [...nodes.values()], edges };
}

function roleOf(theme: Theme, node: Node): RoleStyle {
  return theme.roles[node.role];
}

function fallbackFont(theme: Theme) {
  return theme.roles.heading.fontFamily ?? 2;
}

/**
 * Rough text-size estimate. No DOM to measure in pure code, so approximate from
 * character count and font size — enough for non-overlapping layout (Excalidraw
 * re-measures precisely when it renders).
 */
function estimateNodeSize(node: Node, fontFamily: 1 | 2 | 3, fontSize: number): { width: number; height: number } {
  const charWidthFactor = fontFamily === 1 ? 0.82 : 0.6; // hand font is wider
  const textWidth = Math.max(node.label.length, 1) * fontSize * charWidthFactor;
  const padX = Math.round(fontSize * 2.2);

  if (node.shape === "text") {
    return { width: Math.max(Math.ceil(textWidth), 80), height: Math.ceil(fontSize * 1.5) };
  }

  let width = Math.max(Math.ceil(textWidth + padX), 90);
  let height = Math.max(Math.ceil(fontSize * 2.8), 56);

  if (node.shape === "ellipse" || node.shape === "circle") {
    width = Math.ceil(width * 1.55);
    height = Math.ceil(height * 1.35);
  } else if (node.shape === "diamond") {
    width = Math.ceil(width * 1.6);
    height = Math.ceil(height * 1.4);
  }
  if (node.shape === "circle") {
    const d = Math.max(width, height);
    width = d;
    height = d;
  }
  return { width, height };
}

/** Where the line from a box's center toward (tx, ty) exits the box. */
function boundaryPoint(box: Box, tx: number, ty: number): { x: number; y: number } {
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  const dx = tx - cx;
  const dy = ty - cy;
  if (dx === 0 && dy === 0) return { x: cx, y: cy };
  const scaleX = dx !== 0 ? box.width / 2 / Math.abs(dx) : Infinity;
  const scaleY = dy !== 0 ? box.height / 2 / Math.abs(dy) : Infinity;
  const scale = Math.min(scaleX, scaleY);
  return { x: cx + dx * scale, y: cy + dy * scale };
}

/** Keep only edges whose endpoints both exist — drop dangling refs defensively. */
function validEdges(nodes: Node[], edges: Edge[]): Edge[] {
  const ids = new Set(nodes.map((n) => n.id));
  return edges.filter((e) => ids.has(e.from) && ids.has(e.to));
}

function nodeSize(theme: Theme, n: Node): { width: number; height: number } {
  const role = roleOf(theme, n);
  return estimateNodeSize(n, role.fontFamily ?? fallbackFont(theme), role.fontSize ?? DEFAULT_FONT_SIZE);
}

/** dagre graph layout with a given direction/spacing. */
function layoutDagre(
  input: RenderInput,
  theme: Theme,
  opts: { rankdir: "TB" | "LR"; ranksep: number; nodesep: number },
): Map<string, Box> {
  const { nodes } = input;
  const edges = validEdges(nodes, input.edges);

  const g = new dagre.graphlib.Graph({ compound: true });
  g.setGraph({ rankdir: opts.rankdir, nodesep: opts.nodesep, ranksep: opts.ranksep, marginx: 50, marginy: 50 });
  g.setDefaultEdgeLabel(() => ({}));

  const sizes = new Map<string, { width: number; height: number }>();
  for (const n of nodes) {
    const size = nodeSize(theme, n);
    sizes.set(n.id, size);
    g.setNode(n.id, { ...size });
  }

  const groups = new Set(nodes.map((n) => n.group).filter((x): x is string => Boolean(x)));
  for (const group of groups) g.setNode(`__group__${group}`, {});
  for (const n of nodes) {
    if (n.group) g.setParent(n.id, `__group__${n.group}`);
  }

  for (const e of edges) g.setEdge(e.from, e.to);

  dagre.layout(g);

  const boxes = new Map<string, Box>();
  for (const n of nodes) {
    const pos = g.node(n.id); // dagre gives the CENTER x/y
    const { width, height } = sizes.get(n.id)!;
    boxes.set(n.id, { x: pos.x - width / 2, y: pos.y - height / 2, width, height });
  }
  return boxes;
}

/**
 * Comparison layout: each group becomes a vertical column, columns sit side by
 * side, the heading (if any) goes on top. Ungrouped nodes form a trailing
 * column. Reads as a clean side-by-side contrast.
 */
function layoutComparison(input: RenderInput, theme: Theme): Map<string, Box> {
  const { nodes } = input;
  const MARGIN = 50;
  const COL_GAP = 70;
  const ROW_GAP = 36;
  const HEAD_GAP = 50;

  const boxes = new Map<string, Box>();
  const heading = nodes.find((n) => n.role === "heading");
  let topY = MARGIN;
  if (heading) {
    const s = nodeSize(theme, heading);
    boxes.set(heading.id, { x: MARGIN, y: MARGIN, width: s.width, height: s.height });
    topY = MARGIN + s.height + HEAD_GAP;
  }

  const colMap = new Map<string, Node[]>();
  const ungrouped: Node[] = [];
  for (const n of nodes) {
    if (n === heading) continue;
    if (n.group) {
      if (!colMap.has(n.group)) colMap.set(n.group, []);
      colMap.get(n.group)!.push(n);
    } else {
      ungrouped.push(n);
    }
  }
  const columns = [...colMap.values()];
  if (ungrouped.length) columns.push(ungrouped);

  let x = MARGIN;
  for (const col of columns) {
    const colWidth = Math.max(...col.map((n) => nodeSize(theme, n).width), 1);
    let y = topY;
    for (const n of col) {
      const s = nodeSize(theme, n);
      boxes.set(n.id, { x: x + (colWidth - s.width) / 2, y, width: s.width, height: s.height });
      y += s.height + ROW_GAP;
    }
    x += colWidth + COL_GAP;
  }
  return boxes;
}

/**
 * Compute each node's bounding box, choosing a layout by representation:
 *  - flow / hierarchy -> top-to-bottom (a long process won't sprawl sideways)
 *  - comparison       -> side-by-side columns
 *  - timeline         -> left-to-right
 *  - concept / cycle  -> left-to-right graph (default)
 * (cycle/timeline get bespoke layouts in a later pass.)
 */
export function computeLayout(
  input: RenderInput,
  theme: Theme = getTheme(),
  representation: Representation = "concept",
): Map<string, Box> {
  switch (representation) {
    case "comparison":
      return layoutComparison(input, theme);
    case "flow":
    case "hierarchy":
      return layoutDagre(input, theme, { rankdir: "TB", ranksep: 70, nodesep: 50 });
    case "timeline":
      return layoutDagre(input, theme, { rankdir: "LR", ranksep: 90, nodesep: 50 });
    case "cycle":
    case "concept":
    default:
      return layoutDagre(input, theme, { rankdir: "LR", ranksep: 120, nodesep: 65 });
  }
}

/** Bounding box around all members of a group, padded — used to draw a frame. */
function groupFrames(nodes: Node[], boxes: Map<string, Box>): Map<string, Box> {
  const frames = new Map<string, Box>();
  for (const n of nodes) {
    if (!n.group) continue;
    const b = boxes.get(n.id)!;
    const f = frames.get(n.group);
    if (!f) {
      frames.set(n.group, { x: b.x, y: b.y, width: b.width, height: b.height });
    } else {
      const minX = Math.min(f.x, b.x);
      const minY = Math.min(f.y, b.y);
      const maxX = Math.max(f.x + f.width, b.x + b.width);
      const maxY = Math.max(f.y + f.height, b.y + b.height);
      frames.set(n.group, { x: minX, y: minY, width: maxX - minX, height: maxY - minY });
    }
  }
  for (const [k, f] of frames) {
    frames.set(k, { x: f.x - FRAME_PADDING, y: f.y - FRAME_PADDING, width: f.width + FRAME_PADDING * 2, height: f.height + FRAME_PADDING * 2 });
  }
  return frames;
}

function roundness(rounded?: boolean) {
  return rounded ? { type: 3 } : null;
}

/** Relative luminance of a #rrggbb color (0 = black, 1 = white). */
function luminance(hex: string): number {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return 1;
  const n = parseInt(m[1], 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => c / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Label color for a box: if the node has a solid dark fill, the role's stroke
 * color would be unreadable on it (e.g. red text on a solid red box), so use a
 * light color. Otherwise the role color reads fine.
 */
function labelColor(role: RoleStyle): string {
  const solidFill = role.fillStyle === "solid" && role.backgroundColor && role.backgroundColor !== "transparent";
  if (solidFill && luminance(role.backgroundColor!) < 0.55) return "#FFFFFF";
  return role.strokeColor;
}

/**
 * Build Excalidraw element skeletons from DSL nodes + edges, styled by `theme`.
 * Feed to `convertToExcalidrawElements` in the browser, then `updateScene`.
 */
export function dslToSkeletons(
  input: RenderInput,
  theme: Theme = getTheme(),
  representation: Representation = "concept",
): Skeleton[] {
  const { nodes } = input;
  const edges = validEdges(nodes, input.edges);
  const boxes = computeLayout(input, theme, representation);
  const fb = fallbackFont(theme);
  const roughness = theme.roughness;

  const skeletons: Skeleton[] = [];

  // Frames first, so groups sit behind their nodes.
  const frame = theme.roles.frame;
  for (const [, box] of groupFrames(nodes, boxes)) {
    skeletons.push({
      type: "rectangle",
      x: box.x,
      y: box.y,
      width: box.width,
      height: box.height,
      strokeColor: frame.strokeColor,
      backgroundColor: frame.backgroundColor ?? "transparent",
      fillStyle: frame.fillStyle ?? "solid",
      strokeWidth: frame.strokeWidth,
      strokeStyle: frame.strokeStyle ?? "solid",
      roughness,
      roundness: roundness(frame.rounded),
    });
  }

  for (const n of nodes) {
    const box = boxes.get(n.id)!;
    const role = roleOf(theme, n);
    const font = role.fontFamily ?? fb;
    const fontSize = role.fontSize ?? DEFAULT_FONT_SIZE;
    const type = SHAPE_TO_TYPE[n.shape];

    if (type === "text") {
      skeletons.push({
        type: "text",
        id: n.id,
        x: box.x,
        y: box.y,
        text: n.label,
        fontSize,
        fontFamily: font,
        strokeColor: role.strokeColor,
      });
    } else {
      skeletons.push({
        type,
        id: n.id,
        x: box.x,
        y: box.y,
        width: box.width,
        height: box.height,
        strokeColor: role.strokeColor,
        backgroundColor: role.backgroundColor ?? "transparent",
        fillStyle: role.fillStyle ?? "solid",
        strokeWidth: role.strokeWidth,
        strokeStyle: role.strokeStyle ?? "solid",
        roughness,
        roundness: roundness(role.rounded),
        label: { text: n.label, fontSize, fontFamily: font, strokeColor: labelColor(role) },
      });
    }
  }

  const connector = theme.roles.connector;
  for (const e of edges) {
    const from = boxes.get(e.from)!;
    const to = boxes.get(e.to)!;
    const fromCenter = { x: from.x + from.width / 2, y: from.y + from.height / 2 };
    const toCenter = { x: to.x + to.width / 2, y: to.y + to.height / 2 };
    const start = boundaryPoint(from, toCenter.x, toCenter.y);
    const end = boundaryPoint(to, fromCenter.x, fromCenter.y);
    const skeleton: Skeleton = {
      type: e.style === "line" ? "line" : "arrow",
      x: start.x,
      y: start.y,
      points: [
        [0, 0],
        [end.x - start.x, end.y - start.y],
      ],
      start: { id: e.from },
      end: { id: e.to },
      strokeColor: connector.strokeColor,
      strokeWidth: connector.strokeWidth,
      strokeStyle: connector.strokeStyle ?? "solid",
      roughness,
    };
    if (e.label) skeleton.label = { text: e.label, fontSize: EDGE_FONT_SIZE, fontFamily: fb };
    skeletons.push(skeleton);
  }

  return skeletons;
}
