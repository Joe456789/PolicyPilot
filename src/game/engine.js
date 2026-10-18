// 遊戲規則引擎(公開介面)。所有金額、機率、保險給付都在這裡「確定性」計算。
// AI(Gemini)只負責文字與教練回饋,不會改動任何數字。
import { PRODUCTS, totalPremium } from './products.js'
import {
  BOARD, ASSET_ORDER, run, cover, clamp, blankYear, netWorth, holdingsTotal, recommended,
  canIncrease, householdIncome, round1k,
} from './core.js'
import { buildScene, resolveScene } from './scenes.js'
import { updateQuests } from './quests.js'

export * from './core.js'
export * from './scoring.js'
export { evalQuests, questScore, QUEST_POOL } from './quests.js'
export { taxFor } from './scenes.js'

// ---------- 年度規劃(買保險、理財、貸款)----------

export function setCoverage(state, id, tier) {
  return run(state, (s) => {
    const cur = s.coverage[id] || 0
    if (tier > cur && !canIncrease(s, id)) {
      s.flash = id === 'home' ? '需要先擁有房子才能投保。' : '你已有相關傷病紀錄,這項保障已無法加保(核保限制)。'
      return
    }
    s.coverage[id] = tier
  })
}

// 現金 ↔ 資產類別。delta > 0 買入,< 0 賣出。
export function trade(state, cls, delta) {
  return run(state, (s) => {
    if (!ASSET_ORDER.includes(cls)) return
    if (delta > 0) {
      const d = Math.min(delta, Math.max(0, s.cash))
      s.cash -= d
      s.hold[cls] += d
    } else if (delta < 0) {
      const d = Math.min(-delta, s.hold[cls])
      s.hold[cls] -= d
      s.cash += d
    }
  })
}

export function borrow(state, amount) {
  return run(state, (s) => {
    const limit = Math.max(0, householdIncome(s) * 1.5 - s.loan)
    const a = Math.min(amount, limit)
    if (a <= 0) { s.flash = '貸款額度已用完(上限約為家庭年收入的 1.5 倍)。'; return }
    s.loan += a
    s.cash += a
  })
}

export function repay(state, amount) {
  return run(state, (s) => {
    const a = Math.min(amount, s.loan, Math.max(0, s.cash))
    s.loan -= a
    s.cash -= a
  })
}

// ---------- 擲骰與場景 ----------

export function roll(state) {
  return run(state, (s, rng) => {
    if (s.phase !== 'plan') return
    const dice = rng.int(1, 6)
    s.dice = dice
    s.pos = (s.pos + dice) % BOARD.length
    s.scene = buildScene(s, rng, BOARD[s.pos])
    s.phase = 'scene'
  })
}

export function choose(state, idx) {
  return run(state, (s, rng) => {
    if (s.phase !== 'scene' || !s.scene) return
    const sc = s.scene
    const choice = sc.choices[idx] || sc.choices[0]
    sc.picked = idx
    const lines = []
    const add = (label, amount, kind) => lines.push({ label, amount, kind: kind || (amount >= 0 ? 'in' : 'out') })
    resolveScene(s, rng, sc, choice, add)
    cover(s)
    sc.result = { lines }
    s.year.events.push({ title: sc.title, kind: sc.kind, cat: sc.cat || null, icon: sc.icon })
    s.phase = 'result'
  })
}

export function ackStage(state) {
  return run(state, (s) => { s.pendingStage = false })
}

// ---------- 年度結算 ----------

export function endYear(state) {
  return run(state, (s, rng) => {
    if (s.phase !== 'result') return

    if (s.ended && s.ended.reason === 'death') {
      s.history.push(snapshot(s, { effIncome: 0, grossIncome: 0, premiums: 0, recurring: 0, ret: 0, savingsIn: 0, houseCost: 0 }))
      s.phase = 'ended'
      s.newQuests = updateQuests(s)
      return
    }

    // 收入:職業波動 + 失能/中斷影響;配偶收入穩定。
    const vol = s.career.vol
    const noise = clamp(1 + rng.normal(0, vol), vol > 0.1 ? 0.5 : 0.9, vol > 0.1 ? 1.5 : 1.1)
    const gross = s.income * noise
    const lossSum = clamp(s.effects.reduce((a, e) => a + e.ratio, 0), 0, 1)
    s.effects.forEach((e) => (e.yearsLeft -= 1))
    s.effects = s.effects.filter((e) => e.yearsLeft > 0)
    let partnerIncome = 0
    if (s.partner) {
      partnerIncome = s.partner.income * clamp(1 + rng.normal(0, 0.03), 0.9, 1.1)
      s.partner.income = Math.round(s.partner.income * 1.025)
    }
    const effIncome = Math.round(gross * (1 - lossSum) + partnerIncome)

    const recurring = s.recurring.reduce((a, r) => a + r.amount, 0)
    s.recurring.forEach((r) => (r.yearsLeft -= 1))
    s.recurring = s.recurring.filter((r) => r.yearsLeft > 0)

    const premiums = totalPremium(s.coverage, s.age)
    const annuityTier = PRODUCTS.annuity.tiers[s.coverage.annuity || 0]
    const savingsIn = annuityTier.saving ? annuityTier.premium : 0
    s.savings = Math.round(s.savings * 1.02 + savingsIn * 0.9)

    // 貸款:先計息,再依最低還款額攤還。
    let loanService = 0
    if (s.loan > 0) {
      s.loan = Math.round(s.loan * 1.07)
      const pay = Math.min(s.loan, Math.round(s.loan * 0.1))
      s.loan -= pay
      loanService = pay
    }

    // 房貸攤還與房價變動
    let houseCost = 0
    if (s.house) {
      const h = s.house
      if (h.yearsLeft > 0 && h.balance > 0) {
        houseCost = Math.min(h.payment, Math.round(h.balance * (1 + h.rate)))
        const interest = Math.round(h.balance * h.rate)
        h.balance = Math.max(0, h.balance + interest - houseCost)
        h.yearsLeft -= 1
      }
      const g = s.year.houseChange ?? clamp(rng.normal(0.03, 0.04), -0.1, 0.12)
      h.value = Math.round(h.value * (1 + g))
    }

    s.cash += effIncome - s.expense - premiums - recurring - houseCost - loanService
    s.year.recurringCost = recurring

    // 各類資產報酬:一場市場行情會同時影響股票、個股、債券。
    const m = (s.year.marketReturn ?? clamp(rng.normal(0.065, 0.15), -0.4, 0.4)) + s.carryBonus
    const returns = {
      deposit: 0.015,
      bond: clamp(0.028 + 0.2 * m + rng.normal(0, 0.015), -0.1, 0.2),
      stock: m,
      spec: clamp(1.5 * m - 0.02 + rng.normal(0, 0.22), -0.85, 2.0),
    }
    for (const k of ASSET_ORDER) s.hold[k] = Math.round(Math.max(0, s.hold[k] * (1 + returns[k])))
    s.carryBonus = s.newBonus
    s.newBonus = 0

    cover(s)

    const snap = snapshot(s, { effIncome, grossIncome: gross + partnerIncome, premiums, recurring, ret: m, returns, savingsIn, houseCost })
    s.history.push(snap)
    s.lastYear = snap
    s.newQuests = updateQuests(s)

    // 進入下一年
    s.turn += 1
    s.age += 1
    s.income = Math.round(s.income * (1 + s.career.growth + rng.normal(0, 0.01)))
    s.expense = Math.round(s.expense * (1.022 + s.career.growth * 0.5)) // 通膨 + 生活水準隨收入提高
    s.health = Math.min(100, s.health + 5)
    if (s.checkupYears > 0) s.checkupYears -= 1
    s.year = blankYear()
    s.scene = null
    s.dice = null

    if (s.turn >= s.years) {
      s.ended = { reason: 'complete' }
      s.phase = 'ended'
      s.newQuests = [...(s.newQuests || []), ...updateQuests(s)]
    } else {
      s.phase = 'plan'
      if (s.turn % 8 === 0) s.pendingStage = true
    }
  })
}

function protRatio(s, rec) {
  const items = Object.keys(rec).filter((id) => rec[id] > 0)
  if (!items.length) return 1
  return items.reduce((a, id) => a + Math.min((s.coverage[id] || 0) / rec[id], 1), 0) / items.length
}

function snapshot(s, f) {
  const rec = recommended(s)
  return {
    turn: s.turn,
    age: s.age,
    effIncome: f.effIncome,
    grossIncome: Math.round(f.grossIncome),
    expense: s.expense,
    houseCost: f.houseCost || 0,
    premiums: f.premiums,
    recurring: f.recurring,
    ret: f.ret,
    returns: f.returns || null,
    savingsIn: f.savingsIn,
    shockCost: s.year.shockCost,
    payout: s.year.payout,
    borrowed: Math.round(s.year.borrowed),
    shocks: s.year.shocks,
    events: s.year.events,
    cash: Math.round(s.cash),
    holdings: Math.round(holdingsTotal(s)),
    savings: Math.round(s.savings),
    loan: Math.round(s.loan),
    houseEquity: s.house ? Math.round(s.house.value - s.house.balance) : 0,
    netWorth: netWorth(s),
    coverage: { ...s.coverage },
    rec,
    protRatio: protRatio(s, rec),
    assetKinds: ASSET_ORDER.filter((k) => s.hold[k] > 0).length,
    health: Math.round(s.health),
    monthsCash: Math.round((s.cash / (s.expense / 12)) * 10) / 10,
  }
}

export { round1k }
