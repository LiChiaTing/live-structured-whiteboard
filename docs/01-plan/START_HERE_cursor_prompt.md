# Cursor 啟動 Prompt

> 用法:在 Cursor 開一個空專案,把 `教學動態白板_開發計畫_v2.md` 放進去,
> 然後把下面整段(分隔線之間)複製貼給 Claude Code 當第一句話。

---

你是這個專案的主力工程師。請先閱讀同目錄下的 `教學動態白板_開發計畫_v2.md`,那是我們的技術規格與藍圖,後續所有實作都以它為準。

**專案目標:** 一個「文字稿 → 結構化板書 → 課後筆記」的教學動態白板。MVP 階段先不做語音,先把「文字 → 板書」這條管線做穩。

**技術堆疊:** Astro + Tailwind CSS + `@excalidraw/excalidraw`(React Island)+ `zod`(DSL 驗證)+ `dagre`(排版)。

**核心架構原則(務必遵守):**
1. 兩層架構:LLM 只輸出精簡的中介 DSL(規格見文件第 4 節),**絕不直接產 Excalidraw JSON**。
2. 座標一律由 `dagre` 排版引擎計算,**不要讓 LLM 算 x/y**。
3. 板書是累積式(add / connect / update / remove),不是每次重畫。
4. LLM 的輸出一律先過 Zod 驗證,失敗就重試或丟棄,絕不送進渲染層。

**這次請只做「起手式步驟 1」(文件第 9 節):**
- 初始化 Astro + Tailwind 專案。
- 安裝並以 `client:only="react"` 嵌入 Excalidraw,畫面能正常顯示一塊空白白板。
- 取得並保存 `excalidrawAPI` 的 ref,之後要用它呼叫 `updateScene`。
- 確認 `npm run dev` 可跑起來,白板可正常互動。

完成後請告訴我怎麼啟動、目前的檔案結構,以及下一步(步驟 2:`dsl.ts` + `render.ts` + 單元測試)你打算怎麼做。**先不要一次寫完所有階段,我們一步一步來,每步我確認後再繼續。**

---

## 後續每一步要貼的指令(備忘)

照文件第 9 節順序,每步驗收後再下一步:

- **步驟 2:** 「實作 `dsl.ts`(第 4 節 Zod schema)與 `render.ts`(dagre + DSL→Excalidraw 轉換),並寫單元測試:給 2–3 組寫死的 DSL,驗證輸出的 elements 合法、無重疊、箭頭正確綁定。」
- **步驟 3:** 「在頁面加一個『貼文字稿』輸入框,先用 mock LLM 回傳固定 DSL,把『輸入 → DSL → 渲染』整條跑通。」
- **步驟 4:** 「接真 LLM(structured output 強制 JSON 格式)+ Zod 驗證閘門,並建立 8–10 段文字稿的評測集做回歸測試。」
- **步驟 5(階段四):** 「實作匯出(PNG/SVG)+ LLM 自動摘要筆記。」
- **步驟 6(階段三):** 「最後才接語音:Web Audio API + STT,並用語意段落 + debounce 控制節奏。」
