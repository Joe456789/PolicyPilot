// 和電腦對手的交易:收購對手的地產、把地產賣給對手、借錢給手頭緊的對手收利息。
// 都在「對局」層級運作(會同時改到你和對手的狀態),函式不改動傳入的 players,回傳新的 players。
// 每一年最多做一筆地產交易;借款一位對手同時只能有一筆。
import { propById, ownsArea, PROPERTIES } from './properties.js'
import { holdingsTotal } from './core.js'
import { t } from '../i18n.js'

const round10k = (x) => Math.round(x / 10000) * 10000
const liquid = (s) => s.cash + holdingsTotal(s)
const active = (pl) => pl.s.phase !== 'ended'
const clone = (players) => players.map((p) => ({ ...p, s: structuredClone(p.s) }))

export const dealUsed = (s) => s.dealTurn === s.turn

// 對手開價:一般是市值的 1.25 倍;會讓對手失去「整區加成」的地產開更高;手頭緊的對手願意便宜一點賣
export function askPrice(pl, propId) {
  const pr = pl.s.props[propId]
  const p = propById(propId)
  let mult = 1.25
  if (ownsArea(pl.s.props, p.area)) mult = 1.6
  if (pl.s.cash < pl.s.expense * 0.25) mult -= 0.15
  if (pl.persona?.risk > 0.6) mult += 0.05
  return round10k(pr.value * mult)
}

// 你可以收購的對手地產
export function buyOffers(players) {
  const me = players[0].s
  const out = []
  players.forEach((pl, idx) => {
    if (!idx || !active(pl)) return
    for (const id of Object.keys(pl.s.props || {})) {
      const price = askPrice(pl, id)
      out.push({ idx, id, name: pl.name, price, value: pl.s.props[id].value, level: pl.s.props[id].level, afford: me.cash >= price })
    }
  })
  return out.sort((a, b) => a.price - b.price)
}

// 對手對你的地產出價:有錢、而且喜歡買地產的對手才會出價;能讓他湊滿整區的話會出比較高
export function sellBids(players) {
  const me = players[0].s
  const out = []
  for (const id of Object.keys(me.props || {})) {
    const pr = me.props[id]
    const p = propById(id)
    let best = null
    players.forEach((pl, idx) => {
      if (!idx || !active(pl)) return
      const s = pl.s
      const owned = PROPERTIES.filter((q) => q.area === p.area && s.props[q.id]).length
      let mult = 0.9 + (pl.persona?.risk || 0.3) * 0.2 + (owned >= 2 ? 0.25 : 0)
      const bid = round10k(pr.value * mult)
      if (liquid(s) - bid < s.expense * 0.5) return // 買了會付不出生活費就不買
      if (!best || bid > best.bid) best = { idx, name: pl.name, bid }
    })
    if (best) out.push({ id, ...best, value: pr.value, mortgage: pr.mortgage?.balance || 0 })
  }
  return out
}

// 收購:你付現金;對手用賣價先還清房貸。財產險跟著人走,過戶後要重新投保
export function buyFromBot(players, idx, propId) {
  const next = clone(players)
  const me = next[0].s, bot = next[idx].s
  const pr = bot.props[propId]
  if (!pr || dealUsed(me)) return { players, note: null }
  const price = askPrice(players[idx], propId)
  if (me.cash < price) return { players, note: null }
  me.cash -= price
  bot.cash += price - (pr.mortgage?.balance || 0)
  delete bot.props[propId]
  me.props[propId] = { ...pr, insured: false, mortgage: null, bought: price }
  me.dealTurn = me.turn
  me.dealLog = [...(me.dealLog || []), { turn: me.turn, kind: 'buy', propId, price, with: players[idx].id }]
  return { players: next, note: t('你用 {amt} 萬向{name}買下「{prop}」', { amt: price / 10000, name: players[idx].name, prop: t(propById(propId).name) }) }
}

export function sellToBot(players, propId) {
  const bid = sellBids(players).find((b) => b.id === propId)
  const next = clone(players)
  const me = next[0].s
  if (!bid || dealUsed(me)) return { players, note: null }
  const bot = next[bid.idx].s
  const pr = me.props[propId]
  me.cash += bid.bid - (pr.mortgage?.balance || 0)
  delete me.props[propId]
  bot.cash -= bid.bid
  bot.props[propId] = { ...pr, insured: false, mortgage: null, bought: bid.bid }
  me.dealTurn = me.turn
  me.dealLog = [...(me.dealLog || []), { turn: me.turn, kind: 'sell', propId, price: bid.bid, with: players[bid.idx].id }]
  return { players: next, note: t('你以 {amt} 萬把「{prop}」賣給{name}', { amt: bid.bid / 10000, prop: t(propById(propId).name), name: players[bid.idx].name }) }
}

// ---------- 借錢給對手 ----------
export const LOAN_RATE = 0.06
export const LOAN_YEARS = 3

// 手頭緊的對手會開口借錢(一年最多一位)
export function loanRequest(players) {
  const me = players[0].s
  for (let idx = 1; idx < players.length; idx++) {
    const pl = players[idx]
    if (!active(pl)) continue
    if ((me.lent || []).some((l) => l.to === pl.id && l.left > 0)) continue
    const s = pl.s
    if (s.turn >= 2 && s.cash < s.expense * 0.2) {
      const amount = Math.max(100000, round10k(s.expense * 0.5))
      // 對手的財務體質:負債比越高越可能還不出來
      const debtRatio = (s.loan || 0) / Math.max(1, s.income)
      return { idx, id: pl.id, name: pl.name, amount, rate: LOAN_RATE, years: LOAN_YEARS, risky: debtRatio > 1 || !Object.values(s.coverage).some(Boolean) }
    }
  }
  return null
}

export function lendTo(players, req) {
  const next = clone(players)
  const me = next[0].s, bot = next[req.idx].s
  if (me.cash < req.amount) return { players, note: null }
  me.cash -= req.amount
  bot.cash += req.amount
  bot.iou = (bot.iou || 0) + req.amount
  me.lent = [...(me.lent || []), { to: req.id, name: req.name, principal: req.amount, balance: req.amount, rate: req.rate, left: req.years, earned: 0 }]
  return { players: next, note: t('你借給{name} {amt} 萬,年利率 {rate}%,分 {years} 年還', { name: req.name, amt: req.amount / 10000, rate: Math.round(req.rate * 100), years: req.years }) }
}

// 每一輪(大家都過完一年)結束時收款:本金平均攤還 + 利息;對手破產就收不回來
export function settleLoans(players) {
  const me0 = players[0].s
  if (!(me0.lent || []).some((l) => l.left > 0)) return { players, notes: [] }
  const next = clone(players)
  const me = next[0].s
  const notes = []
  for (const l of me.lent) {
    if (l.left <= 0) continue
    const bi = next.findIndex((p) => p.id === l.to)
    const bot = next[bi]?.s
    if (!bot || bot.ended?.reason === 'bankrupt') {
      notes.push({ icon: '💸', text: t('{name}破產了,借出去的 {amt} 萬收不回來', { name: l.name, amt: Math.round(l.balance / 10000) }), tone: 'bad' })
      l.lost = l.balance
      l.balance = 0
      l.left = 0
      continue
    }
    const principal = Math.round(l.balance / l.left)
    const interest = Math.round(l.balance * l.rate)
    bot.cash -= principal + interest
    bot.iou = Math.max(0, (bot.iou || 0) - principal)
    me.cash += principal + interest
    l.balance -= principal
    l.earned += interest
    l.left -= 1
    notes.push({ icon: '🤝', text: t('{name}還款 {amt} 萬(含利息 {int} 萬)', { name: l.name, amt: Math.round((principal + interest) / 1000) / 10, int: Math.round(interest / 1000) / 10 }), tone: 'good' })
  }
  return { players: next, notes }
}
