# Live Structured Whiteboard — Product Focus & Experience Principles

> The most common failure during development: getting pulled along by technical details and building something with "lots of features but a loose, incoherent experience."
> Use this document to **pull focus back at every development decision**. Read it before you start, when you're stuck, and whenever you want to add a new feature.
>
> Research and market sources are at the end. Several of the design tradeoffs here are backed by related ICLR 2026 research (see Source 1).

---

## 0. The one sentence you can never forget

> **"As the speaker talks, clean and correct board work grows on its own — and they almost never have to stop to operate the tool."**

Any feature or interface decision that makes the speaker "interrupt their flow in order to operate the tool" hurts the core experience. This sentence is the highest arbiter of every tradeoff. (In the classroom that speaker is the teacher; in a meeting, the facilitator; in a brainstorm, whoever is leading — the principle is the same.)

---

## 1. Three experience pillars (all required)

Academic research indicates that automatic board-work generation needs three things to hold true at once — which map exactly onto our three pillars (Source 1):

**Pillar 1: structured, reproducible, editable content**
Board work must be "objects" (selectable, movable, deletable elements), not an image. Using Excalidraw's native JSON, the speaker can edit directly with no format conversion (Source 1 explicitly notes this is "directly transferable to a real workflow").

**Pillar 2: a rhythm synced with the talk**
*When* content appears matters as much as the content itself. The study's controlled experiment shows: without speech alignment, the model draws things "in the right layout, at the wrong time" — which damages the experience just as much as drawing the wrong thing (Source 1, E5 ablation).

**Pillar 3: cumulative evolution, not full redraws**
Board work should "grow" like a real chalkboard, each step building on the last. The research proves that not being cumulative (one-shot generation) causes "layout drift and overlapping elements" (Source 1, E4 ablation). **This directly validates that v2's cumulative architecture is correct — not optional.**

---

## 2. What the MVP must include (don't cut these)

These are the minimal set of "without it, the thing doesn't stand up." If any one is cut during development, the core experience breaks:

1. **Clean structured board-work generation** — text boxes, arrows, basic shapes, non-overlapping layout. (This is the heart of the product.)
2. **Live human correction (Human-in-the-Loop)** — the ability to instantly move / edit / delete AI-generated elements to fix misreads. The research recommends the interface expose an "editable timeline (elements, timing, coordinates)" so the leader can correct things before publishing (Source 1).
3. **Cumulative canvas state** — new content continues from old content; no redraws.
4. **Post-session note output** — compile the final board plus the transcript into clean notes. This is the "last mile" of the experience and the only touchpoint for participants — don't skip it.

> In the MVP, "type / paste a transcript" stands in for voice — this isn't laziness; the research itself recommends staging: **(1) offline draft → (2) semi-automatic with human approval → (3) limited real-time pilots** (Source 1). Build the first two stages solidly first.

---

## 3. What we deliberately "won't do yet" (hold the focus)

The biggest enemy during development is "doing a little extra while we're at it." The following are explicitly non-goals; when someone proposes them, come back to this section:

- **Complex / photorealistic image generation** — we want low-cognitive-load structure, not pretty illustrations.
- **Hand-drawn stroke simulation** — 95% of the research dataset is hand-drawn traces (because it was recorded from real people), but **our differentiation is precisely the use of tidy structured shapes** — clearer, cheaper, and easier to edit. Don't regress toward "looking handwritten."
- **Multi-user real-time collaborative editing** — the MVP focuses on a single speaker.
- **Real-time voice** — scheduled for the last phase, connected only after the earlier stages are validated.

---

## 4. "Feel" principles for the experience (Do / Don't)

These are the micro-level judgments while coding that decide whether the product "feels good":

**Rhythm**
- Do: reveal in "semantic-paragraph" units — draw a chunk once a concept is finished, like a real person at a board.
- Don't: jitter sentence-by-sentence in real time or re-layout constantly. Latency isn't scary; **jitter is.**

**The leader's sense of control**
- Do: the AI is a "co-pilot"; the human is always the final decision-maker. Generated content should be treated as a "draft awaiting approval," not a verdict (Source 1 explicitly recommends this).
- Do: elements the human has manually edited should be "locked"; the AI must not overwrite them again (already planned in v2).
- Don't: let the AI unilaterally delete or change something the human just drew.

**Low cognitive load**
- Do: white space in the layout, elements not crowded, only the necessary things growing at a time.
- Don't: cram the whole canvas at once, or overload with colors and shapes.

**Trust**
- Do: when generation is wrong, make it "easy to fix" rather than "never wrong." Correctability > accuracy.
- Don't: treat AI output as an immovable authority.

---

## 5. Where research says "real rooms break" (design for it ahead of time)

The ICLR paper honestly lists the failure points real deployments hit; designing for them early avoids the traps (Source 1):

- **Geometric drift over long sessions** — the more autoregressive steps, the more small errors accumulate. → Countermeasure: recompute coordinates with a layout engine (v2 already uses dagre); don't let coordinate error snowball.
- **Disfluency in speech** — tangents, filler words, going back to add things, pauses, emphasis, code-switching between languages. → Countermeasure: absorb it with "semantic paragraphs + silence detection"; don't react word-by-word.
- **Real-time ASR latency and recognition errors** — true real-time needs low-latency streaming ASR that can recover from recognition errors. → Countermeasure: this is exactly why voice is scheduled last.
- **Privacy and governance** — involves participants' voices and institutional content. → Countermeasure (if it goes to productization): default to on-premise / VPC inference, de-identify transcripts at import, keep only the structured output, and a clear recording-consent policy. In the MVP, don't touch real participant data.

---

## 6. How to know "the experience is right" (acceptance signals)

Don't just check "does it run" — check "does it resemble the north star." Suggested experiential acceptance checks:

1. **Open a test transcript → when board work grows, do you want to stop and fix it?** The fewer times you want to fix it, the better.
2. **How many steps to correct one element?** More than 2–3 steps is too heavy.
3. **Feed 5 transcript segments in a row — does the layout get messier and messier?** If it does, the cumulative / layout logic is broken.
4. **Can a participant read the resulting notes without the board?** If not, the notes layer isn't doing enough.

---

## 7. Your real moat

There are plenty of text-to-diagram tools on the market, AI teaching/meeting whiteboards exist, and academia has even validated the technical feasibility (Sources 1–3). So **"having thought of the idea" is not a moat.**

Your moat is these three things others haven't done well:

1. **The real-time, voice-driven "in-the-room" experience** (not generating a single image after the fact).
2. **How smooth the human-in-the-loop control feels.**
3. **A complete workflow loop** (pre-load assets before → generate during → deliver notes after) — across teaching, meetings, and brainstorming.

For every decision during development, ask: is this deepening these three things, or doing the first lap of features everyone has already done to death?

---

## Sources

1. Suraj Prasad & Pinak Mahapatra, *Speech-Synchronized Whiteboard Generation via VLM-Driven Structured Drawing Representations* (incl. the ExcaliTeach dataset), ICLR 2026 — https://arxiv.org/html/2603.25870
2. *The 10 Best AI Flowchart Tools in 2026*, Storyflow — https://storyflow.so/blog/best-ai-flowchart-tools-2026
3. *7 Best Napkin AI Alternatives for 2026*, Venngage — https://venngage.com/blog/napkin-ai-alternatives/
4. *The 6 Best Interactive Whiteboard softwares for Teachers in 2026*, Boardmix — https://boardmix.com/articles/teaching-whiteboard-softwares/
5. Napkin AI official site — https://www.napkin.ai/
