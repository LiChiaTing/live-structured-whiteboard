/**
 * theme.ts — visual "kits."
 *
 * The product idea: don't make users pick colors/lines/spacing one by one.
 * We curate a few good-looking kits (a kit = line roughness + role palette +
 * font + spacing + canvas tone). The user makes ONE choice (the look they want
 * today — no kit is tied to a scenario), and the system applies that kit
 * systematically: a content role always looks the same within a kit, so color
 * carries meaning instead of being decoration.
 *
 * Separation of concerns:
 *   - shape  -> form    (circle / rect / diamond / text)   [in dsl.ts]
 *   - role   -> meaning (concept / key / term / ...)         [colored here]
 *   - kit    -> look    (duotone / notebook / editorial / marker)  [this file]
 *
 * The four kits below are distilled from four visual references:
 *   duotone   = modern minimalist duotone (flat, 2 colors + neutral, airy)
 *   notebook  = handwritten information architecture (color-coded, organic)
 *   editorial = elegant geometric infographic (single accent, off-white, refined)
 *   marker    = hand-drawn doodle / whiteboard (roughest sketch, mono + 1 red)
 */

import type { Role } from "./dsl";

export type ThemeKit = {
  id: string;
  name: string;
  /** Excalidraw roughness: 0 = clean/straight, 1 = hand-drawn, 2 = very sketchy. */
  roughness: 0 | 1 | 2;
  /** How shape fills are drawn (matters for grouped/tinted nodes). */
  fillStyle: "solid" | "hachure" | "cross-hatch";
  /** Excalidraw fontFamily: 1 = hand-drawn, 2 = normal, 3 = code. */
  fontFamily: 1 | 2 | 3;
  /** Per-role stroke (and text) color — this is where color gets its meaning. */
  roleColors: Record<Role, string>;
  /** "key" nodes get a heavier stroke; everything else uses the normal width. */
  keyStrokeWidth: number;
  normalStrokeWidth: number;
  /** Connector (arrow/line) color. */
  connectorColor: string;
  /** Fills cycled across groups so clusters read as belonging together. */
  groupTints: string[];
  /** Optional canvas background tone (e.g. off-white for an editorial feel). */
  canvasBackground?: string;
  /** dagre layout tuning baked into the kit (white space lives here). */
  layout: { rankdir: "LR" | "TB"; nodesep: number; ranksep: number };
};

export const KITS: Record<string, ThemeKit> = {
  // 1 — Modern minimalist duotone: clean flat lines, two high-contrast colors
  // (orange + blue) over neutral, generous white space.
  duotone: {
    id: "duotone",
    name: "Duotone",
    roughness: 0,
    fillStyle: "solid",
    fontFamily: 2,
    roleColors: {
      concept: "#1e293b",
      key: "#2563eb", // blue — the hero
      term: "#f97316", // orange — the counter-color
      example: "#94a3b8",
      warning: "#c2410c", // deep orange
    },
    keyStrokeWidth: 2.5,
    normalStrokeWidth: 1.5,
    connectorColor: "#475569",
    groupTints: ["#eff6ff", "#fff7ed", "#f8fafc", "#f0fdf4"],
    layout: { rankdir: "LR", nodesep: 90, ranksep: 150 },
  },

  // 2 — Handwritten information architecture: hand font, color-coded
  // (red = key/heading, blue = term, ink = body), organic and warm.
  notebook: {
    id: "notebook",
    name: "Notebook",
    roughness: 1,
    fillStyle: "solid",
    fontFamily: 1,
    roleColors: {
      concept: "#1f2937", // ink body
      key: "#dc2626", // red headings / keywords
      term: "#2563eb", // blue
      example: "#6b7280", // pencil gray
      warning: "#b91c1c", // deeper red
    },
    keyStrokeWidth: 2.5,
    normalStrokeWidth: 1.25,
    connectorColor: "#4b5563",
    groupTints: ["#fef2f2", "#eff6ff", "#f9fafb", "#fefce8"],
    layout: { rankdir: "LR", nodesep: 70, ranksep: 120 },
  },

  // 3 — Elegant geometric infographic: clean lines, a single refined accent,
  // off-white canvas, otherwise grayscale — premium and restrained.
  editorial: {
    id: "editorial",
    name: "Editorial",
    roughness: 0,
    fillStyle: "solid",
    fontFamily: 2,
    roleColors: {
      concept: "#3f3f46",
      key: "#be123c", // the single accent (refined crimson)
      term: "#52525b",
      example: "#a1a1aa",
      warning: "#be123c",
    },
    keyStrokeWidth: 2.5,
    normalStrokeWidth: 1.25,
    connectorColor: "#71717a",
    groupTints: ["#f4f4f5", "#fafafa", "#f5f3f0", "#eeeeee"],
    canvasBackground: "#faf8f4",
    layout: { rankdir: "LR", nodesep: 90, ranksep: 150 },
  },

  // 4 — Hand-drawn doodle / whiteboard: roughest sketchy strokes, hand font,
  // mostly mono ink with a single red marker for warnings.
  marker: {
    id: "marker",
    name: "Marker",
    roughness: 2,
    fillStyle: "hachure",
    fontFamily: 1,
    roleColors: {
      concept: "#2b2b2b",
      key: "#2b2b2b", // mono — emphasis comes from a heavier stroke, not color
      term: "#2b2b2b",
      example: "#6b7280",
      warning: "#c0392b", // the one red marker
    },
    keyStrokeWidth: 3.5,
    normalStrokeWidth: 1.5,
    connectorColor: "#2b2b2b",
    groupTints: ["#fff7d6", "#e7f0ff", "#ffe9e3", "#e6f7ec"],
    layout: { rankdir: "LR", nodesep: 75, ranksep: 120 },
  },
};

export const DEFAULT_KIT_ID = "duotone";

export function getKit(id?: string): ThemeKit {
  return KITS[id ?? DEFAULT_KIT_ID] ?? KITS[DEFAULT_KIT_ID];
}
