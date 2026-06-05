import { useEffect, useState } from "react";
import { Excalidraw } from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";

/**
 * Whiteboard — the canvas (React Island).
 *
 * Step 1 only goes as far as "run an interactive blank whiteboard and capture
 * the excalidrawAPI." Later (step 2+) we'll call api.updateScene({ elements })
 * to draw the Excalidraw elements computed by the render layer (render.ts).
 *
 * Note: this component must be embedded with client:only="react", because
 * Excalidraw accesses window / document and cannot be server-rendered.
 */
export default function Whiteboard() {
  const [excalidrawAPI, setExcalidrawAPI] = useState(null);

  // Dev convenience: expose the api on window so we can test updateScene
  // manually from the browser console.
  useEffect(() => {
    if (excalidrawAPI) {
      window.excalidrawAPI = excalidrawAPI;
    }
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
