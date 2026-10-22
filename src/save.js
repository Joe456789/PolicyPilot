// 自動存檔:每年開始規劃時,把整局(玩家與對手的狀態)存進瀏覽器;回到標題頁可以「繼續上次的人生」。
const KEY = 'policypilot.save.v3'

export function saveGame({ players, feed, coach }) {
  try {
    const s = players[0].s
    localStorage.setItem(KEY, JSON.stringify({ v: 3, savedAt: Date.now(), players, feed: (feed || []).slice(0, 8), coach: !!coach, meta: { name: s.player.name, age: s.age, turn: s.turn, years: s.years, opponents: players.length - 1 } }))
  } catch { /* 空間不足或無痕模式:略過 */ }
}

export function loadSave() {
  try {
    const d = JSON.parse(localStorage.getItem(KEY) || 'null')
    if (!d || d.v !== 3 || !Array.isArray(d.players) || !d.players.length || d.players[0].s?.phase === 'ended') return null
    return d
  } catch { return null }
}

export const clearSave = () => { try { localStorage.removeItem(KEY) } catch { /* 忽略 */ } }

// 跨局記憶:記下最近 2 局出現過的事件/題目,下一局降低它們再出現的機率(減少重複感)
const RECENT = 'policypilot.recent.v1'
export function loadRecent() {
  try { return [...new Set((JSON.parse(localStorage.getItem(RECENT) || '[]') || []).flat())] } catch { return [] }
}
export function saveRecent(ids) {
  try {
    const games = JSON.parse(localStorage.getItem(RECENT) || '[]') || []
    localStorage.setItem(RECENT, JSON.stringify([ids.slice(0, 200), ...games].slice(0, 2)))
  } catch { /* 忽略 */ }
}

// 觀念圖鑑:跨局累積收集到的觀念卡 id
const CODEX = 'policypilot.codex.v1'
export function loadCodex() {
  try { const a = JSON.parse(localStorage.getItem(CODEX) || '[]'); return Array.isArray(a) ? a : [] } catch { return [] }
}
// 合併這一局收集到的卡,回傳這局新點亮的 id
export function saveCodex(ids) {
  const old = loadCodex()
  const fresh = ids.filter((id) => !old.includes(id))
  try { localStorage.setItem(CODEX, JSON.stringify([...old, ...fresh])) } catch { /* 忽略 */ }
  return fresh
}
