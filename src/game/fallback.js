// 離線備援:沒有 API 金鑰、網路中斷或額度用完時,仍能產出完整的回饋(規則式)。
import { PRODUCTS } from './products.js'
import { wan } from './format.js'
import { t, getLang } from '../i18n.js'

const J = (...a) => a.filter(Boolean).join(getLang() === 'en' ? ' ' : '')
const sep = () => (getLang() === 'en' ? ', ' : '、')
// 「未投保」是商品等級的中文原文;英文模式下報告裡可能已經是翻譯過的字串,兩種都要認得
const isNone = (x) => x === '未投保' || x === t('未投保')

const WHY = {
  life: () => t('一旦發生不幸,家人的生活費與房貸會立刻出現缺口'),
  disability: () => t('失能期間收入中斷,但生活開銷與房貸一天都不會少'),
  critical: () => t('重大傷病除了醫療費,更大的損失是長期的收入中斷'),
  medical: () => t('一次住院手術就可能吃掉好幾個月的儲蓄'),
  ltc: () => t('長期照顧的費用很高,而且會持續好幾年'),
  annuity: () => t('強迫儲蓄能幫你替未來預留一筆不會被花掉的資金'),
  accident: () => t('意外來得突然,車禍與骨折的傷害給付能補貼治療與收入損失'),
  home: () => t('房子是最大的資產,颱風與地震的損失靠保險才能轉移'),
}

export function advisorFallback(analysis, player) {
  const g = analysis.gaps[0]
  if (!g) return t('{name},目前的保障配置和你的處境很吻合,記得每年檢視一次,人生階段變了,保障也要跟著調整。', { name: player.name })
  const p = PRODUCTS[g.id]
  return t('我建議你優先處理「{product}」。{why}。先補上這一項,再來看其他缺口,保費也能維持在合理範圍(目前約占年收入 {ratio}%)。', { product: p.name, why: WHY[g.id]?.(), ratio: analysis.premiumRatio })
}

export function stageFallback(r) {
  const gaps = r.coverage.filter((c) => c.yours !== c.recommended && !isNone(c.recommended))
  const risk = []
  if (gaps.length) risk.push(t('保障缺口:{products}', { products: gaps.slice(0, 2).map((g) => t(g.product)).join(sep()) }))
  if (r.monthsCash < 3) risk.push(t('緊急預備金只有約 {m} 個月,低於 3 個月的安全線', { m: r.monthsCash }))
  if (r.loan > 0) risk.push(t('還有 {amt} 的貸款,利息會持續吃掉現金流', { amt: wan(r.loan) }))
  if (r.panicSells > 0) risk.push(t('曾在市場下跌時賣出,小心情緒影響決策'))
  const strengths = []
  if (r.net > 0) strengths.push(t('淨資產約 {amt},已經累積起來', { amt: wan(r.net) }))
  if (!gaps.length) strengths.push(t('保障配置與目前的人生階段相符'))
  if (r.recentClaims > 0) strengths.push(t('保險給付 {amt},在事件發生時發揮作用', { amt: wan(r.recentClaims) }))
  const lead = r.character.dependents > 0 ? t('家庭責任變重,') : r.character.married ? t('兩個人的生活,') : t('一個人的階段,')
  return {
    title: t('{age} 歲:階段回顧', { age: r.stageAge }),
    analysis: J(
      t('{lead}你目前的淨資產約 {net},現金約可支應 {m} 個月的生活費,保費約占家庭收入的 {pct}%。', { lead, net: wan(r.net), m: r.monthsCash, pct: r.premiumPct }),
      r.recentEvents.length ? t('這幾年經歷了「{title}」等事件,', { title: r.recentEvents[0].title }) : '',
      gaps.length ? t('保障上還有需要補強的地方,趁健康與預算允許時處理成本最低。') : t('保障與資產大致平衡,可以把重心放在長期累積。'),
    ),
    strengths: strengths.slice(0, 2),
    risks: risk.slice(0, 3),
    next: [
      gaps.length ? t('優先補強「{product}」', { product: gaps[0].product }) : t('每年檢視一次保障,配合人生階段調整'),
      r.monthsCash < 6 ? t('把緊急預備金提高到 3 到 6 個月') : t('把多餘現金分散到債券與股票型資產'),
      r.loan > 0 ? t('有餘裕時優先還高利貸款') : t('控制保費占收入 10% 到 15%'),
    ],
  }
}

export function coachFallback(report) {
  const { score, character, counterfactual: cf, coverage } = report
  const gaps = coverage
    .filter((c) => c.yours !== c.recommended && !isNone(c.recommended))
    .slice(0, 3)
    .map((c) => t('{product}:你選了「{yours}」,建議至少「{rec}」。', { product: c.product, yours: c.yours, rec: c.recommended }))

  const headline = t(score.archetype)
  let summary = t('{name}這一局得到 {total} 分({grade} 級)。', { name: character.name, total: score.total, grade: score.grade })
  if (score.family) {
    summary = J(summary, score.family.ratio >= 1
      ? t('不幸發生時,家人有足夠的資金渡過難關,這就是保障的價值。')
      : t('不幸發生時,家人可動用資金約為所需的 {pct}%,還有明顯缺口。', { pct: Math.round(score.family.ratio * 100) }))
  } else if (cf) {
    summary = J(summary, t('同樣的人生事件下,如果完全沒有保險,最後淨資產會是 {none};你的配置為 {yours};建議配置為 {rec}。', { none: wan(cf.none), yours: wan(cf.yours), rec: wan(cf.recommended) }))
  }
  if (score.shortfallYears > 0) summary += ' ' + t('期間有 {n} 年現金不夠、必須舉債,緊急預備金不足是主因。', { n: score.shortfallYears })

  const lessons = [
    t('保障要依人生階段調整:結婚、生子、買房之後,壽險與失能保障都需要重新檢視。'),
    score.avgEmergencyMonths < 3
      ? t('平均緊急預備金只有 {m} 個月,建議先存到 3 到 6 個月生活費。', { m: score.avgEmergencyMonths })
      : t('緊急預備金維持在約 {m} 個月,面對意外時才有緩衝空間。', { m: score.avgEmergencyMonths }),
    score.panicSells > 0
      ? t('市場下跌時恐慌賣出,常常會錯過後續的反彈,資產配置比擇時更重要。')
      : t('保費占年收入約 10% 到 15% 較為健康,先補最大的風險缺口,再談其他。'),
  ]
  const top = coverage.find((c) => c.yours !== c.recommended && !isNone(c.recommended))
  const scripts = [
    {
      scenario: t('客戶覺得「我還年輕,不需要保險」'),
      say: t('年輕時最大的資產是未來的收入,我們先看看如果生病或意外、收入中斷半年,你現在的存款可以撐多久?再一起評估要補哪一塊就好。'),
    },
    {
      scenario: top ? t('客戶對「{product}」有疑慮', { product: top.product }) : t('客戶擔心保費太高'),
      say: top
        ? t('我們不用一次補滿。先抓出對你家影響最大的風險,這一局的經驗顯示「{product}」是缺口,可以先從基本額度開始,日後再依收入調整。', { product: top.product })
        : t('保費的目標是控制在年收入的合理比例內。我們先排出風險優先順序,只買真正需要的,不必一次到位。'),
    },
  ]
  return {
    headline, summary, lessons, gaps, scripts,
    compliance: t('提醒:實際商品需依條款、核保與費率為準,說明時應如實揭露,避免保證收益或誇大保障。'),
  }
}
