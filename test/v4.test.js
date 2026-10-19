import test from 'node:test'
import assert from 'node:assert/strict'
import { createLife, beginLife, chooseLife, advanceLife, careerOptions, lifeToSetup } from '../src/game/prologue.js'
import { createGame, roll, choose, endYear, applyAiScene, directorInfo, netWorth, computeScore, setCoverage, recommended } from '../src/game/engine.js'
import { payoutFor, EMPTY_COVERAGE, PRODUCT_ORDER, PRODUCTS } from '../src/game/products.js'
import { computeEnding, ENDINGS } from '../src/game/endings.js'
import { PERSONAS, createBotGame, botFastForward } from '../src/game/bots.js'
import { lookupGlossary, GLOSSARY } from '../src/game/glossary.js'
import { BACKGROUNDS } from '../src/game/careers.js'

const base = { name: 't', career: 'office', background: 'normal', style: 'steady', length: 'standard' }

test('新保險商品:癌症險、日額險、汽車險、投資型保單的給付', () => {
  const c = { ...EMPTY_COVERAGE, cancer: 2, daily: 2, auto: 2, invlinked: 1, travel: 1 }
  const crit = payoutFor(c, { cat: 'critical', cancer: true, medicalCost: 1000000, income: 1e6, years: 2 })
  assert.equal(crit.cancer, 1500000)
  assert.equal(crit.daily, 3000 * 40)
  assert.equal(payoutFor(c, { cat: 'liability', otherCost: 1000000 }).auto, 900000)
  assert.equal(payoutFor(c, { cat: 'medical', medicalCost: 100000, carRepair: true, otherCost: 100000 }).auto, 80000)
  assert.equal(payoutFor(c, { cat: 'death' }).invlinked, 1200000)
  assert.equal(payoutFor(c, { cat: 'trip', otherCost: 100000 }).travel, 90000)
  assert.equal(payoutFor(EMPTY_COVERAGE, { cat: 'critical', cancer: true, medicalCost: 1e6, income: 1e6, years: 2 }).total, 0)
  assert.equal(PRODUCT_ORDER.length, 13)
  for (const id of PRODUCT_ORDER) assert.ok(PRODUCTS[id].group && PRODUCTS[id].tiers.length >= 2)
})

test('投資型保單:帳戶價值會累積,並計入淨資產', () => {
  let s = createGame({ ...base, background: 'comfy' }, 3)
  s = setCoverage(s, 'invlinked', 1)
  for (let k = 0; k < 5; k++) {
    s = roll(s)
    s = endYear(choose(s, 0))
    if (s.phase === 'ended') break
  }
  assert.ok(s.ilv > 0)
  assert.ok(Number.isFinite(netWorth(s)))
})

test('家境起點很多元:富二代有現金、股票與房子,祖產家庭有房沒現金', () => {
  const mk = (bgId) => {
    let l = beginLife(createLife({ name: 'x', look: {}, style: 's', bgId }, 5))
    let g = 0
    while (!l.done && g++ < 40) { l = chooseLife(l, 0); l = advanceLife(l) }
    return createGame(lifeToSetup(l, careerOptions(l)[0].id, 'standard', 0), 5)
  }
  const rich = mk('rich')
  assert.ok(rich.house && rich.house.balance === 0)
  assert.ok(rich.hold.stock > 500000)
  assert.ok(netWorth(rich) > 10000000)
  const her = mk('heritage')
  assert.ok(her.house && her.cash < 300000)
  const tight = mk('tight')
  assert.ok(netWorth(tight) < 0)
  assert.equal(BACKGROUNDS.length, 8)
})

test('AI 事件導演:選項方向會被轉成有上下限的數字,不合法的輸出會被忽略', () => {
  let s = createGame(base, 7)
  let found = null
  for (let seed = 1; seed < 300 && !found; seed++) {
    let g = roll(createGame(base, seed))
    if (directorInfo(g.scene)) found = g
  }
  assert.ok(found, '應該能遇到可由 AI 導演的事件')
  const info = directorInfo(found.scene)
  assert.ok(info.severity >= 1 && info.severity <= 4)
  const bad = applyAiScene(found, { title: 'x', story: 'y', choices: [{ label: 'a', style: 'evil' }, { label: 'b', style: 'hack' }] })
  assert.deepEqual(bad.scene.choices, found.scene.choices)
  const good = applyAiScene(found, {
    title: '新事件', story: '新故事', lesson: '觀念',
    choices: [{ label: '省', hint: 'h', style: 'frugal' }, { label: '好', hint: 'h', style: 'premium' }, { label: '拚', hint: 'h', style: 'risky' }],
  })
  assert.equal(good.scene.choices.length, 3)
  assert.equal(good.scene.title, '新事件')
  for (const c of good.scene.choices) assert.ok(c.costMult >= 0.5 && c.costMult <= 1.7)
  // 套用後仍可正常結算
  const after = endYear(choose(good, 1))
  assert.ok(after.history.length === 1)
})

test('結局:每一局都有結局,而且多種結局都會出現', () => {
  const seen = new Set()
  for (const p of PERSONAS) {
    for (let seed = 1; seed <= 40; seed++) {
      const s = botFastForward(createBotGame(p, seed * 5 + 2, seed % 2 ? 'long' : 'standard'), p)
      const e = computeEnding(s, computeScore(s))
      assert.ok(ENDINGS.some((x) => x.id === e.id))
      assert.ok(e.epilogue.length > 20)
      seen.add(e.id)
    }
  }
  assert.ok(seen.size >= 7, `只出現 ${seen.size} 種結局`)
  assert.equal(ENDINGS.length, 17)
})

test('小辭典:能依關鍵字找到相關說明', () => {
  assert.ok(GLOSSARY.length >= 30)
  assert.equal(lookupGlossary('醫療險和重大傷病險有什麼不一樣')[0].title.includes('醫療'), true)
  assert.ok(lookupGlossary('股市大跌我該賣嗎').some((g) => g.title.includes('下跌')))
  assert.equal(lookupGlossary('今天天氣如何').length, 0)
})

test('建議配置不會要求選配商品,汽車險只在有車時才建議', () => {
  const s = createGame(base, 1)
  const r = recommended(s)
  assert.equal(r.cancer + r.daily + r.travel + r.invlinked + r.auto, 0)
  s.car = true
  assert.equal(recommended(s).auto, 1)
})
