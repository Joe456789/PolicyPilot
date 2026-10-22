import test from 'node:test'
import assert from 'node:assert/strict'
import { createGame, roll, choose, endYear, hasMinor, nextMinor, setCoverage } from '../src/game/engine.js'
import { PERSONAS, botAct, botMinors, botFastForward } from '../src/game/bots.js'
import { buyCard, buyCar, sellCar, buyHome, sellHome, homeOffer, SHOP_PER_YEAR } from '../src/game/purchases.js'
import { MINOR_DEFS } from '../src/game/minor.js'

const base = { name: 't', career: 'engineer', background: 'comfy', style: 'steady', length: 'short' }

test('小事件:每年擲骰後排 1~2 件,一件一件處理,處理完才能年度結算', () => {
  let s = createGame(base, 21)
  s = roll(s, {})
  assert.ok(s.minorQueue.length >= 1 && s.minorQueue.length <= 2)
  s = botAct(s, PERSONAS[0])
  const n = s.minorQueue.length
  assert.ok(hasMinor(s))
  s = nextMinor(s)
  assert.equal(s.scene.kind, 'minor')
  assert.equal(s.minorQueue.length, n - 1)
  s = choose(s, 0)
  assert.equal(s.phase, 'result')
  s = botMinors(s, PERSONAS[0])
  assert.ok(!hasMinor(s))
  const turn = s.turn
  s = endYear(s)
  assert.equal(s.turn, turn + 1)
})

test('小事件:扭傷有醫療險會理賠,沒保就自己付', () => {
  const run = (cov) => {
    let s = createGame(base, 5)
    if (cov) s = setCoverage(s, 'medical', 1)
    s = { ...s, phase: 'result', minorQueue: ['m_sprain'], minorTotal: 1, ended: null }
    s = nextMinor(s)
    const cash0 = s.cash
    s = choose(s, 0)
    return s.cash - cash0
  }
  const insured = run(true), bare = run(false)
  assert.equal(bare, -25000)
  assert.ok(insured > bare, `有保險應該付得比較少:${insured} vs ${bare}`)
})

test('小事件:所有選項都能結算,整局電腦代打跑完不出錯', () => {
  for (const d of MINOR_DEFS) {
    for (let i = 0; i < d.choices.length; i++) {
      let s = createGame(base, 9)
      s = { ...s, car: true, house: { price: 8e6, value: 8e6, balance: 5e6, rate: 0.022, payment: 3e5, yearsLeft: 30 }, phase: 'result', minorQueue: [d.id], minorTotal: 1, ended: null }
      s = choose(nextMinor(s), i)
      assert.equal(s.phase, 'result', d.id)
      assert.ok(Number.isFinite(s.cash), d.id)
    }
  }
  for (const p of PERSONAS) assert.equal(botFastForward(createGame(base, 33), p).phase, 'ended')
})

test('商店:扣現金、拿到卡;每年最多買 2 張;免災金牌買不到', () => {
  let s = { ...createGame(base, 3), cash: 1e6 }
  s = buyCard(s, 'medaid')
  assert.ok(s.cards.includes('medaid'))
  assert.equal(s.cash, 1e6 - 60000)
  s = buyCard(s, 'antiscam')
  s = buyCard(s, 'crash_guard')
  assert.equal(s.cards.length, SHOP_PER_YEAR)
  assert.ok(s.flash)
  s = buyCard(s, 'shield')
  assert.ok(!s.cards.includes('shield'))
})

test('買車與賣車:支出增減、汽車險隨車解約', () => {
  let s = { ...createGame(base, 4), cash: 1e6 }
  const e0 = s.expense
  s = buyCar(s, 'new')
  assert.ok(s.car)
  assert.equal(s.expense, e0 + 80000)
  s = setCoverage(s, 'auto', 1)
  assert.equal(s.coverage.auto, 1)
  s = sellCar(s)
  assert.ok(!s.car)
  assert.equal(s.coverage.auto, 0)
  assert.equal(s.expense, e0)
})

test('買房與賣房:頭期款、房貸、負擔上限', () => {
  let s = { ...createGame(base, 6), cash: 50000 }
  s = buyHome(s, 'small')
  assert.ok(!s.house, '現金不夠付頭期款')
  s = { ...s, cash: 1e7 }
  const o = homeOffer(s, 'small')
  s = buyHome(s, 'small')
  assert.ok(s.house)
  assert.equal(s.cash, 1e7 - o.down)
  assert.equal(s.house.balance, o.balance)
  const cash1 = s.cash
  s = sellHome(s)
  assert.ok(!s.house)
  assert.ok(s.cash > cash1)
  assert.equal(s.coverage.home, 0)
})

import { family, familyBlock } from '../src/game/purchases.js'
test('家庭計畫:先結婚才能生小孩;生小孩會新增孩子並增加支出', () => {
  let s = { ...createGame(base, 8), cash: 2e6 }
  assert.ok(familyBlock(s, 'baby'), '單身不能生小孩')
  s = family(s, 'marry')
  assert.ok(s.partner)
  const e0 = s.expense
  s = family(s, 'baby')
  assert.equal(s.kids.length, 1)
  assert.equal(s.dependents, 1)
  assert.ok(s.expense > e0)
  s = family(s, 'baby')
  assert.equal(s.kids.length, 1, '同一年只能一次')
})
