# src/

程式碼進駐前的佔位檔。Astro scaffold 後,這個資料夾會放:

- `dsl.ts` — 中介 DSL 的 Zod schema (LLM 的唯一輸出格式)
- `render.ts` — DSL → Excalidraw 的純函式 (dagre 排版)
- Astro 頁面與 React (Excalidraw) island

> scaffold 完成後可刪掉這個 README。
