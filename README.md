# 保險大富翁 — 財務人生模擬遊戲

Cardif InsurHack 2026 · 題目 1-1。**從 0 歲出生開始**:出生抽籤(家境、家人有沒有保險)→ 0 到 21 歲的成長篇 → 22 歲踏入社會,
進入 **3D 大富翁棋盤**,和電腦對手一起走完人生:結婚、買房、育兒、投資、貸款、意外與市場起伏。

- **大富翁為主:** 擲骰、走格、抽事件卡、和電腦對手比拚。
- **小遊戲格:** 棋盤上有 3 個小遊戲格,隨機出現保險配對翻牌、防詐騙判斷、預算分配、風險攔截戰、命運輪盤(用你真實的保障檢驗)與保險小學堂,玩得好有獎金。
- **成長篇(可跳過):** 從 0 歲出生開始的選擇;你小時候「還不能決定」的事,例如家人有沒有保險,會留在你的起點。也可以直接進入棋盤。
- **3D 棋盤:** 以 three.js 程式生成(沒有外部圖檔)。骰子物理滾動、角色走格、鏡頭運鏡、音效(WebAudio 合成)。不支援 WebGL 時自動改用 2D。
- **電腦對手與即時排名:** 4 種決策風格不同的 AI 玩家(穩健、梭哈、保險至上、平衡),同一套規則、同一個棋盤。
- **人生任務與成就戰績:** 每局抽 3 個任務;成就與歷史戰績存在瀏覽器(`localStorage`,尚無帳號)。
- **結算:** 平行人生對照(沒保險 / 你 / 建議配置)、AI 教練回饋、給理專的客戶話術。

**設計原則:AI 寫劇本與做學習回饋,規則引擎算帳。** Gemini 負責劇情改寫、理專諮詢、人生階段分析與結算教練回饋;
所有金額、機率與保險給付由 `src/game/` 的規則引擎確定性計算(同一個 seed 會得到同一局)。沒有金鑰時自動使用內建題庫與規則式教練。
AI 不負責創造角色,也不改動任何數字;每局約 10 到 15 次 AI 呼叫,後端有每 IP、每日與全站上限,超過時自動改用離線題庫。
規則層是純函式、可重現,之後做連線多人只需要同步「操作」。

## 本機執行

```bash
npm install
cp .env.example .env        # 填入 GEMINI_API_KEY(到 Google AI Studio 申請)
npm run server              # 後端 http://localhost:8080(讀取環境變數)
npm run dev                 # 前端 http://localhost:5173(/api 會代理到後端)
npm test                    # 規則引擎測試
```
`npm run server` 會自動讀取專案根目錄的 `.env`。沒有金鑰也能玩(離線備援);想測試 AI 管線可在 `.env` 加 `GEMINI_MOCK=1`。

網址參數(錄影/除錯用):`?seed=11` 固定同一局;`?auto=1&career=engineer&len=short&opp=2` 略過成長篇直接進棋盤(career: office/engineer/nurse/sales/freelancer/teacher;len: short/standard/long;opp: 電腦對手 0~3)。

## 部署到 Google Cloud Run

```bash
gcloud run deploy policypilot --source . --region asia-east1 --allow-unauthenticated \
  --set-secrets GEMINI_API_KEY=gemini-api-key:latest
```
金鑰請放在 Secret Manager,不要寫進程式碼或前端。後端內建每 IP 每分鐘限流(`RATE_LIMIT_PER_MIN`)。

## 結構

- `src/game/` 規則引擎:`prologue.js` 成長篇、`core.js` 狀態與建議、`scenes.js` 場景、`engine.js` 動作與年度結算、`scoring.js` 評分與平行人生、`quests.js` 任務、`bots.js` 電腦對手、`match.js` 對局與排名、`records.js` 成就戰績、`content.js` 題庫、`products.js` 保障商品
- `src/three/BoardScene.js` 3D 棋盤;`src/sfx.js` 音效
- `src/components/` 棋盤、規劃面板、事件卡、結算頁(平行人生對照圖)
- `server/` Express + Gemini 代理與提示詞(`prompts.js`)
