import dagre from "@dagrejs/dagre";
import type { Edge, Node } from "./dsl";
import { getKit, type ThemeKit } from "./theme";

/**
 * render.ts — the deterministic render layer: DSL -> Excalidraw element
 * skeletons, styled by a theme kit.
 *
 * This is a PURE function: same input always yields the same output, no
 * network, no DOM. That's what makes it unit-testable.
 *
 * Two-step design (deliberate): this module produces lightweight Excalidraw
 * "skeletons" (the simplified element format). The browser then turns those
 * into full Excalidraw elements via `convertToExcalidrawElements`, which fills
 * in every required field and binds arrows to their nodes. We don't import
 * Excalidraw here because it pulls in browser-only code that can't run in Node
 * (so tests would break). Skeletons keep the engine pure and testable; the
 * actual rendering is verified in the browser.
 *
 * Styling is NOT hardcoded — it comes from the chosen kit (theme.ts):
 *   - role  -> color   (kit.roleColors[node.role])
 *   - "key" -> heavier stroke
 *   - kit.lineStyle -> roughness (hand vs clean)
 *   - group -> a soft tint cycled from kit.groupTints
 */

const FONT_SIZE = 20;
const EDGE_FONT_SIZE = 16;

// --- Layout sizing ---
const NODE_HEIGHT = 70;
const LABEL_PADDING_X = 48; // horizontal breathing room around the label text
const MIN_NODE_WIDTH = 90;

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
 * Rough text-width estimate. We have no DOM to measure text in pure code, so
 * we approximate from character count — good enough for non-overlapping layout
 * (Excalidraw re-measures text precisely when it renders).
 */
function estimateNodeSize(node: Node, fontFamily: 1 | 2 | 3): { width: number; height: number } {
  // The hand-drawn font (Virgil, family 1) is noticeably wider than Helvetica,
  // so it needs a larger per-char estimate or labels clip inside their boxes.
  const charWidthFactor = fontFamily === 1 ? 0.82 : 0.62;
  const avgCharWidth = FONT_SIZE * charWidthFactor;
  const textWidth = Math.max(node.label.length, 1) * avgCharWidth;

  if (node.shape === "text") {
    return { width: Math.max(Math.ceil(textWidth), MIN_NODE_WIDTH), height: Math.ceil(FONT_SIZE * 1.4) };
  }

  let width = Math.max(Math.ceil(textWidth + LABEL_PADDING_X), MIN_NODE_WIDTH);
  let height = NODE_HEIGHT;

  // Text inscribed in an ellipse/diamond needs a bigger box than in a rectangle
  // (the shape narrows away from the center), or the label clips.
  if (node.shape === "ellipse" || node.shape === "circle") {
    width = Math.ceil(width * 1.55);
    height = 96;
  } else if (node.shape === "diamond") {
    width = Math.ceil(width * 1.6);
    height = 100;
  }
  if (node.shape === "circle") {
    const diameter = Math.max(width, height); // a circle's bounding box is square
    width = diameter;
    height = diameter;
  }
  return { width, height };
}

/**
 * Where the line from a box's center toward (tx, ty) exits the box. Used to
 * start/end connectors at the node's edge instead of its center, so arrows
 * actually span between nodes and stop at their borders.
 */
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

/**
 * Compute each node's bounding box via dagre, using the kit's layout settings.
 * Returns top-left x/y (Excalidraw coordinates) plus width/height. Exposed
 * separately so layout invariants (e.g. no overlap) can be unit-tested.
 */
export function computeLayout(input: RenderInput, kit: ThemeKit = getKit()): Map<string, Box> {
  const { nodes } = input;
  const edges = validEdges(nodes, input.edges);

  const g = new dagre.graphlib.Graph({ compound: true });
  g.setGraph({ ...kit.layout, marginx: 40, marginy: 40 });
  g.setDefaultEdgeLabel(() => ({}));

  const sizes = new Map<string, { width: number; height: number }>();
  for (const n of nodes) {
    const size = estimateNodeSize(n, kit.fontFamily);
    sizes.set(n.id, size);
    g.setNode(n.id, { ...size });
  }

  // Group support: cluster nodes that share a `group` under a parent so they
  // stay near each other in the layout.
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

/** Stable index per distinct group (order of first appearance) for tint cycling. */
function groupIndexMap(nodes: Node[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const n of nodes) {
    if (n.group && !map.has(n.group)) map.set(n.group, map.size);
  }
  return map;
}

/**
 * Build Excalidraw element skeletons from a DSL set of nodes + edges, styled
 * by `kit`. Feed the result to `convertToExcalidrawElements` in the browser,
 * then to `excalidrawAPI.updateScene({ elements })`.
 */
export function dslToSkeletons(input: RenderInput, kit: ThemeKit = getKit()): Skeleton[] {
  const { nodes } = input;
  const edges = validEdges(nodes, input.edges);
  const boxes = computeLayout(input, kit);
  const groupIdx = groupIndexMap(nodes);
  const roughness = kit.roughness;

  const skeletons: Skeleton[] = [];

  for (const n of nodes) {
    const box = boxes.get(n.id)!;
    const isKey = n.role === "key";
    const strokeColor = kit.roleColors[n.role];
    const strokeWidth = isKey ? kit.keyStrokeWidth : kit.normalStrokeWidth;
    const type = SHAPE_TO_TYPE[n.shape];

    if (type === "text") {
      skeletons.push({
        type: "text",
        id: n.id,
        x: box.x,
        y: box.y,
        text: n.label,
        fontSize: FONT_SIZE,
        fontFamily: kit.fontFamily,
        strokeColor,
      });
    } else {
      const tint = n.group ? kit.groupTints[(groupIdx.get(n.group) ?? 0) % kit.groupTints.length] : "transparent";
      skeletons.push({
        type,
        id: n.id,
        x: box.x,
        y: box.y,
        width: box.width,
        height: box.height,
        strokeColor,
        strokeWidth,
        roughness,
        backgroundColor: tint,
        fillStyle: kit.fillStyle,
        label: { text: n.label, fontSize: FONT_SIZE, fontFamily: kit.fontFamily, strokeColor },
      });
    }
  }

  for (const e of edges) {
    const from = boxes.get(e.from)!;
    const to = boxes.get(e.to)!;
    const fromCenter = { x: from.x + from.width / 2, y: from.y + from.height / 2 };
    const toCenter = { x: to.x + to.width / 2, y: to.y + to.height / 2 };
    // Span from the source's border to the target's border so the connector
    // actually reaches (and stops at) each node. start/end ids keep it bound,
    // so dragging a node still drags the connector.
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
      strokeColor: kit.connectorColor,
      strokeWidth: kit.normalStrokeWidth,
      roughness,
    };
    if (e.label) skeleton.label = { text: e.label, fontSize: EDGE_FONT_SIZE, fontFamily: kit.fontFamily };
    skeletons.push(skeleton);
  }

  return skeletons;
}
