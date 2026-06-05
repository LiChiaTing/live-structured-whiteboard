# Decision Log

Records the project's key decisions and the "why." Newest on top. Shared by design and engineering.

---

## 2026-06-05 — Scope broadened beyond teaching; repo goes fully English + renamed

- **Decision:** The product is not teaching-only. The same mechanic (speech/text → structured board → notes) also serves **meetings** and **brainstorming sessions**, so the positioning is "a live structured whiteboard for any live session." Renamed the repo `teaching-live-whiteboard` → `live-structured-whiteboard` to match.
- **Decision:** The repo is now **100% English** — including the previously-Chinese thinking docs and the app UI title. Dianne's original Chinese drafts are preserved locally only under the gitignored `docs/_zh-originals/` folder, never uploaded.
- **Why:** Classroom, meetings, and brainstorming share the same job-to-be-done; narrowing to teaching undersold the concept. A fully English, public repo is the professional baseline for collaboration and a future case study, while keeping Dianne's Chinese source drafts intact on her machine.

## 2026-06-05 — Step 1 scaffold complete

- **Decision:** Initialize Astro 5 + Tailwind 4 + React island; embed Excalidraw with `client:only="react"`; capture and keep the `excalidrawAPI` ref.
- **Why:** This is step 1 of the dev plan (section 9) — get the render pipeline's endpoint (`api.updateScene`) working before building the DSL/render layers.
- **Verified:** `npm run build` passes; dev server runs and the whiteboard is interactive; `api.updateScene` was tested live and successfully drew an element (this is the exact call the render layer will use in step 2).

## 2026-06-05 — Project foundation

- **Decision:** Use `docs/` (00-product / 01-plan / 03-decisions / archive) for planning documents, reserve `src/` for code; initialize git and push to a **public** GitHub repo.
- **Why:** Start from a clean baseline that's easy to collaborate on later, and convenient to turn into a public case study down the line.

## (existing) MVP drops voice — do "text → whiteboard → notes" first

- **Decision:** No voice in the MVP; first validate the "transcript → stable, good-looking whiteboard" pipeline.
- **Why:** That pipeline is the most uncertain risk. If it works, going real-time is just engineering; if it doesn't, real-time is pointless.
- **Source:** `../01-plan/dev-plan-v2.md` sections 1 and 9.

## (existing) Two-layer DSL architecture; layout engine computes coordinates

- **Decision:** The LLM only outputs a compact intermediate DSL, never full Excalidraw JSON; coordinates are computed by `dagre`, not the LLM.
- **Why:** Having the LLM emit full Excalidraw specs is fragile (it often drops fields); it's also bad at coordinates (overlaps once there are more than ~4-5 elements). The two-layer split keeps output short, valid, and unit-testable.
- **Source:** `../01-plan/dev-plan-v2.md` section 1 (fixes A, B); supersedes the approach in `../archive/dev-plan-v1-superseded.md`.
