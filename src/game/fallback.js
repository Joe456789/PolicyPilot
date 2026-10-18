// 離線備援:沒有 API 金鑰、網路中斷或額度用完時,仍能產出完整的回饋(規則式)。
import { PRODUCTS } from './products.js'
import { wan } from './format.js'

const WHY = {
  life: '一旦發生不幸,家人的生活費與房貸會立刻出現缺口',
  disability: '失能期間收入中斷,但生活開銷與房貸一天都不會少',
  critical: '重大傷病除了醫療費,更大的損失是長期的收入中斷',
  medical: '一次住院手術就可能吃掉好幾個月的儲蓄',
  ltc: '長期照顧的費用很高,而且會持續好幾年',
  annuity: '強迫儲蓄能幫你替未來預留一筆不會被花掉的資金',
  accident: '意外來得突然,車禍與骨折的傷害給付能補貼治療與收入損失',
  home: '房子是最大的資產,颱風與地震的損失靠保險才能轉移',
}

export function advisorFallback(analysis, player) {
  const g = analysis.gaps[0]
  if (!g) return `${player.name},目前的保障配置和你的處境很吻合,記得每年檢視一次,人生階段變了,保障也要跟著調整。`
  const p = PRODUCTS[g.id]
  return `我建議你優先處理「${p.name}」。${WHY[g.id]}。先補上這一項,再來看其他缺口,保費也能維持在合理範圍(目前約占年收入 ${analysis.premiumRatio}%)。`
}

export function stageFallback(r) {
  const gaps = r.coverage.filter((c) => c.yours !== c.recommended && c.recommended !== '未投保')
  const risk = []
  if (gaps.length) risk.push(`保障缺口:${gaps.slice(0, 2).map((g) => g.product).join('、')}`)
  if (r.monthsCash < 3) risk.push(`緊急預備金只有約 ${r.monthsCash} 個月,低於 3 個月的安全線`)
  if (r.loan > 0) risk.push(`還有 ${wan(r.loan)} 的貸款,利息會持續吃掉現金流`)
  if (r.panicSells > 0) risk.push('曾在市場下跌時賣出,小心情緒影響決策')
  const strengths = []
  if (r.net > 0) strengths.push(`淨資產約 ${wan(r.net)},已經累積起來`)
  if (!gaps.length) strengths.push('保障配置與目前的人生階段相符')
  if (r.recentClaims > 0) strengths.push(`保險給付 ${wan(r.recentClaims)},在事件發生時發揮作用`)
  const lead = r.character.dependents > 0 ? '家庭責任變重,' : r.character.married ? '兩個人的生活,' : '一個人的階段,'
  return {
    title: `${r.stageAge} 歲:階段回顧`,
    analysis: `${lead}你目前的淨資產約 ${wan(r.net)},現金約可支應 ${r.monthsCash} 個月的生活費,保費約占家庭收入的 ${r.premiumPct}%。` +
      (r.recentEvents.length ? `這幾年經歷了「${r.recentEvents[0].title}」等事件,` : '') +
      (gaps.length ? '保障上還有需要補強的地方,趁健康與預算允許時處理成本最低。' : '保障與資產大致平衡,可以把重心放在長期累積。'),
    strengths: strengths.slice(0, 2),
    risks: risk.slice(0, 3),
    next: [
      gaps.length ? `優先補強「${gaps[0].product}」` : '每年檢視一次保障,配合人生階段調整',
      r.monthsCash < 6 ? '把緊急預備金提高到 3 到 6 個月' : '把多餘現金分散到債券與股票型資產',
      r.loan > 0 ? '有餘裕時優先還高利貸款' : '控制保費占收入 10% 到 15%',
    ],
  }
}

export function coachFallback(report) {
  const { score, character, counterfactual: cf, coverage } = report
  const gaps = coverage
    .filter((c) => c.yours !== c.recommended && c.recommended !== '未投保')
    .slice(0, 3)
    .map((c) => `${c.product}:你選了「${c.yours}」,建議至少「${c.recommended}」。`)

  const headline = score.archetype
  let summary = `${character.name}這一局得到 ${score.total} 分(${score.grade} 級)。`
  if (score.family) {
    summary += score.family.ratio >= 1
      ? '不幸發生時,家人有足夠的資金渡過難關,這就是保障的價值。'
      : `不幸發生時,家人可動用資金約為所需的 ${Math.round(score.family.ratio * 100)}%,還有明顯缺口。`
  } else if (cf) {
    summary += `同樣的人生事件下,如果完全沒有保險,最後淨資產會是 ${wan(cf.none)};你的配置為 ${wan(cf.yours)};建議配置為 ${wan(cf.recommended)}。`
  }
  if (score.shortfallYears > 0) summary += ` 期間有 ${score.shortfallYears} 年現金不夠、必須舉債,緊急預備金不足是主因。`

  const lessons = [
    '保障要依人生階段調整:結婚、生子、買房之後,壽險與失能保障都需要重新檢視。',
    score.avgEmergencyMonths < 3
      ? `平均緊急預備金只有 ${score.avgEmergencyMonths} 個月,建議先存到 3 到 6 個月生活費。`
      : `緊急預備金維持在約 ${score.avgEmergencyMonths} 個月,面對意外時才有緩衝空間。`,
    score.panicSells > 0
      ? '市場下跌時恐慌賣出,常常會錯過後續的反彈,資產配置比擇時更重要。'
      : '保費占年收入約 10% 到 15% 較為健康,先補最大的風險缺口,再談其他。',
  ]
  const top = coverage.find((c) => c.yours !== c.recommended && c.recommended !== '未投保')
  const scripts = [
    {
      scenario: '客戶覺得「我還年輕,不需要保險」',
      say: '年輕時最大的資產是未來的收入,我們先看看如果生病或意外、收入中斷半年,你現在的存款可以撐多久?再一起評估要補哪一塊就好。',
    },
    {
      scenario: top ? `客戶對「${top.product}」有疑慮` : '客戶擔心保費太高',
      say: top
        ? `我們不用一次補滿。先抓出對你家影響最大的風險,這一局的經驗顯示「${top.product}」是缺口,可以先從基本額度開始,日後再依收入調整。`
        : '保費的目標是控制在年收入的合理比例內。我們先排出風險優先順序,只買真正需要的,不必一次到位。',
    },
  ]
  return {
    headline, summary, lessons, gaps, scripts,
    compliance: '提醒:實際商品需依條款、核保與費率為準,說明時應如實揭露,避免保證收益或誇大保障。',
  }
}
