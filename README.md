# Live Structured Whiteboard

Turns what's being said in any live session — lectures, meetings, brainstorming — into a clean, minimal, structured whiteboard (text boxes, arrows, simple shapes) in real time, and automatically produces tidy notes afterward.

## What it is

A live whiteboard for any session where people think out loud together. As someone speaks, the system translates the spoken content into clear, low-cognitive-load whiteboard visuals that help visual thinkers follow along, and delivers clean notes to participants afterward.

It fits any scenario with the same shape — someone is talking and ideas need visible structure:

- **Classroom / lectures** — clean board work grows alongside the talk.
- **Meetings** — points, decisions, and dependencies become one shared structured picture.
- **Brainstorming** — ideas and their relationships surface as a living map.

**MVP scope:** start with the "paste transcript / type → generate whiteboard → export notes" pipeline. Voice is a later input layer, not the first thing to solve.

**Core architecture principle (two-layer DSL):**

1. The LLM only outputs a compact intermediate DSL — it **never produces Excalidraw JSON directly**.
2. Coordinates are always computed by the layout engine (`dagre`) — **the LLM never computes x/y**.
3. The whiteboard is cumulative (add / connect / update / remove), not redrawn from scratch each time.
4. Every LLM output passes Zod validation first; on failure it is retried or discarded, and never sent to the render layer.

Full spec: [docs/01-plan/dev-plan-v2.md](docs/01-plan/dev-plan-v2.md).

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
├── docs/                  Thinking documents
│   ├── 00-product/        Product vision + experience principles (north star: why)
│   ├── 01-plan/           Dev plan v2 + start-here kickoff prompt
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
