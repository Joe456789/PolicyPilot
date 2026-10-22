// 「AI 學習型」電腦玩家的策略:20 個參數決定保險、預備金、投資比例、買地產與面對行情的態度。
// 參數不是人手調的,而是用演化策略(Evolution Strategies,一種強化學習方法)讓它自己玩幾千局、
// 依最後的人生積分慢慢調整出來的(scripts/ml/train-bot.mjs)。
import { LOOKS } from '../careers.js'

export const PARAM_NAMES = [
  'medical', 'critical', 'disability', 'life', 'accident', 'ltc', 'home', 'auto',
  'premiumCap', 'buffer', 'investFrac', 'wDeposit', 'wBond', 'wStock', 'wSpec',
  'propMonths', 'propLoan', 'risk', 'love', 'insureProps',
]
const sig = (v) => 1 / (1 + Math.exp(-v))

// 把參數(任意實數)轉成電腦玩家的個性設定,欄位與 bots.js 的 PERSONAS 相容
export function decodePolicy(raw) {
  const q = Object.fromEntries(PARAM_NAMES.map((n, i) => [n, sig(raw[i] || 0)]))
  const w = [q.wDeposit, q.wBond, q.wStock, q.wSpec * 0.6]
  const sum = w.reduce((a, b) => a + b, 0)
  const cov = ['medical', 'critical', 'disability', 'life', 'accident', 'ltc', 'home', 'auto']
  return {
    id: 'learned', name: '演算法阿智', title: 'AI 學習型', blurb: '用強化學習自己玩了幾千局,學出來的保險與投資策略。', // i18n-ignore:由呼叫端 t()
    look: { skin: LOOKS.skins[1], hair: LOOKS.hairs[2], style: 'short', top: LOOKS.tops[3], accent: '#dbeafe', extra: 'glasses' },
    cover: 'learned', skip: [],
    coverMap: Object.fromEntries(cov.map((id) => [id, q[id] < 0.5 ? 0 : q[id] > 0.85 ? 2 : 1])), // 0 不買、1 照建議、2 建議再多一級
    premiumCap: 0.06 + q.premiumCap * 0.16,
    buffer: Math.round(q.buffer * 12),
    invest: { deposit: w[0] / sum, bond: w[1] / sum, stock: w[2] / sum, spec: w[3] / sum },
    investFrac: 0.2 + q.investFrac * 0.8,
    loans: false,
    prop: { months: 4 + q.propMonths * 20, loan: q.propLoan > 0.5 },
    insureProps: q.insureProps > 0.5,
    risk: q.risk, love: q.love, panic: q.risk < 0.25, quiz: 0.75, study: 'study',
  }
}
