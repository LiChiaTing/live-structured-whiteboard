# Cursor Kickoff Prompt

> How to use: Open an empty project in Cursor, drop `dev-plan-v2.md` into it,
> then copy the entire block below (between the horizontal rules) and paste it to Claude Code as your first message.

---

You are the lead engineer on this project. First, read `dev-plan-v2.md` in the same directory — it is our technical spec and blueprint, and all subsequent implementation must follow it.

**Project goal:** A live, structured whiteboard that turns a transcript into structured board notes and then into post-session notes — for any spoken or typed session, whether lectures and classrooms, meetings, or brainstorming. For the MVP we won't do speech yet; first we'll make the "text → board notes" pipeline solid.

**Tech stack:** Astro + Tailwind CSS + `@excalidraw/excalidraw` (React Island) + `zod` (DSL validation) + `dagre` (layout).

**Core architectural principles (must be followed):**
1. Two-layer architecture: the LLM only outputs a compact intermediate DSL (spec in Section 4 of the document), and **never produces Excalidraw JSON directly**.
2. Coordinates are always computed by the `dagre` layout engine — **do not let the LLM calculate x/y**.
3. The board is cumulative (add / connect / update / remove), not redrawn from scratch each time.
4. The LLM's output always passes through Zod validation first; on failure, retry or discard, and never send it to the rendering layer.

**For this round, please do only "Kickoff Step 1" (Section 9 of the document):**
- Initialize an Astro + Tailwind project.
- Install and embed Excalidraw with `client:only="react"`, so the screen correctly displays a blank whiteboard.
- Obtain and store the `excalidrawAPI` ref — we'll use it later to call `updateScene`.
- Confirm that `npm run dev` runs and the whiteboard is interactive.

When you're done, tell me how to start it, the current file structure, and how you plan to approach the next step (Step 2: `dsl.ts` + `render.ts` + unit tests). **Don't write all the phases at once — we'll go one step at a time, and I'll confirm each step before we continue.**

---

## Instructions to paste for each subsequent step (memo)

Follow the order in Section 9 of the document, moving to the next step only after the current one is accepted:

- **Step 2:** "Implement `dsl.ts` (the Zod schema from Section 4) and `render.ts` (dagre + DSL→Excalidraw conversion), and write unit tests: given 2–3 hard-coded DSL sets, verify that the output elements are valid, non-overlapping, and that arrows are bound correctly."
- **Step 3:** "Add a 'paste transcript' input box to the page, first using a mock LLM that returns fixed DSL, to run the entire 'input → DSL → render' pipeline end to end."
- **Step 4:** "Connect the real LLM (structured output forcing JSON format) + Zod validation gate, and build an evaluation set of 8–10 transcript segments for regression testing."
- **Step 5 (Phase 4):** "Implement export (PNG/SVG) + LLM auto-summarized notes."
- **Step 6 (Phase 3):** "Connect speech last: Web Audio API + STT, using semantic paragraphs + debounce to control the pacing."
