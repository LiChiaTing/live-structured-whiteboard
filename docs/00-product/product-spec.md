# Live Structured Whiteboard — Product Vision & Concept (Product Spec)

> This document is the project's "north star": it defines **why we're building it, what we're building, and who it's for**.
> For "how" (technical architecture and implementation), see `../01-plan/dev-plan-v2.md`.

---

## Core Concept

A live, "speech/text-to-visual" whiteboard for any session where people think out loud together. It translates what is being said into **structured, minimal whiteboard visuals** (text boxes, arrows, simple shapes) in real time, helps visual thinkers follow along, and automatically delivers clean notes afterward.

It works across scenarios that share the same shape — someone is talking, and ideas need to take visible structure:

- **Classroom / lectures** — a teacher explains a concept and clean board work grows alongside the talk.
- **Meetings** — discussion points, decisions, and dependencies become a shared structured picture instead of scattered notes.
- **Brainstorming sessions** — ideas and their relationships surface as a living map the group can react to.

**Design tradeoff:** the focus is "structured board work," not "complex image generation" — the goal is clarity, low cognitive load, and keeping up with the speaker.

---

## Key Feature Directions

**1. Real-time Vector Rendering**
Focus on low-latency rendering of basic structure, flowcharts, and diagrams — not complex image generation — so the visuals keep up with the speaker.

**2. Human-in-the-Loop (the leader stays in control)**
Provide an intuitive interface (e.g. via a tablet) so the session leader — teacher, facilitator, or presenter — can easily edit, move, and delete generated elements, correcting the LLM's misreads on the fly.

**3. Pre-loaded Knowledge & Assets**
Let the leader pre-load terminology, definitions, complex diagrams, or templates beforehand, maximizing accuracy and making assets reusable across sessions.

**4. Automated Note Delivery**
Compile the final board structure into clean, lightweight notes and seamlessly share them with participants — students, attendees, or teammates — after the session.

---

## Design Philosophy

A minimal, clean, low-cognitive-load interface that feels natural to use — like an **evolving digital chalkboard / whiteboard**.

---

## Target Users

- **Primary:** anyone leading a live session — educators/lecturers, meeting facilitators, and workshop/brainstorm leaders (often using a tablet during the session).
- **Secondary:** participants — students, attendees, teammates — who receive clean notes afterward and benefit passively.

---

## North Star & Non-goals

**North star:** let the speaker "grow clean, correct board work as they talk," with almost no need to stop and operate the tool.

**Not doing right now (non-goals):**

- Complex / photorealistic image generation.
- Replacing the leader's judgment about what to put on the board (the system assists; the human keeps final control).
- Multi-user real-time collaborative editing (the MVP focuses on a single speaker).

---

## Related Documents

- `experience-principles.md` — experience principles and a stay-focused checklist for development (with research sources).
- `../01-plan/dev-plan-v2.md` — the active technical spec and implementation blueprint.
- `../01-plan/start-here.md` — kickoff prompt for Cursor / Claude Code.
- `../archive/dev-plan-v1-superseded.md` — the original plan (reference only; do not build from it).
