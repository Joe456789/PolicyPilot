// 訓練「AI 學習型」電腦玩家:演化策略(Evolution Strategies, OpenAI 2017 那種做法)。
// 每一代對目前的參數加上隨機擾動,各自玩幾局,依「人生積分」好壞決定往哪個方向更新。
// 不需要任何人寫規則,也不需要外部資料;資料就是遊戲自己模擬出來的。
// 輸出 src/game/ml/learnedPolicy.json(參數、訓練曲線、和內建四種個性的比較)。
import fs from 'node:fs'
import { playGame } from './simulate.mjs'
import { computeScore } from '../../src/game/engine.js'
import { PERSONAS } from '../../src/game/bots.js'
import { Rng } from '../../src/game/rng.js'
import { decodePolicy, PARAM_NAMES } from '../../src/game/ml/policy.js'

const GENS = Number(process.argv[2] || 40)
const PAIRS = 10, SIGMA = 0.6, LR = 0.25, GAMES = 8
const D = PARAM_NAMES.length
const fitness = (persona, seeds) => seeds.reduce((a, sd) => {
  const { s } = playGame(sd, persona)
  const sc = computeScore(s).total
  return a + sc
}, 0) / seeds.length

let theta = Array(D).fill(0)
const curve = []
const r = new Rng(20261106, 0)
const gauss = () => { const u = 1 - r.next(), v = r.next(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v) }
const t0 = Date.now()
for (let g = 0; g < GENS; g++) {
  const seeds = Array.from({ length: GAMES }, (_, k) => 200000 + g * 97 + k * 13)
  const eps = [], rewards = []
  for (let k = 0; k < PAIRS; k++) {
    const e = Array.from({ length: D }, gauss)
    for (const sign of [1, -1]) {
      const th = theta.map((v, i) => v + sign * SIGMA * e[i])
      eps.push(e.map((x) => sign * x))
      rewards.push(fitness(decodePolicy(th), seeds))
    }
  }
  // 排名正規化(對極端值不敏感)
  const order = rewards.map((v, i) => [v, i]).sort((a, b) => a[0] - b[0])
  const util = Array(rewards.length)
  order.forEach(([, i], rank) => { util[i] = rank / (rewards.length - 1) - 0.5 })
  const grad = Array(D).fill(0)
  eps.forEach((e, k) => e.forEach((x, i) => (grad[i] += util[k] * x)))
  theta = theta.map((v, i) => v + (LR / (eps.length * SIGMA)) * grad[i])
  const cur = fitness(decodePolicy(theta), seeds)
  curve.push(+cur.toFixed(2))
  console.log(`第 ${g + 1} 代:平均積分 ${cur.toFixed(1)}(族群最好 ${Math.max(...rewards).toFixed(1)},${((Date.now() - t0) / 1000).toFixed(0)} 秒)`)
}

// 和內建四種個性比較(用沒看過的種子)
const testSeeds = Array.from({ length: 120 }, (_, k) => 900000 + k * 7)
const compare = { learned: +fitness(decodePolicy(theta), testSeeds).toFixed(2) }
for (const p of PERSONAS) compare[p.id] = +fitness(p, testSeeds).toFixed(2)
console.log('測試集平均人生積分:', compare)
fs.writeFileSync(new URL('../../src/game/ml/learnedPolicy.json', import.meta.url), JSON.stringify({
  method: 'evolution-strategies', params: PARAM_NAMES, theta: theta.map((v) => +v.toFixed(4)),
  training: { generations: GENS, population: PAIRS * 2, gamesPerEval: GAMES, totalGames: GENS * (PAIRS * 2 + 1) * GAMES, curve },
  compare,
}, null, 1))
console.log('已輸出 src/game/ml/learnedPolicy.json')
