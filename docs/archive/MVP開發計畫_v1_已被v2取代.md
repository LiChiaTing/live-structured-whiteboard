# ⚠️ 已被取代 — MVP 開發計畫 v1(僅存查)

> **此文件已被 `教學動態白板_開發計畫_v2.md` 取代,請勿據以開發。**
>
> v1 的兩個技術做法已在 v2 中被修正:
> 1. ❌ 讓 LLM 直接輸出完整 Excalidraw JSON → ✅ 改為兩層 DSL 架構。
> 2. ❌ 讓 LLM 計算座標 / 排版 → ✅ 改由 `dagre` 排版引擎計算。
>
> 保留此檔僅供追溯初版構想。以下為原始內容。

---

## 技術堆疊預覽 (Tech Stack)

- 前端框架:Astro 搭配 Tailwind CSS(利用 React Islands 處理互動元件)
- 白板核心:`@excalidraw/excalidraw`(React 元件)
- 語音辨識 (STT):OpenAI Whisper API(或其他低延遲服務)
- AI 邏輯模型:具備強大 JSON 輸出能力的 LLM(如 GPT-4o 或 Gemini 1.5 Pro)

## 階段一:前端基礎建設與白板嵌入
目標:建立一個乾淨的畫布介面,並確認能透過程式碼動態控制畫布內容。

1. 環境建置:初始化 Astro 專案並整合 Tailwind CSS,建立極簡且無干擾的教學介面版型。
2. 套件安裝:引入 Excalidraw 套件,透過 Astro 的 `client:only="react"` 指令將白板元件渲染在網頁上。
3. 資料測試 (PoC):撰寫測試腳本,手動傳遞 Excalidraw 格式 JSON 給 `updateScene` API,確認畫面能長出對應圖形與文字。

## 階段二:AI 邏輯與資料格式轉換
目標:打通「自然語言 ➔ 結構化 JSON」的推論管線。

1. 提示詞工程:設計系統指令,規定 LLM 只能輸出符合 Excalidraw 規範的 JSON 陣列(含 `type`, `x`, `y`, `text`, `width` 等屬性)。
2. 空間與排版測試:給 LLM 多段教學文字稿,測試其空間排版邏輯與座標計算能力。
3. 預載機制實作:建立資料結構,預先讀取專有名詞清單或底圖模版,提升 LLM 推論準確度。

## 階段三:語音串接與即時渲染
目標:將聲音與畫布動作連動。

1. 語音擷取:透過 Web Audio API 取得麥克風音訊,送 STT 服務轉譯成純文字。
2. 管線串接:轉譯文字即時傳入 LLM,產出 JSON 後推送至 Excalidraw 畫布。
3. 節奏與體驗微調:反覆調整 API 呼叫頻率與防抖機制 (Debounce),確保視覺浮現自然流暢。

## 階段四:課後筆記與輸出
目標:產出實用的學習資產。

1. 畫面匯出:呼叫 Excalidraw 匯出 API,轉成唯讀圖片 (PNG 或 SVG)。
2. 自動摘要:讓 LLM 彙整逐字稿與最終 JSON 結構,輸出條理分明的文字版重點筆記。
