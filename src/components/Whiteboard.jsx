import { useEffect, useState } from "react";
import { Excalidraw, convertToExcalidrawElements } from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";
import { dslToSkeletons } from "../render.ts";
import { getTheme } from "../theme.ts";

/**
 * Whiteboard — the canvas (React Island).
 *
 * Pipeline (step 2): DSL ({ nodes, edges })
 *   -> dslToSkeletons()            (pure, in render.ts)
 *   -> convertToExcalidrawElements (Excalidraw fills every field + binds arrows)
 *   -> excalidrawAPI.updateScene   (draws it)
 *
 * Note: this component must be embedded with client:only="react", because
 * Excalidraw accesses window / document and cannot be server-rendered.
 */
export default function Whiteboard() {
  const [excalidrawAPI, setExcalidrawAPI] = useState(null);

  useEffect(() => {
    if (!excalidrawAPI) return;
    // Dev convenience: draw a DSL board straight from the console / tests.
    //   window.drawDSL({ nodes: [...], edges: [...] })
    window.excalidrawAPI = excalidrawAPI;
    // window.drawDSL(dsl, "soft" | "neutral" | "vivid")
    // Excalidraw's fonts (Excalifont/Nunito/Comic Shanns) load on demand. If we
    // convert+measure text before the needed font is ready, widths bake in wrong
    // and labels clip. So preload all families/sizes, THEN paint.
    const FONT_FAMILIES = ["Excalifont", "Nunito", "Comic Shanns"];
    const FONT_SIZES = [16, 18, 20, 28, 36];
    const preloadFonts = () =>
      Promise.all(
        FONT_FAMILIES.flatMap((f) => FONT_SIZES.map((s) => document.fonts.load(`${s}px ${f}`).catch(() => {}))),
      ).then(() => document.fonts.ready);

    window.drawDSL = (input, themeId) => {
      const theme = getTheme(themeId);
      const paint = () => {
        const elements = convertToExcalidrawElements(dslToSkeletons(input, theme));
        excalidrawAPI.updateScene({
          elements,
          appState: { viewBackgroundColor: theme.pageBackground ?? "#ffffff" },
        });
        excalidrawAPI.scrollToContent(elements, { fitToContent: true });
      };
      // Even after fonts.ready, the very first conversion that uses a font can
      // measure text before the canvas has it active (widths bake in too small
      // -> labels clip). Paint, then repaint once more so the second measure is
      // correct. Cheap and idempotent.
      preloadFonts().then(() => {
        paint();
        requestAnimationFrame(() => requestAnimationFrame(paint));
      });
      return "drawing (after fonts load)";
    };
  }, [excalidrawAPI]);

  return (
    <div style={{ height: "100%", width: "100%" }}>
      <Excalidraw
        excalidrawAPI={(api) => setExcalidrawAPI(api)}
        // Minimal, low cognitive load: default light theme; refine the UI later
        // per the design direction.
        theme="light"
      />
    </div>
  );
}
