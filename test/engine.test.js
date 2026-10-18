import test from 'node:test'
import assert from 'node:assert/strict'
import { CHARACTERS } from '../src/game/characters.js'
import {
  createGame, roll, choose, endYear, setCoverage, moveMoney,
  computeScore, counterfactual, recommended, buildReport, canIncrease,
} from '../src/game/engine.js'
import { PRODUCT_ORDER, payoutFor, EMPTY_COVERAGE } from '../src/game/products.js'

function playOut(char, seed, strategy) {
  let s = createGame(char, seed)
  if (strategy === 'rec') {
    const rec = recommended(s)
    for (const id of PRODUCT_ORDER) s = setCoverage(s, id, rec[id] || 0)
  }
  let guard = 0
  while (s.phase !== 'ended' && guard++ < 500) {
    if (s.phase === 'plan') s = roll(s)
    else if (s.phase === 'scene') s = choose(s, 0)
    else if (s.phase === 'result') s = endYear(s)
  }
  return s
}

test('每個角色、多個 seed 都能完整跑完且數字合理', () => {
  for (const c of CHARACTERS) {
    for (let seed = 1; seed <= 25; seed++) {
      for (const strat of ['none', 'rec']) {
        const s = playOut(c, seed, strat)
        assert.equal(s.phase, 'ended', `${c.id}/${seed}/${strat}`)
        for (const k of ['cash', 'invest', 'debt', 'savings', 'income', 'expense']) {
          assert.ok(Number.isFinite(s[k]), `${c.id} ${k}`)
        }
        assert.ok(s.cash >= 0 && s.invest >= 0 && s.debt >= 0)
        const sc = computeScore(s)
        assert.ok(sc.total >= 0 && sc.total <= 100, `score ${sc.total}`)
        const cf = counterfactual(s)
        assert.equal(cf.length, s.history.length)
      }
    }
  }
})

test('同一個 seed 會產生同一局(可重現)', () => {
  const a = playOut(CHARACTERS[2], 42, 'none')
  const b = playOut(CHARACTERS[2], 42, 'none')
  assert.deepEqual(a.history, b.history)
})

test('保險給付規則', () => {
  const cov = { ...EMPTY_COVERAGE, medical: 1, critical: 2, disability: 2, life: 3 }
  const crit = payoutFor(cov, { cat: 'critical', medicalCost: 1000000, income: 1000000, years: 2 })
  assert.equal(crit.medical, 700000)
  assert.equal(crit.lump, 3000000)
  const dis = payoutFor(cov, { cat: 'disability', medicalCost: 100000, income: 1000000, years: 3 })
  assert.equal(dis.disability, 1800000)
  const death = payoutFor(cov, { cat: 'death' })
  assert.equal(death.life, 20000000)
  const none = payoutFor(EMPTY_COVERAGE, { cat: 'critical', medicalCost: 1000000, income: 1e6, years: 2 })
  assert.equal(none.total, 0)
})

test('重大傷病後無法再加保(核保限制)', () => {
  let s = createGame(CHARACTERS[0], 1)
  s.blocked.critical = true
  s = setCoverage(s, 'critical', 1)
  assert.equal(s.coverage.critical, 0)
  assert.ok(s.flash)
  assert.equal(canIncrease(s, 'life'), true)
})

test('moveMoney 不會讓現金或投資變成負數', () => {
  let s = createGame(CHARACTERS[0], 1)
  s = moveMoney(s, 10_000_000)
  assert.equal(s.cash, 0)
  s = moveMoney(s, -10_000_000)
  assert.equal(s.invest, 0)
})

test('一旦發生重大傷病或失能,建議配置的現金緩衝多數(>80%)勝過沒保險', () => {
  let n = 0, wins = 0
  for (const c of CHARACTERS) {
    for (let seed = 1; seed <= 60; seed++) {
      const s = playOut(c, seed, 'none')
      if (s.ended.reason === 'death') continue
      const big = s.history.some((h) => h.shocks.some((x) => x.cat === 'critical' || x.cat === 'disability'))
      if (!big) continue
      const cf = counterfactual(s)
      const last = cf[cf.length - 1]
      n++
      if (last.rec > last.none) wins++
    }
  }
  console.log(`重大事件下建議配置勝過沒保險:${wins}/${n}`)
  assert.ok(n > 20)
  assert.ok(wins / n > 0.8)
})

test('重大傷病與失能事件每局最多各發生一次', () => {
  for (const c of CHARACTERS) {
    for (let seed = 1; seed <= 40; seed++) {
      const s = playOut(c, seed, 'none')
      const cats = s.history.flatMap((h) => h.shocks.map((x) => x.cat))
      assert.ok(cats.filter((x) => x === 'critical').length <= 1)
      assert.ok(cats.filter((x) => x === 'disability').length <= 1)
    }
  }
})

test('buildReport 回傳可序列化的摘要', () => {
  const s = playOut(CHARACTERS[1], 7, 'rec')
  const r = buildReport(s)
  JSON.stringify(r)
  assert.ok(r.score.total >= 0)
})
