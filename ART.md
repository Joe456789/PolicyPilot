# 用 Gemini 生成遊戲插圖

遊戲裡的事件卡、地產、結局與標題頁,都可以換成 Gemini 生成的插圖。**沒有圖的時候會自動顯示原本的表情符號**,所以這是「加分」功能,不做也不影響遊戲。

金鑰只在你自己的電腦上使用,生成後的圖片放在 `public/art/`,跟著網站一起部署。

## 一次做完(Windows Git Bash / Mac / Linux 都一樣)

```bash
git pull origin claude/lucid-fermat-rlqnmr   # 拿到最新程式
npm install
npm install --no-save sharp                   # 選配:把圖縮小成 webp(檔案小很多,建議裝);不裝也能用
# .env 裡已經有 GEMINI_API_KEY=你的金鑰 的話,直接往下

npm run art:dry          # 先看會生成哪些圖(不花錢)
npm run art              # 生成「核心」69 張:生活事件、行情、里程碑、12 處地產、17 種結局、標題
npm run art -- --tier all   # 想要更完整:再加上機會卡、意外之財、成長篇卡片(共約 180 張)
```

- 可以隨時按 `Ctrl+C` 中斷,**再執行同一個指令只會補還沒有的圖**。
- 只想重畫某幾張:`npm run art -- --only prop_ --force`(`--only` 是 id 開頭;例如 `ending_`、`life_kid_`、`flu`)。
- 想先看畫面效果、不花額度:`npm run art -- --mock`(產生彩色占位圖,看完把 `public/art/` 清掉)。

## 畫風:寫實電影感(2026/10 更新)

`scripts/artSubjects.mjs` 的 `STYLE` 已從「黏土玩具」改成**寫實電影感照片**(黃昏暖光、淺景深、同一套調色),和 3D 棋盤的寫實畫風一致。
之前生成的黏土風圖片不會自動換掉,要整批重畫:

```bash
npm run art -- --force   # 重新生成全部 69 張核心插圖(會覆蓋 public/art/ 裡的舊圖)
```

舊圖還在 git 歷史裡,想換回來可以 `git checkout <舊的 commit> -- public/art`。

## 看效果

```bash
npm run build
npm start        # 開 http://localhost:8080
```

## 放進專案

圖片放在 `public/art/`,建議檢查過再提交(AI 偶爾會畫出奇怪的字或多一隻手):

```bash
git add public/art
git commit -m "Add Gemini illustrations"
git push origin claude/lucid-fermat-rlqnmr
```

部署到 Cloud Run 時 `npm run build` 會自動把 `public/art` 一起打包。

## 費用與疑難排解

- 圖片生成通常**不在免費額度內**,需要在 Google AI Studio 綁定計費。粗估一張約 0.04 美元,核心 69 張約 3 美元、全部約 7 美元。
- 全部都是 `HTTP 400 / 403 / 404`:金鑰沒有開通圖片生成,或模型名稱不對。可以用 `--model` 指定,或在 `.env` 設 `GEMINI_IMAGE_MODEL=你帳號可用的圖片模型`。預設是 `gemini-2.5-flash-image`。
- `HTTP 429`:太快了,腳本會自動等待重試;也可以加 `--concurrency 1`。
- 回應裡沒有圖片:被安全機制擋下,該題材會被列在失敗清單,再跑一次或手動調整 `scripts/artSubjects.mjs` 裡那一題的描述。
- 想換畫風:改 `scripts/artSubjects.mjs` 最上面的 `STYLE`,再用 `--force` 重新生成。

## 注意

- 單一檔案的展示版(Artifact)沒有包含圖片(檔案會太大),拍影片或展示請用 `npm start` 的版本。
- 企劃書建議註明「插圖由 Gemini 生成」,這也是 AI 應用的一部分。
