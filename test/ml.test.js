import test from 'node:test'
import assert from 'node:assert/strict'
import { createGame } from '../src/game/engine.js'
import { setCoverage } from '../src/game/engine.js'
import { predictRisk, classifyStyle, RISK_MODEL, STYLE_MODEL, POLICY_INFO, learnedAdvice } from '../src/game/ml/index.js'
import { LEARNED, PERSONAS, botFastForward } from '../src/game/bots.js'
import { FEATURES } from '../src/game/ml/features.js'

const base = { name: 't', career: 'office', background: 'normal', style: 'steady', length: 'short' }

test('風險預測模型:權重與特徵數量一致,驗證 AUC 明顯優於亂猜', () => {
  assert.equal(RISK_MODEL.w.length, FEATURES.length)
  assert.ok(RISK_MODEL.metrics.auc > 0.75, `AUC ${RISK_MODEL.metrics.auc}`)
  const s = createGame(base, 3)
  const r = predictRisk(s)
  assert.ok(r.p > 0 && r.p < 1)
  assert.ok(Array.isArray(r.reasons))
})

test('風險預測:補上保障、多存預備金,預測的危機機率會下降', () => {
  let s = createGame(base, 4)
  const before = predictRisk(s).p
  for (const id of ['medical', 'critical', 'disability']) s = setCoverage(s, id, 1)
  s = { ...s, cash: s.cash + s.expense }
  assert.ok(predictRisk(s).p < before)
})

test('理財性格分群:5 群都有名字,整局結束後能分類', () => {
  assert.equal(STYLE_MODEL.clusters.length, 5)
  assert.equal(new Set(STYLE_MODEL.clusters.map((c) => c.id)).size, 5)
  const s = botFastForward(createGame(base, 9), PERSONAS[0])
  const r = classifyStyle(s)
  assert.ok(STYLE_MODEL.clusters.some((c) => c.id === r.id))
})

test('AI 學習型玩家:能完整打完一局,訓練結果有紀錄', () => {
  assert.ok(PERSONAS.includes(LEARNED))
  assert.equal(botFastForward(createGame(base, 21), LEARNED).phase, 'ended')
  assert.ok(POLICY_INFO.training.totalGames > 0)
  assert.ok(Array.isArray(learnedAdvice(createGame(base, 2)).buy))
})
