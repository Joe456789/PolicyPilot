// 產生訓練資料:讓各種理財風格的電腦玩家跑上千局,記下每一年的狀態與之後的結果。
// 規則引擎是確定性的(同一個種子結果相同),所以資料可以重現。
import { createGame, roll, endYear } from '../../src/game/engine.js'
import { PERSONAS, botPlan, botAct, botMinors } from '../../src/game/bots.js'
import { CAREERS, BACKGROUNDS } from '../../src/game/careers.js'
import { PRODUCT_ORDER } from '../../src/game/products.js'
import { Rng } from '../../src/game/rng.js'
import { featurize } from '../../src/game/ml/features.js'

// 隨機產生一個理財風格(以內建四種個性為底再打散),讓資料涵蓋各種好壞做法
export function randomPersona(r) {
  const base = PERSONAS[Math.floor(r.next() * PERSONAS.length)]
  const covers = ['rec', 'max', 'core', 'late', 'none']
  const w = [r.next(), r.next(), r.next(), r.next() * 0.6]
  const sum = w.reduce((a, b) => a + b, 0)
  return {
    ...base,
    id: base.id,
    cover: r.next() < 0.5 ? base.cover : covers[Math.floor(r.next() * covers.length)],
    skip: PRODUCT_ORDER.filter(() => r.next() < 0.18),
    buffer: Math.round(r.next() * 12),
    invest: { deposit: w[0] / sum, bond: w[1] / sum, stock: w[2] / sum, spec: w[3] / sum },
    investFrac: 0.3 + r.next() * 0.7,
    loans: r.next() < 0.25,
    risk: r.next(), love: r.next(), panic: r.next() < 0.3,
  }
}

// 跑一局,回傳每一年的 { x: 特徵, year } 與整局歷史
export function playGame(seed, persona) {
  const r = new Rng(seed * 7 + 3, 0)
  const setup = {
    name: 'sim', career: CAREERS[Math.floor(r.next() * CAREERS.length)].id,
    background: BACKGROUNDS[Math.floor(r.next() * BACKGROUNDS.length)].id, style: 'steady',
    length: r.next() < 0.5 ? 'standard' : 'long',
  }
  let s = createGame(setup, seed)
  const rows = []
  let guard = 0
  while (s.phase !== 'ended' && guard++ < 80) {
    s = botPlan(s, persona)
    rows.push({ x: featurize(s), year: s.history.length })
    s = roll(s, {})
    s = botAct(s, persona)
    s = botMinors(s, persona)
    s = endYear(s)
  }
  return { rows, s }
}

// 第 year 年開始之後的 horizon 年內,有沒有發生「財務危機」:現金不夠被迫借錢、資產被拍賣,或破產
export function crisisWithin(s, year, horizon) {
  const h = s.history.slice(year, year + horizon)
  if (h.some((y) => y.borrowed > 0 || y.forced > 0)) return 1
  if (s.ended?.reason === 'bankrupt' && s.history.length <= year + horizon) return 1
  return 0
}
