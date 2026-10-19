// 遊戲規則引擎(公開介面)。所有金額、機率、保險給付都在這裡「確定性」計算。
// AI(Gemini)只負責文字與教練回饋,不會改動任何數字。
import { CARDS, useCard } from './cards.js'
import { PRODUCTS, totalPremium } from './products.js'
import {
  BOARD, ASSET_ORDER, run, cover, clamp, blankYear, netWorth, holdingsTotal, recommended,
  canIncrease, householdIncome, round1k,
} from './core.js'
import { buildScene, resolveScene, acquireProperty, upgradeProp, insureProp, sellProp } from './scenes.js'
import { propById, rentOf, propPremium, upgradeCost, RISK_NAME } from './properties.js'
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
      s.flash = id === 'home' ? '需要先擁有房子才能投保。' : id === 'auto' ? '需要先有車才能投保汽車險。' : '你已有相關傷病紀錄,這項保障已無法加保(核保限制)。'
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

// ---------- 資產格:規劃面板的行動(每年 2 個行動點)----------
export function propAction(state, propId, action) {
  return run(state, (s) => {
    const p = propById(propId)
    const mine = s.props[propId]
    if (!p || !mine) { s.flash = '你還沒有這處資產。'; return }
    if (s.phase !== 'plan') return
    if (s.ap <= 0) { s.flash = '今年的行動點已用完(每年 2 點)。'; return }
    const lines = []
    const add = (label, amount, kind) => lines.push({ label, amount, kind })
    if (action === 'upgrade') {
      if (mine.level >= 3) { s.flash = '已經是最高等級。'; return }
      upgradeProp(s, p, add)
    } else if (action === 'insure') {
      if (mine.insured) return
      insureProp(s, p, add)
    } else if (action === 'sell') sellProp(s, p, add)
    else return
    s.ap -= 1
    s.flash = lines.map((l) => l.label).join(';')
  })
}

// 收到別人付的過路費
export function receiveCash(state, amount) {
  return run(state, (s) => { s.cash += amount; s.year.tolls += amount })
}

// 拍賣成交:以原價全額買下
export function buyPropertyAt(state, propId, mode = 'cash') {
  return run(state, (s) => { acquireProperty(s, propById(propId), mode, () => {}) })
}

export function clearOps(state) {
  return run(state, (s) => { s.pendingOps = [] })
}

// ---------- 擲骰與場景 ----------

export function roll(state, world = {}) {
  return run(state, (s, rng) => {
    if (s.phase !== 'plan') return
    const dice = rng.int(1, 6)
    s.dice = dice
    s.pos = (s.pos + dice) % BOARD.length
    s.pendingOps = []
    s.scene = buildScene(s, rng, BOARD[s.pos], world)
    s.phase = 'scene'
  })
}

export function choose(state, idx, opts = {}) {
  return run(state, (s, rng) => {
    if (s.phase !== 'scene' || !s.scene) return
    const sc = s.scene
    const choice = sc.choices[idx] || sc.choices[0]
    sc.picked = idx
    const lines = []
    const add = (label, amount, kind) => lines.push({ label, amount, kind: kind || (amount >= 0 ? 'in' : 'out') })
    resolveScene(s, rng, sc, choice, add, opts)
    cover(s)
    if (s.cash < 0) add(`現金與可變現資產都用完了,缺口 ${Math.round(-s.cash / 10000)} 萬。年底前補不上就破產出局!`, 0, 'warn')
    sc.result = { lines }
    s.year.events.push({ title: sc.title, kind: sc.kind, cat: sc.cat || null, icon: sc.icon })
    s.phase = 'result'
  })
}

// ---------- AI 事件導演 ----------
// 引擎決定事件的類別與嚴重程度,AI 設計具體情境與選項;選項的「方向」由引擎轉成有上下限的數字。
const DIRECTOR_DEFS = ['flu', 'fracture', 'car_accident', 'chronic', 'cancer', 'disability', 'burnout', 'house_repair', 'house_damage', 'tuition', 'car_liability']
const CAT_NAME = { medical: '醫療', critical: '重大傷病', disability: '失能', career: '職場壓力', property: '家居意外', home: '房屋災損', family: '家庭教育', liability: '交通賠償' }
const STYLE_FX = {
  frugal: { costMult: 0.75, otherMult: 0.7, lossMult: 1.2, health: 1.3 },
  standard: { costMult: 1, otherMult: 1, lossMult: 1, health: 1 },
  premium: { costMult: 1.7, otherMult: 1.4, lossMult: 0.7, health: 0.5 },
  risky: { costMult: 0.6, otherMult: 0.6, lossMult: 0.35, health: 1.8 },
}

export function directorInfo(scene) {
  if (!scene || scene.kind !== 'event' || !DIRECTOR_DEFS.includes(scene.defId)) return null
  const b = scene.base
  const cost = (b.medical || 0) + (b.other || 0)
  const rough = cost / 600000
  const severity = rough < 0.15 ? 1 : rough < 0.5 ? 2 : rough < 1.5 ? 3 : 4
  return { cat: scene.cat, catName: CAT_NAME[scene.cat] || '生活', severity, needs: `核心事件必須保留:「${scene.title}」(${scene.story})` }
}

export function applyAiScene(state, out) {
  return run(state, (s) => {
    const sc = s.scene
    if (!sc || s.phase !== 'scene' || !out || !Array.isArray(out.choices)) return
    const choices = out.choices.filter((c) => STYLE_FX[c.style]).slice(0, 3)
    if (choices.length < 2) return
    sc.title = String(out.title || sc.title).slice(0, 30)
    sc.story = String(out.story || sc.story).slice(0, 260)
    sc.lesson = out.lesson ? String(out.lesson).slice(0, 100) : undefined
    sc.choices = choices.map((c) => ({ label: String(c.label).slice(0, 40), hint: String(c.hint || '').slice(0, 50), ...STYLE_FX[c.style], style: c.style }))
    sc.ai = true
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

    // 資產格:租金、房貸、財產險、價值變動與天災(年底被動檢查,不佔用回合)
    let rentIncome = 0, propPrem = 0, propLoan = 0, dmgCost = 0, dmgPaid = 0, propValueTotal = 0
    for (const [id, pr] of Object.entries(s.props)) {
      const p = propById(id)
      if (pr.mortgage) {
        const interest = Math.round(pr.mortgage.balance * pr.mortgage.rate)
        const pay = Math.min(pr.mortgage.payment, pr.mortgage.balance + interest)
        pr.mortgage.balance = Math.max(0, pr.mortgage.balance + interest - pay)
        pr.mortgage.yearsLeft -= 1
        propLoan += pay
        if (pr.mortgage.balance <= 0 || pr.mortgage.yearsLeft <= 0) pr.mortgage = null
      }
      let rent = Math.round(rentOf(p, pr.level) * clamp(1 + rng.normal(0, p.vol), 0.4, 1.15))
      const r = rng.next()
      let acc = 0
      for (const k of ['fire', 'quake', 'flood']) {
        acc += p.risk[k]
        if (r < acc) {
          const ratio = k === 'flood' ? rng.range(0.1, 0.25) : k === 'quake' ? rng.range(0.2, 0.45) : rng.range(0.2, 0.4)
          const cost = Math.round((pr.value * ratio) / 1000) * 1000
          dmgCost += cost
          if (pr.insured) dmgPaid += Math.round(cost * 0.9)
          rent = Math.round(rent * 0.5)
          s.year.events.push({ title: `${p.name}遭遇${RISK_NAME[k]},修繕 ${Math.round(cost / 10000)} 萬${pr.insured ? '(保險賠 9 成)' : '(沒有保險,全部自付)'}`, kind: 'event', cat: 'propdamage', icon: k === 'fire' ? '🔥' : k === 'quake' ? '🌋' : '🌊' })
          break
        }
      }
      rentIncome += rent
      if (pr.insured) propPrem += propPremium(pr.value)
      const g = (s.year.houseChange ?? clamp(rng.normal(0.03, 0.04), -0.1, 0.12)) + rng.normal(0, 0.015)
      pr.value = Math.max(100000, Math.round(pr.value * (1 + g)))
      propValueTotal += pr.value
    }
    s.year.rent = rentIncome
    s.year.propPrem = propPrem
    s.year.propDamage = dmgCost
    s.year.propPaid = dmgPaid
    s.year.propLoanPay = propLoan

    // 手牌:保費回饋、旺季租金
    let premBack = 0
    if (premiums > 0 && useCard(s, 'premium_off')) {
      const back = Math.round((premiums * 0.3) / 100) * 100
      premBack = back
      s.year.events.push({ title: `${CARDS.premium_off.name}生效:保費回饋 ${Math.round(back / 10000 * 10) / 10} 萬`, kind: 'chance', cat: 'card', icon: CARDS.premium_off.icon })
    }
    if (rentIncome > 0 && useCard(s, 'rent_boost')) {
      const extra = Math.round((rentIncome * 0.5) / 100) * 100
      rentIncome += extra
      s.year.rent = rentIncome
      s.year.events.push({ title: `${CARDS.rent_boost.name}生效:租金多收 ${Math.round(extra / 10000 * 10) / 10} 萬`, kind: 'chance', cat: 'card', icon: CARDS.rent_boost.icon })
    }

    s.cash += effIncome + rentIncome + premBack - s.expense - premiums - recurring - houseCost - loanService - propPrem - propLoan - dmgCost + dmgPaid
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
    // 投資型保單:帳戶價值隨市場波動、扣除費用;前兩年扣費特別高。
    const ilTier = PRODUCTS.invlinked.tiers[s.coverage.invlinked || 0]
    if (s.ilv > 0 || ilTier.invest) {
      s.ilv = Math.max(0, Math.round(s.ilv * (1 + m * 0.9 - 0.015)))
      if (ilTier.invest) {
        s.ilvYears += 1
        s.ilv += Math.round(ilTier.premium * (s.ilvYears <= 2 ? 0.45 : 0.75))
      }
    }
    s.carryBonus = s.newBonus
    s.newBonus = 0

    cover(s)

    // 破產:賣完投資、借到額度上限、地產與自宅都被拍賣,現金還是負的
    const broke = s.cash < 0
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
    s.ap = 2
    s.pendingOps = []
    s.year = blankYear()
    s.scene = null
    s.dice = null

    if (broke) {
      const debt = -s.cash
      s.loan += debt
      s.cash = 0
      s.ended = { reason: 'bankrupt', debt: Math.round(debt), age: s.age - 1 }
      s.phase = 'ended'
      snap.netWorth = netWorth(s)
      s.newQuests = [...(s.newQuests || []), ...updateQuests(s)]
    } else if (s.turn >= s.years) {
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
    rent: Math.round(s.year.rent),
    propPrem: s.year.propPrem,
    propDamage: s.year.propDamage,
    propPaid: s.year.propPaid,
    propLoan: s.year.propLoanPay,
    tolls: s.year.tolls,
    forced: s.year.forced || 0,
    propValueTotal: Math.round(Object.values(s.props).reduce((a, x) => a + x.value, 0)),
    propCount: Object.keys(s.props).length,
    ilv: Math.round(s.ilv || 0),
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
