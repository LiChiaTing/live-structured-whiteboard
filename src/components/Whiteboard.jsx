import { useEffect, useState } from "react";
import { Excalidraw, convertToExcalidrawElements } from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";
import { dslToSkeletons } from "../render.ts";
import { getKit } from "../theme.ts";

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
    window.drawDSL = (input, kitId) => {
      const kit = getKit(kitId);
      const paint = () => {
        const elements = convertToExcalidrawElements(dslToSkeletons(input, kit));
        excalidrawAPI.updateScene({
          elements,
          appState: { viewBackgroundColor: kit.canvasBackground ?? "#ffffff" },
        });
        excalidrawAPI.scrollToContent(elements, { fitToContent: true });
        return elements.length;
      };
      // Wait for fonts before Excalidraw measures text — otherwise a hand-drawn
      // label gets measured with a fallback font and clips on first render.
      if (typeof document !== "undefined" && document.fonts?.status !== "loaded") {
        document.fonts.ready.then(paint);
        return 0;
      }
      return paint();
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
