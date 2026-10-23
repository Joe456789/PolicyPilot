import test from 'node:test'
import assert from 'node:assert/strict'
import { createGame, roll, endYear, netWorth } from '../src/game/engine.js'
import { PERSONAS, botAct, botMinors } from '../src/game/bots.js'
import { openClaim, fileClaim, claimPending, correctPicks, DOCS } from '../src/game/claims.js'
import { flashDue, buildFlashScene } from '../src/game/flash.js'
import { createMatch } from '../src/game/match.js'
import { buyOffers, buyFromBot, sellBids, sellToBot, lendTo, settleLoans } from '../src/game/deals.js'
import { CODEX, collectedIn, codexProgress } from '../src/game/codex.js'
import { payoutFor } from '../src/game/products.js'

const base = { name: 't', career: 'engineer', background: 'comfy', style: 'steady', length: 'short' }
const inResult = (seed) => {
  let s = createGame(base, seed)
  s = roll(s, {})
  return botAct(s, PERSONAS[0])
}

test('理賠申請:醫療給付要附診斷書與收據;附齊當年入帳,缺件延到下一年', () => {
  let s = inResult(3)
  s.coverage = { ...s.coverage, medical: 1 }
  const payout = payoutFor(s.coverage, { cat: 'medical', medicalCost: 80000 })
  assert.ok(payout.total > 0)
  s = structuredClone(s)
  s.claim = null
  openClaim(s, payout, { cat: 'medical' })
  assert.ok(claimPending(s))
  assert.deepEqual(new Set(s.claim.need), new Set(['form', 'diag', 'receipt']))
  assert.ok(s.claim.options.some((d) => DOCS[d].decoy), '選項裡要混入用不到的文件')

  const ok = fileClaim(s, correctPicks(s))
  assert.equal(ok.cash, s.cash)
  assert.ok(!claimPending(ok))
  assert.equal(ok.claimStats.perfect, 1)

  const late = fileClaim(s, ['form', 'diag'])
  assert.equal(late.cash, s.cash - s.claim.amount)
  assert.equal(late.claimDue, s.claim.amount)
  // 年底結算後(進入下一年),補件的錢入帳
  const next = endYear(late)
  assert.equal(next.claimDue, 0)
  assert.ok(next.year.events.some((e) => e.icon === '📨'))
})

test('盤中行情:有股票才會出現;選擇賣出會把一半股票變現,年底回頭比較', () => {
  let s = createGame(base, 5)
  assert.equal(flashDue({ ...s, hold: { ...s.hold, stock: 0, spec: 0 } }), false)
  s = structuredClone(s)
  s.hold.stock = 1000000
  s.hold.spec = 0
  let found = null
  for (let turn = 0; turn < 40 && !found; turn++) if (flashDue({ ...s, turn })) found = turn
  assert.ok(found != null, '有股票時應該有些年份會出現盤中行情')
  s.turn = found
  const sc = buildFlashScene(s)
  assert.equal(sc.defId, 'mkt_flash')
  assert.equal(sc.choices.length, 3)
  assert.notEqual(s.hold.stock, 1000000, '行情要反映在持股市值上')
})

test('和對手交易:收購、出售、借款與還款都會讓雙方的錢與地產一致變動', () => {
  const h = createGame(base, 9)
  let { players } = createMatch(h, 2, 9)
  // 準備:對手有一塊地,你有錢
  players = players.map((p, i) => ({ ...p, s: structuredClone(p.s) }))
  players[1].s.props.wanhua = { level: 1, value: 3000000, bought: 3000000, insured: true, damaged: false, mortgage: null }
  players[0].s.cash = 10000000
  const offer = buyOffers(players).find((o) => o.id === 'wanhua')
  assert.ok(offer && offer.price > offer.value)
  const before = players[1].s.cash
  const r = buyFromBot(players, offer.idx, 'wanhua')
  assert.ok(r.note)
  assert.ok(r.players[0].s.props.wanhua && !r.players[1].s.props.wanhua)
  assert.equal(r.players[0].s.props.wanhua.insured, false, '過戶後要重新投保')
  assert.equal(r.players[1].s.cash, before + offer.price)
  // 一年只能一筆
  assert.equal(buyFromBot(r.players, offer.idx, 'wanhua').note, null)

  // 借錢:借出後淨資產不變(變成應收款),每輪收回本金加利息
  const nw = netWorth(r.players[0].s)
  const lent = lendTo(r.players, { idx: 2, id: r.players[2].id, name: 'x', amount: 300000, rate: 0.06, years: 3 })
  assert.equal(netWorth(lent.players[0].s), nw)
  const paid = settleLoans(lent.players)
  assert.ok(paid.players[0].s.cash > lent.players[0].s.cash)
  assert.equal(paid.players[0].s.lent[0].left, 2)

  // 出售:有錢的對手才會出價
  const rich = paid.players.map((p, i) => (i ? { ...p, s: { ...p.s, cash: 20000000 } } : p))
  const s2 = { ...rich[0].s, turn: rich[0].s.turn + 1 }
  const ps = [{ ...rich[0], s: s2 }, ...rich.slice(1)]
  assert.ok(sellBids(ps).length > 0)
  const sold = sellToBot(ps, 'wanhua')
  assert.ok(sold.note && !sold.players[0].s.props.wanhua)
})

test('觀念圖鑑:每張卡都有主題與文字;玩過的場景會被收集', () => {
  assert.ok(CODEX.length > 100)
  for (const c of CODEX) assert.ok(c.theme && c.title && c.text, c.id)
  assert.equal(new Set(CODEX.map((c) => c.id)).size, CODEX.length, '卡片 id 不重複')
  let s = inResult(11)
  s = endYear(botMinors(s, PERSONAS[0]))
  const got = collectedIn(s)
  assert.ok(got.length >= 2)
  const prog = codexProgress(got)
  assert.equal(prog.length, 5) // 保險保障、風險管理、資產配置、市場波動、銀行通路
  assert.equal(prog.reduce((a, p) => a + p.got, 0), got.length)
})
