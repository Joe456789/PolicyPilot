// 英文翻譯檢查。
//   node scripts/i18n-check.mjs                       檢查全部:t('…') 的 key 都有英文、變數佔位一致、資料檔的中文字串都有英文
//   node scripts/i18n-check.mjs --scan                列出還沒包 t() 的中文行(逐檔統計)
//   node scripts/i18n-check.mjs --files a.js b.jsx    只看指定檔案
// 該行刻意保留中文(例如中文關鍵字比對)時,在行尾加  // i18n-ignore
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import EN from '../src/locales/en/index.js'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2)
const scan = args.includes('--scan')
const fi = args.indexOf('--files')
const only = fi >= 0 ? args.slice(fi + 1).filter((a) => !a.startsWith('--')).map((a) => path.resolve(a)) : null
const CJK = /[㐀-鿿]/

// 這些檔案是「靜態資料」:每個中文字串字面值都必須是英文字典的 key(顯示時由 t(資料字串) 翻譯)
const DATA_FILES = ['src/game/content.js', 'src/game/products.js', 'src/game/careers.js', 'src/game/glossary.js', 'src/game/quests.js', 'src/game/records.js', 'src/game/endings.js', 'src/game/tags.js', 'src/game/cards.js', 'src/game/properties.js', 'src/game/minigames.js', 'src/game/banter.js', 'src/game/prologueCards.js']

function walk(dir, out = []) {
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, f.name)
    if (f.isDirectory()) { if (!['node_modules', 'locales', 'dist'].includes(f.name)) walk(p, out) } else if (/\.(js|jsx|mjs)$/.test(f.name)) out.push(p)
  }
  return out
}
const files = [...walk(path.join(root, 'src')), ...fs.readdirSync(path.join(root, 'server')).filter((f) => f.endsWith('.js')).map((f) => path.join(root, 'server', f))]
  .filter((f) => !only || only.includes(f))

const unesc = (s) => s.replace(/\\n/g, '\n').replace(/\\(['"`\\])/g, '$1')
const ph = (s) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',')
const problems = []
const leftovers = {}

for (const file of files) {
  const rel = path.relative(root, file)
  const src = fs.readFileSync(file, 'utf8')
  // 1) t('…') 的 key(先去掉註解)
  const nocom = src.replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, ' ')).split('\n').map((l) => l.replace(/(^|\s)\/\/.*$/, '$1')).join('\n')
  for (const m of nocom.matchAll(/(?<![\w.])t\(\s*(['"`])((?:\\.|(?!\1)[^\\])*?)\1/gs)) {
    const key = unesc(m[2])
    if (!CJK.test(key) || key.includes('${')) continue
    const line = nocom.slice(0, m.index).split('\n').length
    if (EN[key] === undefined) problems.push(`${rel}:${line} 缺英文翻譯:${key.slice(0, 60)}`)
    else if (ph(key) !== ph(EN[key])) problems.push(`${rel}:${line} 變數佔位不一致:${key.slice(0, 50)}`)
  }
  // 2) 資料檔
  if (DATA_FILES.includes(rel)) {
    const body = src.replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, ' ')).split('\n').map((l) => l.replace(/(^|\s)\/\/.*$/, '$1')).join('\n')
    for (const m of body.matchAll(/(['"])((?:\\.|(?!\1)[^\\\n])*)\1/g)) {
      const key = unesc(m[2])
      if (!CJK.test(key)) continue
      const line = body.slice(0, m.index).split('\n').length
      if (body.split('\n')[line - 1].includes('i18n-ignore')) continue
      if (EN[key] === undefined) problems.push(`${rel}:${line} 資料字串缺英文:${key.slice(0, 60)}`)
    }
  }
  // 3) 掃描還沒包 t() 的中文行
  if (scan) {
    let inBlock = false
    src.split('\n').forEach((raw, i) => {
      let l = raw
      if (inBlock) { if (l.includes('*/')) { inBlock = false; l = l.slice(l.indexOf('*/') + 2) } else return }
      l = l.replace(/\/\*.*?\*\//g, '').replace(/\{\/\*.*?\*\/\}/g, '')
      if (l.includes('/*')) { inBlock = true; l = l.slice(0, l.indexOf('/*')) }
      l = l.replace(/(^|\s)\/\/.*$/, '$1')
      if (!CJK.test(l) || /\bt\(|\btrDeep\(|i18n-ignore/.test(raw)) return
      if (DATA_FILES.includes(rel)) return // 資料檔由第 2 項檢查
      ;(leftovers[rel] ||= []).push(`${i + 1}: ${raw.trim().slice(0, 90)}`)
    })
  }
}
// 4) 英文值裡不應該還有中文(「萬」「歲」除外的單位提示不允許,金額請用 數字 + 萬)
for (const [k, v] of Object.entries(EN)) {
  if (!only && typeof v === 'string' && CJK.test(v.replace(/(\d[\d,.]*)\s*萬/g, ''))) problems.push(`locales 英文值含中文:${k.slice(0, 30)} → ${v.slice(0, 40)}`)
  if (!only && typeof v === 'string' && ph(k) !== ph(v)) problems.push(`locales 佔位不一致:${k.slice(0, 40)}`)
}
if (scan) {
  let total = 0
  for (const [f, ls] of Object.entries(leftovers)) { total += ls.length; console.log(`\n${f}  (${ls.length})`); ls.slice(0, 400).forEach((x) => console.log('  ' + x)) }
  console.log(`\n未翻譯的中文行共 ${total} 行`)
}
console.log(problems.length ? problems.join('\n') + `\n\n共 ${problems.length} 個問題` : '✓ 翻譯檢查通過')
process.exit(problems.length ? 1 : 0)
