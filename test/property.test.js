import test from 'node:test'
import assert from 'node:assert/strict'
import { createGame, propAction, receiveCash, buyPropertyAt, endYear, netWorth } from '../src/game/engine.js'
import { tollOf, rentOf, propById } from '../src/game/properties.js'

const base = { name: 't', career: 'office', background: 'rich', style: 'steady', length: 'standard' }

test('拍賣成交後擁有地產;升級與投保各花 1 行動點,點數用完不能再做', () => {
  let s = createGame(base, 11)
  s = { ...s, cash: 20000000 }
  s = buyPropertyAt(s, 'wanhua', 'cash')
  assert.ok(s.props.wanhua)
  const cash0 = s.cash
  s = propAction(s, 'wanhua', 'upgrade')
  assert.equal(s.props.wanhua.level, 2)
  assert.ok(s.cash < cash0)
  s = propAction(s, 'wanhua', 'insure')
  assert.ok(s.props.wanhua.insured)
  assert.equal(s.ap, 0)
  s = propAction(s, 'wanhua', 'upgrade')
  assert.equal(s.props.wanhua.level, 2)
})

test('過路費是租金的 40%,收到後進入現金與年度紀錄', () => {
  let s = createGame(base, 12)
  const before = s.cash
  s = receiveCash(s, 50000)
  assert.equal(s.cash, before + 50000)
  assert.equal(s.year.tolls, 50000)
  const p = propById('wanhua')
  assert.ok(Math.abs(tollOf(p, 1) - rentOf(p, 1) * 0.4) <= 1000)
})

test('持有地產過一年:租金入帳、地產計入淨資產、沒有例外', () => {
  let s = createGame(base, 13)
  s = { ...s, cash: 20000000 }
  s = buyPropertyAt(s, 'qiqi', 'cash')
  const nw = netWorth(s)
  assert.ok(nw > 10000000)
  s = propAction(s, 'qiqi', 'sell')
  assert.equal(s.props.qiqi, undefined)
})

test('破產:現金、借款額度、地產與自宅都用完仍為負,年底出局;存活者排名在前', async () => {
  const { cover } = await import('../src/game/core.js')
  let s = createGame(base, 21)
  s = { ...s, cash: -90000000, loan: 99999999, phase: 'result' }
  s.hold = { deposit: 0, bond: 0, stock: 0, spec: 0 }
  const out = endYear(s)
  assert.equal(out.ended?.reason, 'bankrupt')
  assert.equal(out.phase, 'ended')
  assert.ok(out.ended.debt > 0)
  assert.ok(netWorth(out) < 0)
})

test('現金不足時先借款,額度用完才被迫拍賣地產(打 85 折並還清房貸)', async () => {
  const { cover, householdIncome } = await import('../src/game/core.js')
  let s = createGame(base, 22)
  s = buyPropertyAt({ ...s, cash: 20000000 }, 'banqiao', 'cash')
  const s2 = structuredClone(s)
  s2.hold = { deposit: 0, bond: 0, stock: 0, spec: 0 }
  s2.loan = Math.round(householdIncome(s2) * 1.5) // 額度已滿
  s2.cash = -500000
  cover(s2)
  assert.equal(Object.keys(s2.props).length, 0)
  assert.ok(s2.cash > 0)
  assert.equal(s2.year.forced, 1)
})

test('排名:破產出局的排在存活者後面', async () => {
  const { rank } = await import('../src/game/match.js')
  const a = createGame(base, 31)
  const b = createGame(base, 32)
  const hist = (s) => ({ ...s, history: [] })
  const players = [
    { id: 'x', name: 'x', human: true, s: { ...hist(a), ended: { reason: 'bankrupt', debt: 1, age: 30 } } },
    { id: 'y', name: 'y', human: false, s: hist(b) },
  ]
  const rows = rank(players)
  assert.equal(rows[0].id, 'y')
  assert.equal(rows[1].bankrupt, true)
})

test('手牌:最多 3 張、滿了換掉最舊的;免災金牌擋下事件;醫療補助卡減免自付', async () => {
  const { giveCard, MAX_CARDS } = await import('../src/game/cards.js')
  const { Rng } = await import('../src/game/rng.js')
  const { choose } = await import('../src/game/engine.js')
  const s = createGame(base, 41)
  const rng = new Rng(1, 0)
  const add = () => {}
  for (const id of ['shield', 'medaid', 'antiscam', 'premium_off']) giveCard(s, rng, id, add)
  assert.equal(s.cards.length, MAX_CARDS)
  assert.equal(s.cards[0], 'medaid')
  const mk = (cards) => ({
    ...createGame(base, 42), cards, phase: 'scene',
    scene: { kind: 'event', cat: 'medical', defId: 'x', base: { medical: 200000, other: 0 }, choices: [{}], title: 't', icon: 'i' },
  })
  const withShield = choose(mk(['shield']), 0)
  const bare = choose(mk([]), 0)
  assert.ok(withShield.cash > bare.cash)
  assert.deepEqual(withShield.cards, [])
  const withAid = choose(mk(['medaid']), 0)
  assert.ok(withAid.cash > bare.cash && withAid.cash < withShield.cash)
})
