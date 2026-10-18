// 對局:你 + 電腦對手,同一個棋盤、各自的人生。排名即時更新。
import { PERSONAS, createBotGame, botFastForward } from './bots.js'
import { computeScore, netWorth } from './engine.js'

export function createMatch(humanState, opponents, seed) {
  const rngPick = [...PERSONAS]
  // 依 seed 決定對手出場順序(可重現)
  rngPick.sort((a, b) => ((a.id.charCodeAt(0) * 31 + seed) % 7) - ((b.id.charCodeAt(0) * 31 + seed) % 7))
  const chosen = rngPick.slice(0, opponents)
  const players = [{ id: 'you', human: true, name: humanState.player.name, title: humanState.player.title, look: humanState.player.look, s: humanState }]
  chosen.forEach((p, i) => {
    players.push({
      id: p.id, human: false, persona: p, name: p.name, title: p.title, look: p.look,
      s: createBotGame(p, seed * 7 + i * 101 + 13, humanState.length),
    })
  })
  return { players, round: 0 }
}

// 即時排名:依目前的人生積分,同分比淨資產。
export function rank(players) {
  const rows = players.map((pl) => {
    const sc = pl.s.history.length ? computeScore(pl.s) : { total: 0, parts: {} }
    return { id: pl.id, name: pl.name, title: pl.title, look: pl.look, human: pl.human, total: sc.total, net: netWorth(pl.s), dead: pl.s.ended?.reason === 'death', age: pl.s.age, coverage: pl.s.coverage }
  })
  rows.sort((a, b) => b.total - a.total || b.net - a.net)
  return rows.map((r, i) => ({ ...r, rank: i + 1 }))
}

// 你的人生結束(完成或過世)後,讓還沒結束的對手快轉到最後,取得最終排名。
export function finishMatch(players) {
  return players.map((pl) => (pl.human || pl.s.phase === 'ended' ? pl : { ...pl, s: botFastForward(pl.s, pl.persona) }))
}
