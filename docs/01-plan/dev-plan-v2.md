# Live Structured Whiteboard — Revised Development Plan (v2)

> This document is the technical specification and implementation blueprint for engineering development (Cursor / Claude Code).
> Compared with v1, the core revisions are three: **(1) adopt a two-layer DSL architecture**, **(2) hand coordinate layout off to a layout engine**, and **(3) drop speech from the MVP and first validate "text → board → notes."**

---

## 0. One-Line Positioning

Turn the content of any live session (lectures, meetings, brainstorming) into a "structured, minimalist board visual" (text boxes, arrows, simple shapes), and automatically produce clean notes afterward. **The core value is not flashiness, but "reliably generating good-looking and correct board structure."**

---

## 1. Key Architectural Revisions vs. v1

### Revision A: Don't let the LLM emit complete Excalidraw JSON directly

Each Excalidraw element needs more than a dozen fields such as `id`, `seed`, `versionNonce`, `roughness`, `strokeColor`, `fillStyle`. Having the LLM spit out the full spec directly is very fragile — it often omits fields or produces invalid structures.

**Change to two layers:**

1. **Semantic layer (the LLM's job):** the LLM only emits a compact, easy-to-write intermediate DSL (describing "which nodes exist, who connects to whom, grouping relationships").
2. **Rendering layer (deterministic code's job):** a pure function converts the DSL into valid Excalidraw elements and fills in all the fields.

Benefits: the LLM output is short, has a high validity rate, has low token cost, and is unit-testable.

### Revision B: Don't have the LLM compute coordinates / layout

The LLM is poor at computing x/y and avoiding overlaps; beyond 4–5 elements it starts to overlap and jump around. **The LLM only describes semantic relationships; the actual coordinates are handed to a layout engine** (use `dagre` or `elk` for flowchart-style graphs). This simultaneously solves "overlapping components and a jumping canvas."

### Revision C: Drop speech from the MVP

The most uncertain risk is "transcript → a stable, good-looking board." If this part can't be built, real-time has no meaning; if it's done well, real-time is just an engineering problem.
**MVP scope = paste transcript / type → generate board → export notes.** Speech is an "input method" to be layered on later, not the core to conquer first.

---

## 2. System Architecture

```
┌─────────────┐   text    ┌──────────────┐   DSL(JSON)   ┌────────────────┐
│ Input layer │ ────────▶ │ LLM inference │ ────────────▶ │ DSL validate + │
│ (type/paste/ │           │ (semantic     │   (Zod valid.) │ convert        │
│  speech later)│          │  extraction)  │               │ (layout+render)│
└─────────────┘                  ▲                                  │ Excalidraw elements
                                 │ board state summary (state context) ▼
                          ┌──────┴───────┐                  ┌────────────────┐
                          │ Whiteboard    │ ◀──────────────  │ Excalidraw      │
                          │ state mgmt     │   speaker edits  │ canvas          │
                          │ (node registry)│                  │ (React Island)  │
                          └──────────────┘                  └────────────────┘
                                                                     │ after session
                                                                     ▼
                                                            ┌────────────────┐
                                                            │ Export +       │
                                                            │ summary notes  │
                                                            └────────────────┘
```

**Core principle of the data flow:** the board is "accumulated" rather than "redrawn." Each LLM inference must be fed a "summary of the current board state" so that what it outputs are `add` / `connect` actions, not the entire board redone from scratch.

---

## 3. Technology Stack

| Layer | Choice | Notes |
|---|---|---|
| Frontend framework | Astro + Tailwind CSS | Interactive components use React Islands |
| Whiteboard core | `@excalidraw/excalidraw` | Rendered with `client:only="react"` |
| DSL validation | `zod` | Forces LLM output to conform to the schema |
| Layout engine | `dagre` (MVP) / can switch to `elkjs` later | Computes node coordinates and edge routing |
| LLM | GPT-4o or Gemini 1.5 Pro | Needs strong JSON output; use structured output / function calling |
| STT (only wired up in Phase 4) | OpenAI Whisper / a low-latency streaming service | Web Audio API captures the microphone |

---

## 4. Intermediate DSL Specification (the core contract of this project)

The LLM's only output format. Deliberately compact, **containing no coordinates at all.**

```ts
// dsl.ts
import { z } from "zod";

export const NodeSchema = z.object({
  id: z.string(),                         // stable unique id, named by the LLM itself (e.g. "sun", "plant")
  label: z.string(),                      // displayed text
  shape: z.enum(["circle", "rect", "diamond", "text", "ellipse"]),
  group: z.string().optional(),           // nodes in the same group are clustered together by the layout engine
  emphasis: z.enum(["normal", "strong"]).default("normal"),
});

export const EdgeSchema = z.object({
  from: z.string(),                       // node id
  to: z.string(),                         // node id
  label: z.string().optional(),           // text on the arrow
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
  // plain-text key points for the post-session notes (may be empty)
  noteHint: z.string().optional(),
});

export type LLMOutput = z.infer<typeof LLMOutputSchema>;
```

**Design highlights**
- `id` must be stable: when the same concept is mentioned again, the LLM must reuse the existing id so that `connect` / `update` work correctly.
- No coordinates: coordinates are always computed by the layout engine in the rendering layer.
- Op-based: supports incremental updates and synchronization after speaker edits.

---

## 5. Whiteboard State Management (node registry)

Maintain a single source of truth for "what is currently on the board," used for two things: feeding context to the LLM, and handling speaker edits.

```ts
type BoardState = {
  nodes: Map<string, NodeSchema & { locked: boolean }>;
  edges: EdgeSchema[];
};
```

- Before each LLM call, compress `BoardState` into a compact summary (id + label + group is enough) and inject it into the prompt.
- **MVP handling of speaker-edit conflicts:** nodes that the speaker has manually moved / edited are marked `locked = true`; the LLM may not `update` / `remove` locked nodes (blocked in the conversion layer), to avoid two-way desync. Aim for simple-but-usable first.

---

## 6. Rendering Layer: DSL → Excalidraw

A pure function, **fully unit-testable**, with no network access.

```ts
// render.ts
import dagre from "dagre";

export function dslToExcalidraw(state: BoardState): ExcalidrawElement[] {
  // 1. Build a graph with dagre, feed in nodes / edges, compute each node's x,y
  // 2. Map each shape to its Excalidraw element type, fill in all required fields
  //    (id, seed, versionNonce, roughness, strokeColor, ...)
  // 3. emphasis=strong → thicker strokeWidth / different color
  // 4. edges → arrow elements, bound to the elementId of from/to
  // Return valid elements, handed to excalidrawAPI.updateScene({ elements })
}
```

Acceptance: given a fixed set of DSL, the output elements thrown into Excalidraw produce no errors, no overlaps, and correctly bound connections.

---

## 7. Phased Implementation Plan

### Phase 1: Frontend foundation + whiteboard embedding + rendering layer
**Goal:** without relying on AI, first make the entire "DSL → screen" rendering pipeline stable.

1. Initialize Astro + Tailwind, set up a minimalist, distraction-free layout.
2. Embed Excalidraw with `client:only="react"`, obtaining the `excalidrawAPI` ref.
3. Implement `dsl.ts` (Zod schema) and `render.ts` (dagre + conversion).
4. **PoC:** hand-write 2–3 sets of DSL test data, call `updateScene`, and confirm that shapes / text / arrows grow correctly without overlapping.

✅ Done criteria: hardcoded DSL can stably draw a clean board, and the layout engine avoids overlaps.

---

### Phase 2: AI logic (text → DSL)
**Goal:** get "natural language → valid DSL" working end-to-end; this is the make-or-break of the project.

1. **Prompt design:** the system instruction requires the LLM to output only JSON conforming to the schema in Section 4; prefer the model's structured output / function calling to enforce the format.
2. **Validation gate:** all LLM output must pass `LLMOutputSchema.parse()`; on failure, retry or discard — never send it straight into the rendering layer.
3. **Eval set (important):** prepare 8–10 segments of session transcript + manually annotated "expected node / connection structure" as regression tests. Example: "draw a circle on the left for the sun, a square on the right for the plant, an arrow connecting them in the middle" → expected 2 nodes + 1 edge.
4. **Preload mechanism:** a simple data structure that, before a session, reads in a list of domain terms / a base-map template, injected into the prompt to improve accuracy.

✅ Done criteria: the eval set's structural accuracy reaches an acceptable threshold (target ≥ 80% first), and 100% of outputs pass Zod validation.

---

### Phase 3: Speech integration and real-time rendering
**Goal:** wire up speech as an "input method," and tune the pacing.

1. **Speech capture:** Web Audio API takes the microphone → slice and send to STT → plain text.
2. **Pipeline wiring:** text → LLM → DSL → render.
3. **Pacing design (key):** **don't pursue sentence-by-sentence real-time; instead surface in units of "semantic paragraphs,"** which is more like a real speaker writing on the board and also turns latency into a design choice rather than a bug.
   - Add **debounce / silence detection**: trigger inference only after the speaker pauses for N seconds.
   - Control API call frequency to keep costs down and avoid canvas jitter.

✅ Done criteria: during continuous speaking, the board surfaces in chunks at a natural pace, with no obvious overlap / jumping.

---

### Phase 4: Post-session notes and export
**Goal:** produce a practical learning asset.

1. **Screen export:** use Excalidraw's built-in API to export a read-only PNG / SVG.
2. **Auto summary:** hand the transcript + the final DSL structure to the LLM to output well-organized text-based key-point notes (can combine each op's `noteHint`).
3. Package: board image + text notes, for distribution after the session.

✅ Done criteria: one-click generation of "board image + key-point notes."

---

## 8. Cross-Cutting Risks and Things to Watch

- **The latency chain compounds** (STT 1–3s + LLM 1–3s); this is the biggest risk to the "keep up with the speaker" vision → absorb it with Phase 3's "semantic-paragraph surfacing."
- **Cost:** continuous STT + high-frequency LLM calls; the cost of a one-hour session must be estimated up front, as it affects the business model → reduce frequency with debounce, and evaluate cheaper models for semantic extraction.
- **State sync:** accumulative board + speaker edits is hidden engineering effort → the MVP simplifies it with "locked nodes."
- **id stability:** if the LLM renames repeatedly or arbitrarily changes ids, it breaks incremental updates → emphasize reusing existing ids in the prompt, and do fault-tolerant matching in the conversion layer.

---

## 9. Recommended Development Kickoff (for Claude Code)

Execute in order; each step has clear acceptance, suitable for incremental development:

1. `scaffold`: Astro + Tailwind + Excalidraw island, the page runs.
2. `dsl.ts` + `render.ts` + unit tests (hardcoded DSL → valid elements).
3. Wire up a "paste transcript" input box on the page → (mock the LLM first, returning fixed DSL) → run the whole rendering pipeline.
4. Connect the real LLM + Zod validation gate + eval set.
5. Export + summary (Phase 4).
6. Only connect speech last (Phase 3).

> Recommendation: first build steps 1–4 into a demoable "text-only MVP," then decide whether to invest in speech.
