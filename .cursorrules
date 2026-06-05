# Teaching Live Whiteboard — Project Guide (for AI agents)

> This is the **project-level** guide. Dianne's global working preferences (plan before building, design-first, explain in design language, no walls of code) still apply.
> `.cursorrules` is an alias of this file (identical content) for Cursor.

## Language convention

Write the **code and collaboration layer in English**: code, comments, README, commit messages, config comments, this file, and the decision log. Dianne's authored Chinese thinking docs under `docs/` (product spec, dev plan, experience principles) stay in Chinese. Product UI strings for Chinese-speaking teachers (e.g. the app title) stay in their target language.

## One-line positioning

Turn lecture content into "structured, minimal whiteboard visuals" (text boxes, arrows, simple shapes) and automatically produce clean notes after class. **The core value is "reliably generating good-looking, correct whiteboard structure," not flashiness.**

## Target users

- **Primary:** educators / lecturers (used live in class, often with a tablet).
- **Secondary:** students (receive notes after class, benefit passively).

## Design philosophy

Minimal, clean, low cognitive load — like an **evolving digital chalkboard**. Dianne's aesthetic baseline: [diannedesign.me](https://diannedesign.me).

## Core architecture principles (must follow)

1. **Two-layer architecture:** the LLM only outputs a compact intermediate DSL (spec in `docs/01-plan/教學動態白板_開發計畫_v2.md` section 4) — **never Excalidraw JSON directly**.
2. **Layout engine owns coordinates:** always compute x/y with `dagre` — **never let the LLM compute coordinates**.
3. **Cumulative whiteboard:** use add / connect / update / remove, not a full redraw each time.
4. **Zod validation gate:** every LLM output passes Zod validation first; on failure, retry or discard — never send it to the render layer.

## Tech stack

Astro + Tailwind CSS + `@excalidraw/excalidraw` (React Island, `client:only="react"`) + `zod` (DSL validation) + `dagre` (layout). LLM via GPT-4o / Gemini 1.5 Pro structured output.

## Known constraints / risks

- **Latency chain stacks up** (STT + LLM): the biggest risk to the "keep up with the speaker" vision → later absorbed via "semantic-paragraph reveal + debounce."
- **Cost:** continuous STT + frequent LLM calls; need to estimate per-hour-of-class cost.
- **State sync:** cumulative whiteboard + teacher edits is hidden engineering effort → MVP simplifies with "locked nodes."
- **id stability:** if the LLM changes ids randomly it breaks incremental updates → prompt emphasizes reusing existing ids, with fault-tolerant matching in the conversion layer.

## Development order (MVP, step-by-step sign-off)

Per `docs/01-plan/教學動態白板_開發計畫_v2.md` section 9:

1. Scaffold: Astro + Tailwind + Excalidraw island, screen runs. **(done)**
2. `src/dsl.ts` (Zod schema) + `src/render.ts` (dagre + DSL→Excalidraw) + unit tests.
3. Add a "paste transcript" input on the page; use a mock LLM returning fixed DSL to run the whole render pipeline end to end.
4. Connect a real LLM (structured output) + Zod validation gate + an 8-10 transcript eval set for regression testing.
5. Export (PNG/SVG) + LLM auto-summary notes.
6. Voice last (Web Audio API + STT + debounce).

> **One step at a time:** continue only after Dianne signs off on each step; don't write all phases at once.

## Key documents

- Product north star: `docs/00-product/產品概念與願景_Product_Spec.md`
- Experience principles: `docs/00-product/產品焦點與體驗準則.md`
- Technical blueprint: `docs/01-plan/教學動態白板_開發計畫_v2.md`
- Decision log: `docs/03-decisions/decision-log.md`
