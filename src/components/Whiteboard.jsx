import { useEffect, useState } from "react";
import { Excalidraw } from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";

/**
 * Whiteboard — 白板畫布 (React Island)。
 *
 * 步驟 1 的目標就只到「跑起一塊可互動的空白白板,並抓到 excalidrawAPI」。
 * 之後 (步驟 2+) 會用這個 api 呼叫 api.updateScene({ elements }),
 * 把渲染層 (render.ts) 算出來的 Excalidraw 元素畫上去。
 *
 * 注意:這個元件一定要用 client:only="react" 嵌入,
 * 因為 Excalidraw 會存取 window / document,不能在伺服器端渲染。
 */
export default function Whiteboard() {
  const [excalidrawAPI, setExcalidrawAPI] = useState(null);

  // 開發期方便:把 api 掛到 window,之後可在瀏覽器 console 手動測 updateScene。
  useEffect(() => {
    if (excalidrawAPI) {
      window.excalidrawAPI = excalidrawAPI;
    }
  }, [excalidrawAPI]);

  return (
    <div style={{ height: "100%", width: "100%" }}>
      <Excalidraw
        excalidrawAPI={(api) => setExcalidrawAPI(api)}
        // 極簡、低認知負荷:預設淺色主題,之後再依設計方向調整 UI。
        theme="light"
      />
    </div>
  );
}
