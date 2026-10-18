import test from 'node:test'
import assert from 'node:assert/strict'
import { CAREERS, BACKGROUNDS, STYLES, LENGTHS } from '../src/game/careers.js'
import {
  createGame, roll, choose, endYear, setCoverage, trade, borrow, repay, recommended,
  computeScore, counterfactual, buildReport, buildStageReport, canIncrease, netWorth,
} from '../src/game/engine.js'
import { payoutFor, EMPTY_COVERAGE, PRODUCT_ORDER } from '../src/game/products.js'

const setup = (o = {}) => ({ name: '測試', career: 'office', background: 'normal', style: 'steady', length: 'standard', ...o })

// strategy: 'none' 不買保險;'rec' 每年依建議配置;
function playOut(opts, seed, strategy, pick = () => 0) {
  let s = createGame(setup(opts), seed)
  let guard = 0
  const applyRec = () => {
    const rec = recommended(s)
    for (const id of PRODUCT_ORDER) if (canIncrease(s, id)) s = setCoverage(s, id, rec[id] || 0)
  }
  if (strategy === 'rec') applyRec()
  while (s.phase !== 'ended' && guard++ < 2000) {
    if (s.phase === 'plan') {
      if (strategy === 'rec') applyRec()
      s = roll(s)
    } else if (s.phase === 'scene') s = choose(s, pick(s.scene))
    else if (s.phase === 'result') s = endYear(s)
  }
  return s
}

const combos = []
for (const c of CAREERS) for (const b of BACKGROUNDS) combos.push({ career: c.id, background: b.id })

test('所有職業與家境組合都能完整跑完,數字合理', () => {
  for (const o of combos) {
    for (const length of ['short', 'standard', 'long']) {
      for (let seed = 1; seed <= 6; seed++) {
        for (const strat of ['none', 'rec']) {
          const s = playOut({ ...o, length }, seed, strat)
          const tag = `${o.career}/${o.background}/${length}/${seed}/${strat}`
          assert.equal(s.phase, 'ended', tag)
          for (const k of ['cash', 'loan', 'savings', 'income', 'expense']) assert.ok(Number.isFinite(s[k]), `${tag} ${k}`)
          for (const k of ['deposit', 'bond', 'stock', 'spec']) assert.ok(Number.isFinite(s.hold[k]) && s.hold[k] >= 0, `${tag} ${k}`)
          assert.ok(s.cash >= 0 && s.loan >= -1, tag)
          const sc = computeScore(s)
          assert.ok(sc.total >= 0 && sc.total <= 100, `${tag} score ${sc.total}`)
          const cf = counterfactual(s)
          assert.equal(cf.length, s.history.length)
          JSON.stringify(buildReport(s))
        }
      }
    }
  }
})

test('同一個 seed 會產生同一局(可重現)', () => {
  const a = playOut({ career: 'engineer' }, 42, 'none')
  const b = playOut({ career: 'engineer' }, 42, 'none')
  assert.deepEqual(a.history, b.history)
})

test('保險給付規則', () => {
  const cov = { ...EMPTY_COVERAGE, medical: 1, critical: 2, disability: 2, life: 3, accident: 2, home: 1 }
  const crit = payoutFor(cov, { cat: 'critical', medicalCost: 1000000, income: 1000000, years: 2 })
  assert.equal(crit.medical, 700000)
  assert.equal(crit.lump, 3000000)
  const dis = payoutFor(cov, { cat: 'disability', medicalCost: 100000, income: 1000000, years: 3, accident: true })
  assert.equal(dis.disability, 1800000)
  assert.equal(dis.accident, 3000000)
  assert.equal(payoutFor(cov, { cat: 'death' }).life, 20000000)
  assert.equal(payoutFor(cov, { cat: 'home', otherCost: 1000000 }).home, 900000)
  assert.equal(payoutFor(EMPTY_COVERAGE, { cat: 'critical', medicalCost: 1e6, income: 1e6, years: 2 }).total, 0)
})

test('重大傷病後無法再加保;沒有房子不能買火險', () => {
  let s = createGame(setup(), 1)
  s.blocked.critical = true
  s = setCoverage(s, 'critical', 1)
  assert.equal(s.coverage.critical, 0)
  assert.ok(s.flash)
  s = setCoverage(s, 'home', 1)
  assert.equal(s.coverage.home, 0)
})

test('買賣資產、借款與還款不會產生負數', () => {
  let s = createGame(setup({ background: 'comfy' }), 1)
  const nw0 = netWorth(s)
  s = trade(s, 'stock', 10_000_000)
  assert.equal(s.cash, 0)
  assert.equal(netWorth(s), nw0)
  s = trade(s, 'stock', -10_000_000)
  assert.equal(s.hold.stock, 0)
  s = borrow(s, 100_000_000)
  assert.ok(s.loan <= 560000 * 1.5 + 1)
  s = repay(s, 100_000_000)
  assert.ok(s.cash >= 0 && s.loan >= 0)
})

test('重大傷病與失能事件每局最多各發生一次', () => {
  for (const o of combos) {
    for (let seed = 1; seed <= 12; seed++) {
      const s = playOut({ ...o, length: 'long' }, seed, 'none')
      const cats = s.history.flatMap((h) => h.shocks.map((x) => x.cat))
      assert.ok(cats.filter((x) => x === 'critical').length <= 1)
      assert.ok(cats.filter((x) => x === 'disability').length <= 1)
    }
  }
})

test('一旦發生重大傷病或失能,建議配置的淨資產多數勝過沒保險', () => {
  let n = 0, wins = 0
  for (const o of combos) {
    for (let seed = 1; seed <= 25; seed++) {
      const s = playOut({ ...o, length: 'standard' }, seed, 'none')
      if (s.ended.reason === 'death') continue
      if (!s.history.some((h) => h.shocks.some((x) => x.cat === 'critical' || x.cat === 'disability'))) continue
      const last = counterfactual(s).at(-1)
      n++
      if (last.rec > last.none) wins++
    }
  }
  console.log(`重大事件下建議配置勝過沒保險:${wins}/${n}`)
  assert.ok(n > 20)
  assert.ok(wins / n > 0.8)
})

test('人生內容豐富:一局標準長度會遇到多種不同格子', () => {
  const kinds = new Set()
  for (let seed = 1; seed <= 10; seed++) {
    const s = playOut({}, seed, 'none')
    s.history.forEach((h) => h.events.forEach((e) => kinds.add(e.kind)))
  }
  console.log('遇到的場景種類:', [...kinds].join(', '))
  assert.ok(kinds.size >= 9)
})

test('人生階段報告可序列化', () => {
  const s = playOut({}, 3, 'rec')
  JSON.stringify(buildStageReport(s))
})
