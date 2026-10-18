# 保險大富翁 — 財務人生模擬遊戲

Cardif InsurHack 2026 · 題目 1-1。從 22 歲、一無所有開始:創角(職業、家境、個性)→ 擲骰、做決策 → 結算「平行人生」對照。
玩家會經歷結婚、買房、育兒、投資、貸款、意外與市場起伏,在過程中體驗風險管理、資產配置與保險保障的重要性。

**設計原則:AI 寫劇本與做學習回饋,規則引擎算帳。** Gemini 負責事件劇情改寫、理專諮詢、人生階段分析與結算教練回饋(含給理專的客戶話術);
所有金額、機率與保險給付由 `src/game/` 的規則引擎確定性計算(同一個 seed 會得到同一局)。沒有金鑰時自動使用內建題庫與規則式教練。
AI 不負責創造角色,也不改動任何數字;每局約 10 到 15 次 AI 呼叫,後端有每 IP、每日與全站上限,超過時自動改用離線題庫。

## 本機執行

```bash
npm install
cp .env.example .env        # 填入 GEMINI_API_KEY(到 Google AI Studio 申請)
npm run server              # 後端 http://localhost:8080(讀取環境變數)
npm run dev                 # 前端 http://localhost:5173(/api 會代理到後端)
npm test                    # 規則引擎測試
```
`npm run server` 會自動讀取專案根目錄的 `.env`。沒有金鑰也能玩(離線備援);想測試 AI 管線可在 `.env` 加 `GEMINI_MOCK=1`。

網址參數(錄影/除錯用):`?seed=11` 固定同一局;`?auto=1&career=engineer&bg=normal&len=short` 略過創角直接開局(career: office/engineer/nurse/sales/freelancer/teacher;bg: tight/normal/comfy;len: short/standard/long)。

## 部署到 Google Cloud Run

```bash
gcloud run deploy policypilot --source . --region asia-east1 --allow-unauthenticated \
  --set-secrets GEMINI_API_KEY=gemini-api-key:latest
```
金鑰請放在 Secret Manager,不要寫進程式碼或前端。後端內建每 IP 每分鐘限流(`RATE_LIMIT_PER_MIN`)。

## 結構

- `src/game/` 規則引擎(`core.js` 狀態與建議、`scenes.js` 場景、`engine.js` 動作與年度結算、`scoring.js` 評分與平行人生)、`content.js` 題庫、`products.js` 保障商品
- `src/components/` 棋盤、規劃面板、事件卡、結算頁(平行人生對照圖)
- `server/` Express + Gemini 代理與提示詞(`prompts.js`)
