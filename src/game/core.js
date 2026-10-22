// 遊戲核心:狀態、資產、保障建議等共用的「確定性」計算。
import { Rng } from './rng.js'
import { PRODUCTS, PRODUCT_ORDER, OPTIONAL_PRODUCTS, EMPTY_COVERAGE, totalPremium } from './products.js'
import { CAREERS, BACKGROUNDS, STYLES, LENGTHS, defaultLook } from './careers.js'
import { drawQuests } from './quests.js'
import { applyTagsAtStart } from './tags.js'
import { initialKids } from './lifestages.js'
import { t, getLang } from '../i18n.js'

// 棋盤:100 格,沿著 map.js 的路徑環島一圈,依序經過北、中、南、東 4 區;28 格資產格 + 事件、機會、行情、小遊戲等。
import { PROPERTIES, propById, AREAS } from './properties.js'
const P = (id) => {
  const p = PROPERTIES.find((x) => x.id === id)
  return { type: 'property', label: p.name, icon: p.icon, prop: id }
}
const TILE = {
  start: { type: 'start', label: '年度起點', icon: '🏁' }, // i18n-ignore
  chance: { type: 'chance', label: '機會與命運', icon: '🎲' }, // i18n-ignore
  event: { type: 'event', label: '生活事件', icon: '🎴' }, // i18n-ignore
  market: { type: 'market', label: '市場行情', icon: '📊' }, // i18n-ignore
  minigame: { type: 'minigame', label: '小遊戲', icon: '🎮' }, // i18n-ignore
  milestone: { type: 'milestone', label: '人生里程碑', icon: '🌟' }, // i18n-ignore
  advisor: { type: 'advisor', label: '理專諮詢', icon: '🧑‍💼' }, // i18n-ignore
  tax: { type: 'tax', label: '年度報稅', icon: '🧾' }, // i18n-ignore
  hospital: { type: 'hospital', label: '醫院', icon: '🏥' }, // i18n-ignore
  bank: { type: 'bank', label: '銀行', icon: '🏦' }, // i18n-ignore
  shop: { type: 'shop', label: '理財商城', icon: '🛒' }, // i18n-ignore
  quiz: { type: 'quiz', label: '保險小學堂', icon: '🎓' }, // i18n-ignore
}
// 每一區佔幾格(加起來 100;第一區含起點)
const AREA_SIZE = { north: 27, central: 23, south: 27, east: 23 }
// 非資產格依序填入的格子種類(每 24 格一輪,比例和原本的棋盤相近)
const FILL = ['event', 'chance', 'minigame', 'milestone', 'market', 'event', 'quiz', 'advisor', 'event', 'minigame', 'shop', 'chance',
  'event', 'hospital', 'milestone', 'bank', 'event', 'quiz', 'chance', 'market', 'event', 'tax', 'chance', 'milestone']
function buildBoard() {
  const out = []
  let f = 0
  for (const area of AREAS) {
    const n = AREA_SIZE[area.id]
    const props = PROPERTIES.filter((p) => p.area === area.id)
    const first = out.length === 0 ? 1 : 0 // 第一區的第 0 格是起點
    const slots = new Map()
    props.forEach((p, j) => slots.set(first + Math.floor(((j + 0.5) * (n - first)) / props.length), p.id))
    for (let k = 0; k < n; k++) {
      let tile
      if (out.length === 0) tile = { ...TILE.start }
      else if (slots.has(k)) tile = P(slots.get(k))
      else tile = { ...TILE[FILL[f++ % FILL.length]] }
      tile.area = area.id
      out.push(tile)
    }
  }
  // 資產格的編號由棋盤決定
  out.forEach((tile, i) => { if (tile.prop) propById(tile.prop).tile = i })
  return out
}
export const BOARD = buildBoard()

export const ASSETS = {
  deposit: { id: 'deposit', name: '定存', icon: '🏦', risk: '極低', blurb: '幾乎不波動,年報酬約 1.5%,但追不上通膨。' }, // i18n-ignore
  bond: { id: 'bond', name: '債券基金', icon: '📜', risk: '低', blurb: '波動較小,年報酬約 3%,景氣差時也會小跌。' }, // i18n-ignore
  stock: { id: 'stock', name: '股票型 ETF', icon: '📈', risk: '中高', blurb: '長期平均約 6% 到 7%,但單年可能大漲大跌。' }, // i18n-ignore
  spec: { id: 'spec', name: '熱門個股', icon: '🔥', risk: '極高', blurb: '漲跌幅度是大盤的 1.5 倍以上,可能翻倍也可能腰斬。' }, // i18n-ignore
}
export const ASSET_ORDER = ['deposit', 'bond', 'stock', 'spec']

export const round1k = (n) => Math.round(n / 1000) * 1000
export const clamp = (v, a, b) => Math.min(b, Math.max(a, v))

export function blankYear() {
  return { rent: 0, propPrem: 0, propDamage: 0, propPaid: 0, propLoanPay: 0, tolls: 0, shockCost: 0, recurringCost: 0, payout: 0, borrowed: 0, forced: 0, shocks: [], marketReturn: null, houseChange: null, events: [] }
}

export const holdingsTotal = (s) => ASSET_ORDER.reduce((a, k) => a + s.hold[k], 0)
export const houseEquity = (s) => (s.house ? Math.round(s.house.value - s.house.balance) : 0)
export const propEquity = (s) => Object.values(s.props || {}).reduce((a, p) => a + (p.value - (p.mortgage ? p.mortgage.balance : 0)), 0)
export const householdIncome = (s) => s.income + (s.partner ? s.partner.income : 0)

export function netWorth(s) {
  return Math.round(s.cash + holdingsTotal(s) + s.savings + (s.ilv || 0) + houseEquity(s) + propEquity(s) - s.loan)
}

// 從 0 開始:由創角結果建立初始狀態。
export function createGame(setup, seed = Math.floor(Math.random() * 100000)) {
  const career = CAREERS.find((c) => c.id === setup.career) || CAREERS[0]
  const bg = BACKGROUNDS.find((b) => b.id === setup.background) || BACKGROUNDS[1]
  const style = STYLES.find((x) => x.id === setup.style) || STYLES[1]
  const length = LENGTHS.find((l) => l.id === setup.length) || LENGTHS[1]
  const st = setup.start || null
  const income = Math.round((career.income * (st?.incomeBoost ?? 1) * (st?.growthMult ?? 1)) / 1000) * 1000
  const startAge = st?.age ?? 22
  const startCash = st ? st.cash : bg.cash
  const startLoan = st ? st.loan : bg.loan
  const nw0 = startCash - startLoan + (st?.assets ? Object.values(st.assets).reduce((a, b) => a + b, 0) : 0) + (st?.houseObj ? st.houseObj.value - st.houseObj.balance : st?.house || 0)
  const s = {
    seed,
    rngN: 0,
    player: {
      name: (setup.name || t('你')).slice(0, getLang() === 'en' ? 14 : 8),
      look: setup.look || defaultLook(),
      careerId: career.id,
      title: career.title,
      backgroundId: bg.id,
      background: bg.title,
      style: style.title,
      parentsSupport: st ? st.parentsSupport : bg.parentsSupport,
      parentsInsured: st ? st.parentsInsured : null,
      aspiration: setup.aspiration || null,
      education: st?.education || null,
      major: st?.majorTitle || null,
      stats: st?.stats || null,
      startAge,
      intro: st?.intro || null,
    },
    career,
    length: length.id,
    // 太長的局最多玩到 90 歲
    years: Math.min(length.years, 90 - startAge),
    turn: 0,
    phase: 'plan',
    age: startAge,
    pos: 0,
    dice: null,
    kids: initialKids(startAge, st?.dependents || 0),
    // 前幾局出現過的內容(跨局記憶),這一局會降低它們再出現的機率
    recent: Array.isArray(setup.recent) ? setup.recent.slice(0, 400) : [],
    stagesDone: [],
    retired: false,
    annuityPay: 0,
    cash: startCash,
    hold: { deposit: st?.assets?.deposit || 0, bond: st?.assets?.bond || 0, stock: st?.assets?.stock || 0, spec: 0 },
    loan: startLoan,
    savings: 0,
    ilv: 0,
    ilvYears: 0,
    props: {},
    ap: 2,
    pendingOps: [],
    cards: [],
    tags: [],
    cardsUsed: 0,
    cardsGot: 0,
    hospitalTurns: 0,
    car: !!st?.car,
    trips: 0,
    promotions: 0,
    house: st?.houseObj || (st?.house ? { price: st.house, value: st.house, balance: 0, rate: 0.022, payment: 0, yearsLeft: 0 } : null),
    income,
    expense: Math.round((income * (st ? st.expenseRatio : bg.expenseRatio) * (st?.partner ? 1.4 : 1) + (st?.dependents || 0) * 180000) / 1000) * 1000,
    startIncome: income,
    partner: st?.partner ? { income: st.partnerIncome } : null,
    dependents: st?.dependents || 0,
    health: st ? st.health : 100,
    coverage: { ...EMPTY_COVERAGE, ...(st?.coverage || {}) },
    blocked: {},
    seen: {},
    effects: [],
    recurring: [],
    carryBonus: 0,
    newBonus: 0,
    checkupYears: 0,
    panicSells: 0,
    crashesHeld: 0,
    quests: drawQuests(seed, { ...career, income }, length.years, setup.aspiration, { age: startAge, nw0, house: !!(st?.houseObj || st?.house), partner: !!st?.partner, dependents: st?.dependents || 0 }),
    questDone: {},
    quizRight: 0,
    quizTotal: 0,
    miniStars: 0,
    miniPerfect: 0,
    miniPlayed: 0,
    advisorUsed: 0,
    scene: null,
    year: blankYear(),
    lastYear: null,
    history: [],
    ended: null,
    flash: null,
    pendingStage: false,
    startNetWorth: nw0,
  }
  applyTagsAtStart(s, st?.tags)
  s.startNetWorth += s.cash - startCash
  return s
}

// 讓每個 action 都是純函式:複製 state → 執行 → 回傳新的 state。
export function run(state, fn) {
  const s = structuredClone(state)
  const rng = new Rng(s.seed, s.rngN)
  s.flash = null
  fn(s, rng)
  s.rngN = rng.n
  return s
}

// 現金不足時依序:賣出投資(由低風險到高風險)→ 在額度內舉債 → 被迫拍賣地產與自宅(打 85 折)。
// 全部用完仍補不上的缺口會留在現金上(負數);年度結算時還是負的,就破產出局。
export const FORCED_SALE = 0.85

export function cover(s) {
  if (s.cash >= 0) return
  for (const k of ASSET_ORDER) {
    if (s.cash >= 0) break
    const sell = Math.min(s.hold[k], -s.cash)
    s.hold[k] -= sell
    s.cash += sell
  }
  if (s.cash < 0) {
    const room = Math.max(0, householdIncome(s) * 1.5 - s.loan)
    const b = Math.min(room, -s.cash)
    s.loan += b
    s.year.borrowed += b
    s.cash += b
  }
  // 被迫拍賣:價值較低的地產先賣
  const ids = Object.keys(s.props || {}).sort((a, b) => s.props[a].value - s.props[b].value)
  for (const id of ids) {
    if (s.cash >= 0) break
    const pr = s.props[id]
    const proceeds = Math.round(pr.value * FORCED_SALE) - (pr.mortgage ? pr.mortgage.balance : 0)
    s.cash += proceeds
    delete s.props[id]
    s.year.events.push({ title: t('現金見底,被迫低價拍賣地產「{name}」', { name: propById(id).name }), kind: 'event', cat: 'forced', icon: '🏚️' })
    s.year.forced = (s.year.forced || 0) + 1
  }
  if (s.cash < 0 && s.house) {
    const h = s.house
    s.cash += Math.round(h.value * FORCED_SALE) - h.balance
    s.house = null
    s.coverage.home = 0
    s.year.events.push({ title: t('現金見底,被迫賣掉自己的房子'), kind: 'event', cat: 'forced', icon: '🏚️' })
    s.year.forced = (s.year.forced || 0) + 1
  }
}

export function isOwner(s) {
  return !!s.house
}

// ---------- 保障建議(依當下人生階段與負擔能力動態計算)----------

const SEVERITY = (s) => ({
  life: s.dependents > 0 ? 5 : s.partner || s.house ? 3.5 : 2,
  disability: s.partner || !s.career.laborIns ? 4.5 : 3.5,
  critical: 3.8,
  medical: 3,
  accident: s.career.risk === 'mid' ? 2.4 : 1.6,
  home: 3.2,
  ltc: s.age >= 45 ? 3 : 1,
  annuity: 1,
  auto: 3,
  cancer: 1, daily: 1, travel: 1, invlinked: 1,
})

export function recommended(s) {
  const dep = s.dependents
  const hi = householdIncome(s)
  const rec = { medical: 1, critical: 1, disability: 1, accident: 0, life: 0, home: 0, annuity: 0, ltc: 0, auto: 0, cancer: 0, daily: 0, travel: 0, invlinked: 0 }
  if (hi > 1400000 || dep > 0) rec.critical = 2
  if (dep > 0 || (s.house && !s.partner) || !s.career.laborIns) rec.disability = 2
  let lifeNeed = 0
  if (s.partner) lifeNeed += 1
  if (s.house) lifeNeed += 1
  if (dep >= 1) lifeNeed += 1
  if (dep >= 2 || (dep >= 1 && s.house)) lifeNeed += 1
  rec.life = clamp(lifeNeed, 0, 3)
  if (s.career.risk === 'mid' || dep > 0) rec.accident = 1
  if (s.house) rec.home = 1
  if (s.car) rec.auto = 1
  if (s.age >= 30 && hi > 1200000) rec.annuity = hi > 2200000 ? 2 : 1
  if (s.age >= 45) rec.ltc = 1

  // 負擔能力:保費占收入超過 15% 時,從最不重要的項目往下調。
  const sev = SEVERITY(s)
  const ratio = () => totalPremium(rec, s.age) / hi
  const order = PRODUCT_ORDER.filter((id) => rec[id] > 0).sort((a, b) => sev[a] - sev[b])
  for (const id of order) {
    while (ratio() > 0.15 && rec[id] > 0) rec[id] -= 1
  }
  return rec
}

export function canIncrease(s, id) {
  if (['medical', 'critical', 'disability', 'cancer', 'daily'].includes(id)) return !s.blocked[id]
  if (id === 'home') return !!s.house
  if (id === 'auto') return !!s.car
  return true
}

export function analyzeGaps(s) {
  const rec = recommended(s)
  const sev = SEVERITY(s)
  const gaps = []
  for (const id of PRODUCT_ORDER) {
    if (OPTIONAL_PRODUCTS.includes(id)) continue
    const have = s.coverage[id] || 0
    const need = rec[id] || 0
    if (have < need) {
      gaps.push({
        id,
        have,
        need,
        severity: sev[id] * (need - have),
        blocked: !canIncrease(s, id),
        text: t('{name}:目前「{have}」,建議至少「{need}」', { name: PRODUCTS[id].name, have: PRODUCTS[id].tiers[have].label, need: PRODUCTS[id].tiers[need].label }),
      })
    }
  }
  gaps.sort((a, b) => b.severity - a.severity)
  const premium = totalPremium(s.coverage, s.age)
  return {
    gaps,
    emergencyMonths: Math.round((s.cash / (s.expense / 12)) * 10) / 10,
    premiumRatio: Math.round((premium / householdIncome(s)) * 1000) / 10,
    premium,
  }
}

// 實際年度支出(生活 + 房貸 + 長期支出 + 保費),用來估算緊急預備金。
export function annualOutflow(s) {
  return s.expense + (s.house ? s.house.payment : 0)
}
