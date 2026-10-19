// 保障商品:僅為教學用的簡化模型,非真實商品條款或費率。
// tiers[0] 一律代表「未投保」。premium 為年繳保費(NT$),age 加成見 premiumFor()。
export const PRODUCTS = {
  medical: {
    id: 'medical',
    group: 'medical',
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
    group: 'medical',
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
    group: 'income',
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
    group: 'family',
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
    group: 'savings',
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
    group: 'income',
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
    group: 'property',
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
  cancer: {
    id: 'cancer',
    name: '癌症險',
    sub: '確診一次給付',
    group: 'medical',
    icon: '🧬',
    blurb: '確診癌症時一次給付,和重大傷病險可以疊加,專門補強癌症這個高機率的重大風險。',
    tiers: [
      { label: '未投保', premium: 0 },
      { label: '確診 50 萬', premium: 9000, lump: 500000 },
      { label: '確診 150 萬', premium: 22000, lump: 1500000 },
    ],
  },
  daily: {
    id: 'daily',
    name: '住院日額險',
    sub: '每天定額給付',
    group: 'medical',
    icon: '🛏️',
    blurb: '住院期間依天數每天給付固定金額,可以補貼看護、營養與請假造成的收入損失。',
    tiers: [
      { label: '未投保', premium: 0 },
      { label: '日額 1,000 元', premium: 4500, perDay: 1000 },
      { label: '日額 3,000 元', premium: 11000, perDay: 3000 },
    ],
  },
  invlinked: {
    id: 'invlinked',
    name: '投資型保單',
    sub: '保障 + 投資帳戶',
    group: 'savings',
    icon: '📊',
    blurb: '一部分保費買壽險保障,其餘進入投資帳戶,價值隨市場波動,前幾年有較高費用,風險由你自己承擔。',
    invest: true,
    tiers: [
      { label: '未投保', premium: 0 },
      { label: '年繳 6 萬', premium: 60000, invest: true, face: 1200000 },
      { label: '年繳 12 萬', premium: 120000, invest: true, face: 2400000 },
    ],
  },
  auto: {
    id: 'auto',
    name: '汽車險',
    sub: '第三人責任 + 車體',
    group: 'property',
    icon: '🚙',
    blurb: '有車才需要。第三人責任險補貼撞傷他人的賠償,車體險補貼自己的修車費。',
    needsCar: true,
    tiers: [
      { label: '未投保', premium: 0 },
      { label: '第三人責任', premium: 12000, liability: 0.9, cap: 1500000 },
      { label: '責任 + 車體', premium: 28000, liability: 0.9, cap: 1500000, repair: 0.8 },
    ],
  },
  travel: {
    id: 'travel',
    name: '旅遊平安險',
    sub: '旅途意外與不便',
    group: 'property',
    icon: '🧳',
    blurb: '旅途中受傷、行李遺失或班機取消時給付,保費低、很適合愛旅行的人。',
    tiers: [
      { label: '未投保', premium: 0 },
      { label: '年繳旅平險', premium: 3000, travel: 0.9 },
    ],
  },
  ltc: {
    id: 'ltc',
    group: 'family',
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

export const PRODUCT_GROUPS = [
  ['medical', '🏥 醫療與重病'],
  ['income', '💼 收入保障'],
  ['family', '👨‍👩‍👧 家庭責任'],
  ['property', '🏠 財產與生活'],
  ['savings', '🌱 儲蓄與投資'],
]
export const PRODUCT_ORDER = ['medical', 'critical', 'cancer', 'daily', 'disability', 'accident', 'life', 'ltc', 'home', 'auto', 'travel', 'annuity', 'invlinked']
// 「選配」商品:不計入建議配置與缺口,是進階的學習與取捨
export const OPTIONAL_PRODUCTS = ['cancer', 'daily', 'travel', 'invlinked']

export function premiumFor(productId, tierIdx, age) {
  const t = PRODUCTS[productId].tiers[tierIdx]
  if (!t || !t.premium) return 0
  if (t.saving || t.invest) return t.premium
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
  cancer: 0,
  daily: 0,
  invlinked: 0,
  auto: 0,
  travel: 0,
})

// 保險給付:規則引擎統一計算,實際遊戲與「平行人生」對照共用,確保一致。
// shock: { cat, medicalCost, incomeLoss:{ratio,years}, income, yearsOfLoss }
// 住院天數:由醫療費用概估(教學用簡化)
export const hospitalDays = (medicalCost) => Math.min(60, Math.max(2, Math.round((medicalCost || 0) / 25000)))

export function payoutFor(coverage, shock) {
  const out = { medical: 0, lump: 0, disability: 0, life: 0, ltc: 0, accident: 0, home: 0, cancer: 0, daily: 0, auto: 0, invlinked: 0, travel: 0 }
  const T = (id) => PRODUCTS[id].tiers[coverage[id] || 0]
  const m = T('medical'), c = T('critical'), d = T('disability'), l = T('life'), g = T('ltc')
  const a = T('accident'), h = T('home'), ca = T('cancer'), da = T('daily'), au = T('auto'), il = T('invlinked'), tr = T('travel')

  if (['medical', 'critical', 'disability'].includes(shock.cat) && m.rate) {
    out.medical = Math.min(Math.round((shock.medicalCost || 0) * m.rate), m.cap)
  }
  if (shock.cat === 'critical' && c.lump) out.lump = c.lump
  if (shock.cancer && ca.lump) out.cancer = ca.lump
  if (['medical', 'critical', 'disability'].includes(shock.cat) && da.perDay) out.daily = da.perDay * hospitalDays(shock.medicalCost)
  if (shock.cat === 'disability' && d.ratio) {
    out.disability = Math.round((shock.income || 0) * d.ratio * Math.min(3, shock.years || 3))
  }
  if (shock.cat === 'death') {
    if (l.lump) out.life = l.lump
    if (il.face) out.invlinked = il.face
  }
  if (shock.cat === 'ltc' && g.perYear) out.ltc = g.perYear * g.years
  if (shock.accident) {
    if (shock.cat === 'medical') out.accident = a.injury || 0
    if (shock.cat === 'disability') out.accident = a.lump || 0
  }
  if (shock.cat === 'home' && h.rate) out.home = Math.min(Math.round((shock.otherCost || 0) * h.rate), h.cap)
  if (shock.cat === 'liability' && au.liability) out.auto = Math.min(Math.round((shock.otherCost || 0) * au.liability), au.cap)
  if (shock.carRepair && au.repair) out.auto += Math.round((shock.otherCost || 0) * au.repair)
  if (shock.cat === 'trip' && tr.travel) out.travel = Math.round((shock.otherCost || 0) * tr.travel)
  out.total = Object.values(out).reduce((x, y) => x + y, 0)
  return out
}
