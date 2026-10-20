import test from 'node:test'
import assert from 'node:assert/strict'
import { createGame, setCoverage, roll, endYear } from '../src/game/engine.js'
import { PERSONAS, botPlan, botAct } from '../src/game/bots.js'
import { marketSeries } from '../src/game/market.js'
import { ASSET_ORDER } from '../src/game/core.js'

const base = { name: 't', career: 'office', background: 'comfy', style: 'steady', length: 'short' }

test('託管:keep 模式只補強保障,不會降級玩家原本買的保險', () => {
  const allin = PERSONAS.find((p) => p.id === 'allin') // 這個個性本來會把大部分保險歸零
  let s = createGame(base, 5)
  s = setCoverage(s, 'medical', 2)
  const kept = botPlan(s, allin, { keep: true })
  assert.equal(kept.coverage.medical, 2)
  const dropped = botPlan(s, allin)
  assert.equal(dropped.coverage.medical, 0, '一般(對手)模式會依個性把保障調成目標值')
  const s2 = setCoverage(s, 'life', 1)
  assert.equal(botPlan(s2, allin, { keep: true }).coverage.life, 1)
  assert.equal(botPlan(s2, allin).coverage.life, 0)
})

test('託管:同一個種子下,代打整局可以順利跑完且不出錯', () => {
  for (const p of PERSONAS) {
    let s = createGame(base, 11)
    let guard = 0
    while (s.phase !== 'ended' && guard++ < 60) {
      if (s.phase === 'plan') s = roll(botPlan(s, p, { keep: true }), {})
      if (s.phase === 'scene') s = botAct(s, p)
      if (s.phase === 'result') s = endYear(s)
    }
    assert.equal(s.phase, 'ended', p.id)
  }
})

test('走勢圖資料:起點 100,逐年用歷史報酬複利累乘', () => {
  let s = createGame(base, 7)
  for (let k = 0; k < 3; k++) {
    s = roll(s, {})
    s = botAct(s, PERSONAS[0])
    s = endYear(s)
  }
  const pts = marketSeries(s.history, s.age)
  assert.equal(pts.length, 1 + s.history.filter((h) => h.returns).length)
  for (const k of ASSET_ORDER) assert.equal(pts[0][k], 100)
  const h0 = s.history[0]
  for (const k of ASSET_ORDER) assert.ok(Math.abs(pts[1][k] - 100 * (1 + h0.returns[k])) < 1e-9)
  assert.deepEqual(marketSeries([], 22).length, 1)
})
