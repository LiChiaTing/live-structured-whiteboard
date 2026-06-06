import { useEffect, useState } from "react";
import { Excalidraw, convertToExcalidrawElements } from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";
import { dslToSkeletons, opsToRenderInput } from "../render.ts";
import { getTheme, THEMES, DEFAULT_THEME_ID } from "../theme.ts";
import { parseLLMOutput } from "../dsl.ts";
import { mockGenerate, EXAMPLES } from "../lib/mock-llm.ts";

/**
 * Studio — step 3 UI: a control panel (theme + transcript) beside the board.
 *
 * Pipeline on "Generate": transcript -> mockGenerate (stand-in LLM) ->
 * parseLLMOutput (Zod validation gate) -> opsToRenderInput -> dslToSkeletons ->
 * convertToExcalidrawElements -> updateScene. No real AI yet (step 4).
 */

// Excalidraw fonts load on demand; preload so text measures correctly.
const FONT_FAMILIES = ["Excalifont", "Nunito", "Comic Shanns"];
const FONT_SIZES = [16, 18, 20, 28, 36];
const preloadFonts = () =>
  Promise.all(
    FONT_FAMILIES.flatMap((f) => FONT_SIZES.map((s) => document.fonts.load(`${s}px ${f}`).catch(() => {}))),
  ).then(() => document.fonts.ready);

export default function Studio() {
  const [api, setApi] = useState(null);
  const [transcript, setTranscript] = useState(EXAMPLES[0].transcript);
  const [themeId, setThemeId] = useState(DEFAULT_THEME_ID);
  const [error, setError] = useState(null);

  const draw = (text, id) => {
    if (!api) return;
    const out = parseLLMOutput(mockGenerate(text)); // through the validation gate
    if (!out) {
      setError("Generated output failed validation — nothing was drawn.");
      return;
    }
    setError(null);
    const theme = getTheme(id);
    const input = opsToRenderInput(out);
    const paint = () => {
      const elements = convertToExcalidrawElements(dslToSkeletons(input, theme));
      api.updateScene({ elements, appState: { viewBackgroundColor: theme.pageBackground } });
      if (elements.length) api.scrollToContent(elements, { fitToContent: true });
    };
    preloadFonts().then(() => {
      paint();
      requestAnimationFrame(() => requestAnimationFrame(paint)); // remeasure once fonts are active
    });
  };

  // Draw the starting example once the canvas is ready, and re-draw on theme change.
  useEffect(() => {
    draw(transcript, themeId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api, themeId]);

  return (
    <div style={{ display: "flex", height: "100%", width: "100%" }}>
      <aside className="flex w-80 shrink-0 flex-col gap-4 overflow-y-auto border-r border-neutral-200 bg-neutral-50 p-5">
        <div>
          <h1 className="text-lg font-semibold text-neutral-900">Live Whiteboard</h1>
          <p className="mt-1 text-xs text-neutral-500">Paste a transcript, pick a theme, generate a board. (mock AI for now)</p>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-neutral-700">Theme</label>
          <select
            value={themeId}
            onChange={(e) => setThemeId(e.target.value)}
            className="rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-sm"
          >
            {Object.values(THEMES).map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-neutral-700">Transcript</label>
          <textarea
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            rows={9}
            className="resize-none rounded-md border border-neutral-300 p-2 text-sm leading-relaxed"
            placeholder="Paste or type what's being said…"
          />
          <div className="flex flex-wrap gap-1.5">
            {EXAMPLES.map((ex) => (
              <button
                key={ex.label}
                onClick={() => setTranscript(ex.transcript)}
                className="rounded border border-neutral-300 bg-white px-2 py-1 text-xs text-neutral-600 hover:bg-neutral-100"
              >
                {ex.label}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={() => draw(transcript, themeId)}
          className="rounded-md bg-neutral-900 py-2 text-sm font-medium text-white hover:bg-neutral-700"
        >
          Generate board
        </button>

        {error && <p className="text-xs text-red-600">{error}</p>}
      </aside>

      <main style={{ flex: 1, height: "100%" }}>
        <Excalidraw excalidrawAPI={setApi} theme="light" />
      </main>
    </div>
  );
}
