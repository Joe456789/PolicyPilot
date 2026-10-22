// 遊戲裡使用的機器學習模型(都在瀏覽器裡計算,不連網、不呼叫任何 AI 服務):
//   predictRisk:財務危機預測(邏輯迴歸,scripts/ml/train-risk.mjs 用上千局模擬資料訓練)
import RISK from './riskModel.json' with { type: 'json' }
import { featurize, FEATURE_TEXT } from './features.js'
import { t } from '../../i18n.js'

export const RISK_MODEL = RISK

// 回傳 { p: 接下來 N 年發生財務危機的機率, level, reasons: 最主要的 3 個原因 }
export function predictRisk(s) {
  const x = featurize(s)
  const z = x.map((v, j) => (v - RISK.mean[j]) / RISK.std[j])
  const contrib = z.map((v, j) => v * RISK.w[j])
  const logit = contrib.reduce((a, b) => a + b, RISK.b)
  const p = 1 / (1 + Math.exp(-logit))
  const reasons = contrib
    .map((c, j) => ({ c, id: RISK.features[j], dir: RISK.w[j] >= 0 ? 'hi' : 'lo' }))
    .filter((r) => r.c > 0.15)
    .sort((a, b) => b.c - a.c)
    .slice(0, 3)
    .map((r) => ({ id: r.id, text: t(FEATURE_TEXT[r.id][r.dir]), weight: r.c }))
  const level = p < 0.12 ? 'low' : p < 0.3 ? 'mid' : 'high'
  return { p, level, reasons, horizon: RISK.horizon }
}

// ---------- 理財性格分析(k-means 分群,scripts/ml/train-style.mjs)----------
import STYLE from './styleModel.json' with { type: 'json' }
import { styleFeaturize } from './features.js'

export const STYLE_MODEL = STYLE
export const STYLE_INFO = {
  guardian: { icon: '🛡️', name: '穩健保障型', desc: '保障完整、很少借錢、有充足的預備金,遇到意外也撐得住。', advice: '保障打好底之後,可以把多餘的現金提高長期投資比例,讓資產跑贏通膨。' },
  uninsured: { icon: '🎲', name: '保障不足型', desc: '有在投資、也存了現金,但保障明顯不夠;一場重病或意外就可能吃掉多年的累積。', advice: '先補醫療、重大傷病與失能險,保費抓年收入 10% 左右,再談投資。' },
  debtor: { icon: '💳', name: '借貸周轉型', desc: '常常需要借錢周轉、投資比例低、手邊現金也偏少,財務彈性很小。', advice: '先建立 3~6 個月的預備金、降低固定支出,高利負債優先還清。' },
  leveraged: { icon: '🚀', name: '積極槓桿型', desc: '投資比例高,也願意用貸款放大資產,保障有一定程度。', advice: '槓桿會放大虧損:確保還款不依賴投資報酬,並留足預備金。' },
  gambler: { icon: '🔥', name: '高風險投機型', desc: '偏好高風險個股,股票類資產比例很高,報酬起伏劇烈。', advice: '把個股控制在投資的 1 成以內,其餘用 ETF 分散,定期再平衡。' },
}
export const STYLE_LABELS = { protection: '保障完整度', investRate: '投資比例', riskyShare: '股票類比例', specShare: '個股比例', cashMonths: '緊急預備金', debtUse: '借錢的年數比例' }

// 回傳 { id, second, you, typical }:最接近的群、第二接近的群、你的數值與該群平均
export function classifyStyle(s) {
  if (!s.history || s.history.length < 2) return null
  const x = styleFeaturize(s)
  const z = x.map((v, j) => (v - STYLE.mean[j]) / STYLE.std[j])
  const d = STYLE.clusters.map((c) => ({ id: c.id, d: c.center.reduce((a, v, j) => a + (v - z[j]) ** 2, 0), raw: c.raw }))
  d.sort((a, b) => a.d - b.d)
  return { id: d[0].id, second: d[1].id, you: x, typical: d[0].raw, features: STYLE.features }
}

// ---------- AI 學習型玩家(演化策略,scripts/ml/train-bot.mjs)----------
import POLICY from './learnedPolicy.json' with { type: 'json' }
import { LEARNED } from '../bots.js'
import { recommended } from '../engine.js'
import { PRODUCTS } from '../products.js'

export const POLICY_INFO = POLICY
// 在你目前的處境,AI 學習型玩家會怎麼做(給規劃面板當參考)
export function learnedAdvice(s) {
  const rec = recommended(s)
  const buy = Object.entries(LEARNED.coverMap)
    .filter(([id, m]) => m > 0 && (rec[id] || 0) > 0 && (s.coverage[id] || 0) < Math.min(PRODUCTS[id].tiers.length - 1, (rec[id] || 0) + (m === 2 ? 1 : 0)))
    .map(([id]) => id)
  return { buy, buffer: LEARNED.buffer, invest: LEARNED.invest, investFrac: LEARNED.investFrac }
}
