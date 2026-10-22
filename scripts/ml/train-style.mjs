// 訓練「理財性格」分群模型:k-means(k = 5),純 JavaScript。
// 用上千局各種風格的模擬人生,依整局行為(保障、投資比例、風險偏好、現金、負債)分成 5 群,
// 再依各群中心點的特徵自動命名。輸出 src/game/ml/styleModel.json。
import fs from 'node:fs'
import { playGame, randomPersona } from './simulate.mjs'
import { Rng } from '../../src/game/rng.js'
import { STYLE_FEATURES, styleFeaturize } from '../../src/game/ml/features.js'

const GAMES = Number(process.argv[2] || 1500)
const K = 5
const X = []
for (let g = 0; g < GAMES; g++) {
  const r = new Rng(g * 17 + 5, 0)
  const { s } = playGame(50000 + g, randomPersona(r))
  if (s.history.length >= 5) X.push(styleFeaturize(s))
}
const d = STYLE_FEATURES.length
const mean = Array(d).fill(0), std = Array(d).fill(0)
for (const x of X) x.forEach((v, j) => (mean[j] += v / X.length))
for (const x of X) x.forEach((v, j) => (std[j] += (v - mean[j]) ** 2 / X.length))
for (let j = 0; j < d; j++) std[j] = Math.sqrt(std[j]) || 1
const Z = X.map((x) => x.map((v, j) => (v - mean[j]) / std[j]))
const dist = (a, b) => a.reduce((s, v, j) => s + (v - b[j]) ** 2, 0)

// k-means++ 初始化 + 多次重跑取最好的
function kmeans(seed) {
  const r = new Rng(seed, 0)
  const C = [Z[Math.floor(r.next() * Z.length)]]
  while (C.length < K) {
    const dd = Z.map((z) => Math.min(...C.map((c) => dist(z, c))))
    let u = r.next() * dd.reduce((a, b) => a + b, 0)
    let i = 0
    while ((u -= dd[i]) > 0 && i < Z.length - 1) i++
    C.push(Z[i])
  }
  let assign = []
  for (let it = 0; it < 60; it++) {
    assign = Z.map((z) => { let best = 0; C.forEach((c, k) => { if (dist(z, c) < dist(z, C[best])) best = k }); return best })
    for (let k = 0; k < K; k++) {
      const mem = Z.filter((_, i) => assign[i] === k)
      if (mem.length) C[k] = Array(d).fill(0).map((_, j) => mem.reduce((a, m) => a + m[j], 0) / mem.length)
    }
  }
  const sse = Z.reduce((a, z, i) => a + dist(z, C[assign[i]]), 0)
  return { C, assign, sse }
}
let best = null
for (let s = 1; s <= 8; s++) { const km = kmeans(s * 101); if (!best || km.sse < best.sse) best = km }

// 依中心點自動命名:每個名字有一個「多符合」的分數,找總分最高的一對一配對
const F = Object.fromEntries(STYLE_FEATURES.map(([n], j) => [n, j]))
const NAMES = {
  guardian: (c) => 1.2 * c[F.protection] - c[F.debtUse] + 0.3 * c[F.cashMonths],
  uninsured: (c) => -1.5 * c[F.protection],
  debtor: (c) => c[F.debtUse] - c[F.investRate] - 0.5 * c[F.cashMonths],
  leveraged: (c) => c[F.investRate] + c[F.debtUse] + 0.5 * c[F.riskyShare],
  gambler: (c) => 1.5 * c[F.specShare] + c[F.riskyShare],
}
const ids = Object.keys(NAMES)
let bestPerm = null, bestScore = -Infinity
const perm = (arr, l = 0) => {
  if (l === arr.length) { const sc = arr.reduce((a, id, k) => a + NAMES[id](best.C[k]), 0); if (sc > bestScore) { bestScore = sc; bestPerm = [...arr] } return }
  for (let i = l; i < arr.length; i++) { [arr[l], arr[i]] = [arr[i], arr[l]]; perm(arr, l + 1); [arr[l], arr[i]] = [arr[i], arr[l]] }
}
perm([...ids])
const sizes = Array(K).fill(0); best.assign.forEach((k) => sizes[k]++)
const clusters = best.C.map((c, k) => ({ id: bestPerm[k], center: c.map((v) => +v.toFixed(4)), raw: c.map((v, j) => +(v * std[j] + mean[j]).toFixed(4)), share: +(sizes[k] / Z.length).toFixed(3) }))
for (const c of clusters) console.log(c.id.padEnd(9), `${(c.share * 100).toFixed(0)}%`.padStart(4), STYLE_FEATURES.map(([n], j) => `${n} ${c.raw[j].toFixed(2)}`).join(', '))
fs.writeFileSync(new URL('../../src/game/ml/styleModel.json', import.meta.url), JSON.stringify({
  model: 'k-means', k: K, features: STYLE_FEATURES.map(([n]) => n), mean: mean.map((v) => +v.toFixed(5)), std: std.map((v) => +v.toFixed(5)),
  clusters, metrics: { games: X.length },
}, null, 1))
console.log(`已輸出 src/game/ml/styleModel.json(${X.length} 局)`)
