# 保險大富翁 — 財務人生模擬遊戲

Cardif InsurHack 2026 · 題目 1-1。玩家擲骰、抽事件卡,在不同人生與市場情境中體驗風險管理、資產配置與保險保障。

**設計原則:AI 寫劇本,規則引擎算帳。** Gemini 負責事件劇情、理專諮詢、教練回饋與自訂角色;
所有金額、機率與保險給付由 `src/game/engine.js` 確定性計算(同一個 seed 會得到同一局)。沒有金鑰時自動使用內建題庫與規則式教練。

## 本機執行

```bash
npm install
cp .env.example .env        # 填入 GEMINI_API_KEY(到 Google AI Studio 申請)
npm run server              # 後端 http://localhost:8080(讀取環境變數)
npm run dev                 # 前端 http://localhost:5173(/api 會代理到後端)
npm test                    # 規則引擎測試
```
`npm run server` 會自動讀取專案根目錄的 `.env`。沒有金鑰也能玩(離線備援);想測試 AI 管線可在 `.env` 加 `GEMINI_MOCK=1`。

網址參數(錄影/除錯用):`?seed=11` 固定同一局、`?char=parents` 直接選角(rookie / newlywed / parents / single_mom / freelancer / sandwich / pre_retire)。

## 部署到 Google Cloud Run

```bash
gcloud run deploy policypilot --source . --region asia-east1 --allow-unauthenticated \
  --set-secrets GEMINI_API_KEY=gemini-api-key:latest
```
金鑰請放在 Secret Manager,不要寫進程式碼或前端。後端內建每 IP 每分鐘限流(`RATE_LIMIT_PER_MIN`)。

## 結構

- `src/game/` 規則引擎(`engine.js`)、角色、保險商品、事件題庫、離線備援
- `src/components/` 棋盤、規劃面板、事件卡、結算頁(平行人生對照圖)
- `server/` Express + Gemini 代理與提示詞(`prompts.js`)
