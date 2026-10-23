import test from 'node:test'
import assert from 'node:assert/strict'
import { createGame, choose, endYear, recommended, canIncrease, setCoverage, analyzeGaps, computeScore } from '../src/game/engine.js'
import { PRODUCTS, premiumFor, premCtx, totalPremium, payoutFor } from '../src/game/products.js'
import { buyHome, sellHome } from '../src/game/purchases.js'
import { CHANCE_DEFS, QUIZ_DEFS } from '../src/game/content.js'
import { CODEX, codexProgress } from '../src/game/codex.js'

const base = { career: 'engineer', background: 'rich', style: '穩健型', length: 'standard' }
const withHome = (seed = 3) => {
  let s = { ...createGame(base, seed), cash: 6_000_000 }
  s = buyHome(s, 'small')
  assert.ok(s.house && s.house.balance > 0, '要先買到房子')
  return s
}

test('房貸壽險:保費依剩餘房貸與年齡計算,沒有房貸就不能投保', () => {
  const s0 = createGame(base, 1)
  assert.equal(canIncrease(s0, 'mortgage'), false)
  assert.equal(premiumFor('mortgage', 1, 30, premCtx(s0)), 0)
  assert.match(setCoverage(s0, 'mortgage', 1).flash, /房貸/)
  const s = withHome()
  assert.equal(canIncrease(s, 'mortgage'), true)
  const p30 = premiumFor('mortgage', 1, 30, { mortgage: 5_000_000 })
  assert.equal(p30, 10000) // 500 萬 × 0.2%
  assert.ok(premiumFor('mortgage', 1, 45, { mortgage: 5_000_000 }) > p30, '年紀越大保費越高')
  assert.ok(premiumFor('mortgage', 1, 30, { mortgage: 2_000_000 }) < p30, '房貸越少保費越低')
  const on = setCoverage(s, 'mortgage', 1)
  assert.equal(totalPremium(on.coverage, on.age, premCtx(on)) - totalPremium(s.coverage, s.age, premCtx(s)), premiumFor('mortgage', 1, s.age, premCtx(s)))
})

test('房貸壽險:有房貸又有家人才列入建議;保費隨房貸遞減', () => {
  const s = withHome()
  assert.equal(recommended(s).mortgage, 0, '單身沒有扶養,不強制建議')
  const fam = { ...s, partner: { income: 600000 } }
  assert.equal(recommended(fam).mortgage, 1)
  assert.ok(analyzeGaps(fam).gaps.some((g) => g.id === 'mortgage'))
  let y = setCoverage(s, 'mortgage', 1)
  const before = premiumFor('mortgage', 1, y.age, premCtx(y))
  y = endYear({ ...y, phase: 'result' })
  assert.ok(y.house.balance < s.house.balance)
  assert.ok(premiumFor('mortgage', 1, y.age, premCtx(y)) <= Math.round(before * 1.04), '保額遞減,保費不該明顯變高')
})

test('房貸壽險:身故時清償剩餘房貸,平行人生也算得到;賣房或繳清後自動結束', () => {
  const death = (s) => choose({ ...s, phase: 'scene', scene: { kind: 'event', cat: 'death', defId: 'death', title: 'x', story: 'x', base: {}, choices: [{ label: 'x', tag: 'death' }] } }, 0)
  const s = { ...withHome(), turn: 3, partner: { income: 600000 } }
  const bal = s.house.balance
  const without = death(s)
  const withIns = death(setCoverage(s, 'mortgage', 1))
  assert.equal(without.ended.reason, 'death')
  assert.equal(withIns.ended.payout - without.ended.payout, bal)
  assert.equal(withIns.ended.funds - without.ended.funds, bal)
  assert.ok(withIns.scene.result.lines.some((l) => l.kind === 'cover' && l.amount === bal))
  assert.ok(without.scene.result.lines.some((l) => l.kind === 'warn' && /房貸/.test(l.label)))
  assert.equal(payoutFor({ mortgage: 1 }, { cat: 'death', mortgage: bal }).mortgage, bal)
  assert.equal(payoutFor({ mortgage: 0 }, { cat: 'death', mortgage: bal }).mortgage, 0)
  // 平行人生(同樣的人生、不同保障)可以正常計算
  const done = endYear(withIns)
  assert.ok(Number.isFinite(computeScore(done).total))

  const sold = sellHome(setCoverage(withHome(), 'mortgage', 1))
  assert.equal(sold.house, null)
  assert.equal(sold.coverage.mortgage, 0)
  const paid = setCoverage(withHome(), 'mortgage', 1)
  paid.house = { ...paid.house, balance: 1000, payment: 50000 }
  const after = endYear({ ...paid, phase: 'result' })
  assert.equal(after.coverage.mortgage, 0)
  assert.ok(after.history.at(-1).events.some((e) => /房貸繳清/.test(e.title)))
})

test('銀行通路題庫:情境卡與測驗都標好主題、答案合理,圖鑑多了一個主題', () => {
  const bank = CHANCE_DEFS.filter((d) => d.theme === 'bank')
  assert.ok(bank.length >= 5)
  for (const d of bank) {
    assert.ok(d.title && d.story && d.lesson && d.choices.length >= 2, d.id)
    for (const c of d.choices) {
      const id = c.fx?.coverage?.id
      if (id) assert.ok(PRODUCTS[id], `${d.id} 指到不存在的商品 ${id}`)
    }
  }
  const quizzes = QUIZ_DEFS.filter((q) => q.theme === 'bank')
  assert.ok(quizzes.length >= 5)
  for (const q of quizzes) assert.ok(q.answer >= 0 && q.answer < q.options.length && q.why)
  // 房貸壽險情境只在「有房貸、還沒投保」時出現
  const mi = bank.find((d) => d.id === 'b_mortgage_ins')
  assert.equal(mi.req(createGame(base, 1)), false)
  assert.equal(mi.req(withHome()), true)
  assert.equal(mi.req(setCoverage(withHome(), 'mortgage', 1)), false)
  assert.ok(CODEX.some((c) => c.theme === 'bank'))
  assert.ok(codexProgress([]).some((p) => p.id === 'bank' && p.total >= 10))
})
