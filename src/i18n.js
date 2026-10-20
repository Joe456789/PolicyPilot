// 多語系:繁體中文(預設)與英文。
//   t('中文原文 {name}', { name })  → 中文模式回傳原文;英文模式回傳 locales/en 裡的翻譯。
//   key 一律是「中文原文」,變數用 {name} 佔位;找不到英文翻譯時退回中文(並記錄到 window.__i18nMissing,方便補齊)。
//   靜態資料(例如保險商品名稱)顯示時也用 t(資料字串),翻譯放在 locales/en 的同名 key。
//   金額:英文值裡的「數字 + 萬」會自動換成 NT$ 格式(例如 280 萬 → NT$2.8M),不必自己換算。
import { useSyncExternalStore } from 'react'
import EN from './locales/en/index.js'

const CJK = /[㐀-鿿]/
let lang = 'zh'
try {
  const q = new URLSearchParams(globalThis.location?.search || '').get('lang')
  const saved = JSON.parse(globalThis.localStorage?.getItem('policypilot.settings') || 'null')?.lang
  lang = (q || saved) === 'en' ? 'en' : 'zh'
} catch { /* 沒有瀏覽器環境(測試)時維持中文 */ }

const subs = new Set()
export const getLang = () => lang
export function setLang(next) {
  const v = next === 'en' ? 'en' : 'zh'
  if (v === lang) return
  lang = v
  try { globalThis.document && (document.documentElement.lang = v === 'en' ? 'en' : 'zh-Hant') } catch { /* 忽略 */ }
  subs.forEach((f) => f())
}
const subscribe = (f) => { subs.add(f); return () => subs.delete(f) }
// 元件要在語言切換時重新渲染,就呼叫這個
export const useLang = () => useSyncExternalStore(subscribe, getLang, () => 'zh')

// 英文金額:元 → NT$1.2M / NT$280K
export function moneyEn(yuan) {
  const sign = yuan < 0 ? '-' : ''
  const a = Math.abs(yuan)
  if (a >= 1e6) {
    const m = a / 1e6
    const s = (m >= 100 ? Math.round(m).toLocaleString('en-US') : m >= 10 ? m.toFixed(1) : m.toFixed(2)).replace(/\.?0+$/, '')
    return `${sign}NT$${s}M`
  }
  if (a >= 1000) return `${sign}NT$${Math.round(a / 1000).toLocaleString('en-US')}K`
  return `${sign}NT$${Math.round(a)}`
}
const WAN = /(-?\d[\d,]*(?:\.\d+)?)\s*萬/g
const enMoney = (s) => s.replace(WAN, (m, n) => moneyEn(parseFloat(n.replace(/,/g, '')) * 10000))

function missing(key) {
  if (!CJK.test(key)) return
  const bag = (globalThis.__i18nMissing ||= new Set())
  bag.add(key)
}

function lookup(key) {
  const v = EN[key]
  if (v === undefined) { missing(key); return key }
  return v
}

// 先翻譯,再把變數代進去(字串變數若本身是中文資料,也會自動翻譯)
export function t(key, vars) {
  if (typeof key !== 'string') return key
  const en = lang === 'en'
  let s = en && CJK.test(key) ? lookup(key) : key
  if (vars) {
    s = s.replace(/\{(\w+)\}/g, (m, k) => {
      if (!(k in vars)) return m
      const v = vars[k]
      return en && typeof v === 'string' && CJK.test(v) && EN[v] !== undefined ? EN[v] : String(v)
    })
  }
  return en ? enMoney(s) : s
}

// 把資料物件裡的字串整個翻譯(只在英文模式作用;用於在引擎產生的場景、結果行等)
export function trDeep(x) {
  if (lang !== 'en' || x == null) return x
  if (typeof x === 'string') return CJK.test(x) ? t(x) : x
  if (Array.isArray(x)) return x.map(trDeep)
  if (typeof x === 'object' && Object.getPrototypeOf(x) === Object.prototype) {
    const out = {}
    for (const [k, v] of Object.entries(x)) out[k] = trDeep(v)
    return out
  }
  return x
}

export const missingKeys = () => [...(globalThis.__i18nMissing || [])]
