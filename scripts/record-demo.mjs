// 自動錄製初賽展示影片(照 docs/VIDEO_SCRIPT.md 的分鏡)。
// 在自己的電腦上執行:先用 `npm run server` 開好接上 Gemini 的遊戲,再開另一個視窗執行
//   npm run record
// 程式會開一個瀏覽器,照腳本自動操作遊戲並錄影,完成後輸出:
//   video/保險大富翁_展示影片.webm   影片(YouTube 可直接上傳)
//   video/保險大富翁_展示影片.srt    字幕(可匯入剪映/CapCut 產生旁白,或上傳到 YouTube)
// 環境變數:BASE(遊戲網址,預設 http://localhost:8080)、HEADED=1(看得到瀏覽器視窗)、BOARD=2d(用 2D 棋盤)

import fs from 'node:fs'
import path from 'node:path'

let chromium
try {
  ({ chromium } = await import('playwright'))
} catch {
  console.error('找不到 playwright。請先執行:\n  npm install --no-save playwright\n  npx playwright install chromium')
  process.exit(1)
}

const BASE = (process.env.BASE || 'http://localhost:8080').replace(/\/$/, '')
const OUT = path.resolve('video')
const W = 1920, H = 1080
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// 旁白 / 字幕(與 docs/VIDEO_SCRIPT.md 一致)
const CAP = {
  open: '理專要讓客戶懂保險,最難的是:「萬一」還沒發生過。我們做了「保險大富翁」,讓理專在一局遊戲裡,先走完一生。',
  create: '先建立角色:家境、職業、個性,可以從 22 歲、30 歲或 40 歲開局。',
  plan: '每一年先做規劃。右邊是我們自己訓練的機器學習模型:未來八年發生財務危機的機率。補上醫療、重大傷病和失能險,機率馬上下降。',
  event: '擲骰子。事件卡是 Gemini 依角色處境即時寫出的情境和選項;所有金額與理賠由規則引擎計算,下方還附台灣政府的真實統計。',
  claim: '有買保險,還要會申請理賠。學員要自己挑出該附的文件;缺件的話,理賠金要等到下一年才會入帳。',
  ask: '不懂就問理專。AI 會依照學員現在的保障和財務狀況回答,不是罐頭答案。',
  auto: '接下來用電腦託管快轉。途中股市會突然急跌,考驗會不會殺低;每隔幾年,AI 理專會整理一次財務體質。',
  result: '一局結束。平行人生用完全相同的事件,算出沒保險和建議配置差了多少;理財性格分析告訴學員自己是哪一型,最後還能下載 PDF 學習報告。',
  close: '保險大富翁:讓理專先在遊戲裡經歷人生,再把保障的價值,講給客戶聽。',
}
const QUESTION = '實支實付和住院日額有什麼不同?我現在該先補哪一個?'

// 每頁都會注入:畫面下方的字幕條、看得見的滑鼠游標(錄影本身不會錄到系統游標)
const OVERLAY = () => {
  const boot = () => {
    if (document.getElementById('rec-cap')) return
    const cap = document.createElement('div')
    cap.id = 'rec-cap'
    cap.style.cssText = 'position:fixed;left:50%;bottom:28px;transform:translateX(-50%);max-width:1500px;z-index:2147483647;pointer-events:none;background:rgba(16,33,43,.88);color:#fff;font:600 30px/1.5 "Noto Sans TC","Microsoft JhengHei",sans-serif;padding:14px 28px;border-radius:16px;text-align:center;display:none'
    document.body.appendChild(cap)
    const dot = document.createElement('div')
    dot.id = 'rec-cursor'
    dot.style.cssText = 'position:fixed;left:-50px;top:-50px;width:26px;height:26px;margin:-13px 0 0 -13px;border-radius:50%;background:rgba(242,168,29,.55);border:3px solid #fff;box-shadow:0 0 0 2px rgba(0,0,0,.35);z-index:2147483647;pointer-events:none;transition:transform .12s'
    document.body.appendChild(dot)
    addEventListener('mousemove', (e) => { dot.style.left = e.clientX + 'px'; dot.style.top = e.clientY + 'px' }, true)
    addEventListener('mousedown', () => { dot.style.transform = 'scale(.7)' }, true)
    addEventListener('mouseup', () => { dot.style.transform = 'scale(1)' }, true)
  }
  if (document.body) boot(); else addEventListener('DOMContentLoaded', boot)
  window.__cap = (text) => { boot(); const c = document.getElementById('rec-cap'); c.textContent = text || ''; c.style.display = text ? 'block' : 'none' }
}

const t0 = Date.now()
const subs = []
let page

async function caption(key) {
  const text = CAP[key]
  const now = (Date.now() - t0) / 1000
  if (subs.length) subs[subs.length - 1].end = now
  subs.push({ start: now, end: now + 8, text })
  await page.evaluate((x) => window.__cap?.(x), text).catch(() => {})
  console.log(`[${now.toFixed(1)}s] ${key}`)
}

// 滑鼠慢慢移過去再點,觀眾才看得清楚
async function glide(locator) {
  const box = await locator.boundingBox()
  if (!box) return false
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 18 })
  await sleep(250)
  return true
}
async function tap(locator, timeout = 15000) {
  await locator.waitFor({ state: 'visible', timeout })
  await locator.scrollIntoViewIfNeeded().catch(() => {})
  await glide(locator)
  await locator.click()
  await sleep(400)
}
async function point(locator, ms = 1800) {
  if (await locator.count()) {
    await locator.first().scrollIntoViewIfNeeded().catch(() => {})
    await glide(locator.first())
  }
  await sleep(ms)
}
const visible = async (loc) => (await loc.count()) > 0 && (await loc.first().isVisible().catch(() => false))

// 處理完這一年剩下的畫面(生活小事、年度結算),回到可以操作棋盤的狀態
async function finishYear(maxSteps = 20) {
  for (let i = 0; i < maxSteps; i++) {
    await sleep(700)
    if (await visible(page.getByRole('button', { name: '送出申請' }))) {
      for (const n of ['理賠申請書', '診斷證明書', '醫療費用收據']) {
        const box = page.locator('.claim-doc', { hasText: n }).locator('input')
        if (await box.count()) await box.first().check().catch(() => {})
      }
      await tap(page.getByRole('button', { name: '送出申請' }))
      continue
    }
    const choice = page.locator('.choices .choice').first()
    if (await visible(choice)) { await tap(choice); continue }
    const next = page.getByRole('button', { name: /進入下一年/ })
    if (await visible(next)) { await tap(next); continue }
    const cont = page.locator('.modal .btn.primary.wide').first()
    if (await visible(cont)) { await tap(cont); continue }
    if (await visible(page.locator('.modal.plan'))) { await tap(page.getByRole('button', { name: /完成,去擲骰/ })); continue }
    if (await page.getByRole('button', { name: '擲骰子' }).isEnabled().catch(() => false)) return
  }
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true })
  const browser = await chromium.launch({ headless: !process.env.HEADED, args: ['--autoplay-policy=no-user-gesture-required'] })
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, recordVideo: { dir: OUT, size: { width: W, height: H } }, acceptDownloads: true, locale: 'zh-TW', colorScheme: 'light' })
  await ctx.addInitScript(OVERLAY)
  if (process.env.BOARD === '2d') await ctx.addInitScript(() => localStorage.setItem('policypilot.2d', '1'))
  page = await ctx.newPage()

  // 1. 開場
  await page.goto(BASE + '/')
  await page.waitForSelector('.title-btns', { timeout: 30000 })
  const ai = await page.locator('.ai-pill').first().innerText().catch(() => '')
  if (!/已連線/.test(ai)) console.warn('⚠ 注意:遊戲目前不是「AI 已連線」狀態(' + ai.trim() + '),錄到的 AI 畫面會是離線或模擬版本。')
  await caption('open')
  await sleep(2500)
  await point(page.getByRole('button', { name: '開始新的人生' }), 6000)

  // 2. 創角(只是瀏覽選項)
  await tap(page.getByRole('button', { name: '開始新的人生' }))
  await caption('create')
  for (let i = 0; i < 6; i++) { await page.mouse.wheel(0, 260); await sleep(700) }
  await sleep(1500)

  // 3. 開局規劃 + AI 風險預測(固定種子 31:第一年會遇到意外骨折)
  await page.goto(`${BASE}/?auto=1&seed=31&opp=2&len=short`)
  await page.waitForSelector('.modal.plan', { timeout: 60000 })
  await caption('plan')
  await sleep(1500)
  await point(page.locator('.modal .risk-card'), 3500)
  for (const name of ['醫療險', '重大傷病險', '失能所得補償']) {
    const opt = page.locator('.prod', { hasText: name }).first().locator('.seg-b').nth(1)
    if (await opt.count()) await tap(opt)
    await sleep(500)
  }
  await point(page.locator('.modal .risk-card'), 3000)
  await point(page.locator('.learned-box'), 2500)

  // 4. 擲骰 + AI 事件導演 + 真實數據卡
  await caption('event')
  await tap(page.getByRole('button', { name: /完成,去擲骰/ }))
  await tap(page.locator('label.switch'))
  await tap(page.getByRole('button', { name: '擲骰子' }))
  await page.waitForSelector('.card-title', { timeout: 60000 })
  // 等 AI 改寫情境(最多 12 秒),沒等到就用原本的事件卡
  await page.locator('.ai-pill', { hasText: 'AI 導演' }).waitFor({ timeout: 12000 }).catch(() => {})
  await sleep(2500)
  await point(page.locator('.real-fact'), 3000)
  await point(page.locator('.pick-text'), 2500)
  await tap(page.locator('.choices .choice').first())

  // 5. 理賠申請
  await caption('claim')
  await page.waitForSelector('.claim-panel', { timeout: 15000 }).catch(() => {})
  await sleep(1200)
  for (const n of ['理賠申請書', '診斷證明書', '醫療費用收據']) {
    const box = page.locator('.claim-doc', { hasText: n }).locator('input')
    if (await box.count()) { await glide(box.first()); await box.first().check().catch(() => {}); await sleep(500) }
  }
  if (await visible(page.getByRole('button', { name: '送出申請' }))) await tap(page.getByRole('button', { name: '送出申請' }))
  await sleep(3500)
  await finishYear()

  // 6. 問理專
  await caption('ask')
  await tap(page.getByRole('button', { name: /問理專/ }).first())
  const input = page.locator('#ask-q')
  await input.waitFor({ timeout: 10000 })
  await glide(input)
  await input.click()
  await input.pressSequentially(QUESTION, { delay: 70 })
  const before = await page.locator('.msg.bot').count()
  await tap(page.getByRole('button', { name: '送出' }))
  await page.waitForFunction((n) => document.querySelectorAll('.msg.bot:not(:has(.typing))').length > n, before, { timeout: 40000 }).catch(() => {})
  await sleep(5000)
  await tap(page.locator('.modal.ask').getByRole('button', { name: '關閉' }))

  // 7. 電腦託管快轉 + 階段回顧
  await caption('auto')
  await tap(page.getByRole('button', { name: /快轉/ }))
  await tap(page.getByRole('button', { name: /電腦託管/ }))
  await tap(page.locator('.auto-years button', { hasText: '到結束' }))
  await tap(page.getByRole('button', { name: /開始託管/ }))
  for (let i = 0; i < 400; i++) {
    await sleep(500)
    if (await visible(page.getByRole('button', { name: /PDF/ }))) break
    const stage = page.getByRole('button', { name: '繼續人生' })
    if (await stage.isEnabled().catch(() => false) && await visible(stage)) { await sleep(3500); await tap(stage) }
  }

  // 8. 人生結算
  await caption('result')
  await sleep(2000)
  await point(page.getByText(/平行人生:同樣的人生/), 4500)
  await point(page.locator('.style-card'), 4500)
  const pdf = page.getByRole('button', { name: /PDF/ })
  await pdf.scrollIntoViewIfNeeded()
  const dl = page.waitForEvent('download', { timeout: 30000 }).catch(() => null)
  await tap(pdf)
  const file = await dl
  if (file) await file.saveAs(path.join(OUT, '學習報告範例.pdf')).catch(() => {})
  await sleep(2500)

  // 9. 收尾
  await page.goto(BASE + '/')
  await page.waitForSelector('.title-btns', { timeout: 30000 })
  await caption('close')
  await sleep(6500)

  subs[subs.length - 1].end = (Date.now() - t0) / 1000
  const video = page.video()
  await ctx.close()
  await browser.close()
  const dest = path.join(OUT, '保險大富翁_展示影片.webm')
  fs.renameSync(await video.path(), dest)
  // 字幕時間從影片開始算(與錄影起點差不到一秒)
  const ts = (s) => { const ms = Math.max(0, Math.round(s * 1000)); const p = (n, l = 2) => String(n).padStart(l, '0'); return `${p(Math.floor(ms / 3600000))}:${p(Math.floor(ms / 60000) % 60)}:${p(Math.floor(ms / 1000) % 60)},${p(ms % 1000, 3)}` }
  fs.writeFileSync(path.join(OUT, '保險大富翁_展示影片.srt'), subs.map((x, i) => `${i + 1}\n${ts(x.start)} --> ${ts(x.end)}\n${x.text}\n`).join('\n'))
  const total = subs[subs.length - 1].end
  console.log(`\n完成!影片長度約 ${Math.floor(total / 60)} 分 ${Math.round(total % 60)} 秒`)
  console.log('  ' + dest)
  console.log('  ' + path.join(OUT, '保險大富翁_展示影片.srt'))
  if (total > 180) console.log('⚠ 超過 3 分鐘:剪輯時把等待 AI 與電腦託管的片段加速即可。')
}

main().catch((e) => { console.error(e); process.exit(1) })
