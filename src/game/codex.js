// 觀念圖鑑:遊戲裡每一張事件、機會卡、市場行情、生活小事、小測驗與小觀念,都是一張「觀念卡」。
// 玩到就點亮;跨局累積(存在瀏覽器裡),依四大主題顯示收集進度。
import { EVENT_DEFS, CHANCE_DEFS, MARKET_DEFS, QUIZ_DEFS, TIP_DEFS } from './content.js'
import { MINOR_DEFS } from './minor.js'

export const CODEX_THEMES = [
  { id: 'insurance', name: '保險保障', icon: '🛡️' },
  { id: 'risk', name: '風險管理', icon: '🧯' },
  { id: 'allocation', name: '資產配置', icon: '🧺' },
  { id: 'market', name: '市場波動', icon: '📈' },
]

// 沒有標主題的舊題目,依種類歸類
const entry = (id, d, theme, kind, text) => ({ id, icon: d.icon || '🎓', title: d.title || d.q, text, theme: d.theme || theme, kind })

export const CODEX = [
  ...EVENT_DEFS.map((d) => entry(d.id, d, 'insurance', 'event', d.story)),
  ...CHANCE_DEFS.map((d) => entry(d.id, d, 'allocation', 'chance', d.lesson || d.story)),
  ...MARKET_DEFS.map((d) => entry(d.id, d, 'market', 'market', d.note || d.headline || d.story)),
  ...MINOR_DEFS.map((d) => entry(d.id, d, 'risk', 'minor', d.lesson || d.story)),
  ...QUIZ_DEFS.map((q, i) => entry('quiz' + i, q, 'insurance', 'quiz', q.why)),
  ...TIP_DEFS.map((d, i) => entry('tip' + i, d, 'insurance', 'tip', d.story)),
]
const IDS = new Set(CODEX.map((c) => c.id))

// 這一局收集到的卡:玩過的場景,加上每年年度結算顯示的「今年的理財觀念」
export function collectedIn(s) {
  const out = new Set(Object.keys(s.seen || {}).filter((id) => IDS.has(id)))
  for (let k = 1; k <= (s.turn || 0); k++) out.add('tip' + yearTipIndex(s, k))
  return [...out].filter((id) => IDS.has(id))
}

// 年度結算的小觀念:和 YearModal 用同一個公式
export const yearTipIndex = (s, turn) => (turn * 7 + (s.seed % 13)) % TIP_DEFS.length

export function codexProgress(ids) {
  const have = new Set(ids)
  return CODEX_THEMES.map((th) => {
    const all = CODEX.filter((c) => c.theme === th.id)
    return { ...th, total: all.length, got: all.filter((c) => have.has(c.id)).length }
  })
}
