// 電腦對手:個性不同的 AI 玩家,走同一個棋盤、遵守同一套規則。
// 他們只用公開的引擎動作(買保險、投資、擲骰、選擇),沒有任何作弊的資訊,
// 目的是讓玩家看見「不同的決策,在同樣的人生裡會有什麼結果」。
import { Rng } from './rng.js'
import { LOOKS, CAREERS, STYLES } from './careers.js'
import {
  createGame, setCoverage, trade, borrow, repay, roll, choose, endYear, recommended, canIncrease, propAction,
  analyzeGaps, householdIncome, ASSET_ORDER, clamp,
} from './engine.js'
import { PRODUCT_ORDER, totalPremium } from './products.js'
import { createLife, beginLife, chooseLife, advanceLife, careerOptions, lifeToSetup, skipLife } from './prologue.js'
import { propById, upgradeCost } from './properties.js'
import { t } from '../i18n.js'

export const PERSONAS = [
  {
    id: 'steady', name: '林穩健', title: '穩健理財派', blurb: '保障先到位、資產分散、不追高。', // i18n-ignore
    look: { skin: LOOKS.skins[1], hair: LOOKS.hairs[3], style: 'bob', top: LOOKS.tops[1], accent: '#d9f2e5', extra: 'glasses' },
    cover: 'rec', skip: [], buffer: 8, invest: { deposit: 0.4, bond: 0.4, stock: 0.2, spec: 0 }, investFrac: 0.7, loans: false,
    panic: false, risk: 0.1, love: 0.8, quiz: 0.8, study: 'study',
  },
  {
    id: 'allin', name: '阿宏', title: '梭哈冒險家', blurb: '覺得保險是浪費錢,什麼都想投資賺。', // i18n-ignore
    look: { skin: LOOKS.skins[2], hair: LOOKS.hairs[0], style: 'messy', top: LOOKS.tops[6], accent: '#ffe3c2', extra: 'beanie' },
    cover: 'late', skip: ['critical', 'disability', 'life', 'accident', 'annuity', 'ltc', 'home'], buffer: 1, invest: { deposit: 0, bond: 0, stock: 0.5, spec: 0.5 }, investFrac: 0.95, loans: true,
    panic: true, risk: 1, love: 0, quiz: 0.45, study: 'social',
  },
  {
    id: 'insured', name: '保險控小美', title: '保險至上派', blurb: '什麼險都想買,但很少拿錢去投資。', // i18n-ignore
    look: { skin: LOOKS.skins[0], hair: LOOKS.hairs[1], style: 'ponytail', top: LOOKS.tops[2], accent: '#ffe0e9', extra: 'none' },
    cover: 'max', skip: [], buffer: 5, invest: { deposit: 0.7, bond: 0.3, stock: 0, spec: 0 }, investFrac: 0.5, loans: false,
    panic: false, risk: 0, love: 1, quiz: 0.7, study: 'study',
  },
  {
    id: 'balanced', name: '陳平衡', title: '平衡工程師', blurb: '核心保障加定期定額,理性但偶爾追熱門。', // i18n-ignore
    look: { skin: LOOKS.skins[1], hair: LOOKS.hairs[0], style: 'side', top: LOOKS.tops[5], accent: '#cfd8dc', extra: 'headphones' },
    cover: 'core', skip: ['annuity', 'ltc'], buffer: 4, invest: { deposit: 0.1, bond: 0.2, stock: 0.6, spec: 0.1 }, investFrac: 0.85, loans: false,
    panic: false, risk: 0.4, love: 0.5, quiz: 0.65, study: 'study',
  },
]

// ---------- 成長篇(自動)----------
function botLifeSetup(p, seed, length, opponents, startAge = 22) {
  let l = createLife({ name: t(p.name), look: p.look, style: STYLES.find((x) => x.id === 'steady').title }, seed)
  l = startAge > 22 ? skipLife(l, startAge) : beginLife(l)
  let guard = 0
  while (!l.done && guard++ < 40) {
    const sc = l.scene
    let idx = 0
    if (sc.choices[0].major !== undefined) {
      // 升學:依能力與個性挑科系
      const wants = p.id === 'allin' ? ['work', 'art', 'biz'] : p.id === 'insured' ? ['med', 'biz'] : ['stem', 'biz', 'med']
      const k = sc.choices.findIndex((c) => wants.includes(c.major) && l.stats.study >= (c.need || 0))
      idx = k >= 0 ? k : sc.choices.length - 1
    } else if (sc.choices.some((c) => c.fx && ('study' in c.fx || 'social' in c.fx))) {
      idx = p.study === 'study' ? sc.choices.findIndex((c) => c.fx && c.fx.study >= 8 || c.track === 'academic') : 0
      if (idx < 0) idx = 0
    } else if (sc.choices.some((c) => c.cash)) idx = p.risk > 0.5 ? 2 : 0
    l = chooseLife(l, idx)
    l = advanceLife(l)
  }
  const opts = careerOptions(l)
  const prefer = p.id === 'allin' ? ['sales', 'freelancer'] : p.id === 'steady' ? ['teacher', 'engineer', 'office'] : ['engineer', 'nurse', 'office']
  const pick = opts.find((c) => prefer.includes(c.id)) || opts[0]
  return lifeToSetup(l, pick.id, length, opponents)
}

export function createBotGame(p, seed, length, startAge = 22) {
  const setup = botLifeSetup(p, seed, length, 0, startAge)
  return createGame(setup, seed)
}

// ---------- 年度規劃 ----------
function applyCoverage(s, p, keep = false) {
  const rec = recommended(s)
  const hi = householdIncome(s)
  let target = { ...rec }
  if (p.cover === 'none') target = {}
  if (p.cover === 'late') target = s.age >= 32 ? { medical: 1 } : {}
  if (p.cover === 'max') {
    for (const id of PRODUCT_ORDER) target[id] = Math.min(PRODUCT_ORDER.includes(id) ? 2 : 1, (rec[id] || 0) + (id === 'life' || id === 'critical' ? 1 : 0))
  }
  for (const id of p.skip) target[id] = 0
  for (const id of PRODUCT_ORDER) {
    const want = target[id] || 0
    const cur = s.coverage[id] || 0
    if (want > cur && !canIncrease(s, id)) continue
    // 保費上限:避免買到破產
    const trial = { ...s.coverage, [id]: want }
    if (want > cur && totalPremium(trial, s.age) / hi > 0.17) continue
    if (want !== cur && !(keep && want < cur)) s = setCoverage(s, id, want)
  }
  return s
}

// ---------- 理財 ----------
function applyInvest(s, p) {
  const buffer = (s.expense / 12) * p.buffer
  if (p.loans && s.loan < householdIncome(s) * 0.6 && s.age < 45 && s.cash < s.expense) {
    s = borrow(s, 200000)
  }
  if (!p.loans && s.loan > 0 && s.cash > buffer + s.loan) s = repay(s, s.loan)
  const surplus = Math.max(0, s.cash - buffer) * p.investFrac
  if (surplus < 20000) return s
  for (const k of ASSET_ORDER) {
    const amt = Math.round((surplus * p.invest[k]) / 1000) * 1000
    if (amt > 0) s = trade(s, k, amt)
  }
  return s
}

// keep:代玩家託管時用,只會補強保障,不會把玩家原本買的降級
export function botPlan(s, p, { keep = false } = {}) {
  s = applyCoverage(s, p, keep)
  if (p.love > 0.3) for (const id of Object.keys(s.props)) if (!s.props[id].insured && s.ap > 0) s = propAction(s, id, 'insure')
  s = applyInvest(s, p)
  return s
}

// ---------- 場景選擇 ----------
function fxScore(fx, p) {
  if (!fx) return 0
  let sc = 0
  if (fx.lessonOnly) sc += 2
  if (fx.gamble) sc += p.risk * 3 - 2
  if (fx.invest) sc += (fx.invest.cls === 'spec' ? p.risk * 2 - 0.8 : 0.2) + fx.invest.pct * 2
  if (fx.coverage) sc += p.love * 3 - 0.5
  if (fx.cashPct) sc += fx.cashPct * 8
  if (fx.cash) sc += fx.cash / 40000
  if (fx.expense) sc -= fx.expense / 60000
  if (fx.health) sc += fx.health / 6
  return sc
}

export function botChoose(s, p) {
  const sc = s.scene
  const rng = new Rng((s.seed ^ 0xa5a5) + s.turn * 31, 0)
  const n = sc.choices.length
  const last = n - 1
  switch (sc.kind) {
    case 'event': {
      if (sc.cat === 'death') return 0
      return p.id === 'allin' ? Math.min(1, last) : 0
    }
    case 'chance': {
      let best = 0, bestV = -1e9
      sc.choices.forEach((c, i) => {
        const v = fxScore(c.fx, p) + (rng.next() - 0.5) * 0.8
        if (v > bestV) { best = i; bestV = v }
      })
      return best
    }
    case 'market': {
      const { ret } = sc.base
      if (ret < 0) return p.panic ? 1 : p.risk > 0.3 && s.cash > s.expense ? 2 : 0
      return p.risk > 0.6 ? 2 : 0
    }
    case 'bonus': return p.love > 0.6 ? 2 : p.risk > 0.3 ? 1 : 0
    case 'advisor': return p.id === 'allin' && n > 1 ? 1 : 0
    case 'shop': return p.id === 'steady' ? 1 : p.id === 'insured' ? 2 : p.risk > 0.3 ? 0 : 2
    case 'bank': {
      const hasLoan = s.loan > 0
      if (p.loans && !hasLoan) return 0
      return hasLoan ? 0 : 1
    }
    case 'hospital': return p.id === 'allin' ? 2 : p.id === 'steady' || p.id === 'insured' ? 0 : 1
    case 'quiz': {
      const right = sc.choices.findIndex((c) => c.tag === 'right')
      return rng.next() < p.quiz ? right : (right + 1) % n
    }
    case 'milestone': return botMilestone(s, p, sc, rng)
    case 'property': return botProperty(s, p, sc)
    default: return 0
  }
}

const liquidOf = (s) => s.cash + s.hold.deposit + s.hold.bond + s.hold.stock + s.hold.spec

// 對手想用什麼方式買資產:'cash' | 'loan' | null
export function botWantsProperty(s, p, prop) {
  const liquid = liquidOf(s)
  const mo = s.expense / 12
  const price = prop.price
  if (p.id === 'steady') {
    if (liquid - price >= 12 * mo && price <= liquid * 0.45) return 'cash'
    return null
  }
  if (p.id === 'allin') return liquid >= price * 0.3 * 1.05 && s.age < 48 ? 'loan' : null
  if (p.id === 'insured') return price <= liquid * 0.3 && liquid - price >= 10 * mo ? 'cash' : null
  if (prop.yield >= 0.05 && liquid - price * 0.3 >= 7 * mo) return 'loan'
  if (liquid - price >= 8 * mo) return 'cash'
  return null
}

function botProperty(s, p, sc) {
  const base = sc.base
  const tags = sc.choices.map((c) => c.tag)
  const idxOf = (tag) => Math.max(0, tags.indexOf(tag))
  if (base.status === 'rival') return 0
  const prop = propById(base.propId)
  if (base.status === 'unowned') {
    const m = botWantsProperty(s, p, prop)
    return m === 'cash' ? idxOf('buy_cash') : m === 'loan' ? idxOf('buy_loan') : idxOf('skip')
  }
  const mine = s.props[base.propId]
  if (!mine.insured && p.love > 0.3) return idxOf('insure')
  if (mine.level < 3 && p.risk > 0.3 && liquidOf(s) > upgradeCost(prop, mine.level) + 8 * (s.expense / 12)) return idxOf('upgrade')
  return idxOf('skip')
}

function botMilestone(s, p, sc, rng) {
  switch (sc.defId) {
    case 'marriage': return s.age >= (p.id === 'allin' ? 24 : 27) ? 0 : 1
    case 'baby': return 0
    case 'house_buy': {
      const price = clamp(Math.round(householdIncome(s) * 7), 5000000, 18000000)
      return s.cash + s.hold.deposit + s.hold.bond + s.hold.stock + s.hold.spec >= price * 0.2 * 1.3 ? 0 : 1
    }
    case 'promotion': return p.id === 'allin' || p.id === 'balanced' ? 1 : 0
    case 'job_change': return p.risk > 0.3 ? 0 : 1
    case 'mba': return s.cash > 500000 ? 0 : 1
    case 'creep': return p.id === 'allin' ? 1 : 0
    case 'parents_support': return p.id === 'steady' ? 0 : 1
    case 'retire_plan': return p.love > 0.5 || p.id === 'steady' ? 0 : 1
    default: return rng.next() < 0.5 ? 0 : sc.choices.length - 1
  }
}

// 電腦玩小遊戲:依個性的「知識水準」決定星數。
export function botStars(s, p) {
  const rng = new Rng((s.seed ^ 0x77) + s.turn * 17, 0)
  const x = rng.next() * 0.9 + p.quiz * 0.6
  return x > 1.25 ? 3 : x > 0.95 ? 2 : x > 0.65 ? 1 : 0
}

// 選擇並結算當前場景(小遊戲需要星數)
export function botAct(s, p) {
  if (s.scene.kind === 'minigame') return choose(s, 0, { stars: botStars(s, p) })
  return choose(s, botChoose(s, p))
}

// ---------- 一整年(同步,用於快轉或測試)----------
export function botPlayYear(s, p, world = {}) {
  s = botPlan(s, p)
  s = roll(s, world)
  s = botAct(s, p)
  s = endYear(s)
  return s
}

export function botFastForward(s, p, world = {}) {
  let guard = 0
  while (s.phase !== 'ended' && guard++ < 100) {
    if (s.phase === 'plan') s = botPlan(s, p)
    if (s.phase === 'plan') s = roll(s, world)
    if (s.phase === 'scene') s = botAct(s, p)
    if (s.phase === 'result') s = endYear(s)
  }
  return s
}
