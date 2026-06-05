# Decision Log

Records the project's key decisions and the "why." Newest on top. Shared by design and engineering.

---

## 2026-06-05 — Step 1 scaffold complete

- **Decision:** Initialize Astro 5 + Tailwind 4 + React island; embed Excalidraw with `client:only="react"`; capture and keep the `excalidrawAPI` ref.
- **Why:** This is step 1 of the dev plan (section 9) — get the render pipeline's endpoint (`api.updateScene`) working before building the DSL/render layers.
- **Verified:** `npm run build` passes; dev server runs and the whiteboard is interactive; `api.updateScene` was tested live and successfully drew an element (this is the exact call the render layer will use in step 2).

## 2026-06-05 — Language: English for the code/collaboration layer

- **Decision:** Everything in the code and collaboration layer (README, code comments, commit messages, config comments, CLAUDE.md, this log) is written in English. Dianne's authored Chinese thinking docs (product spec, dev plan, experience principles) stay in Chinese.
- **Why:** The repo is public and meant for collaborating with engineers, so an English-facing code layer is the professional standard; but the source thinking docs carry nuance that translation would lose.

## 2026-06-05 — Project foundation

- **Decision:** Use `docs/` (00-product / 01-plan / 03-decisions / archive) for planning documents, reserve `src/` for code; initialize git and push to a **public** GitHub repo.
- **Why:** Start from a clean baseline that's easy to collaborate on later, and convenient to turn into a public case study down the line.

## (existing) MVP drops voice — do "text → whiteboard → notes" first

- **Decision:** No voice in the MVP; first validate the "transcript → stable, good-looking whiteboard" pipeline.
- **Why:** That pipeline is the most uncertain risk. If it works, going real-time is just engineering; if it doesn't, real-time is pointless.
- **Source:** `01-plan/教學動態白板_開發計畫_v2.md` sections 1 and 9.

## (existing) Two-layer DSL architecture; layout engine computes coordinates

- **Decision:** The LLM only outputs a compact intermediate DSL, never full Excalidraw JSON; coordinates are computed by `dagre`, not the LLM.
- **Why:** Having the LLM emit full Excalidraw specs is fragile (it often drops fields); it's also bad at coordinates (overlaps once there are more than ~4-5 elements). The two-layer split keeps output short, valid, and unit-testable.
- **Source:** `01-plan/教學動態白板_開發計畫_v2.md` section 1 (fixes A, B); supersedes the approach in `archive/MVP開發計畫_v1`.
