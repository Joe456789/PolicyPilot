// 場景:依棋盤格子建立事件卡,並在玩家選擇後結算。
// 所有數字都在這裡(規則引擎)決定;AI 只會改寫文字。
import {
  EVENT_DEFS, CHANCE_DEFS, BONUS_DEFS, MILESTONE_DEFS, MARKET_DEFS, TIP_DEFS, QUIZ_DEFS,
} from './content.js'
import { PRODUCTS, payoutFor } from './products.js'
import { MINIGAMES, MINIGAME_IDS, MINIGAME_REWARD } from './minigames.js'
import {
  ASSETS, ASSET_ORDER, round1k, clamp, cover, canIncrease, analyzeGaps, householdIncome, holdingsTotal,
} from './core.js'

const wOf = (d, s) => (typeof d.w === 'function' ? d.w(s) : d.w ?? 1)
const seenCount = (s, id) => s.seen[id] || 0

// 相同卡片重複出現時降低權重,讓一局之中的內容更豐富。
function pickDef(s, rng, defs, { once = true } = {}) {
  const pool = defs.filter((d) => {
    if (d.minAge && s.age < d.minAge) return false
    if (d.minTurn && s.turn < d.minTurn) return false
    if (d.once && once && seenCount(s, d.id) > 0) return false
    if (d.req && !d.req(s)) return false
    return true
  })
  if (!pool.length) return null
  return rng.weighted(pool, (d) => wOf(d, s) / (1 + seenCount(s, d.id) * 1.2))
}

export function buildScene(s, rng, tile) {
  switch (tile.type) {
    case 'event': return buildEvent(s, rng)
    case 'chance': return buildChance(s, rng)
    case 'market': return buildMarket(s, rng)
    case 'bonus': return buildBonus(s, rng)
    case 'milestone': return buildMilestone(s, rng)
    case 'advisor': return buildAdvisor(s)
    case 'shop': return buildShop(s)
    case 'bank': return buildBank(s)
    case 'tax': return buildTax(s)
    case 'hospital': return buildHospital(s)
    case 'minigame': return buildMinigame(s, rng)
    case 'rest': return rng.next() < 0.6 ? buildQuiz(s, rng) : buildTip(s, rng)
    default: return buildTip(s, rng)
  }
}

const scene = (o) => ({ ai: false, aiable: false, tone: 'neutral', base: {}, ...o })

function buildEvent(s, rng) {
  const inflation = Math.pow(1.025, s.turn)
  const healthMult = 1 + (100 - s.health) / 120
  const pool = EVENT_DEFS.filter((d) => {
    if (d.minAge && s.age < d.minAge) return false
    if (d.minTurn && s.turn < d.minTurn) return false
    if (d.once && seenCount(s, d.id) > 0) return false
    if (d.req && !d.req(s)) return false
    return true
  })
  const d = rng.weighted(pool, (x) => {
    const w = wOf(x, s)
    return ['medical', 'critical', 'disability'].includes(x.cat) ? w * healthMult : w
  })
  const rangeVal = (r) => round1k(rng.int(r[0], r[1]) * inflation)
  return scene({
    kind: 'event', aiable: true, defId: d.id, cat: d.cat, icon: d.icon, tone: d.tone,
    title: d.title, story: d.story,
    base: {
      medical: d.medical ? rangeVal(d.medical) : 0,
      other: d.other ? rangeVal(d.other) : 0,
      loss: d.loss || null,
      accident: !!d.accident,
      recurring: d.recurring ? { ...d.recurring, amount: round1k(d.recurring.amount * inflation) } : null,
      healthHit: d.healthHit || 0,
    },
    choices: d.choices.map((c) => ({ ...c })),
  })
}

function buildChance(s, rng) {
  const d = pickDef(s, rng, CHANCE_DEFS)
  return scene({
    kind: 'chance', aiable: true, defId: d.id, icon: d.icon, tone: 'neutral', title: d.title, story: d.story,
    base: { lesson: d.lesson },
    choices: d.choices.map((c) => ({ ...c })),
  })
}

function buildMarket(s, rng) {
  const m = pickDef(s, rng, MARKET_DEFS, { once: false })
  const up = m.ret >= 0
  const hasRisk = s.hold.stock + s.hold.spec > 0
  return scene({
    kind: 'market', defId: m.id, icon: m.icon, tone: up ? 'good' : 'bad', title: m.title,
    story: m.story + (hasRisk ? '' : '(你目前沒有持有股票類資產,這次和你的資產無關,但也許是個進場的機會。)'),
    base: { ret: m.ret, rebound: m.rebound, house: m.house ?? null },
    choices: [
      { label: '繼續持有,耐心等待', hint: '不動作', tag: 'hold' },
      { label: up ? '獲利了結,賣出股票類資產' : '先賣出,避免再跌', hint: '把股票與個股轉成現金', tag: 'sell' },
      { label: '趁機加碼(現金的 30% 買 ETF)', hint: '提高股票型 ETF 部位', tag: 'buy' },
    ],
  })
}

function buildBonus(s, rng) {
  const b = pickDef(s, rng, BONUS_DEFS, { once: false })
  const amount = b.pct ? round1k(s.income * rng.range(b.pct[0], b.pct[1])) : round1k(rng.int(b.amount[0], b.amount[1]))
  return scene({
    kind: 'bonus', defId: b.id, icon: b.icon, tone: 'good', title: b.title,
    story: `${b.story}(約 ${Math.max(1, Math.round(amount / 10000))} 萬元)`,
    base: { amount },
    choices: [
      { label: '全部存進現金', hint: '提高緊急預備金', tag: 'save' },
      { label: '一半存起來、一半買股票型 ETF', hint: '分散運用', tag: 'split' },
      { label: '拿來補強保障缺口', hint: '加保最重要的一項', tag: 'cover' },
    ],
  })
}

function buildMilestone(s, rng) {
  const m = pickDef(s, rng, MILESTONE_DEFS, { once: true })
  if (!m) return buildTip(s, rng)
  return scene({
    kind: 'milestone', aiable: true, defId: m.id, icon: m.icon, tone: 'neutral', title: m.title, story: m.story,
    base: { lesson: m.lesson }, choices: m.choices.map((c) => ({ ...c })),
  })
}

function buildAdvisor(s) {
  const analysis = analyzeGaps(s)
  const top = analysis.gaps[0]
  return scene({
    kind: 'advisor', defId: 'advisor', icon: '🧑‍💼',
    title: '理專諮詢時間',
    story: top
      ? `理專幫你做了保障健檢,最大的缺口是「${PRODUCTS[top.id].name}」。`
      : '理專檢視你的保障配置,目前沒有明顯的缺口,做得很好!',
    base: { analysis },
    choices: top
      ? [
          { label: '採納建議,補強缺口', hint: '自動加保最重要的 2 項', tag: 'accept' },
          { label: '我自己決定', hint: '回到規劃再調整', tag: 'skip' },
        ]
      : [{ label: '很好,繼續前進', hint: '', tag: 'skip' }],
  })
}

const buffer = (s) => s.expense * 0.25
const spendable = (s, pct) => Math.max(0, round1k(Math.min(s.cash * pct, s.cash - buffer(s))))

function buildShop(s) {
  const etf = spendable(s, 0.25), bond = spendable(s, 0.25), dep = spendable(s, 0.3)
  const w = (n) => `${Math.round(n / 10000)} 萬`
  return scene({
    kind: 'shop', defId: 'shop', icon: '🛒', title: '理財商城:本週熱門商品',
    story: '櫃檯推薦了幾種商品。投資是為了累積資產,但別忘了:賺錢的是投資,擋風險的是保險。',
    base: {},
    choices: [
      { label: `買股票型 ETF(${w(etf)})`, hint: '長期報酬較高,波動大', tag: 'buy:stock:0.25' },
      { label: `買債券基金(${w(bond)})`, hint: '波動較小', tag: 'buy:bond:0.25' },
      { label: `轉入定存(${w(dep)})`, hint: '幾乎不波動', tag: 'buy:deposit:0.3' },
      { label: '先不買', hint: '保留現金', tag: 'skip' },
    ],
  })
}

function buildBank(s) {
  const hasLoan = s.loan > 0
  return scene({
    kind: 'bank', defId: 'bank', icon: '🏦', title: '銀行櫃檯',
    story: hasLoan
      ? `你目前有 ${Math.round(s.loan / 10000)} 萬的貸款,利率約 7%。要不要先還一部分?`
      : '行員向你介紹信用貸款:最高 30 萬、年利率約 7%。借錢可以投資,但報酬不確定,利息卻是確定的。',
    base: {},
    choices: hasLoan
      ? [
          { label: '還款(現金的一半)', hint: '減少利息支出', tag: 'repay' },
          { label: '把閒置現金轉定存', hint: '賺取 1.5% 利息', tag: 'buy:deposit:0.4' },
          { label: '維持現狀', hint: '不動作', tag: 'skip' },
        ]
      : [
          { label: '辦信貸 30 萬', hint: '現金增加,年利率 7%', tag: 'borrow' },
          { label: '把閒置現金轉定存', hint: '賺取 1.5% 利息', tag: 'buy:deposit:0.4' },
          { label: '維持現狀', hint: '不動作', tag: 'skip' },
        ],
  })
}

const BRACKETS = [[560000, 0.05], [1260000, 0.12], [2520000, 0.2], [4720000, 0.3], [Infinity, 0.4]]
export function taxFor(s) {
  const taxable = Math.max(0, householdIncome(s) * 0.55 - (s.partner ? 0 : 0))
  const rate = BRACKETS.find(([cap]) => taxable <= cap)[1]
  return { taxable, rate, tax: round1k(taxable * rate) }
}

function buildTax(s) {
  const t = taxFor(s)
  return scene({
    kind: 'tax', defId: 'tax', icon: '🧾', title: '年度綜合所得稅申報',
    story: '又到了報稅季。除了稅款,人身保險費也能列舉扣除(每人每年有上限),保險不只是保障,也有稅務上的考量。',
    base: t,
    choices: [{ label: '完成申報', hint: `稅率約 ${Math.round(t.rate * 100)}%`, tag: 'ok' }],
  })
}

function buildHospital(s) {
  return scene({
    kind: 'hospital', defId: 'hospital', icon: '🏥', title: '健康檢查日',
    story: '趁著健康好好檢查一下吧。早期發現,治療成本通常更低;但別忘了,健康時才買得到最划算的保障。',
    base: {},
    choices: [
      { label: '完整健檢', hint: '約 1.8 萬,健康 +12,降低未來重病風險', tag: 'full' },
      { label: '基本健檢', hint: '約 6 千,健康 +5', tag: 'basic' },
      { label: '太忙了,不去', hint: '不動作', tag: 'skip' },
    ],
  })
}

function buildMinigame(s, rng) {
  const ids = [...MINIGAME_IDS, 'quiz']
  const id = rng.weighted(ids, (g) => 1 / (1 + seenCount(s, 'mg_' + g) * 1.5))
  s.seen['mg_' + id] = (s.seen['mg_' + id] || 0) + 1
  if (id === 'quiz') return buildQuiz(s, rng)
  const m = MINIGAMES[id]
  return scene({
    kind: 'minigame', defId: 'mgplay_' + id, icon: m.icon, tone: 'neutral', title: m.title, story: m.blurb,
    base: { game: id }, choices: [{ label: '開始挑戰', hint: '', tag: 'play' }],
  })
}

function buildQuiz(s, rng) {
  const unseen = QUIZ_DEFS.map((q, i) => i).filter((i) => !s.seen['quiz' + i])
  const idx = unseen.length ? rng.pick(unseen) : rng.int(0, QUIZ_DEFS.length - 1)
  const q = QUIZ_DEFS[idx]
  return scene({
    kind: 'quiz', defId: 'quiz' + idx, icon: '🎓', title: '保險小學堂:搶答時間',
    story: q.q, base: { idx },
    choices: q.options.map((o, i) => ({ label: o, hint: '', tag: i === q.answer ? 'right' : 'wrong' })),
  })
}

function buildTip(s, rng) {
  const t = rng.pick(TIP_DEFS)
  return scene({
    kind: 'tip', defId: 'tip', icon: t.icon, title: t.title, story: t.story, base: {},
    choices: [{ label: '學到了', hint: '', tag: 'ok' }],
  })
}

// ======================= 結算 =======================

export function resolveScene(s, rng, sc, choice, add, opts = {}) {
  s.seen[sc.defId] = (s.seen[sc.defId] || 0) + 1
  switch (sc.kind) {
    case 'event': return resolveEvent(s, sc, choice, add)
    case 'market': return resolveMarket(s, sc, choice, add)
    case 'bonus': return resolveBonus(s, sc, choice, add)
    case 'advisor': return resolveAdvisor(s, choice, add)
    case 'shop':
    case 'bank': return resolveFinance(s, choice, add)
    case 'tax': return resolveTax(s, sc, add)
    case 'hospital': return resolveHospital(s, choice, add)
    case 'quiz': return resolveQuiz(s, sc, choice, add)
    case 'minigame': return resolveMinigame(s, sc, add, opts)
    case 'chance':
    case 'milestone': return resolveFxScene(s, rng, sc, choice, add)
    default: return undefined
  }
}

function resolveEvent(s, sc, choice, add) {
  const b = sc.base
  const medicalCost = Math.round((b.medical || 0) * (choice.costMult ?? 1))
  const otherCost = Math.round((b.other || 0) * (choice.otherMult ?? 1)) + (choice.other || 0)
  const loss = choice.loss || b.loss
  const lossRatio = loss ? loss.ratio * (choice.lossMult ?? 1) : 0
  const lossYears = loss ? loss.years : 0

  if (sc.cat === 'death') return resolveDeath(s, add)

  const payout = payoutFor(s.coverage, {
    cat: sc.cat, medicalCost, otherCost, income: s.income, years: lossYears || 3, accident: b.accident,
  })
  if (medicalCost) { s.cash -= medicalCost; add('醫療與治療費用', -medicalCost) }
  if (otherCost) {
    s.cash -= otherCost
    add(sc.cat === 'family' ? '教育費用' : sc.cat === 'home' ? '房屋修繕費用' : '額外支出', -otherCost)
  }
  const pays = [
    ['medical', '醫療險給付'], ['lump', '重大傷病險給付'], ['disability', '失能所得補償給付'],
    ['ltc', '長照險給付'], ['accident', '意外險給付'], ['home', '住宅火險給付'],
  ]
  for (const [k, label] of pays) {
    if (payout[k]) { s.cash += payout[k]; add(label, payout[k], 'cover') }
  }
  if (lossRatio > 0) {
    s.effects.push({ ratio: lossRatio, yearsLeft: lossYears, label: sc.title })
    add(`收入中斷:每年少 ${Math.round(lossRatio * 100)}%,持續 ${lossYears} 年`, 0, 'note')
  }
  if (b.recurring) {
    const amount = Math.round(b.recurring.amount * (choice.recurMult ?? 1))
    s.recurring.push({ amount, yearsLeft: b.recurring.years, label: b.recurring.label })
    add(`${b.recurring.label}:每年 ${Math.round(amount / 10000)} 萬,持續 ${b.recurring.years} 年`, 0, 'note')
  }
  if (choice.tag === 'upskill') s.income = Math.round(s.income * 1.06)
  const hit = (b.healthHit || 0) * (choice.health ?? 1)
  if (hit) s.health = Math.max(5, s.health - hit)
  if (sc.cat === 'critical' || sc.cat === 'disability') {
    s.blocked.critical = s.blocked.disability = s.blocked.medical = true
    add('已有傷病紀錄:相關保障日後無法再加保', 0, 'warn')
  }
  s.year.shockCost += medicalCost + otherCost
  s.year.payout += payout.total
  s.year.shocks.push({
    cat: sc.cat, medicalCost, otherCost, income: s.income, years: lossYears || 3, accident: b.accident,
  })
  if (!payout.total && (medicalCost + otherCost) > 0 && sc.cat !== 'family') {
    add('這次沒有任何保險給付,全部由自己承擔', 0, 'warn')
  }
}

function resolveDeath(s, add) {
  const payout = payoutFor(s.coverage, { cat: 'death' })
  const yearsSupport = s.dependents > 0 ? 12 : s.partner ? 8 : 5
  const mortgage = s.house ? s.house.balance : 0
  const need = s.expense * yearsSupport + mortgage + s.loan
  const funds = s.cash + holdingsTotal(s) + s.savings + (s.house ? s.house.value : 0) + payout.life
  s.year.payout += payout.life
  s.year.shocks.push({ cat: 'death', medicalCost: 0, otherCost: 0, income: s.income, years: 0 })
  add('壽險身故給付', payout.life, 'cover')
  add('家人未來生活所需(生活費+房貸+負債)', -Math.round(need), 'out')
  add('家人可動用資金(含保險金與房產)', Math.round(funds), 'in')
  s.ended = {
    reason: 'death', need: Math.round(need), funds: Math.round(funds),
    ratio: Math.round((funds / need) * 100) / 100, payout: payout.life, yearsSupport,
  }
}

function riskHoldings(s) { return s.hold.stock + s.hold.spec }

function resolveMarket(s, sc, choice, add) {
  const { ret, rebound, house } = sc.base
  s.year.marketReturn = ret
  s.year.houseChange = house
  s.newBonus = rebound
  if (choice.tag === 'sell' && riskHoldings(s) > 0) {
    const f = (r) => 1 + r * 0.8
    const stockVal = Math.round(s.hold.stock * f(ret))
    const specVal = Math.round(s.hold.spec * f(ret * 1.5))
    const before = riskHoldings(s)
    s.cash += stockVal + specVal
    s.hold.stock = 0
    s.hold.spec = 0
    s.newBonus = 0
    add(`賣出股票類資產(以接近谷底的價格成交)`, stockVal + specVal - before, stockVal + specVal >= before ? 'in' : 'out')
    if (ret < 0) s.panicSells++
    add('已轉為現金,錯過後續的反彈', 0, 'note')
    return
  }
  if (ret < 0 && riskHoldings(s) > 0) s.crashesHeld++
  if (choice.tag === 'buy') {
    const amt = spendable(s, 0.3)
    if (amt > 0) {
      s.cash -= amt
      s.hold.stock += amt
      add('加碼股票型 ETF', -amt, 'note')
    } else add('現金不足,無法加碼', 0, 'note')
  } else add('選擇持有,等待市場', 0, 'note')
  add(`今年股市整體 ${ret >= 0 ? '+' : ''}${Math.round(ret * 100)}%(於年底結算)`, 0, ret >= 0 ? 'in' : 'out')
  if (house) add(`房市 ${house > 0 ? '+' : ''}${Math.round(house * 100)}%${s.house ? '(影響你的房產價值)' : ''}`, 0, 'note')
}

function topGaps(s, n) {
  return analyzeGaps(s).gaps.filter((g) => !g.blocked).slice(0, n)
}

function resolveBonus(s, sc, choice, add) {
  const amount = sc.base.amount
  if (choice.tag === 'split') {
    const half = Math.round(amount / 2)
    s.cash += amount - half
    s.hold.stock += half
    add('存入現金', amount - half)
    add('買入股票型 ETF', half)
  } else if (choice.tag === 'cover') {
    s.cash += amount
    add('存入現金', amount)
    const gaps = topGaps(s, 1)
    if (!gaps.length) add('目前沒有可補強的缺口,錢先留著當預備金', 0, 'note')
    for (const g of gaps) {
      s.coverage[g.id] = g.need
      add(`已加保:${PRODUCTS[g.id].name}(${PRODUCTS[g.id].tiers[g.need].label})`, 0, 'cover')
    }
  } else {
    s.cash += amount
    add('存入現金', amount)
  }
}

function resolveAdvisor(s, choice, add) {
  s.advisorUsed++
  if (choice.tag !== 'accept') return add('你決定自己規劃', 0, 'note')
  const gaps = topGaps(s, 2)
  if (!gaps.length) add('目前沒有可以補強的項目', 0, 'note')
  for (const g of gaps) {
    s.coverage[g.id] = g.need
    add(`已加保:${PRODUCTS[g.id].name}(${PRODUCTS[g.id].tiers[g.need].label})`, 0, 'cover')
  }
}

function buyAsset(s, cls, pct, add) {
  const amt = spendable(s, pct)
  if (amt <= 0) return add('現金不足(需保留緊急預備金),無法購買', 0, 'note')
  s.cash -= amt
  s.hold[cls] += amt
  add(`買入${ASSETS[cls].name}`, -amt, 'note')
}

function resolveFinance(s, choice, add) {
  const tag = choice.tag
  if (tag.startsWith('buy:')) {
    const [, cls, pct] = tag.split(':')
    return buyAsset(s, cls, Number(pct), add)
  }
  if (tag === 'borrow') {
    s.cash += 300000
    s.loan += 300000
    add('撥款入帳', 300000)
    add('提醒:這筆錢需要付 7% 的利息,用來投資要先想清楚', 0, 'warn')
  } else if (tag === 'repay') {
    const amt = Math.min(s.loan, Math.max(0, round1k(s.cash * 0.5)))
    s.cash -= amt
    s.loan -= amt
    add('提前還款', -amt, 'note')
  } else add('維持現狀', 0, 'note')
}

function resolveTax(s, sc, add) {
  const { rate, tax } = sc.base
  const personal = Math.min(24000, Object.keys(s.coverage).reduce((a, id) => a + (s.coverage[id] ? PRODUCTS[id].tiers[s.coverage[id]].premium : 0), 0))
  const saved = Math.round(personal * rate)
  const net = Math.max(0, tax - saved)
  s.cash -= net
  add(`綜合所得稅(稅率約 ${Math.round(rate * 100)}%)`, -tax)
  if (saved > 0) add(`保險費列舉扣除,節稅`, saved, 'cover')
  add('人身保險費每人每年可列舉扣除約 2.4 萬(簡化說明,以最新稅法為準)', 0, 'note')
}

function resolveHospital(s, choice, add) {
  if (choice.tag === 'full') {
    s.cash -= 18000
    s.health = Math.min(100, s.health + 12)
    s.checkupYears = 2
    add('完整健檢費用', -18000)
    add('健康 +12,接下來兩年重病風險降低', 0, 'cover')
  } else if (choice.tag === 'basic') {
    s.cash -= 6000
    s.health = Math.min(100, s.health + 5)
    add('基本健檢費用', -6000)
  } else add('你選擇不去健檢', 0, 'note')
}

function resolveQuiz(s, sc, choice, add) {
  const { idx } = sc.base
  const q = QUIZ_DEFS[idx]
  s.quizTotal++
  if (choice.tag === 'right') {
    s.quizRight++
    s.cash += 10000
    add('答對了!獲得獎金', 10000, 'cover')
  } else add(`答錯了。正確答案:${q.options[q.answer]}`, 0, 'warn')
  add(q.why, 0, 'lesson')
}

function resolveMinigame(s, sc, add, opts) {
  const m = MINIGAMES[sc.base.game]
  const stars = clamp(Math.round(opts.stars ?? 1), 0, 3)
  const reward = MINIGAME_REWARD[stars]
  s.miniPlayed++
  s.miniStars += stars
  if (stars === 3) s.miniPerfect++
  s.cash += reward
  add(`完成「${m.title}」:${stars ? '⭐'.repeat(stars) : '再接再厲'}`, 0, stars ? 'in' : 'note')
  if (reward) add('小遊戲獎金', reward, 'cover')
  if (opts.note) add(opts.note, 0, 'note')
  add(m.lesson, 0, 'lesson')
}

// ---- 機會卡與里程碑:以 fx 描述效果 ----
function resolveFxScene(s, rng, sc, choice, add) {
  if (choice.special) specials[choice.special](s, rng, add)
  const fx = choice.fx
  if (fx) applyFx(s, rng, fx, add)
  if (sc.base.lesson) add(sc.base.lesson, 0, 'lesson')
}

function applyFx(s, rng, fx, add) {
  if (fx.cash) { s.cash += fx.cash; add(fx.cash > 0 ? '收入' : '花費', fx.cash) }
  if (fx.cashPct) {
    const amt = round1k(Math.max(0, s.cash) * fx.cashPct)
    s.cash += amt
    if (amt) add(amt > 0 ? '收入' : '損失', amt)
  }
  if (fx.invest) {
    const amt = spendable(s, fx.invest.pct)
    if (amt > 0) { s.cash -= amt; s.hold[fx.invest.cls] += amt; add(`買入${ASSETS[fx.invest.cls].name}`, -amt, 'note') }
    else add('現金不足,無法投入', 0, 'note')
  }
  if (fx.gamble) {
    const g = fx.gamble
    const lose = rng.next() < g.lossP
    const part = lose ? g.lose : g.win
    const amt = part.cash ?? round1k(Math.max(0, s.cash) * (part.cashPct || 0))
    s.cash += amt
    if (lose) add(`結果:血本無歸,損失 ${Math.round(Math.abs(amt) / 10000)} 萬`, amt, 'out')
    else add(amt ? `結果:這次運氣不錯` : '結果:對方準時還了錢', amt, 'in')
  }
  if (fx.expense) { s.expense += fx.expense; add(`每年支出 ${fx.expense > 0 ? '+' : ''}${Math.round(fx.expense / 10000 * 10) / 10} 萬`, 0, 'note') }
  if (fx.expenseMult) s.expense = Math.round(s.expense * fx.expenseMult)
  if (fx.incomeMult) { s.income = Math.round(s.income * fx.incomeMult); add(`年收入調整為約 ${Math.round(s.income / 10000)} 萬`, 0, 'in') }
  if (fx.health) { s.health = clamp(s.health + fx.health, 5, 100); }
  if (fx.checkup) s.checkupYears = 2
  if (fx.coverage) {
    if (fx.coverage === 'topGap') {
      const g = topGaps(s, 1)[0]
      if (g) { s.coverage[g.id] = g.need; add(`已加保:${PRODUCTS[g.id].name}(${PRODUCTS[g.id].tiers[g.need].label})`, 0, 'cover') }
      else add('目前沒有可補強的缺口', 0, 'note')
    } else {
      const { id, tier } = fx.coverage
      if (!canIncrease(s, id)) add('這項保障已無法加保', 0, 'warn')
      else if ((s.coverage[id] || 0) < tier) { s.coverage[id] = tier; add(`已加保:${PRODUCTS[id].name}(${PRODUCTS[id].tiers[tier].label})`, 0, 'cover') }
    }
  }
}

const specials = {
  marry(s, rng, add) {
    s.partner = { income: round1k(s.income * rng.range(0.7, 1.1)) }
    s.cash -= 300000
    s.expense += Math.round(s.expense * 0.4 / 1000) * 1000
    add('婚禮與新家花費', -300000)
    add(`配偶年收入約 ${Math.round(s.partner.income / 10000)} 萬,家庭支出同步增加`, 0, 'note')
    add('兩個人互為依靠,壽險與失能保障需要重新檢視', 0, 'warn')
  },
  baby(s, rng, add) {
    s.dependents += 1
    s.cash -= 100000
    s.expense += 180000
    add('新生兒一次性花費', -100000)
    add('每年生活支出增加 18 萬', 0, 'note')
    add('責任變重了,記得檢視壽險與失能保障', 0, 'warn')
  },
  buyHouse(s, rng, add) {
    const price = clamp(round1k(householdIncome(s) * 7), 5000000, 18000000)
    const down = Math.round(price * 0.2)
    if (s.cash + holdingsTotal(s) < down) {
      add(`頭期款需要約 ${Math.round(down / 10000)} 萬,目前資金不足,這次買不起`, 0, 'warn')
      s.seen.house_buy = 0
      return
    }
    const balance = price - down
    const rate = 0.022
    const n = 30
    const payment = Math.round((balance * rate) / (1 - Math.pow(1 + rate, -n)))
    const rentSaved = round1k(price * 0.02)
    s.cash -= down
    cover(s)
    s.house = { price, value: price, balance, rate, payment, yearsLeft: n }
    s.expense = Math.max(Math.round(s.expense * 0.5), s.expense - rentSaved)
    add(`買房頭期款(房價約 ${Math.round(price / 10000)} 萬)`, -down)
    add(`房貸 ${Math.round(balance / 10000)} 萬,每年還款約 ${Math.round(payment / 10000 * 10) / 10} 萬`, 0, 'note')
    add('擁有房子後:房貸壓力、天災風險都變大,記得檢視壽險與住宅火險', 0, 'warn')
  },
  jobChange(s, rng, add) {
    s.income = Math.round(s.income * 1.15)
    s.effects.push({ ratio: 0.1, yearsLeft: 1, label: '新工作試用期' })
    add(`年收入調整為約 ${Math.round(s.income / 10000)} 萬(第一年試用期打 9 折)`, 0, 'in')
  },
  retire(s, rng, add) {
    if (canIncrease(s, 'annuity') && (s.coverage.annuity || 0) < 1) {
      s.coverage.annuity = 1
      add('已加保:儲蓄年金險(年繳 6 萬)', 0, 'cover')
    }
    buyAsset(s, 'bond', 0.25, add)
  },
}
