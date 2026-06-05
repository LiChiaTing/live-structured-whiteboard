# 教學動態白板 — 專案說明 (給 AI agent)

> 這份是**專案層級**的說明。Dianne 的全域工作偏好 (規劃先行、設計優先、用設計語言溝通、不要丟一堆程式碼) 仍然適用。
> `.cursorrules` 是這份的別名 (內容相同),給 Cursor 用。

## 一句話定位

把講課內容轉成「結構化、極簡的板書視覺」(文字框、箭頭、簡單圖形),並在課後自動輸出乾淨筆記。**核心價值在「穩定生成好看且正確的板書結構」,不在炫。**

## 目標使用者

- **主要:** 教育者 / 講師 (課堂中即時使用,常搭配平板)。
- **次要:** 學生 (課後接收筆記,被動受益)。

## 設計哲學

極簡、乾淨、低認知負荷,像一塊**會演化的數位黑板**。Dianne 的美感基準:[diannedesign.me](https://diannedesign.me)。

## 核心架構原則 (務必遵守)

1. **兩層架構:** LLM 只輸出精簡的中介 DSL (規格見 `docs/01-plan/教學動態白板_開發計畫_v2.md` 第 4 節),**絕不直接產 Excalidraw JSON**。
2. **座標交給排版引擎:** 一律由 `dagre` 計算 x/y,**不要讓 LLM 算座標**。
3. **累積式板書:** 用 add / connect / update / remove,不是每次重畫。
4. **Zod 驗證閘門:** LLM 輸出一律先過 Zod 驗證,失敗就重試或丟棄,絕不送進渲染層。

## 技術堆疊

Astro + Tailwind CSS + `@excalidraw/excalidraw` (React Island, `client:only="react"`) + `zod` (DSL 驗證) + `dagre` (排版)。LLM 用 GPT-4o / Gemini 1.5 Pro 的 structured output。

## 已知限制 / 風險

- **延遲鏈疊加** (STT + LLM):是「跟上講者」願景的最大風險 → 之後用「語意段落浮現 + debounce」吸收。
- **成本:** 持續 STT + 高頻 LLM 呼叫,需估算每小時課程成本。
- **狀態同步:** 累積式板書 + 老師編輯是隱藏工程量 → MVP 用「鎖定節點」簡化。
- **id 穩定性:** LLM 亂改 id 會破壞增量更新 → prompt 強調沿用既有 id,轉換層做容錯。

## 開發順序 (MVP,逐步驗收)

依 `docs/01-plan/教學動態白板_開發計畫_v2.md` 第 9 節:

1. Scaffold:Astro + Tailwind + Excalidraw island,畫面能跑。
2. `src/dsl.ts` (Zod schema) + `src/render.ts` (dagre + DSL→Excalidraw) + 單元測試。
3. 頁面加「貼文字稿」輸入框,先用 mock LLM 回固定 DSL,跑通整條渲染。
4. 接真 LLM (structured output) + Zod 驗證閘門 + 8-10 段評測集做回歸測試。
5. 匯出 (PNG/SVG) + LLM 自動摘要筆記。
6. 最後才接語音 (Web Audio API + STT + debounce)。

> **一步一步來:** 每步 Dianne 確認驗收後再繼續,不要一次寫完所有階段。

## 重要文件

- 產品北極星:`docs/00-product/產品概念與願景_Product_Spec.md`
- 技術藍圖:`docs/01-plan/教學動態白板_開發計畫_v2.md`
- 決策記錄:`docs/03-decisions/decision-log.md`
