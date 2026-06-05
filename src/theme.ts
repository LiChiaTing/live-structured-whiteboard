/**
 * theme.ts — visual style kits (theme presets).
 *
 * Four ready-made whiteboard looks. The user picks one by scenario/mood; the
 * render layer applies it systematically. The DSL only describes a node's
 * semantic ROLE (heading / body / node / connector / frame / emphasis) — the
 * theme decides what each role looks like. Switching theme = swapping this
 * token table; the DSL and layout never change.
 *
 * Spec source: docs/_zh-originals — "視覺風格 Kit (Theme Presets)".
 */

export type Roughness = 0 | 1 | 2; // 0 = precise, 1 = natural, 2 = sketchy
export type FillStyle = "solid" | "hachure" | "cross-hatch";
export type FontFamily = 1 | 2 | 3; // 1 = hand-drawn, 2 = sans, 3 = mono
export type StrokeWidth = 1 | 2 | 4;
export type StrokeStyle = "solid" | "dashed" | "dotted";

export type RoleStyle = {
  strokeColor: string;
  backgroundColor?: string;
  fillStyle?: FillStyle;
  strokeWidth: StrokeWidth;
  strokeStyle?: StrokeStyle;
  fontFamily?: FontFamily;
  fontSize?: number; // 16 / 20 / 28 / 36
  rounded?: boolean;
};

/** Semantic roles the DSL can assign; the theme styles each one. */
export type RoleName =
  | "heading"
  | "body"
  | "nodePrimary"
  | "nodeSecondary"
  | "connector"
  | "frame"
  | "emphasis";

export type Theme = {
  id: string;
  name: string;
  pageBackground: string;
  roughness: Roughness;
  roles: Record<RoleName, RoleStyle>;
};

export const THEMES: Record<string, Theme> = {
  // A — Duotone Flat: high-contrast two colors + neutral ink, flat, airy.
  "duotone-flat": {
    id: "duotone-flat",
    name: "Duotone Flat",
    pageBackground: "#FFFFFF",
    roughness: 0,
    roles: {
      heading: { strokeColor: "#16161D", strokeWidth: 4, fontFamily: 2, fontSize: 28, rounded: true },
      body: { strokeColor: "#16161D", strokeWidth: 2, fontFamily: 2, fontSize: 20 },
      nodePrimary: { strokeColor: "#FF6B35", backgroundColor: "#FFE3D6", fillStyle: "solid", strokeWidth: 2, fontFamily: 2, fontSize: 20, rounded: true },
      nodeSecondary: { strokeColor: "#2E5E8C", backgroundColor: "#E2ECF5", fillStyle: "solid", strokeWidth: 2, fontFamily: 2, fontSize: 20, rounded: true },
      connector: { strokeColor: "#16161D", strokeWidth: 2, strokeStyle: "solid" },
      frame: { strokeColor: "#2E5E8C", strokeWidth: 2, strokeStyle: "dashed", rounded: true },
      emphasis: { strokeColor: "#FF6B35", strokeWidth: 4, fontFamily: 2, fontSize: 20 },
    },
  },

  // B — Handwritten Notes: color-coded (red headings, ink body, blue support),
  // natural hand strokes, hatched frames. Closest to a real teacher's board.
  "handwritten-notes": {
    id: "handwritten-notes",
    name: "Handwritten Notes",
    pageBackground: "#FCFAF5",
    roughness: 1,
    roles: {
      heading: { strokeColor: "#D7263D", strokeWidth: 2, fontFamily: 1, fontSize: 28 },
      body: { strokeColor: "#20232A", strokeWidth: 1, fontFamily: 1, fontSize: 20 },
      nodePrimary: { strokeColor: "#D7263D", backgroundColor: "transparent", strokeWidth: 2, fontFamily: 1, fontSize: 20, rounded: true },
      nodeSecondary: { strokeColor: "#2A6FB0", backgroundColor: "transparent", strokeWidth: 1, fontFamily: 1, fontSize: 20, rounded: true },
      connector: { strokeColor: "#20232A", strokeWidth: 1, strokeStyle: "solid" },
      frame: { strokeColor: "#2A6FB0", backgroundColor: "#EAF2FA", fillStyle: "hachure", strokeWidth: 1, rounded: true },
      emphasis: { strokeColor: "#D7263D", backgroundColor: "#F6C667", fillStyle: "hachure", strokeWidth: 2, fontFamily: 1, fontSize: 20 },
    },
  },

  // C — Editorial Geometric: single accent, off-white canvas, sharp corners,
  // dramatic scale contrast. Premium and editorial.
  "editorial-geometric": {
    id: "editorial-geometric",
    name: "Editorial Geometric",
    pageBackground: "#F3EFE6",
    roughness: 0,
    roles: {
      heading: { strokeColor: "#2B2B2B", strokeWidth: 2, fontFamily: 2, fontSize: 36, rounded: false },
      body: { strokeColor: "#2B2B2B", strokeWidth: 1, fontFamily: 2, fontSize: 18 },
      nodePrimary: { strokeColor: "#C1121F", backgroundColor: "#C1121F", fillStyle: "solid", strokeWidth: 2, fontFamily: 2, fontSize: 20, rounded: false },
      nodeSecondary: { strokeColor: "#2B2B2B", backgroundColor: "transparent", strokeWidth: 1, fontFamily: 2, fontSize: 20, rounded: false },
      connector: { strokeColor: "#C1121F", strokeWidth: 2, strokeStyle: "solid" },
      frame: { strokeColor: "#2B2B2B", strokeWidth: 1, strokeStyle: "solid", rounded: false },
      emphasis: { strokeColor: "#C1121F", strokeWidth: 2, fontFamily: 2, fontSize: 28 },
    },
  },

  // D — Doodle Sketch: mono ink, roughest strokes, hatched fills, hand font,
  // one accent color. Low-pressure, casual.
  "doodle-sketch": {
    id: "doodle-sketch",
    name: "Doodle Sketch",
    pageBackground: "#FCFCFA",
    roughness: 2,
    roles: {
      heading: { strokeColor: "#1F1F1F", strokeWidth: 2, fontFamily: 1, fontSize: 28 },
      body: { strokeColor: "#1F1F1F", strokeWidth: 1, fontFamily: 1, fontSize: 20 },
      nodePrimary: { strokeColor: "#1F1F1F", backgroundColor: "#E8590C", fillStyle: "hachure", strokeWidth: 2, fontFamily: 1, fontSize: 20, rounded: true },
      nodeSecondary: { strokeColor: "#1F1F1F", backgroundColor: "transparent", strokeWidth: 1, fontFamily: 1, fontSize: 20, rounded: true },
      connector: { strokeColor: "#1F1F1F", strokeWidth: 1, strokeStyle: "solid" },
      frame: { strokeColor: "#1F1F1F", backgroundColor: "transparent", strokeWidth: 1, strokeStyle: "solid", rounded: true },
      emphasis: { strokeColor: "#E8590C", strokeWidth: 2, fontFamily: 1, fontSize: 20 },
    },
  },
};

export const DEFAULT_THEME_ID = "handwritten-notes";

export function getTheme(id?: string): Theme {
  return THEMES[id ?? DEFAULT_THEME_ID] ?? THEMES[DEFAULT_THEME_ID];
}
