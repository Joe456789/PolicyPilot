// 自動存檔:每年開始規劃時,把整局(玩家與對手的狀態)存進瀏覽器;回到標題頁可以「繼續上次的人生」。
const KEY = 'policypilot.save.v2'

export function saveGame({ players, feed, coach }) {
  try {
    const s = players[0].s
    localStorage.setItem(KEY, JSON.stringify({ v: 2, savedAt: Date.now(), players, feed: (feed || []).slice(0, 8), coach: !!coach, meta: { name: s.player.name, age: s.age, turn: s.turn, years: s.years, opponents: players.length - 1 } }))
  } catch { /* 空間不足或無痕模式:略過 */ }
}

export function loadSave() {
  try {
    const d = JSON.parse(localStorage.getItem(KEY) || 'null')
    if (!d || d.v !== 1 || !Array.isArray(d.players) || !d.players.length || d.players[0].s?.phase === 'ended') return null
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
