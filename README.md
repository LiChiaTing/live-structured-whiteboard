# 教學動態白板 (Teaching Live Whiteboard)

把講課內容即時轉成「結構化、極簡的板書」(文字框、箭頭、簡單圖形),並在課後自動輸出乾淨筆記。

## What it is

一個為教育者設計的動態白板。老師邊講課,系統邊把口語內容轉譯成清晰、低認知負荷的板書視覺,協助視覺型學習者理解,並在課後自動分發筆記。

**MVP 範圍:** 先做「貼文字稿 / 打字 → 生成板書 → 匯出筆記」這條管線,語音是後續才疊加的輸入方式。

**核心架構原則(兩層 DSL):**

1. LLM 只輸出精簡的中介 DSL,**絕不直接產 Excalidraw JSON**。
2. 座標一律由排版引擎 (`dagre`) 計算,**不讓 LLM 算 x/y**。
3. 板書是累積式 (add / connect / update / remove),不是每次重畫。
4. LLM 輸出一律先過 Zod 驗證,失敗就重試或丟棄,絕不送進渲染層。

完整規格見 [docs/01-plan/教學動態白板_開發計畫_v2.md](docs/01-plan/教學動態白板_開發計畫_v2.md)。

## Tech stack

| 層 | 選型 |
|---|---|
| 前端框架 | Astro + Tailwind CSS (互動元件用 React Islands) |
| 白板核心 | `@excalidraw/excalidraw` (`client:only="react"`) |
| DSL 驗證 | `zod` |
| 排版引擎 | `dagre` (MVP) |
| LLM | GPT-4o / Gemini 1.5 Pro (structured output) |

## Project structure

```
.
├── docs/                  專案的「思考」文件
│   ├── 00-product/        產品概念與願景 (北極星:為什麼做)
│   ├── 01-plan/           開發計畫 v2 + Cursor / Claude Code 啟動指令
│   ├── 03-decisions/      decision-log (重要決策記錄)
│   └── archive/           已被取代的舊版 (僅存查)
├── src/                   程式碼 (Astro 進駐後在此)
├── README.md             你正在看的這份
└── CLAUDE.md             給 AI agent 的專案說明
```

## How to run

> 程式碼尚未進駐 — 目前是規劃 / 地基階段。
> 開始開發後,啟動指令會補在這裡 (預期為 `npm install` → `npm run dev`)。

## Credits

- 產品與設計:Dianne ([diannedesign.me](https://diannedesign.me))
- 開發協作:Claude Code
