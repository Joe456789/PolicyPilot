import test from 'node:test'
import assert from 'node:assert/strict'
import { createGame, roll, choose, nextMinor, hasMinor, endYear } from '../src/game/engine.js'
import { PERSONAS, botFastForward } from '../src/game/bots.js'
import { dueStages, KID_STAGES } from '../src/game/lifestages.js'

const base = { name: 't', career: 'engineer', background: 'comfy', style: 'steady' }

test('一輩子(60 年):孩子一路長大到獨立,自己 65 歲前後退休,中途不出錯', () => {
  // 這個測試看的是人生階段,不是壽命:挑一個能活到最後的種子
  let s
  for (let seed = 17; seed < 60; seed++) {
    s = createGame({ ...base, length: 'life60' }, seed)
    assert.equal(s.years, 60)
    s = { ...s, kids: [{ age: 1, done: [] }], dependents: 1 }
    s = botFastForward(s, PERSONAS.find((p) => p.id === 'balanced'))
    if (s.ended?.reason !== 'death') break
  }
  assert.equal(s.phase, 'ended')
  const kid = s.kids[0]
  for (const id of ['k_kinder', 'k_school', 'k_cram', 'k_college', 'k_grad']) assert.ok(kid.done.includes(id), id)
  assert.ok(kid.independent)
  assert.ok(s.retired, '有退休')
  assert.ok(s.stagesDone.includes('s_fifty'))
})

test('人生階段:到了年紀才出現,同一個階段只發生一次', () => {
  let s = createGame({ ...base, length: 'life40' }, 3)
  s = { ...s, kids: [{ age: 6, done: [] }], dependents: 1 }
  assert.deepEqual(dueStages(s), ['k_school#0'])
  s = roll(s, {})
  assert.ok(s.minorQueue[0] === 'k_school#0' || s.phase === 'scene')
  assert.deepEqual(dueStages(s), [], '排進佇列後就不會再出現')
  assert.ok(KID_STAGES.every((d) => d.choices.length >= 2))
})

test('退休:收入變成年金,儲蓄年金分年領回', () => {
  let s = createGame({ ...base, length: 'life60' }, 8)
  s = { ...s, age: 65, savings: 2000000, phase: 'result', minorQueue: ['s_retire'], minorTotal: 1, ended: null, stagesDone: ['s_retire'] }
  const salary = s.income
  s = choose(nextMinor(s), 0)
  assert.ok(s.retired)
  assert.ok(s.income < salary * 0.5)
  assert.equal(s.annuityPay, 100000)
  assert.ok(!hasMinor(s))
  const sav = s.savings
  s = endYear(s)
  assert.ok(s.savings < sav, '領回之後帳戶變少(另外有利息)')
})
