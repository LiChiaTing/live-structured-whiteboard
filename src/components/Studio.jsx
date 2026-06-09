import { useEffect, useState } from "react";
import { Excalidraw, convertToExcalidrawElements, exportToBlob, exportToSvg } from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";
import { dslToSkeletons, opsToRenderInput } from "../render.ts";
import { getTheme, THEMES, DEFAULT_THEME_ID } from "../theme.ts";
import { parseLLMOutput } from "../dsl.ts";
import { boardToMarkdown } from "../lib/notes.ts";
import { EXAMPLES } from "../lib/mock-llm.ts";

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Studio — step 4 UI: a control panel beside the board.
 *
 * "Generate" calls the real LLM via our server endpoint:
 *   transcript -> POST /api/generate (Claude + Zod gate, server-side) -> DSL
 *   -> opsToRenderInput -> dslToSkeletons -> convertToExcalidrawElements -> board
 *
 * Switching theme re-renders the SAME output locally (no extra API call/cost).
 */

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
  const [loading, setLoading] = useState(false);
  // Start with a built-in sample so the board isn't blank (no API call on load).
  const [output, setOutput] = useState(() => parseLLMOutput(EXAMPLES[0].output));

  // Paint whenever the canvas is ready, the theme changes, or a new board is generated.
  useEffect(() => {
    if (!api || !output) return;
    const theme = getTheme(themeId);
    const input = opsToRenderInput(output);
    const paint = () => {
      const elements = convertToExcalidrawElements(dslToSkeletons(input, theme));
      api.updateScene({ elements, appState: { viewBackgroundColor: theme.pageBackground } });
      if (elements.length) api.scrollToContent(elements, { fitToContent: true });
    };
    preloadFonts().then(() => {
      paint();
      requestAnimationFrame(() => requestAnimationFrame(paint)); // remeasure once fonts are active
    });
  }, [api, themeId, output]);

  const generate = async () => {
    if (!transcript.trim() || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ transcript }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? "Generation failed.");
        return;
      }
      const validated = parseLLMOutput(data.output); // gate again, client-side (defensive)
      if (!validated) {
        setError("The generated board failed validation.");
        return;
      }
      setOutput(validated);
    } catch {
      setError("Couldn't reach the server. Is the dev server running?");
    } finally {
      setLoading(false);
    }
  };

  // --- Export (all client-side, free) ---
  const exportScene = () => ({
    elements: api.getSceneElements(),
    appState: { ...api.getAppState(), exportBackground: true },
    files: api.getFiles(),
  });

  const exportPng = async () => {
    if (!api) return;
    const blob = await exportToBlob({ ...exportScene(), mimeType: "image/png", quality: 1 });
    downloadBlob(blob, "whiteboard.png");
  };

  const exportSvg = async () => {
    if (!api) return;
    const svg = await exportToSvg(exportScene());
    const text = new XMLSerializer().serializeToString(svg);
    downloadBlob(new Blob([text], { type: "image/svg+xml" }), "whiteboard.svg");
  };

  const exportNotes = () => {
    if (!output) return;
    downloadBlob(new Blob([boardToMarkdown(output)], { type: "text/markdown" }), "notes.md");
  };

  return (
    <div style={{ display: "flex", height: "100%", width: "100%" }}>
      <aside className="flex w-80 shrink-0 flex-col gap-4 overflow-y-auto border-r border-neutral-200 bg-neutral-50 p-5">
        <div>
          <h1 className="text-lg font-semibold text-neutral-900">Live Whiteboard</h1>
          <p className="mt-1 text-xs text-neutral-500">Paste a transcript, pick a theme, generate a board.</p>
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
          onClick={generate}
          disabled={loading}
          className="rounded-md bg-neutral-900 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
        >
          {loading ? "Generating…" : "Generate board"}
        </button>

        {error && <p className="text-xs text-red-600">{error}</p>}

        <div className="mt-2 flex flex-col gap-1.5 border-t border-neutral-200 pt-4">
          <label className="text-sm font-medium text-neutral-700">Export</label>
          <div className="flex gap-1.5">
            <button onClick={exportPng} className="flex-1 rounded border border-neutral-300 bg-white px-2 py-1.5 text-xs text-neutral-700 hover:bg-neutral-100">
              PNG
            </button>
            <button onClick={exportSvg} className="flex-1 rounded border border-neutral-300 bg-white px-2 py-1.5 text-xs text-neutral-700 hover:bg-neutral-100">
              SVG
            </button>
            <button onClick={exportNotes} className="flex-1 rounded border border-neutral-300 bg-white px-2 py-1.5 text-xs text-neutral-700 hover:bg-neutral-100">
              Notes (.md)
            </button>
          </div>
          <p className="text-xs text-neutral-400">Download the board image or post-session notes.</p>
        </div>
      </aside>

      <main style={{ flex: 1, height: "100%" }}>
        <Excalidraw excalidrawAPI={setApi} theme="light" />
      </main>
    </div>
  );
}
