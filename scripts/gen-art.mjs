// 用 Gemini 生成遊戲插圖。在「你自己的電腦」執行(金鑰在 .env,不會上傳到任何地方)。
//
//   npm run art:dry                 只列出會生成哪些圖與提示詞,不呼叫 API
//   npm run art                     生成核心插圖(約 70 張:事件、行情、里程碑、8 處地產、17 種結局、標題)
//   npm run art -- --tier all       連機會卡、意外之財與成長篇卡片一起生成(約 190 張)
//   npm run art -- --only prop_     只生成 id 以 prop_ 開頭的圖
//   npm run art -- --mock           不呼叫 API,產生占位圖,用來測試畫面
// 已存在的圖會跳過(可以中斷後再跑);加 --force 重新生成。
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { allSubjects } from './artSubjects.mjs'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const outDir = path.join(root, 'public', 'art')
const args = process.argv.slice(2)
const flag = (n) => args.includes('--' + n)
const opt = (n, d) => { const i = args.indexOf('--' + n); return i >= 0 && args[i + 1] ? args[i + 1] : d }

const MODEL = opt('model', process.env.GEMINI_IMAGE_MODEL || 'gemini-2.5-flash-image')
const TIER = opt('tier', 'core')
const ONLY = opt('only', '')
const CONC = Number(opt('concurrency', 2))
const KEY = process.env.GEMINI_API_KEY

let subjects = allSubjects().filter((s) => (TIER === 'all' ? true : s.tier === 'core') && s.id.startsWith(ONLY))
fs.mkdirSync(outDir, { recursive: true })
const existing = (id) => fs.readdirSync(outDir).find((f) => f.startsWith(id + '.'))
const todo = flag('force') ? subjects : subjects.filter((s) => !existing(s.id))

console.log(`題材 ${subjects.length} 個,需要生成 ${todo.length} 個(模型 ${flag('mock') ? 'mock' : MODEL})`)
if (flag('dry')) {
  for (const s of todo) console.log(`- ${s.id}\n    ${s.prompt.split('\nScene: ')[1]}`)
  process.exit(0)
}
if (!flag('mock') && !KEY) {
  console.error('找不到 GEMINI_API_KEY。請先在專案根目錄的 .env 設定:GEMINI_API_KEY=你的金鑰(或加 --mock 測試)')
  process.exit(1)
}

let sharp = null
try { sharp = (await import('sharp')).default } catch { /* 沒裝 sharp 就直接存原圖 */ }

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function generate(prompt) {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': KEY },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseModalities: ['IMAGE'] } }),
  })
  if (!res.ok) {
    const e = new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 240)}`)
    e.status = res.status
    throw e
  }
  const data = await res.json()
  const part = data?.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data)
  if (!part) throw new Error('回應裡沒有圖片(可能被安全機制擋下):' + JSON.stringify(data?.candidates?.[0]?.finishReason || data?.promptFeedback || ''))
  return { buf: Buffer.from(part.inlineData.data, 'base64'), mime: part.inlineData.mimeType || 'image/png' }
}

function mockImage(id) {
  let h = 0
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0
  const hue = h % 360
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${hue} 70% 85%)"/><stop offset="1" stop-color="hsl(${(hue + 50) % 360} 70% 72%)"/></linearGradient></defs><rect width="640" height="480" fill="url(#g)"/><circle cx="470" cy="150" r="70" fill="rgba(255,255,255,.5)"/><rect x="90" y="250" width="200" height="150" rx="18" fill="rgba(255,255,255,.55)"/><rect x="320" y="290" width="220" height="110" rx="18" fill="rgba(255,255,255,.4)"/></svg>`
  return { buf: Buffer.from(svg), mime: 'image/svg+xml' }
}

async function save(id, { buf, mime }) {
  for (const f of fs.readdirSync(outDir)) if (f.startsWith(id + '.')) fs.unlinkSync(path.join(outDir, f))
  if (sharp && mime !== 'image/svg+xml') {
    await sharp(buf).resize({ width: 720, withoutEnlargement: true }).webp({ quality: 82 }).toFile(path.join(outDir, id + '.webp'))
    return id + '.webp'
  }
  const ext = mime.includes('svg') ? 'svg' : mime.includes('jpeg') ? 'jpg' : mime.includes('webp') ? 'webp' : 'png'
  fs.writeFileSync(path.join(outDir, `${id}.${ext}`), buf)
  return `${id}.${ext}`
}

function writeManifest() {
  const m = {}
  for (const f of fs.readdirSync(outDir)) {
    if (f === 'manifest.json') continue
    m[f.replace(/\.[^.]+$/, '')] = f
  }
  fs.writeFileSync(path.join(outDir, 'manifest.json'), JSON.stringify(m, null, 1))
  return Object.keys(m).length
}

let done = 0, failed = []
async function worker(queue) {
  while (queue.length) {
    const s = queue.shift()
    let ok = false
    for (let attempt = 1; attempt <= 4 && !ok; attempt++) {
      try {
        const img = flag('mock') ? mockImage(s.id) : await generate(s.prompt)
        const file = await save(s.id, img)
        ok = true
        done++
        console.log(`[${done}/${todo.length}] ${file}`)
        writeManifest()
      } catch (e) {
        const wait = e.status === 429 ? 25000 : 3000 * attempt
        console.warn(`  ${s.id} 第 ${attempt} 次失敗:${e.message}`)
        if (e.status === 400 || e.status === 403 || e.status === 404) break // 設定問題,重試沒用
        if (attempt < 4) await sleep(wait)
      }
    }
    if (!ok) failed.push(s.id)
    if (!flag('mock')) await sleep(600)
  }
}

const queue = [...todo]
await Promise.all(Array.from({ length: Math.max(1, CONC) }, () => worker(queue)))
const total = writeManifest()
console.log(`\n完成:本次生成 ${done} 張,目前共 ${total} 張。${failed.length ? `\n失敗 ${failed.length} 張:${failed.join(', ')}\n(重新執行同一個指令會只補失敗的)` : ''}`)
if (failed.length && !flag('mock')) console.log('若全部都是 HTTP 400/403/404:請確認金鑰有開通圖片生成(可能需要綁定計費),或用 --model 指定你帳號可用的圖片模型。')
