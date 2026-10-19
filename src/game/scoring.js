// 評分、平行人生對照與給 AI 的事實摘要。
import { PRODUCTS, PRODUCT_ORDER, payoutFor, totalPremium } from './products.js'
import { clamp, netWorth, recommended, householdIncome } from './core.js'
import { questScore } from './quests.js'

// 平行人生:同一串人生事件,只替換保障配置。
// 作法:以「實際淨資產」為基準,逐年加上(替代配置的給付 - 實際給付)與(實際保費 - 替代配置保費)。
// 儲蓄年金險視為儲蓄而非保障成本,三條線一律沿用實際的年金配置。
export function counterfactual(s) {
  let dNone = 0
  let dRec = 0
  const series = []
  for (const h of s.history) {
    const keepAnnuity = { annuity: h.coverage.annuity || 0, invlinked: h.coverage.invlinked || 0 }
    const cov = (base) => ({ ...base, ...keepAnnuity })
    const none = cov({})
    const rec = cov(h.rec)
    const pay = (c) => h.shocks.reduce((a, sh) => a + payoutFor(c, sh).total, 0)
    const prem = (c) => totalPremium(c, h.age)
    // 資產格的財產險與天災,三條線沿用實際結果(另在結算頁單獨說明)
    dNone += (pay(none) - h.payout) - (prem(none) - h.premiums)
    dRec += (pay(rec) - h.payout) - (prem(rec) - h.premiums)
    series.push({
      age: h.age,
      none: Math.round(h.netWorth + dNone),
      yours: Math.round(h.netWorth),
      rec: Math.round(h.netWorth + dRec),
    })
  }
  return series
}

export function computeScore(s) {
  const years = Math.max(1, s.history.length)
  const shortfallYears = s.history.filter((h) => h.borrowed > 0).length
  const avgMonths = s.history.reduce((a, h) => a + h.monthsCash, 0) / years
  const resilience =
    35 * clamp(1 - (shortfallYears / years) * 2, 0, 1) * (0.7 + 0.3 * clamp(avgMonths / 6, 0, 1))

  const prot = s.history.reduce((a, h) => a + h.protRatio, 0) / years
  const avgPremium = s.history.reduce((a, h) => a + h.premiums, 0) / years
  const avgIncome = s.history.reduce((a, h) => a + h.effIncome, 0) / years || 1
  const premiumRatio = avgPremium / avgIncome
  const over = clamp((premiumRatio - 0.18) / 0.1, 0, 1)
  const protection = 25 * prot - 5 * over

  const end = s.history[s.history.length - 1]
  const nw = end ? end.netWorth : netWorth(s)
  const growth = 20 * clamp((nw - s.startNetWorth) / ((s.startIncome || s.career.income) * s.years * 0.7), 0, 1)
  const quests = questScore(s)

  const behavior = clamp(6 + Math.min(4, s.quizRight) - 3 * s.panicSells, 0, 10)

  let total = Math.round(resilience + protection + growth + behavior + quests)
  let family = null
  if (s.ended && s.ended.reason === 'death') {
    total = Math.round(clamp(s.ended.ratio, 0, 1.1) * 85)
    family = s.ended
  }
  const bankrupt = s.ended?.reason === 'bankrupt'
  if (bankrupt) total = Math.min(Math.round(total * 0.5), 39)
  const grade = total >= 85 ? 'S' : total >= 72 ? 'A' : total >= 58 ? 'B' : total >= 40 ? 'C' : 'D'
  let archetype = '成長中的規劃者'
  if (prot < 0.4) archetype = '裸奔冒險家'
  else if (premiumRatio > 0.22) archetype = '保障控'
  else if (total >= 80) archetype = '穩健守護者'
  if (bankrupt) archetype = '破產出局'
  if (family) archetype = family.ratio >= 1 ? '家人的靠山' : '來不及的守護'

  return {
    total, grade, archetype,
    parts: {
      resilience: Math.round(resilience),
      protection: Math.round(protection),
      growth: Math.round(growth),
      behavior: Math.round(behavior),
      quests,
    },
    shortfallYears,
    avgEmergencyMonths: Math.round(avgMonths * 10) / 10,
    premiumRatio: Math.round(premiumRatio * 1000) / 10,
    panicSells: s.panicSells,
    quiz: `${s.quizRight}/${s.quizTotal}`,
    netWorth: nw,
    family,
  }
}

function lifeSummary(s) {
  return {
    name: s.player.name,
    career: s.player.title,
    background: s.player.background,
    style: s.player.style,
    age: s.age,
    married: !!s.partner,
    dependents: s.dependents,
    ownsHouse: !!s.house,
  }
}

function coverageTable(s) {
  const rec = recommended(s)
  return PRODUCT_ORDER.filter((id) => id !== 'home' || s.house).map((id) => ({
    product: PRODUCTS[id].name,
    yours: PRODUCTS[id].tiers[s.coverage[id] || 0].label,
    recommended: PRODUCTS[id].tiers[rec[id] || 0].label,
  }))
}

// 給 AI 教練的「事實摘要」:全部是引擎算好的數字。
export function buildReport(s) {
  const score = computeScore(s)
  const cf = counterfactual(s)
  const last = cf[cf.length - 1]
  const h = s.history
  return {
    character: lifeSummary(s),
    years: h.length,
    ended: s.ended,
    score,
    coverage: coverageTable(s),
    events: h.flatMap((x) => x.events.filter((e) => ['event', 'chance', 'milestone'].includes(e.kind)).map((e) => ({ age: x.age, title: e.title, kind: e.kind }))),
    claims: h.reduce((a, x) => a + x.payout, 0),
    shocksCost: h.reduce((a, x) => a + x.shockCost, 0),
    netWorthPath: [h[0], h[Math.floor(h.length / 2)], h[h.length - 1]].filter(Boolean).map((x) => ({ age: x.age, netWorth: x.netWorth })),
    holdingsNow: s.hold,
    loanNow: s.loan,
    counterfactual: last ? { none: last.none, yours: last.yours, recommended: last.rec } : null,
  }
}

// 人生階段報告(中場分析):目前的財務體質與風險暴露。
export function buildStageReport(s) {
  const h = s.history
  const recent = h.slice(-8)
  const rec = recommended(s)
  return {
    character: lifeSummary(s),
    stageAge: s.age,
    net: netWorth(s),
    cash: Math.round(s.cash),
    monthsCash: Math.round((s.cash / (s.expense / 12)) * 10) / 10,
    holdings: s.hold,
    loan: Math.round(s.loan),
    houseEquity: s.house ? Math.round(s.house.value - s.house.balance) : 0,
    householdIncome: Math.round(householdIncome(s)),
    premiumPct: Math.round((totalPremium(s.coverage, s.age) / householdIncome(s)) * 1000) / 10,
    coverage: coverageTable(s),
    recommendedNow: rec,
    recentEvents: recent.flatMap((x) => x.events.filter((e) => ['event', 'chance', 'milestone'].includes(e.kind)).map((e) => ({ age: x.age, title: e.title }))),
    recentClaims: recent.reduce((a, x) => a + x.payout, 0),
    shortfallYears: recent.filter((x) => x.borrowed > 0).length,
    panicSells: s.panicSells,
  }
}

// 資產格的總結:收租、天災與財產險的效果
export function propSummary(s) {
  const h = s.history
  const rent = h.reduce((a, x) => a + (x.rent || 0), 0)
  const damage = h.reduce((a, x) => a + (x.propDamage || 0), 0)
  const paid = h.reduce((a, x) => a + (x.propPaid || 0), 0)
  const prem = h.reduce((a, x) => a + (x.propPrem || 0), 0)
  const tolls = h.reduce((a, x) => a + (x.tolls || 0), 0)
  const owned = Object.keys(s.props).length
  return { rent, damage, paid, prem, tolls, owned, everOwned: rent > 0 || owned > 0 }
}
