# ⚠️ Superseded — MVP Development Plan v1 (Reference Only)

> **This document has been superseded by `../01-plan/dev-plan-v2.md`. Do not use it as a basis for development.**
>
> Two of v1's technical approaches were corrected in v2:
> 1. ❌ Having the LLM directly output complete Excalidraw JSON → ✅ Switched to a two-layer DSL architecture.
> 2. ❌ Having the LLM compute coordinates / layout → ✅ Layout is now computed by the `dagre` layout engine.
>
> This file is kept only to trace the original concept. The original content follows below.

---

## Tech Stack Preview

- Frontend framework: Astro with Tailwind CSS (using React Islands for interactive components)
- Whiteboard core: `@excalidraw/excalidraw` (React component)
- Speech-to-text (STT): OpenAI Whisper API (or another low-latency service)
- AI logic model: an LLM with strong JSON output capabilities (such as GPT-4o or Gemini 1.5 Pro)

## Phase 1: Frontend Foundation and Whiteboard Embedding
Goal: Build a clean canvas interface and confirm that canvas content can be dynamically controlled via code.

1. Environment setup: Initialize an Astro project and integrate Tailwind CSS, building a minimal, distraction-free teaching interface layout.
2. Package installation: Bring in the Excalidraw package and render the whiteboard component on the page using Astro's `client:only="react"` directive.
3. Data testing (PoC): Write a test script that manually passes Excalidraw-format JSON to the `updateScene` API, and confirm that the corresponding shapes and text appear on screen.

## Phase 2: AI Logic and Data Format Conversion
Goal: Open up the inference pipeline from "natural language ➔ structured JSON".

1. Prompt engineering: Design system instructions that require the LLM to output only JSON arrays conforming to the Excalidraw spec (including properties such as `type`, `x`, `y`, `text`, `width`).
2. Spatial and layout testing: Feed the LLM multiple segments of teaching transcript and test its spatial layout logic and coordinate calculation ability.
3. Preloading mechanism implementation: Build a data structure that pre-loads a list of specialized terms or base map templates to improve the LLM's inference accuracy.

## Phase 3: Voice Integration and Real-Time Rendering
Goal: Link audio and canvas actions together.

1. Voice capture: Obtain microphone audio via the Web Audio API and send it to the STT service to transcribe into plain text.
2. Pipeline integration: Pass the transcribed text into the LLM in real time, generate JSON, and push it to the Excalidraw canvas.
3. Pacing and experience tuning: Iteratively adjust the API call frequency and debounce mechanism to ensure the visuals appear naturally and smoothly.

## Phase 4: Post-Class Notes and Output
Goal: Produce practical learning assets.

1. Canvas export: Call the Excalidraw export API to convert the canvas into a read-only image (PNG or SVG).
2. Automatic summary: Have the LLM consolidate the transcript and the final JSON structure, outputting well-organized text-based key notes.
