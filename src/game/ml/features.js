// 機器學習用的特徵:把一個玩家「這一年開始時」的財務狀態轉成一串數字。
// 訓練(scripts/ml/*.mjs)與遊戲裡的即時預測共用這一份,確保兩邊算法一模一樣。
import { recommended, householdIncome, holdingsTotal, netWorth } from '../engine.js'
import { PRODUCT_ORDER, OPTIONAL_PRODUCTS, totalPremium, premCtx } from '../products.js'

const clip = (x, a, b) => Math.max(a, Math.min(b, x))

// 每個特徵:名稱(給解釋用的 id)與計算方式
export const FEATURES = [
  ['cashMonths', (s) => clip(s.cash / (s.expense / 12), -6, 24) / 12],
  ['liquidMonths', (s) => clip((s.cash + s.hold.deposit + s.hold.bond) / (s.expense / 12), -6, 36) / 12],
  ['debtRatio', (s) => clip((s.loan + (s.house ? s.house.balance : 0) + Object.values(s.props || {}).reduce((a, p) => a + (p.mortgage ? p.mortgage.balance : 0), 0)) / householdIncome(s), 0, 15) / 5],
  ['fixedCost', (s) => clip((s.expense + (s.house ? s.house.payment : 0) + totalPremium(s.coverage, s.age, premCtx(s))) / householdIncome(s), 0, 3)],
  ['coverGap', (s) => {
    const rec = recommended(s)
    let need = 0, have = 0
    for (const id of PRODUCT_ORDER) {
      // 房貸壽險是模型訓練之後才加入的商品:不列入,讓這個特徵的意義和訓練時一致
      if (OPTIONAL_PRODUCTS.includes(id) || id === 'mortgage') continue
      need += rec[id] || 0
      have += Math.min(rec[id] || 0, s.coverage[id] || 0)
    }
    return need ? 1 - have / need : 0
  }],
  ['noMedical', (s) => ((s.coverage.medical || 0) > 0 ? 0 : 1)],
  ['noDisability', (s) => ((s.coverage.disability || 0) > 0 ? 0 : 1)],
  ['noCritical', (s) => ((s.coverage.critical || 0) > 0 ? 0 : 1)],
  ['riskyShare', (s) => { const tot = holdingsTotal(s) + Math.max(0, s.cash); return tot > 0 ? (s.hold.stock + s.hold.spec) / tot : 0 }],
  ['specShare', (s) => { const tot = holdingsTotal(s) + Math.max(0, s.cash); return tot > 0 ? s.hold.spec / tot : 0 }],
  ['health', (s) => s.health / 100],
  ['dependents', (s) => s.dependents / 3],
  ['age', (s) => (s.age - 20) / 50],
  ['propCount', (s) => Object.keys(s.props || {}).length / 4],
  ['netWorthYears', (s) => clip(netWorth(s) / householdIncome(s), -5, 20) / 10],
]

export const featurize = (s) => FEATURES.map(([, f]) => f(s))

// 解釋用的白話文字:hi = 這個特徵「偏高」時、lo = 「偏低」時(模型會依權重方向挑一個)
export const FEATURE_TEXT = {
  cashMonths: { hi: '現金很多', lo: '手邊現金只夠撐很短的時間' },
  liquidMonths: { hi: '預備金充足', lo: '緊急預備金(現金、定存、債券)不足' },
  debtRatio: { hi: '負債(貸款、房貸)相對收入偏高', lo: '負債很少' },
  fixedCost: { hi: '每年固定支出(生活費、房貸、保費)占收入太高', lo: '固定支出不高' },
  coverGap: { hi: '保障缺口大', lo: '保障完整' },
  noMedical: { hi: '沒有醫療險', lo: '有醫療險' },
  noDisability: { hi: '沒有失能險,收入中斷時沒有補償', lo: '有失能險' },
  noCritical: { hi: '沒有重大傷病險', lo: '有重大傷病險' },
  riskyShare: { hi: '股票類資產比例偏高', lo: '幾乎沒有長期投資,資產累積慢' },
  specShare: { hi: '高風險個股比例偏高', lo: '沒有高風險個股' },
  health: { hi: '身體健康', lo: '健康狀況不佳,生病機率高' },
  dependents: { hi: '扶養人口多,家庭責任重', lo: '沒有扶養壓力' },
  age: { hi: '年紀較大', lo: '剛出社會,資產還在累積' },
  propCount: { hi: '持有地產多,房貸與天災壓力大', lo: '沒有地產負擔' },
  netWorthYears: { hi: '累積了不少資產', lo: '累積的資產相對收入偏少' },
}

// ---------- 理財性格(分群)用的整局特徵 ----------
// 從每一年的結算紀錄(history)算出這一局的平均行為
const avg = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0)
export const STYLE_FEATURES = [
  ['protection', (h) => avg(h.map((y) => y.protRatio || 0))],
  ['investRate', (h) => avg(h.map((y) => { const tot = y.holdings + Math.max(0, y.cash); return tot > 0 ? y.holdings / tot : 0 }))],
  ['riskyShare', (h) => avg(h.map((y) => (y.hold && y.holdings > 0 ? (y.hold.stock + y.hold.spec) / y.holdings : 0)))],
  ['specShare', (h) => avg(h.map((y) => (y.hold && y.holdings > 0 ? y.hold.spec / y.holdings : 0)))],
  ['cashMonths', (h) => avg(h.map((y) => clip(y.monthsCash || 0, 0, 24) / 12))],
  ['debtUse', (h) => avg(h.map((y) => (y.loan > 0 || y.borrowed > 0 ? 1 : 0)))],
]
export const styleFeaturize = (s) => STYLE_FEATURES.map(([, f]) => f(s.history || []))
