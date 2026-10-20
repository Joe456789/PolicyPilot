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
