// 對局:你 + 電腦對手,同一個棋盤、各自的人生。排名即時更新。
import { PERSONAS, createBotGame, botFastForward, botWantsProperty } from './bots.js'
import { computeScore, netWorth, receiveCash, buyPropertyAt, clearOps } from './engine.js'
import { propById, ownsArea } from './properties.js'
import { t } from '../i18n.js'

export function createMatch(humanState, opponents, seed) {
  const rngPick = [...PERSONAS]
  // 依 seed 決定對手出場順序(可重現)
  rngPick.sort((a, b) => ((a.id.charCodeAt(0) * 31 + seed) % 7) - ((b.id.charCodeAt(0) * 31 + seed) % 7))
  // 兩位以上對手時,一定有一位是 AI 學習型(強化學習訓練出來的)
  const learned = rngPick.find((p) => p.id === 'learned')
  const chosen = opponents >= 2 ? [learned, ...rngPick.filter((p) => p !== learned)].slice(0, opponents) : rngPick.slice(0, opponents)
  const players = [{ id: 'you', human: true, name: humanState.player.name, title: humanState.player.title, look: humanState.player.look, s: humanState }]
  chosen.forEach((p, i) => {
    players.push({
      id: p.id, human: false, persona: p, name: t(p.name), title: t(p.title), look: p.look,
      s: createBotGame(p, seed * 7 + i * 101 + 13, humanState.length, humanState.player.startAge || 22, humanState.market),
    })
  })
  return { players, round: 0 }
}

// 即時排名:依目前的人生積分,同分比淨資產。
export function rank(players) {
  const rows = players.map((pl) => {
    const sc = pl.s.history.length ? computeScore(pl.s) : { total: 0, parts: {} }
    return { id: pl.id, name: pl.name, title: pl.title, look: pl.look, human: pl.human, total: sc.total, net: netWorth(pl.s), dead: pl.s.ended?.reason === 'death', bankrupt: pl.s.ended?.reason === 'bankrupt', age: pl.s.age, coverage: pl.s.coverage }
  })
  // 破產出局的排在還活著的後面;同類再依人生積分與淨資產比
  rows.sort((a, b) => (a.bankrupt ? 1 : 0) - (b.bankrupt ? 1 : 0) || b.total - a.total || b.net - a.net)
  return rows.map((r, i) => ({ ...r, rank: i + 1 }))
}

// 你的人生結束(完成或過世)後,讓還沒結束的對手快轉到最後,取得最終排名。
export function finishMatch(players) {
  const world = worldOf(players)
  return players.map((pl) => (pl.human || pl.s.phase === 'ended' ? pl : { ...pl, s: botFastForward(pl.s, pl.persona, world) }))
}

// ---------- 資產格:誰擁有哪一格(從各玩家的狀態推導)----------
export function worldOf(players) {
  const owners = {}
  players.forEach((pl, idx) => {
    for (const [id, pr] of Object.entries(pl.s.props || {})) owners[id] = { idx, name: pl.name, level: pr.level, insured: pr.insured, full: ownsArea(pl.s.props, propById(id).area) }
  })
  return { owners }
}

// 處理玩家剛做完的選擇所產生的「對其他玩家的影響」:過路費、拍賣。
// 回傳新的 players 與要顯示的訊息。
export function applyOps(players, fromIdx) {
  const next = players.map((p) => ({ ...p }))
  const notes = []
  const ops = next[fromIdx].s.pendingOps || []
  for (const op of ops) {
    if (op.op === 'toll') {
      const owner = next[op.toIdx]
      if (owner && owner.s.phase !== 'ended') {
        owner.s = receiveCash(owner.s, op.amount)
        notes.push({ icon: '💰', who: owner.name, text: t('收到 {from} 的過路費 {n} 萬({prop})', { from: next[fromIdx].name, n: Math.round(op.amount / 10000), prop: propById(op.propId).name }), tone: 'good' })
      }
    } else if (op.op === 'auction') {
      const prop = propById(op.propId)
      const order = next.map((_, i) => i).filter((i) => i !== fromIdx)
      // 從出手者的下一位開始詢問
      order.sort((a, b) => ((a - fromIdx + next.length) % next.length) - ((b - fromIdx + next.length) % next.length))
      for (const i of order) {
        const pl = next[i]
        if (pl.human || pl.s.phase === 'ended' || pl.s.props[prop.id]) continue
        const mode = botWantsProperty(pl.s, pl.persona, prop)
        if (mode === 'cash') {
          pl.s = buyPropertyAt(pl.s, prop.id, 'cash')
          notes.push({ icon: '🏷️', who: pl.name, text: t('在拍賣中買下了「{prop}」({n} 萬)', { prop: prop.name, n: Math.round(prop.price / 10000) }), tone: '' })
          break
        }
      }
    }
  }
  next[fromIdx].s = clearOps(next[fromIdx].s)
  return { players: next, notes }
}
