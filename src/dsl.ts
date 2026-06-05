import { z } from "zod";

/**
 * dsl.ts — the intermediate DSL: the project's core contract.
 *
 * This is the ONLY format the LLM is allowed to output. It is deliberately
 * compact and contains NO coordinates — positions are computed later by the
 * layout engine (see render.ts). Keeping the LLM's output short and schema-
 * checked is what makes it reliable, cheap, and unit-testable.
 *
 * Every LLM output must pass `LLMOutputSchema` before anything downstream
 * touches it (the "validation gate"). On failure: retry or discard — never
 * send unvalidated data to the render layer.
 */

/**
 * Content role — what a node MEANS. This is the LLM's semantic vocabulary; the
 * chosen theme kit maps each role to a consistent color (see theme.ts), so
 * color carries meaning instead of being decoration. Shape (below) is separate
 * — it controls form, not meaning.
 */
export const RoleSchema = z.enum(["concept", "key", "term", "example", "warning"]);
export type Role = z.infer<typeof RoleSchema>;

export const NodeSchema = z.object({
  id: z.string(), // stable unique id, named by the LLM (e.g. "sun", "plant")
  label: z.string(), // text shown on the node
  shape: z.enum(["circle", "rect", "diamond", "text", "ellipse"]),
  group: z.string().optional(), // nodes in the same group are clustered together
  role: RoleSchema.default("concept"), // meaning -> color, via the theme kit
});

export const EdgeSchema = z.object({
  from: z.string(), // source node id
  to: z.string(), // target node id
  label: z.string().optional(), // text on the connector
  style: z.enum(["arrow", "line"]).default("arrow"),
});

export const BoardOpSchema = z.object({
  op: z.enum(["add", "connect", "update", "remove"]),
  nodes: z.array(NodeSchema).default([]),
  edges: z.array(EdgeSchema).default([]),
  removeIds: z.array(z.string()).default([]),
});

export const LLMOutputSchema = z.object({
  ops: z.array(BoardOpSchema),
  // plain-text key points for the post-session notes (optional)
  noteHint: z.string().optional(),
});

export type Node = z.infer<typeof NodeSchema>;
export type Edge = z.infer<typeof EdgeSchema>;
export type BoardOp = z.infer<typeof BoardOpSchema>;
export type LLMOutput = z.infer<typeof LLMOutputSchema>;

/**
 * Whiteboard state (the node registry) — the single source of truth for
 * "what's currently on the board." Used to feed context to the LLM and to
 * handle live human edits. Nodes the human has edited are `locked` so the
 * LLM can't overwrite them.
 */
export type BoardState = {
  nodes: Map<string, Node & { locked: boolean }>;
  edges: Edge[];
};

/**
 * The validation gate. Parses unknown input (e.g. raw LLM output) against the
 * schema. Returns the typed result on success, or null on failure — callers
 * should retry or discard, never pass bad data on.
 */
export function parseLLMOutput(raw: unknown): LLMOutput | null {
  const result = LLMOutputSchema.safeParse(raw);
  return result.success ? result.data : null;
}
