# Teaching Live Whiteboard (教學動態白板)

Turns lecture content into a clean, minimal, structured whiteboard (text boxes, arrows, simple shapes) in real time, and automatically produces tidy notes after class.

## What it is

A live whiteboard for educators. As the teacher speaks, the system translates spoken content into clear, low-cognitive-load whiteboard visuals that help visual learners follow along, and delivers clean notes to students after class.

**MVP scope:** start with the "paste transcript / type → generate whiteboard → export notes" pipeline. Voice is a later input layer, not the first thing to solve.

**Core architecture principle (two-layer DSL):**

1. The LLM only outputs a compact intermediate DSL — it **never produces Excalidraw JSON directly**.
2. Coordinates are always computed by the layout engine (`dagre`) — **the LLM never computes x/y**.
3. The whiteboard is cumulative (add / connect / update / remove), not redrawn from scratch each time.
4. Every LLM output passes Zod validation first; on failure it is retried or discarded, and never sent to the render layer.

Full spec (in Chinese): [docs/01-plan/教學動態白板_開發計畫_v2.md](docs/01-plan/教學動態白板_開發計畫_v2.md).

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Astro + Tailwind CSS (interactive parts as React Islands) |
| Whiteboard | `@excalidraw/excalidraw` (`client:only="react"`) |
| DSL validation | `zod` |
| Layout engine | `dagre` (MVP) |
| LLM | GPT-4o / Gemini 1.5 Pro (structured output) |

## Project structure

```
.
├── docs/                  Thinking documents (in Chinese — Dianne's source docs)
│   ├── 00-product/        Product vision + experience principles (north star: why)
│   ├── 01-plan/           Dev plan v2 + Cursor / Claude Code start prompt
│   ├── 03-decisions/      decision-log (key decisions)
│   └── archive/           Superseded older versions (reference only)
├── src/                   Source code
│   ├── pages/             Astro pages (index.astro)
│   ├── components/        React components (Whiteboard.jsx — Excalidraw island)
│   └── styles/            global.css (Tailwind)
├── public/                Static assets (favicon)
├── astro.config.mjs       Astro config (React + Tailwind)
├── README.md             This file
└── CLAUDE.md             Project guide for AI agents
```

> The `docs/` folder holds Dianne's product and planning documents, which are written in Chinese on purpose. Everything in the code and collaboration layer is in English.

## How to run

```bash
npm install      # install dependencies (first time)
npm run dev      # local dev at http://localhost:4321/
npm run build    # production build into dist/
npm run preview  # preview the built output
```

Current status: **step 1 complete** — Astro + Tailwind + Excalidraw whiteboard runs and is interactive, with `excalidrawAPI` captured.
Next: `src/dsl.ts` + `src/render.ts` (DSL → Excalidraw) + unit tests.

## Credits

- Product & design: Dianne ([diannedesign.me](https://diannedesign.me))
- Development: Claude Code
