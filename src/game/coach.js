// 教練提示:純規則,依目前的狀態替每個選項算出「預估結果」與「建議」。
// 教練只會說明利弊與數字,不會替你決定;小測驗不給答案。
import { PRODUCTS } from './products.js'
import { payoutFor } from './products.js'
import { analyzeGaps, householdIncome } from './core.js'
import { propById, mortgagePayment, rentOf, upgradeCost, propPremium, hazardTotal } from './properties.js'
import { hasCard } from './cards.js'

const w = (n) => `${Math.round(Math.abs(n) / 10000 * 10) / 10} 萬`
const liquidOf = (s) => s.cash + s.hold.deposit + s.hold.bond + s.hold.stock + s.hold.spec
const monthsOf = (s) => (s.cash + s.hold.deposit) / (s.expense / 12)
const yearsLeft = (s) => Math.max(0, s.years - s.turn)

// badge: 'best' 教練推薦 | 'warn' 要小心 | null
const P = (badge, text) => ({ badge, text })

// 這類事件對應哪些保障
const CAT_PRODUCTS = {
  medical: ['medical', 'daily'], critical: ['critical', 'cancer'], disability: ['disability'], accident: ['accident'],
  home: ['home'], liability: ['auto'], property: ['home'], career: ['disability'],
}

function eventTip(s, sc) {
  const b = sc.base
  const ids = CAT_PRODUCTS[sc.cat] || []
  const coverage = ids
    .map((id) => `${PRODUCTS[id].name}「${PRODUCTS[id].tiers[s.coverage[id] || 0].label}」`)
    .join('、')
  const any = ids.some((id) => (s.coverage[id] || 0) > 0)
  let summary = ids.length
    ? `這類風險對應的保障:${coverage}。${any ? '' : '目前沒有任何對應的保障,費用幾乎全要自己扛。'}`
    : '這類事件沒有對應的保險,要靠預備金。'
  if (hasCard(s, 'shield') && sc.cat !== 'family') summary += ' 你有「免災金牌」,會自動擋下這件事。'
  const rows = sc.choices.map((c) => {
    const med = Math.round((b.medical || 0) * (c.costMult ?? 1))
    const oth = Math.round((b.other || 0) * (c.otherMult ?? 1)) + (c.other || 0)
    const loss = c.loss || b.loss
    const ratio = loss ? loss.ratio * (c.lossMult ?? 1) : 0
    const yrs = loss ? loss.years : 0
    const pay = payoutFor(s.coverage, { cat: sc.cat, medicalCost: med, otherCost: oth, income: s.income, years: yrs || 3, accident: b.accident, cancer: b.cancer, carRepair: b.carRepair }).total
    const incomeLoss = Math.round(s.income * ratio * yrs)
    const net = med + oth - pay + incomeLoss
    return { net, med, oth, pay, incomeLoss }
  })
  const min = Math.min(...rows.map((r) => r.net))
  const max = Math.max(...rows.map((r) => r.net))
  const picks = rows.map((r) => {
    const parts = []
    if (r.med + r.oth > 0) parts.push(`花費約 ${w(r.med + r.oth)}`)
    if (r.pay > 0) parts.push(`保險賠約 ${w(r.pay)}`)
    if (r.incomeLoss > 0) parts.push(`收入損失約 ${w(r.incomeLoss)}`)
    const text = parts.length ? `預估:${parts.join('、')} → 你實際負擔約 ${w(Math.max(0, r.net))}` : ''
    // 多花錢通常換來更好的恢復,所以這裡不貼警告,只標出「負擔最低」
    const cheapest = rows.length > 1 && max - min > Math.max(20000, max * 0.08) && r.net === min
    return P(null, text && cheapest ? `${text}(負擔最低)` : text)
  })
  if (rows.length > 1 && sc.choices.some((c) => c.tag === 'upskill')) {
    const i = sc.choices.findIndex((c) => c.tag === 'upskill')
    picks[i] = P(picks[i].badge, `${picks[i].text}(進修是長期投資:收入 +6% 會持續好幾年)`)
  }
  return { summary, picks }
}

function marketTip(s, sc) {
  const { ret, rebound } = sc.base
  const risk = s.hold.stock + s.hold.spec
  const m = monthsOf(s)
  const down = ret < 0
  const summary = risk > 0
    ? `你的股票類資產約 ${w(risk)},預備金約 ${m.toFixed(1)} 個月。${down ? '下跌時最怕的不是帳面虧損,而是被迫在低點賣出。' : '上漲時別因為貪心而過度加碼。'}${rebound ? '(歷史上大跌之後常有反彈。)' : ''}`
    : '你目前沒有股票類資產,這次行情不影響你。可以先把預備金存到 6 個月再考慮進場。'
  const picks = sc.choices.map((c) => {
    if (c.tag === 'hold') return down ? (m >= 3 ? P('best', '預備金夠,抱緊持股、不賣在低點(長期持有者通常能等到反彈)') : P(null, '預備金偏少,持有的同時要先把現金補起來')) : P(m >= 3 ? 'best' : null, '繼續持有,讓複利替你工作')
    if (c.tag === 'sell') return down ? P('warn', '賣在低點會把帳面虧損變成真的虧損,還會錯過反彈(也會扣行為分)') : P(risk > 0 ? null : null, '獲利了結沒有錯,但別因為怕就全部賣光;分批調整比較穩')
    if (c.tag === 'buy') {
      if (m < 6 || s.loan > 0) return P('warn', `預備金只有 ${m.toFixed(1)} 個月${s.loan > 0 ? '、而且還有貸款' : ''},先別加碼`)
      return down ? P('best', '預備金充足、沒有高利負債,下跌時分批加碼是長期投資人的做法') : P(null, '上漲時加碼要克制,別追高')
    }
    return P(null, '')
  })
  return { summary, picks }
}

// 機會卡:依選項的效果估算
function fxValue(s, fx) {
  if (!fx) return 0
  let v = 0
  if (fx.cash) v += fx.cash
  if (fx.cashPct) v += Math.max(0, s.cash) * fx.cashPct
  if (fx.gamble) {
    const g = fx.gamble
    const amt = (part) => part.cash ?? Math.max(0, s.cash) * (part.cashPct || 0)
    v += g.lossP * amt(g.lose) + (1 - g.lossP) * amt(g.win)
  }
  if (fx.health) v += fx.health * 6000
  if (fx.expense) v -= fx.expense * Math.min(12, yearsLeft(s))
  if (fx.coverage) v += 40000
  if (fx.card) v += 30000
  return v
}

function fxText(s, fx, c) {
  const t = []
  if (!fx) return c.special ? '' : ''
  if (fx.gamble) t.push(`賭局:輸的機率約 ${Math.round(fx.gamble.lossP * 100)}%,期望值是${fxValue(s, fx) < 0 ? '負的' : '正的'}`)
  else if (fx.cashPct && fx.cashPct < 0) t.push(`會損失約 ${w(Math.max(0, s.cash) * -fx.cashPct)}`)
  else if (fx.cash) t.push(`${fx.cash > 0 ? '現金 +' : '現金 -'}${w(fx.cash)}`)
  if (fx.expense) t.push(`每年支出 ${fx.expense > 0 ? '增加' : '減少'} ${w(fx.expense)},累積起來很可觀`)
  if (fx.invest) t.push(`${fx.invest.cls === 'spec' ? '個股波動大,可能大賺也可能腰斬' : '分散投資的做法'}`)
  if (fx.coverage) t.push('補強保障缺口,通常是最划算的選擇')
  if (fx.card) t.push('獲得一張手牌,留著等對的時機自動生效')
  if (fx.health) t.push(`健康 ${fx.health > 0 ? '+' : ''}${fx.health}`)
  if (fx.lessonOnly) t.push('不動作、不花錢')
  return t.join(';')
}

function fxChoices(s, sc) {
  const vals = sc.choices.map((c) => fxValue(s, c.fx))
  const best = Math.max(...vals), worst = Math.min(...vals)
  const scam = ['scam_call', 'high_return'].includes(sc.defId)
  const gap = Math.max(10000, Math.abs(best) * 0.1)
  return sc.choices.map((c, i) => {
    let badge = null
    if (sc.choices.length > 1 && best - worst > gap) {
      if (vals[i] === best) badge = 'best'
      else if (vals[i] === worst && (worst < 0 || c.fx?.gamble)) badge = 'warn'
    }
    if (scam && c.fx?.lessonOnly) badge = 'best'
    if (scam && (c.fx?.gamble || (c.fx?.cashPct || 0) < 0)) badge = 'warn'
    return P(badge, fxText(s, c.fx, c))
  })
}

const SPECIAL_TIP = {
  marry: (s) => P(null, `結婚後家庭責任變重:壽險、失能險要重新檢視。${monthsOf(s) < 4 ? '你的預備金偏少,婚禮花費要量力而為。' : ''}`),
  baby: () => P(null, '多一個人的開銷,壽險、失能險與醫療險都要同步調高,這是保障需求最大的階段'),
  buyHouse: (s) => (monthsOf(s) < 6 ? P('warn', `預備金只有 ${monthsOf(s).toFixed(1)} 個月,頭期款與房貸壓力會很大;買了也要補住宅火險與地震險`) : P(null, '房貸每年固定扣款,記得投保住宅火險與地震險,房貸月付不要超過家庭收入的三分之一')),
  jobChange: () => P(null, '收入提高很好,但試用期的不確定性要有預備金撐著'),
  inheritHouse: () => P(null, '自住省租金、出租收租金,兩個方向都要留意修繕與保險'),
  retire: () => P('best', '退休金要長期準備,年金險加債券基金是穩健的方向'),
}

function milestoneTip(s, sc) {
  const fxs = fxChoices(s, sc)
  const picks = sc.choices.map((c, i) => (c.special && SPECIAL_TIP[c.special] ? SPECIAL_TIP[c.special](s) : fxs[i]))
  return { summary: `人生大事沒有標準答案,重點是「做完決定之後,預備金還夠不夠、保障要不要跟著調整」。你現在預備金約 ${monthsOf(s).toFixed(1)} 個月。`, picks }
}

function propertyTip(s, sc) {
  const base = sc.base
  const p = propById(base.propId)
  const m = monthsOf(s)
  const picks = sc.choices.map((c) => {
    if (c.tag === 'buy_cash') {
      const after = (liquidOf(s) - p.price) / (s.expense / 12)
      if (liquidOf(s) < p.price) return P('warn', '資金不夠,要賣掉投資甚至借款,風險很高')
      return after >= 6 ? P(null, `買完還有約 ${after.toFixed(1)} 個月生活費,租金報酬約 ${(p.yield * 100).toFixed(1)}%;記得投保財產險`) : P('warn', `買完只剩約 ${after.toFixed(1)} 個月生活費,現金太緊`)
    }
    if (c.tag === 'buy_loan') {
      const pay = mortgagePayment(p.price * 0.7)
      const rent = rentOf(p, 1)
      const down = p.price * 0.3
      const ok = liquidOf(s) - down >= 6 * (s.expense / 12) && pay <= householdIncome(s) * 0.25
      return P(ok ? 'best' : 'warn', `頭期款 ${w(down)},每年還款約 ${w(pay)}、租金約 ${w(rent)}${rent >= pay ? '(租金可以付房貸)' : '(租金不夠付房貸,要用薪水補)'}`)
    }
    if (c.tag === 'skip') return P(null, liquidOf(s) < p.price * 0.3 ? '你現在的資金還不夠,先不買是合理的' : '不買沒有風險,但也沒有租金;對手可能會買走')
    if (c.tag === 'upgrade') {
      const pr = s.props[p.id]
      const gain = rentOf(p, pr.level + 1) - rentOf(p, pr.level)
      const years = upgradeCost(p, pr.level) / Math.max(1, gain)
      return P(years <= 12 && m >= 4 ? 'best' : null, `約 ${years.toFixed(0)} 年可以靠多出來的租金回本${yearsLeft(s) < years ? '(但遊戲剩下的年數不夠回本)' : ''}`)
    }
    if (c.tag === 'insure') {
      const pr = s.props[p.id]
      return P('best', `年保費約 ${w(propPremium(pr.value))};天災年機率約 ${(hazardTotal(p) * 100).toFixed(1)}%,一次災損可能是 ${w(pr.value * 0.2)} 以上`)
    }
    if (c.tag === 'sell') return P(null, '變現後租金收入就沒了,除非現金吃緊,通常不需要賣')
    if (c.tag === 'pay') return P(null, '踩到別人的地,就是要付過路費;擁有自己的資產,就能收別人的')
    return P(null, '')
  })
  return { summary: `買資產前先算兩件事:買完預備金還剩幾個月、天災來了誰付錢。你現在預備金約 ${m.toFixed(1)} 個月。`, picks }
}

function shopTip(s, sc) {
  const m = monthsOf(s)
  const hasDebt = s.loan > 0
  const long = yearsLeft(s) >= 8
  const picks = sc.choices.map((c) => {
    const [kind, cls] = (c.tag || '').split(':')
    if (kind === 'buy' && cls === 'stock') return m >= 6 && !hasDebt && long ? P('best', '預備金夠、沒有高利負債、投資期間長,適合分批投資 ETF') : P('warn', `${m < 6 ? `預備金只有 ${m.toFixed(1)} 個月` : hasDebt ? '還有 7% 的貸款' : '剩下的年數不長'},股票類資產先別買太多`)
    if (kind === 'buy' && cls === 'bond') return P(m >= 4 ? null : null, '波動比股票小,適合中短期用不到的錢')
    if (kind === 'buy' && cls === 'deposit') return m < 6 ? P('best', '預備金還不夠,先放定存隨時能動用') : P(null, '安全但報酬低,長期可能輸給通膨')
    if (c.tag === 'skip') return m < 3 || hasDebt ? P('best', hasDebt ? '先還 7% 的貸款,比投資划算' : '現金太少,先保留') : P(null, '保留現金沒有錯,但閒置太多也會被通膨吃掉')
    return P(null, '')
  })
  return { summary: `看準自己的位置再投資:預備金 ${m.toFixed(1)} 個月${hasDebt ? `、貸款 ${w(s.loan)}` : ''}。`, picks }
}

function bankTip(s, sc) {
  const m = monthsOf(s)
  const picks = sc.choices.map((c) => {
    if (c.tag === 'borrow') return P('warn', '貸款利息 7% 是確定的成本,投資報酬卻不確定;沒有急用就不建議借')
    if (c.tag === 'repay') return P('best', '還 7% 的貸款,等於穩穩賺到 7%')
    if (c.tag === 'buy:deposit:0.4') return P(m < 6 && !s.loan ? 'best' : null, '定存利率低但安全,適合預備金')
    return P(null, '')
  })
  return { summary: s.loan > 0 ? `你有 ${w(s.loan)} 的貸款,利率 7% 通常比投資報酬更高,有餘錢先還。` : '沒有負債是最好的財務體質,不需要為了借錢而借錢。', picks }
}

function bonusTip(s, sc) {
  const gaps = analyzeGaps(s).gaps
  const m = monthsOf(s)
  const bestTag = gaps.length ? 'cover' : m < 6 ? 'save' : 'split'
  const text = { cover: gaps.length ? `補強缺口:${gaps[0].text}` : '目前沒有明顯缺口', save: `預備金 ${m.toFixed(1)} 個月,存起來最穩`, split: '預備金足夠,可以拿一半長期投資' }
  const picks = sc.choices.map((c) => P(c.tag === bestTag ? 'best' : null, text[c.tag] || ''))
  return { summary: '意外之財最容易被亂花。先看看:保障有沒有缺口?預備金夠不夠?', picks }
}

function advisorTip(s, sc) {
  const gaps = analyzeGaps(s).gaps
  return {
    summary: gaps.length ? `目前最大的缺口:${gaps[0].text}` : '目前保障大致到位。',
    picks: sc.choices.map((c) => (c.tag === 'accept' ? P('best', '理專的建議是依你的處境算出來的,先補最重要的缺口') : P(null, '自己決定也可以,但記得回到規劃把缺口補上'))),
  }
}

function hospitalTip(s, sc) {
  const picks = sc.choices.map((c) => {
    if (c.tag === 'full') return P(s.health < 85 || s.age >= 35 ? 'best' : null, '完整健檢花約 1.8 萬,早期發現成本低;健康時也是投保最划算的時機')
    if (c.tag === 'basic') return P(null, '基本健檢最划算的入門')
    return P(s.health < 70 ? 'warn' : null, '省下這筆錢,但健康差時別忽略身體訊號')
  })
  return { summary: `你目前的健康 ${Math.round(s.health)}。`, picks }
}

export function coachScene(s, sc) {
  if (!sc || sc.defId === 'hospital_rest') return null
  switch (sc.kind) {
    case 'event': return eventTip(s, sc)
    case 'market': return marketTip(s, sc)
    case 'chance': return { summary: '機會卡的重點:誘人的選項要先問「風險是什麼」、「最壞會怎樣」。', picks: fxChoices(s, sc) }
    case 'milestone': return milestoneTip(s, sc)
    case 'property': return propertyTip(s, sc)
    case 'shop': return shopTip(s, sc)
    case 'bank': return bankTip(s, sc)
    case 'bonus': return bonusTip(s, sc)
    case 'advisor': return advisorTip(s, sc)
    case 'hospital': return hospitalTip(s, sc)
    default: return null
  }
}

// ---------- 規劃面板的投資、貸款提示 ----------
export function coachInvest(s) {
  const out = []
  const m = monthsOf(s)
  const risk = s.hold.stock + s.hold.spec
  const total = liquidOf(s)
  if (m < 3) out.push({ tone: 'warn', text: `預備金只有 ${m.toFixed(1)} 個月,先存到至少 3~6 個月的生活費,再談投資。` })
  else if (m < 6) out.push({ tone: 'info', text: `預備金 ${m.toFixed(1)} 個月,離建議的 6 個月還有一點距離。` })
  else out.push({ tone: 'good', text: `預備金 ${m.toFixed(1)} 個月,安全墊夠了,多餘的錢可以考慮長期投資。` })
  if (s.loan > 0) out.push({ tone: 'warn', text: `你還有 ${w(s.loan)} 貸款,年利率約 7%。先還貸款,通常比投資更穩。` })
  if (total > 0) {
    const stockPct = Math.round((risk / total) * 100)
    const cap = Math.max(20, 100 - s.age)
    if (stockPct > cap + 10) out.push({ tone: 'warn', text: `股票類資產占投資 ${stockPct}%,以 ${s.age} 歲來說偏高(常見的參考是「100 − 年齡」約 ${cap}%)。` })
    else if (stockPct > 0) out.push({ tone: 'good', text: `股票類資產約占 ${stockPct}%,在合理範圍。` })
  }
  if (s.hold.spec > 0 && s.hold.spec / Math.max(1, total) > 0.1) out.push({ tone: 'warn', text: `熱門個股超過資產的 10%,波動很大,單一個股可能腰斬。` })
  if (s.hold.deposit > s.expense * 2 && s.hold.stock + s.hold.bond === 0) out.push({ tone: 'info', text: '錢全放在定存,安全但會輸給通膨,長期不用的錢可以分一部分到債券或 ETF。' })
  return out
}

export function coachLoan(s) {
  const out = []
  const hi = householdIncome(s)
  const ratio = s.loan / Math.max(1, hi)
  if (s.loan <= 0) out.push({ tone: 'good', text: '目前沒有信貸,這是最健康的狀態。' })
  else out.push({ tone: ratio > 0.8 ? 'warn' : 'info', text: `貸款相當於家庭年收入的 ${Math.round(ratio * 100)}%,利息每年約 ${w(s.loan * 0.07)}。${ratio > 0.8 ? '額度快用完了,再被迫借款就可能破產。' : ''}` })
  out.push({ tone: 'info', text: '借錢只在「保命」時才用(例如醫療急需),不要借來投資。額度用完而且資產賣光,就會破產出局。' })
  return out
}
