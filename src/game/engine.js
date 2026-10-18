// 遊戲規則引擎:所有金額、機率、保險給付都在這裡「確定性」計算。
// AI(Gemini)只負責文字與教練回饋,不會改動任何數字。
import { Rng } from './rng.js'
import {
  EVENT_DEFS,
  MARKET_SCENARIOS,
  BONUS_SCENARIOS,
  MILESTONES,
  TIPS,
} from './events.js'
import {
  PRODUCTS,
  PRODUCT_ORDER,
  EMPTY_COVERAGE,
  premiumFor,
  totalPremium,
  payoutFor,
} from './products.js'

export const BOARD = [
  { type: 'start', label: '年度起點', icon: '🏁' },
  { type: 'event', label: '人生事件', icon: '🎴' },
  { type: 'market', label: '市場行情', icon: '📊' },
  { type: 'bonus', label: '意外之財', icon: '🎁' },
  { type: 'event', label: '人生事件', icon: '🎴' },
  { type: 'advisor', label: '理專諮詢', icon: '🧑‍💼' },
  { type: 'milestone', label: '人生里程碑', icon: '🌟' },
  { type: 'event', label: '人生事件', icon: '🎴' },
  { type: 'market', label: '市場行情', icon: '📊' },
  { type: 'rest', label: '理財小學堂', icon: '💡' },
  { type: 'event', label: '人生事件', icon: '🎴' },
  { type: 'bonus', label: '意外之財', icon: '🎁' },
  { type: 'market', label: '市場行情', icon: '📊' },
  { type: 'event', label: '人生事件', icon: '🎴' },
  { type: 'advisor', label: '理專諮詢', icon: '🧑‍💼' },
  { type: 'milestone', label: '人生里程碑', icon: '🌟' },
  { type: 'event', label: '人生事件', icon: '🎴' },
  { type: 'market', label: '市場行情', icon: '📊' },
  { type: 'bonus', label: '意外之財', icon: '🎁' },
  { type: 'event', label: '人生事件', icon: '🎴' },
]

const round1k = (n) => Math.round(n / 1000) * 1000
const clamp = (v, a, b) => Math.min(b, Math.max(a, v))

function blankYear() {
  return { shockCost: 0, recurringCost: 0, payout: 0, shocks: [], marketReturn: null, events: [] }
}

export function netWorth(s) {
  return Math.round(s.cash + s.invest + s.savings - s.debt)
}

export function createGame(char, seed = Date.now() % 100000) {
  const s = {
    seed,
    rngN: 0,
    char,
    turn: 0,
    phase: 'plan',
    age: char.age,
    pos: 0,
    dice: null,
    cash: char.cash,
    invest: char.invest,
    debt: char.debt,
    savings: 0,
    income: char.income,
    expense: char.expense,
    dependents: char.dependents,
    mortgage: char.mortgage,
    health: 100,
    coverage: { ...EMPTY_COVERAGE },
    blocked: {},
    seen: {},
    effects: [],
    recurring: [],
    carryBonus: 0,
    newBonus: 0,
    panicSells: 0,
    advisorUsed: 0,
    scene: null,
    year: blankYear(),
    lastYear: null,
    history: [],
    log: [],
    ended: null,
    flash: null,
    startNetWorth: char.cash + char.invest - char.debt,
  }
  return s
}

// 讓每個 action 都是純函式:複製 state → 執行 → 回傳新的 state。
function run(state, fn) {
  const s = structuredClone(state)
  const rng = new Rng(s.seed, s.rngN)
  s.flash = null
  fn(s, rng)
  s.rngN = rng.n
  return s
}

// ---------- 年度規劃階段(買保險、調整投資) ----------

export function recommended(s) {
  const rec = { ...s.char.rec }
  if (s.dependents > s.char.dependents) {
    rec.life = Math.max(rec.life, s.dependents >= 2 ? 3 : 2)
    rec.critical = Math.max(rec.critical, 2)
    rec.disability = Math.max(rec.disability, 2)
  }
  return rec
}

export function canIncrease(s, id) {
  if (!['medical', 'critical', 'disability'].includes(id)) return true
  return !s.blocked[id]
}

export function setCoverage(state, id, tier) {
  return run(state, (s) => {
    const cur = s.coverage[id] || 0
    if (tier > cur && !canIncrease(s, id)) {
      s.flash = '你已有相關傷病紀錄,這項保障已無法加保(核保限制)。'
      return
    }
    s.coverage[id] = tier
  })
}

export function moveMoney(state, delta) {
  return run(state, (s) => {
    if (delta > 0) {
      const d = Math.min(delta, Math.max(0, s.cash))
      s.cash -= d
      s.invest += d
    } else if (delta < 0) {
      const d = Math.min(-delta, s.invest)
      s.invest -= d
      s.cash += d
    }
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

function buildScene(s, rng, tile) {
  switch (tile.type) {
    case 'event':
      return buildEvent(s, rng)
    case 'market':
      return buildMarket(s, rng)
    case 'bonus':
      return buildBonus(s, rng)
    case 'milestone':
      return buildMilestone(s, rng)
    case 'advisor':
      return buildAdvisor(s)
    default:
      return buildTip(rng)
  }
}

function buildEvent(s, rng) {
  const inflation = Math.pow(1.025, s.turn)
  const pool = EVENT_DEFS.filter((d) => {
    if (d.minAge && s.age < d.minAge) return false
    if (d.minTurn && s.turn < d.minTurn) return false
    if (d.once && s.seen[d.id]) return false
    if (d.needsDependents && s.dependents <= 0) return false
    if (d.needsFamilyOrAge && !(s.dependents > 0 || s.age >= 45)) return false
    return true
  })
  const healthMult = 1 + (100 - s.health) / 120
  const d = rng.weighted(pool, (x) => (['medical', 'critical', 'disability'].includes(x.cat) ? x.w * healthMult : x.w))
  const rangeVal = (r) => round1k(rng.int(r[0], r[1]) * inflation)
  return {
    kind: 'event',
    defId: d.id,
    cat: d.cat,
    icon: d.icon,
    tone: d.tone,
    title: d.title,
    story: d.story,
    base: {
      medical: d.medical ? rangeVal(d.medical) : 0,
      other: d.other ? rangeVal(d.other) : 0,
      loss: d.loss || null,
      recurring: d.recurring ? { ...d.recurring, amount: round1k(d.recurring.amount * inflation) } : null,
      healthHit: d.healthHit || 0,
    },
    choices: d.choices.map((c) => ({ ...c })),
    ai: false,
  }
}

function buildMarket(s, rng) {
  const m = rng.weighted(MARKET_SCENARIOS)
  const up = m.ret >= 0
  return {
    kind: 'market',
    defId: m.id,
    icon: m.icon,
    tone: up ? 'good' : 'bad',
    title: m.title,
    story: m.story,
    base: { ret: m.ret, rebound: m.rebound },
    choices: [
      { label: '繼續持有,耐心等待', hint: '不動作', tag: 'hold' },
      { label: up ? '獲利了結,全部賣出' : '先賣出,避免再跌', hint: '把投資部位轉成現金', tag: 'sell' },
      { label: '趁機加碼(現金的 30%)', hint: '提高投資部位', tag: 'buy' },
    ],
    ai: false,
  }
}

function buildBonus(s, rng) {
  const b = rng.pick(BONUS_SCENARIOS)
  const amount = b.pct
    ? round1k(s.income * rng.range(b.pct[0], b.pct[1]))
    : round1k(rng.int(b.amount[0], b.amount[1]))
  return {
    kind: 'bonus',
    defId: b.id,
    icon: b.icon,
    tone: 'good',
    title: b.title,
    story: `${b.story}(約 ${Math.round(amount / 10000)} 萬元)`,
    base: { amount },
    choices: [
      { label: '全部存進現金', hint: '提高緊急預備金', tag: 'save' },
      { label: '一半存起來、一半投資', hint: '分散運用', tag: 'split' },
    ],
    ai: false,
  }
}

function buildMilestone(s, rng) {
  const pool = MILESTONES.filter((m) => !m.cond || m.cond(s))
  const m = rng.weighted(pool)
  return {
    kind: 'milestone',
    defId: m.id,
    icon: m.icon,
    tone: 'neutral',
    title: m.title,
    story: m.story,
    base: {},
    choices: m.choices.map((c) => ({ ...c })),
    ai: false,
  }
}

function buildTip(rng) {
  const t = rng.pick(TIPS)
  return {
    kind: 'tip',
    defId: 'tip',
    icon: t.icon,
    tone: 'neutral',
    title: t.title,
    story: t.story,
    base: {},
    choices: [{ label: '學到了', hint: '', tag: 'ok' }],
    ai: false,
  }
}

function buildAdvisor(s) {
  const analysis = analyzeGaps(s)
  const top = analysis.gaps[0]
  return {
    kind: 'advisor',
    defId: 'advisor',
    icon: '🧑‍💼',
    tone: 'neutral',
    title: '理專諮詢時間',
    story: top
      ? `理專幫你做了保障健檢,最大的缺口是「${PRODUCTS[top.id].name}」。`
      : '理專檢視你的保障配置,目前沒有明顯的缺口,做得很好!',
    base: { analysis },
    choices: top
      ? [
          { label: '採納建議,補強缺口', hint: '自動加保最重要的 2 項', tag: 'accept' },
          { label: '我自己決定', hint: '回到規劃再調整', tag: 'skip' },
        ]
      : [{ label: '很好,繼續前進', hint: '', tag: 'skip' }],
    ai: false,
  }
}

// ---------- 保障缺口分析(理專諮詢、教練、評分共用) ----------

const SEVERITY = (s) => ({
  life: s.dependents > 0 ? 5 : s.char.family ? 3 : 2,
  disability: s.char.soleEarner ? 4.5 : 3,
  critical: 3.5,
  medical: 2.5,
  ltc: s.age >= 45 ? 3 : 1,
  annuity: 1,
})

export function analyzeGaps(s) {
  const rec = recommended(s)
  const sev = SEVERITY(s)
  const gaps = []
  for (const id of PRODUCT_ORDER) {
    const have = s.coverage[id] || 0
    const need = rec[id] || 0
    if (have < need) {
      gaps.push({
        id,
        have,
        need,
        severity: sev[id] * (need - have),
        blocked: !canIncrease(s, id),
        text: `${PRODUCTS[id].name}:目前「${PRODUCTS[id].tiers[have].label}」,建議至少「${PRODUCTS[id].tiers[need].label}」`,
      })
    }
  }
  gaps.sort((a, b) => b.severity - a.severity)
  const emergencyMonths = s.cash / (s.expense / 12)
  const premium = totalPremium(s.coverage, s.age)
  return {
    gaps,
    emergencyMonths: Math.round(emergencyMonths * 10) / 10,
    premiumRatio: Math.round((premium / s.income) * 1000) / 10,
    premium,
  }
}

// ---------- 決策與結算 ----------

export function choose(state, idx) {
  return run(state, (s, rng) => {
    if (s.phase !== 'scene' || !s.scene) return
    const scene = s.scene
    const choice = scene.choices[idx] || scene.choices[0]
    scene.picked = idx
    if (scene.kind === 'event') s.seen[scene.defId] = true
    const lines = []
    const add = (label, amount, kind) => lines.push({ label, amount, kind: kind || (amount >= 0 ? 'in' : 'out') })

    if (scene.kind === 'event') resolveEvent(s, scene, choice, add)
    else if (scene.kind === 'market') resolveMarket(s, scene, choice, add)
    else if (scene.kind === 'bonus') resolveBonus(s, scene, choice, add)
    else if (scene.kind === 'milestone') resolveMilestone(s, scene, choice, add)
    else if (scene.kind === 'advisor') resolveAdvisor(s, scene, choice, add)

    cover(s)
    scene.result = { lines }
    s.year.events.push({ title: scene.title, kind: scene.kind, cat: scene.cat || null, icon: scene.icon })
    s.phase = 'result'
  })
}

// 現金不足時依序:賣出投資 → 舉債。
function cover(s) {
  if (s.cash >= 0) return
  const sell = Math.min(s.invest, -s.cash)
  s.invest -= sell
  s.cash += sell
  if (s.cash < 0) {
    s.debt += -s.cash
    s.cash = 0
  }
}

function resolveEvent(s, scene, choice, add) {
  const b = scene.base
  const medicalCost = Math.round((b.medical || 0) * (choice.costMult ?? 1))
  const otherCost = Math.round((b.other || 0) * (choice.otherMult ?? 1)) + (choice.other || 0)
  const loss = choice.loss || b.loss
  const lossRatio = loss ? loss.ratio * (choice.lossMult ?? 1) : 0
  const lossYears = loss ? loss.years : 0

  if (scene.cat === 'death') return resolveDeath(s, scene, add)

  const payout = payoutFor(s.coverage, {
    cat: scene.cat,
    medicalCost,
    income: s.income,
    years: lossYears || 3,
  })

  if (medicalCost) {
    s.cash -= medicalCost
    add('醫療與治療費用', -medicalCost)
  }
  if (otherCost) {
    s.cash -= otherCost
    add(scene.cat === 'family' ? '教育費用' : '額外支出', -otherCost)
  }
  if (payout.medical) {
    s.cash += payout.medical
    add('醫療險給付', payout.medical, 'cover')
  }
  if (payout.lump) {
    s.cash += payout.lump
    add('重大傷病險給付', payout.lump, 'cover')
  }
  if (payout.disability) {
    s.cash += payout.disability
    add('失能所得補償給付', payout.disability, 'cover')
  }
  if (payout.ltc) {
    s.cash += payout.ltc
    add('長照險給付', payout.ltc, 'cover')
  }

  if (lossRatio > 0) {
    s.effects.push({ ratio: lossRatio, yearsLeft: lossYears, label: scene.title })
    add(`收入中斷:每年少 ${Math.round(lossRatio * 100)}%,持續 ${lossYears} 年`, 0, 'note')
  }
  const rec = b.recurring
  if (rec) {
    const amount = Math.round(rec.amount * (choice.recurMult ?? 1))
    s.recurring.push({ amount, yearsLeft: rec.years, label: rec.label })
    add(`${rec.label}:每年 ${Math.round(amount / 10000)} 萬,持續 ${rec.years} 年`, 0, 'note')
  }
  if (choice.tag === 'upskill') s.income = Math.round(s.income * 1.06)

  const hit = (b.healthHit || 0) * (choice.health ?? 1)
  if (hit) s.health = Math.max(5, s.health - hit)
  if (scene.cat === 'critical' || scene.cat === 'disability') {
    s.blocked.critical = true
    s.blocked.disability = true
    s.blocked.medical = true
    add('已有傷病紀錄:相關保障日後無法再加保', 0, 'warn')
  }

  s.year.shockCost += medicalCost + otherCost
  s.year.payout += payout.total
  s.year.shocks.push({ cat: scene.cat, medicalCost, income: s.income, years: lossYears || 3 })
}

function resolveDeath(s, scene, add) {
  const payout = payoutFor(s.coverage, { cat: 'death' })
  const yearsSupport = s.dependents > 0 ? 12 : 5
  const need = s.expense * yearsSupport + s.mortgage + s.debt
  const funds = s.cash + s.invest + s.savings + payout.life
  s.year.payout += payout.life
  s.year.shocks.push({ cat: 'death', medicalCost: 0, income: s.income, years: 0 })
  add('壽險身故給付', payout.life, 'cover')
  add('家人未來生活所需(生活費+房貸+負債)', -Math.round(need), 'out')
  add('家人可動用資金(含保險金)', Math.round(funds), 'in')
  s.ended = {
    reason: 'death',
    need: Math.round(need),
    funds: Math.round(funds),
    ratio: Math.round((funds / need) * 100) / 100,
    payout: payout.life,
    yearsSupport,
  }
}

function resolveMarket(s, scene, choice, add) {
  const { ret, rebound } = scene.base
  if (choice.tag === 'sell' && s.invest > 0) {
    const factor = ret < 0 ? 1 + ret * 0.6 : 1 + ret * 0.5
    const realized = Math.round(s.invest * factor)
    add(`賣出投資部位(以 ${(factor * 100 - 100).toFixed(0)}% 成交)`, realized - s.invest, realized >= s.invest ? 'in' : 'out')
    s.cash += realized
    s.invest = 0
    s.year.marketReturn = 0
    s.newBonus = 0
    if (ret < 0) s.panicSells++
    add('已轉為現金,錯過後續漲跌', 0, 'note')
    return
  }
  if (choice.tag === 'buy') {
    const amt = Math.round(Math.max(0, Math.min(s.cash * 0.3, s.cash - s.expense * 0.25)) / 1000) * 1000
    if (amt > 0) {
      s.cash -= amt
      s.invest += amt
      add('加碼投資', -amt, 'note')
    } else add('現金不足,無法加碼', 0, 'note')
  } else {
    add('選擇持有,等待市場', 0, 'note')
  }
  s.year.marketReturn = ret
  s.newBonus = rebound
  add(`今年市場整體 ${ret >= 0 ? '+' : ''}${Math.round(ret * 100)}%(於年底結算)`, 0, ret >= 0 ? 'in' : 'out')
}

function resolveBonus(s, scene, choice, add) {
  const amount = scene.base.amount
  if (choice.tag === 'split') {
    const half = Math.round(amount / 2)
    s.cash += amount - half
    s.invest += half
    add('存入現金', amount - half)
    add('投入投資', half)
  } else {
    s.cash += amount
    add('存入現金', amount)
  }
}

function resolveMilestone(s, scene, choice, add) {
  if (scene.defId === 'promotion') {
    s.income = Math.round(s.income * (choice.incomeMult ?? 1.12))
    s.expense = Math.round(s.expense * (choice.expenseMult ?? 1))
    add(`年收入調整為約 ${Math.round(s.income / 10000)} 萬`, 0, 'in')
  } else if (scene.defId === 'newchild') {
    s.dependents += 1
    s.cash -= 100000
    s.expense += 180000
    add('新生兒一次性花費', -100000)
    add('每年生活支出增加 18 萬', 0, 'note')
    add('責任變重了,記得檢視壽險與失能保障', 0, 'warn')
  } else if (scene.defId === 'creep') {
    s.expense = Math.round(s.expense * (choice.expenseMult ?? 1))
    add(choice.expenseMult > 1 ? '每年生活支出增加 8%' : '維持原本的生活支出', 0, 'note')
  }
}

function resolveAdvisor(s, scene, choice, add) {
  s.advisorUsed++
  if (choice.tag !== 'accept') {
    add('你決定自己規劃', 0, 'note')
    return
  }
  const gaps = analyzeGaps(s).gaps.filter((g) => !g.blocked).slice(0, 2)
  if (!gaps.length) add('目前沒有可以補強的項目', 0, 'note')
  for (const g of gaps) {
    s.coverage[g.id] = g.need
    add(`已加保:${PRODUCTS[g.id].name}(${PRODUCTS[g.id].tiers[g.need].label})`, 0, 'cover')
  }
}

// ---------- 年度結算 ----------

export function endYear(state) {
  return run(state, (s, rng) => {
    if (s.phase !== 'result') return

    // 死亡:直接結束,不再結算年度。
    if (s.ended && s.ended.reason === 'death') {
      s.history.push(snapshot(s, 0, 0, 0, 0, 0, 0))
      s.phase = 'ended'
      return
    }

    // 收入:自由工作者波動大。
    let income = s.income
    if (s.char.volatility > 0.05) {
      income = income * clamp(1 + rng.normal(0, s.char.volatility), 0.45, 1.5)
    } else {
      income = income * clamp(1 + rng.normal(0, s.char.volatility), 0.9, 1.1)
    }
    const lossSum = clamp(s.effects.reduce((a, e) => a + e.ratio, 0), 0, 1)
    const effIncome = Math.round(income * (1 - lossSum))
    s.effects.forEach((e) => (e.yearsLeft -= 1))
    s.effects = s.effects.filter((e) => e.yearsLeft > 0)

    const recurring = s.recurring.reduce((a, r) => a + r.amount, 0)
    s.recurring.forEach((r) => (r.yearsLeft -= 1))
    s.recurring = s.recurring.filter((r) => r.yearsLeft > 0)

    const premiums = totalPremium(s.coverage, s.age)
    const annuityTier = PRODUCTS.annuity.tiers[s.coverage.annuity || 0]
    const savingsIn = annuityTier.saving ? annuityTier.premium : 0
    s.savings = Math.round(s.savings * 1.02 + savingsIn * 0.9)

    // 負債利息
    if (s.debt > 0) s.debt = Math.round(s.debt * 1.06)

    s.cash += effIncome - s.expense - premiums - recurring
    s.year.recurringCost = recurring

    // 投資報酬
    const base = clamp(rng.normal(0.04, 0.09), -0.25, 0.25)
    const ret = (s.year.marketReturn ?? base) + s.carryBonus
    s.invest = Math.round(Math.max(0, s.invest * (1 + ret)))
    s.carryBonus = s.newBonus
    s.newBonus = 0

    cover(s)
    // 現金為正就先還債。
    if (s.cash > 0 && s.debt > 0) {
      const pay = Math.min(s.cash, s.debt)
      s.cash -= pay
      s.debt -= pay
    }

    const snap = snapshot(s, effIncome, income, premiums, recurring, ret, savingsIn)
    s.history.push(snap)
    s.lastYear = snap

    // 下一年
    s.turn += 1
    s.age += 1
    s.income = Math.round(s.income * 1.02)
    s.expense = Math.round(s.expense * 1.02)
    s.health = Math.min(100, s.health + 5)
    s.year = blankYear()
    s.scene = null
    s.dice = null

    if (s.turn >= s.char.years) {
      s.ended = { reason: 'complete' }
      s.phase = 'ended'
    } else {
      s.phase = 'plan'
    }
  })
}

function snapshot(s, effIncome, grossIncome, premiums, recurring, ret, savingsIn) {
  return {
    turn: s.turn,
    age: s.age,
    effIncome,
    grossIncome: Math.round(grossIncome),
    expense: s.expense,
    premiums,
    recurring,
    ret,
    savingsIn,
    shockCost: s.year.shockCost,
    payout: s.year.payout,
    shocks: s.year.shocks,
    events: s.year.events,
    cash: Math.round(s.cash),
    invest: Math.round(s.invest),
    savings: Math.round(s.savings),
    debt: Math.round(s.debt),
    netWorth: netWorth(s),
    coverage: { ...s.coverage },
    health: Math.round(s.health),
  }
}

// ---------- 平行人生對照(沒保險 / 你的配置 / 建議配置) ----------
// 使用「現金緩衝」模型:起始現金 + 累計(收入 - 支出 - 事件花費 - 長期支出 + 保險給付 - 保費)。
// 完全相同的事件序列,只替換保障配置,所以可以公平比較。
export function counterfactual(s) {
  const rec = recommended(s)
  const series = []
  let none = s.char.cash
  let yours = s.char.cash
  let recBuf = s.char.cash
  const recCoverage = { ...rec }
  for (const h of s.history) {
    const gross = h.effIncome - h.expense - h.shockCost - h.recurring
    none += gross
    yours += gross + h.payout - h.premiums
    let recPay = 0
    for (const sh of h.shocks) recPay += payoutFor(recCoverage, sh).total
    recBuf += gross + recPay - totalPremium(recCoverage, h.age)
    series.push({
      age: h.age,
      none: Math.round(none),
      yours: Math.round(yours),
      rec: Math.round(recBuf),
    })
  }
  return series
}

// ---------- 評分 ----------

export function computeScore(s) {
  const years = Math.max(1, s.history.length)
  const rec = recommended(s)
  const debtYears = s.history.filter((h) => h.debt > 0).length
  const avgMonths =
    s.history.reduce((a, h) => a + h.cash / (h.expense / 12), 0) / years
  const resilience =
    40 *
    clamp(1 - (debtYears / years) * 1.5, 0, 1) *
    (0.7 + 0.3 * clamp(avgMonths / 6, 0, 1))

  const recItems = PRODUCT_ORDER.filter((id) => rec[id] > 0)
  const prot =
    recItems.reduce((a, id) => a + Math.min((s.coverage[id] || 0) / rec[id], 1), 0) /
    Math.max(1, recItems.length)
  const avgPremium = s.history.reduce((a, h) => a + h.premiums, 0) / years
  const premiumRatio = avgPremium / s.char.income
  const over = clamp((premiumRatio - 0.18) / 0.1, 0, 1)
  const protection = 30 * prot - 6 * over

  const end = s.history[s.history.length - 1]
  const nw = end ? end.netWorth : netWorth(s)
  const growth =
    20 * clamp((nw - s.startNetWorth) / (s.char.income * s.char.years * 0.25), 0, 1)

  const behavior = clamp(10 - 4 * s.panicSells, 2, 10)

  let total = Math.round(resilience + protection + growth + behavior)
  let family = null
  if (s.ended && s.ended.reason === 'death') {
    total = Math.round(clamp(s.ended.ratio, 0, 1.1) * 85)
    family = s.ended
  }
  const grade = total >= 85 ? 'S' : total >= 72 ? 'A' : total >= 58 ? 'B' : total >= 40 ? 'C' : 'D'
  let archetype = '成長中的規劃者'
  if (prot < 0.4) archetype = '裸奔冒險家'
  else if (premiumRatio > 0.22) archetype = '保障控'
  else if (total >= 80) archetype = '穩健守護者'
  if (family) archetype = family.ratio >= 1 ? '家人的靠山' : '來不及的守護'

  return {
    total,
    grade,
    archetype,
    parts: {
      resilience: Math.round(resilience),
      protection: Math.round(protection),
      growth: Math.round(growth),
      behavior: Math.round(behavior),
    },
    debtYears,
    avgEmergencyMonths: Math.round(avgMonths * 10) / 10,
    premiumRatio: Math.round(premiumRatio * 1000) / 10,
    panicSells: s.panicSells,
    netWorth: nw,
    family,
  }
}

// 給 AI 教練的「事實摘要」:全部是引擎算好的數字。
export function buildReport(s) {
  const score = computeScore(s)
  const cf = counterfactual(s)
  const last = cf[cf.length - 1]
  const rec = recommended(s)
  return {
    character: {
      name: s.char.name,
      title: s.char.title,
      startAge: s.char.age,
      dependents: s.dependents,
      soleEarner: s.char.soleEarner,
    },
    years: s.history.length,
    ended: s.ended,
    score,
    coverage: PRODUCT_ORDER.map((id) => ({
      product: PRODUCTS[id].name,
      yours: PRODUCTS[id].tiers[s.coverage[id] || 0].label,
      recommended: PRODUCTS[id].tiers[rec[id] || 0].label,
    })),
    events: s.history.flatMap((h) =>
      h.events.map((e) => ({ age: h.age, title: e.title, kind: e.kind })),
    ),
    claims: s.history.reduce((a, h) => a + h.payout, 0),
    shocksCost: s.history.reduce((a, h) => a + h.shockCost, 0),
    counterfactual: last
      ? { none: last.none, yours: last.yours, recommended: last.rec }
      : null,
  }
}
