// 訓練「財務危機預測」模型:邏輯迴歸(logistic regression),純 JavaScript、不需要任何套件。
// 標籤:接下來 8 年內是否發生財務危機(被迫借錢、資產被拍賣或破產)。
// 輸出 src/game/ml/riskModel.json(權重、標準化參數、驗證集的準確度與 AUC)。
import fs from 'node:fs'
import { playGame, randomPersona, crisisWithin } from './simulate.mjs'
import { Rng } from '../../src/game/rng.js'
import { FEATURES } from '../../src/game/ml/features.js'

const GAMES = Number(process.argv[2] || 2500)
const HORIZON = 8
const X = [], Y = [], G = []
const t0 = Date.now()
for (let g = 0; g < GAMES; g++) {
  const r = new Rng(g * 31 + 11, 0)
  const { rows, s } = playGame(1000 + g, randomPersona(r))
  for (const row of rows) {
    if (row.year + 1 > s.history.length) continue
    X.push(row.x); Y.push(crisisWithin(s, row.year, HORIZON)); G.push(g)
  }
}
console.log(`資料:${GAMES} 局、${X.length} 筆,危機比例 ${(Y.reduce((a, b) => a + b, 0) / Y.length * 100).toFixed(1)}%(${((Date.now() - t0) / 1000).toFixed(1)} 秒)`)

// 依「局」切訓練/驗證(同一局的資料不會同時出現在兩邊)
const train = [], test = []
X.forEach((x, i) => (G[i] % 5 === 0 ? test : train).push(i))
const d = FEATURES.length
const mean = Array(d).fill(0), std = Array(d).fill(0)
for (const i of train) X[i].forEach((v, j) => (mean[j] += v / train.length))
for (const i of train) X[i].forEach((v, j) => (std[j] += (v - mean[j]) ** 2 / train.length))
for (let j = 0; j < d; j++) std[j] = Math.sqrt(std[j]) || 1
const z = (x) => x.map((v, j) => (v - mean[j]) / std[j])
const sig = (v) => 1 / (1 + Math.exp(-v))

let w = Array(d).fill(0), b = 0
const lr = 0.3, l2 = 0.001
for (let epoch = 0; epoch < 400; epoch++) {
  const gw = Array(d).fill(0); let gb = 0
  for (const i of train) {
    const xi = z(X[i])
    const p = sig(xi.reduce((a, v, j) => a + v * w[j], b))
    const e = p - Y[i]
    for (let j = 0; j < d; j++) gw[j] += e * xi[j]
    gb += e
  }
  w = w.map((wj, j) => wj - lr * (gw[j] / train.length + l2 * wj))
  b -= lr * gb / train.length
}

// 驗證:準確度、AUC
const scored = test.map((i) => [sig(z(X[i]).reduce((a, v, j) => a + v * w[j], b)), Y[i]])
const acc = scored.filter(([p, y]) => (p >= 0.5 ? 1 : 0) === y).length / scored.length
const pos = scored.filter(([, y]) => y === 1).map(([p]) => p), neg = scored.filter(([, y]) => y === 0).map(([p]) => p)
let wins = 0
const negSorted = [...neg].sort((a, b) => a - b)
for (const p of pos) { let lo = 0, hi = negSorted.length; while (lo < hi) { const m = (lo + hi) >> 1; if (negSorted[m] < p) lo = m + 1; else hi = m } wins += lo }
const auc = wins / (pos.length * neg.length)
const base = Math.max(pos.length, neg.length) / scored.length
console.log(`驗證集 ${scored.length} 筆:準確度 ${(acc * 100).toFixed(1)}%(全猜多數類別 ${(base * 100).toFixed(1)}%)、AUC ${auc.toFixed(3)}`)
console.log('權重:', FEATURES.map(([n], j) => `${n} ${w[j].toFixed(2)}`).join(', '))

fs.writeFileSync(new URL('../../src/game/ml/riskModel.json', import.meta.url), JSON.stringify({
  model: 'logistic-regression', horizon: HORIZON, features: FEATURES.map(([n]) => n),
  mean: mean.map((v) => +v.toFixed(5)), std: std.map((v) => +v.toFixed(5)), w: w.map((v) => +v.toFixed(5)), b: +b.toFixed(5),
  metrics: { games: GAMES, samples: X.length, testSamples: scored.length, accuracy: +acc.toFixed(4), baseline: +base.toFixed(4), auc: +auc.toFixed(4) },
}, null, 1))
console.log('已輸出 src/game/ml/riskModel.json')
