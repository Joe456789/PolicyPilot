// 保障商品:僅為教學用的簡化模型,非真實商品條款或費率。
// tiers[0] 一律代表「未投保」。premium 為年繳保費(NT$),age 加成見 premiumFor()。
export const PRODUCTS = {
  medical: {
    id: 'medical',
    name: '醫療險',
    sub: '實支實付',
    icon: '🏥',
    blurb: '住院、手術的醫療費用,實支實付給付 70%(每次上限 80 萬)。',
    tiers: [
      { label: '未投保', premium: 0 },
      { label: '實支實付', premium: 12000, rate: 0.7, cap: 800000 },
    ],
  },
  critical: {
    id: 'critical',
    name: '重大傷病險',
    sub: '一次給付',
    icon: '🎗️',
    blurb: '確診重大傷病(如癌症)時一次給付,補貼收入中斷與長期治療。',
    tiers: [
      { label: '未投保', premium: 0 },
      { label: '100 萬', premium: 22000, lump: 1000000 },
      { label: '300 萬', premium: 55000, lump: 3000000 },
    ],
  },
  disability: {
    id: 'disability',
    name: '失能所得補償',
    sub: '依年收入比例',
    icon: '🦽',
    blurb: '因意外或疾病失能、無法工作時,依年收入比例給付(最長 3 年)。',
    tiers: [
      { label: '未投保', premium: 0 },
      { label: '收入 30%', premium: 10000, ratio: 0.3 },
      { label: '收入 60%', premium: 20000, ratio: 0.6 },
    ],
  },
  life: {
    id: 'life',
    name: '定期壽險',
    sub: '身故給付',
    icon: '🛡️',
    blurb: '萬一發生不幸,留給家人的生活費、房貸與教育金。',
    tiers: [
      { label: '未投保', premium: 0 },
      { label: '300 萬', premium: 6000, lump: 3000000 },
      { label: '1,000 萬', premium: 18000, lump: 10000000 },
      { label: '2,000 萬', premium: 34000, lump: 20000000 },
    ],
  },
  annuity: {
    id: 'annuity',
    name: '儲蓄年金險',
    sub: '強迫儲蓄',
    icon: '🌱',
    blurb: '每年固定儲蓄、年化約 2% 累積,遊戲結束時領回(中途不可動用)。',
    tiers: [
      { label: '未投保', premium: 0 },
      { label: '年繳 6 萬', premium: 60000, saving: true },
      { label: '年繳 12 萬', premium: 120000, saving: true },
    ],
  },
  accident: {
    id: 'accident',
    name: '意外險',
    sub: '傷害給付',
    icon: '🚑',
    blurb: '因意外受傷、失能或身故時給付(車禍、骨折、運動傷害都算)。',
    tiers: [
      { label: '未投保', premium: 0 },
      { label: '100 萬', premium: 5000, injury: 100000, lump: 1000000 },
      { label: '300 萬', premium: 9000, injury: 200000, lump: 3000000 },
    ],
  },
  home: {
    id: 'home',
    name: '住宅火險地震險',
    sub: '房屋損失',
    icon: '🏠',
    blurb: '房屋遭遇火災、地震、颱風水災時,補償修繕與重建費用(需持有房屋)。',
    needsHouse: true,
    tiers: [
      { label: '未投保', premium: 0 },
      { label: '基本保障', premium: 4500, rate: 0.9, cap: 5000000 },
    ],
  },
  ltc: {
    id: 'ltc',
    name: '長照險',
    sub: '失能長照給付',
    icon: '🧓',
    blurb: '自己需要長期照顧時,每年給付 50 萬、最長 3 年。',
    tiers: [
      { label: '未投保', premium: 0 },
      { label: '每年 50 萬', premium: 28000, perYear: 500000, years: 3 },
    ],
  },
}

export const PRODUCT_ORDER = ['medical', 'critical', 'disability', 'accident', 'life', 'home', 'annuity', 'ltc']

export function premiumFor(productId, tierIdx, age) {
  const t = PRODUCTS[productId].tiers[tierIdx]
  if (!t || !t.premium) return 0
  if (t.saving) return t.premium
  return Math.round(t.premium * (1 + Math.max(0, age - 30) * 0.03))
}

export function totalPremium(coverage, age) {
  return PRODUCT_ORDER.reduce((s, id) => s + premiumFor(id, coverage[id] || 0, age), 0)
}

export const EMPTY_COVERAGE = Object.freeze({
  medical: 0,
  critical: 0,
  disability: 0,
  life: 0,
  annuity: 0,
  ltc: 0,
  accident: 0,
  home: 0,
})

// 保險給付:規則引擎統一計算,實際遊戲與「平行人生」對照共用,確保一致。
// shock: { cat, medicalCost, incomeLoss:{ratio,years}, income, yearsOfLoss }
export function payoutFor(coverage, shock) {
  const out = { medical: 0, lump: 0, disability: 0, life: 0, ltc: 0, accident: 0, home: 0 }
  const m = PRODUCTS.medical.tiers[coverage.medical || 0]
  const c = PRODUCTS.critical.tiers[coverage.critical || 0]
  const d = PRODUCTS.disability.tiers[coverage.disability || 0]
  const l = PRODUCTS.life.tiers[coverage.life || 0]
  const g = PRODUCTS.ltc.tiers[coverage.ltc || 0]
  const a = PRODUCTS.accident.tiers[coverage.accident || 0]
  const h = PRODUCTS.home.tiers[coverage.home || 0]

  if (['medical', 'critical', 'disability'].includes(shock.cat) && m.rate) {
    out.medical = Math.min(Math.round((shock.medicalCost || 0) * m.rate), m.cap)
  }
  if (shock.cat === 'critical' && c.lump) out.lump = c.lump
  if (shock.cat === 'disability' && d.ratio) {
    out.disability = Math.round((shock.income || 0) * d.ratio * Math.min(3, shock.years || 3))
  }
  if (shock.cat === 'death' && l.lump) out.life = l.lump
  if (shock.cat === 'ltc' && g.perYear) out.ltc = g.perYear * g.years
  if (shock.accident) {
    if (shock.cat === 'medical') out.accident = a.injury || 0
    if (shock.cat === 'disability') out.accident = a.lump || 0
  }
  if (shock.cat === 'home' && h.rate) out.home = Math.min(Math.round((shock.otherCost || 0) * h.rate), h.cap)
  out.total = out.medical + out.lump + out.disability + out.life + out.ltc + out.accident + out.home
  return out
}
