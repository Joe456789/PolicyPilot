// 10 分鐘情境挑戰:給一位客戶的完整資料與保費預算,在時間內配置保障。
// 交卷後用「壓力測試」評分:幾種常見的風險真的發生時,保險能補上多少缺口(全部用 payoutFor 規則計算)。
// 同時用窮舉找出「預算內的最佳配置」當對照。客戶與 AI 客戶對練共用(clientId)。
import { PRODUCTS, premiumFor, payoutFor } from './products.js'

export const CASE_MINUTES = 10

// scenarios:這位客戶未來 10 年最可能遇到的風險(w = 重要度)。loss = 這件事讓家裡損失多少(醫療費 + 收入損失 + 留給家人的缺口)
export const CASES = [
  {
    id: 'newhome', clientId: 'newhome', icon: '🏠', title: '剛辦房貸的新手爸爸',
    facts: ['32 歲工程師,年收入 110 萬;太太懷孕中,生完想先在家帶小孩', '剛辦 800 萬房貸、30 年;每月房貸約 3 萬', '只有公司團保(離職就沒了)', '每月保費預算 3,500 元'],
    age: 32, income: 1100000, mortgage: 8000000, budget: 3500,
    products: ['medical', 'critical', 'disability', 'accident', 'life', 'mortgage', 'invlinked'],
    avoid: ['invlinked'],
    scenarios: [
      { id: 'hospital', title: '住院開刀', w: 2, shock: { cat: 'medical', medicalCost: 300000 }, loss: 300000 },
      { id: 'cancer', title: '罹患癌症', w: 2, shock: { cat: 'critical', medicalCost: 900000, cancer: true, years: 2 }, loss: 900000 + 1100000 * 0.4 * 2 },
      { id: 'disabled', title: '重病失能,3 年無法工作', w: 3, shock: { cat: 'disability', medicalCost: 150000, years: 3 }, loss: 150000 + 1100000 * 0.6 * 3 },
      { id: 'death', title: '不幸身故(太太在家帶小孩)', w: 4, shock: { cat: 'death', mortgage: 8000000 }, loss: 8000000 + 600000 * 5 },
    ],
  },
  {
    id: 'retiree', clientId: 'retiree', icon: '👵', title: '定存到期的退休族',
    facts: ['63 歲退休會計,每月勞保年金約 2 萬、生活費約 3 萬', '定存 600 萬下個月到期,是全部的養老錢', '有高血壓;先生已過世,兒子在國外', '風險屬性:保守型;每月保費預算 7,000 元'],
    age: 63, income: 240000, mortgage: 0, budget: 7000,
    products: ['medical', 'ltc', 'accident', 'annuity', 'invlinked'],
    avoid: ['invlinked'],
    scenarios: [
      { id: 'care', title: '需要長期照顧 3 年', w: 3, shock: { cat: 'ltc' }, loss: 1800000 },
      { id: 'hospital', title: '住院開刀', w: 2, shock: { cat: 'medical', medicalCost: 350000 }, loss: 350000 },
      { id: 'fall', title: '跌倒骨折', w: 1, shock: { cat: 'medical', medicalCost: 120000, accident: true }, loss: 120000 },
    ],
  },
  {
    id: 'young', clientId: 'young', icon: '🛵', title: '想開始投資的小資族',
    facts: ['26 歲行銷專員,月薪 4.2 萬、每月可存約 1 萬', '每天騎機車通勤', '只有一張金額很小的住院日額', '每月保費預算 1,500 元'],
    age: 26, income: 504000, mortgage: 0, budget: 1500,
    products: ['medical', 'accident', 'disability', 'critical', 'annuity', 'invlinked'],
    avoid: ['annuity', 'invlinked'],
    scenarios: [
      { id: 'crash', title: '機車事故骨折', w: 3, shock: { cat: 'medical', medicalCost: 180000, accident: true }, loss: 180000 },
      { id: 'disabled', title: '意外失能,2 年無法工作', w: 3, shock: { cat: 'disability', medicalCost: 120000, years: 2, accident: true }, loss: 120000 + 504000 * 0.6 * 2 },
      { id: 'hospital', title: '生病住院', w: 2, shock: { cat: 'medical', medicalCost: 150000 }, loss: 150000 },
    ],
  },
  {
    id: 'family', clientId: 'family', icon: '👨‍👩‍👧‍👦', title: '雙薪家庭的業務主管',
    facts: ['41 歲業務主管,年收入 150 萬(一半是獎金);太太年收 60 萬', '兩個小孩 8 歲、5 歲;房貸還有 600 萬', '已有實支實付醫療險;五年前的投資型保單壽險保額只有 240 萬', '每月保費預算 5,000 元(不含原本的保單)'],
    age: 41, income: 1500000, mortgage: 6000000, budget: 5000,
    products: ['critical', 'disability', 'life', 'mortgage', 'ltc', 'invlinked'],
    avoid: ['invlinked'],
    have: { medical: 1 },
    scenarios: [
      { id: 'stroke', title: '中風,治療 2 年', w: 3, shock: { cat: 'critical', medicalCost: 800000, years: 2 }, loss: 800000 + 1500000 * 0.5 * 2 },
      { id: 'disabled', title: '失能,3 年無法工作', w: 3, shock: { cat: 'disability', medicalCost: 200000, years: 3 }, loss: 200000 + 1500000 * 0.6 * 3 },
      { id: 'death', title: '不幸身故', w: 3, shock: { cat: 'death', mortgage: 6000000 }, loss: 6000000 + 1000000 * 10 - 2400000 },
    ],
  },
]

export const caseById = (id) => CASES.find((c) => c.id === id) || null

const ctxOf = (cs) => ({ mortgage: cs.mortgage })
export const monthly = (cs, plan) => Math.round(cs.products.reduce((a, id) => a + premiumFor(id, plan[id] || 0, cs.age, ctxOf(cs)), 0) / 12)

// 每個情境:損失、保險給付、自付缺口
export function stressTest(cs, plan) {
  const cov = { ...(cs.have || {}), ...plan }
  return cs.scenarios.map((sc) => {
    const p = payoutFor(cov, { income: cs.income, ...sc.shock }).total
    const pay = Math.min(p, sc.loss)
    return { id: sc.id, title: sc.title, w: sc.w, loss: Math.round(sc.loss), payout: Math.round(pay), gap: Math.round(sc.loss - pay), ratio: sc.loss ? pay / sc.loss : 1 }
  })
}

// 評分:保障 70 + 預算 20 + 適合度 10
export function evaluatePlan(cs, plan) {
  const rows = stressTest(cs, plan)
  const wsum = rows.reduce((a, r) => a + r.w, 0)
  const protect = rows.reduce((a, r) => a + r.w * r.ratio, 0) / wsum
  const prem = monthly(cs, plan)
  const over = prem > cs.budget ? prem / cs.budget - 1 : 0
  const budgetScore = Object.values(plan).some((v) => v > 0) ? Math.max(0, Math.round(20 - over * 40)) : 0
  const avoided = (cs.avoid || []).filter((id) => (plan[id] || 0) > 0)
  // 什麼都沒買,預算與適合度就不給分(不然「不買」也能拿 30 分)
  const any = Object.values(plan).some((v) => v > 0)
  const fitScore = any ? Math.max(0, 10 - avoided.length * 5) : 0
  const protectScore = Math.round(protect * 70)
  return { rows, protect, premium: prem, total: protectScore + budgetScore + fitScore, parts: { protect: protectScore, budget: budgetScore, fit: fitScore }, avoided, overBudget: prem > cs.budget }
}

// 預算內的最佳配置:窮舉每項商品的每個級距(最多幾千種組合,瞬間算完)
export function bestPlan(cs) {
  const ids = cs.products.filter((id) => !(cs.blocked || []).includes(id) && !(cs.avoid || []).includes(id))
  let best = null
  const plan = {}
  const walk = (k) => {
    if (k === ids.length) {
      if (monthly(cs, plan) > cs.budget) return
      const ev = evaluatePlan(cs, plan)
      if (!best || ev.total > best.ev.total || (ev.total === best.ev.total && ev.premium < best.ev.premium)) best = { plan: { ...plan }, ev }
      return
    }
    const id = ids[k]
    for (let tier = 0; tier < PRODUCTS[id].tiers.length; tier++) { plan[id] = tier; walk(k + 1) }
    delete plan[id]
  }
  walk(0)
  return best
}
