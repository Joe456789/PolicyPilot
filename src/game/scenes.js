// 場景:依棋盤格子建立事件卡,並在玩家選擇後結算。
// 所有數字都在這裡(規則引擎)決定;AI 只會改寫文字。
import { tagMult } from './tags.js'
import { t, trDeep, getLang } from '../i18n.js'
import { CARDS, giveCard, hasCard, useCard } from './cards.js'
import { minorById } from './minor.js'
import { stageById, KID_NAMES } from './lifestages.js'
import {
  EVENT_DEFS, CHANCE_DEFS, BONUS_DEFS, MILESTONE_DEFS, MARKET_DEFS, TIP_DEFS, QUIZ_DEFS,
} from './content.js'
import { PRODUCTS, payoutFor } from './products.js'
import { MINIGAMES, MINIGAME_IDS, MINIGAME_REWARD } from './minigames.js'
import { areaById, ownsArea, AREA_BONUS, AREA_NEED, areaCount } from './properties.js'
import { propByTile, propById, LEVELS, rentOf, tollOf, upgradeCost, propPremium, mortgagePayment, localNews, baseRent, RISK_NAME } from './properties.js'
import {
  ASSETS, ASSET_ORDER, round1k, clamp, cover, canIncrease, analyzeGaps, householdIncome, holdingsTotal,
} from './core.js'

const wOf = (d, s) => (typeof d.w === 'function' ? d.w(s) : d.w ?? 1) * tagMult(s, d)
const seenCount = (s, id) => s.seen[id] || 0
// 前幾局剛看過的內容,權重降到 3 成,減少重複感
const recentMult = (s, id) => ((s.recent || []).includes(id) ? 0.3 : 1)

// 相同卡片重複出現時降低權重,讓一局之中的內容更豐富。
// 退休之後不會再遇到的職場事件
const WORK_ONLY = ['burnout', 'jobloss', 'promotion', 'job_change', 'mba']
function pickDef(s, rng, defs, { once = true } = {}) {
  const pool = defs.filter((d) => {
    if (s.retired && WORK_ONLY.includes(d.id)) return false
    if (d.minAge && s.age < d.minAge) return false
    if (d.minTurn && s.turn < d.minTurn) return false
    if (d.once && once && seenCount(s, d.id) > 0) return false
    if (d.req && !d.req(s)) return false
    return true
  })
  if (!pool.length) return null
  return rng.weighted(pool, (d) => (wOf(d, s) * recentMult(s, d.id)) / (1 + seenCount(s, d.id) * 1.2))
}

// 場景建好之後統一翻譯(英文模式):資料檔(content.js)來的靜態文字在這裡轉成英文;中文模式原樣回傳。
export function buildScene(s, rng, tile, world = {}) {
  return trDeep(buildSceneRaw(s, rng, tile, world))
}

function buildSceneRaw(s, rng, tile, world = {}) {
  switch (tile.type) {
    case 'property': return buildProperty(s, rng, tile, world)
    case 'event': return buildEvent(s, rng)
    case 'chance': return rng.next() < 0.7 ? buildChance(s, rng) : buildBonus(s, rng)
    case 'market': return buildMarket(s, rng)
    case 'bonus': return buildBonus(s, rng)
    case 'milestone': return buildMilestone(s, rng)
    case 'advisor': return buildAdvisor(s)
    case 'shop': return buildShop(s)
    case 'bank': return buildBank(s)
    case 'tax': return buildTax(s)
    case 'hospital': return buildHospital(s, rng)
    case 'minigame': return buildMinigame(s, rng)
    case 'quiz': return buildQuiz(s, rng)
    case 'rest': return rng.next() < 0.6 ? buildQuiz(s, rng) : buildTip(s, rng)
    default: return buildTip(s, rng)
  }
}

// 中文全形括號、頓號在英文要換成半形
const paren = (a, b) => (getLang() === 'en' ? `${a} (${b})` : `${a}(${b})`)
const scene = (o) => ({ ai: false, aiable: false, tone: 'neutral', base: {}, ...o })


// 住院休養中的回合:不擲骰,身體慢慢恢復,收入打折。
export function buildHospitalRest(s) {
  const inflation = Math.pow(1.025, s.turn)
  const left = s.hospitalTurns
  return scene({
    kind: 'event', cat: 'medical', defId: 'hospital_rest', icon: '🛌', tone: 'neutral', title: t('住院休養中'),
    story: t('這一年你都在醫院與家裡休養,無法正常工作。{more}', { more: left > 0 ? t('之後還要再休養 {n} 個回合。', { n: left }) : t('醫生說這是最後一個休養的回合,下一回合就能回到棋盤上。') }),
    base: { medical: round1k(25000 * inflation), other: 0, loss: { ratio: 0.2, years: 1 }, rest: true },
    choices: [{ label: t('好好休養'), hint: t('健康 +12,今年收入少 2 成') }],
  })
}

// ---------- 資產格 ----------
const wan = (n) => `${Math.round(n / 10000).toLocaleString('en-US')} 萬` // i18n-ignore:數字 + 萬,t() 會在英文模式自動換成 NT$

function buildProperty(s, rng, tile, world) {
  const p = propByTile(s.pos) || propById(tile.prop)
  const owner = world.owners?.[p.id]
  const mine = s.props[p.id]
  const news = localNews(p, rng.next())
  const risks = Object.entries(p.risk).map(([k, v]) => t('{risk} {pct}%', { risk: RISK_NAME[k], pct: (v * 100).toFixed(1) })).join(getLang() === 'en' ? ', ' : '、')
  const common = { kind: 'property', defId: 'prop_' + p.id, icon: p.icon, tone: 'neutral', title: t('{region} · {name}', { region: p.region, name: p.name }) }
  if (mine) {
    const lv = mine.level
    const up = upgradeCost(p, lv)
    const choices = []
    if (lv < 3) choices.push({ label: t('升級為「{name}」({cost})', { name: LEVELS[lv + 1].name, cost: wan(up) }), hint: t('年租金 {from} → {to}', { from: wan(rentOf(p, lv)), to: wan(rentOf(p, lv + 1)) }), tag: 'upgrade' })
    if (!mine.insured) choices.push({ label: t('投保財產險(年繳 {cost})', { cost: wan(propPremium(mine.value)) }), hint: t('火災、地震、淹水的修繕費,保險賠 9 成'), tag: 'insure' })
    choices.push({ label: t('出售(約得 {amt})', { amt: wan(Math.max(0, mine.value * 0.95 - (mine.mortgage?.balance || 0))) }), hint: t('變現為現金'), tag: 'sell' })
    choices.push({ label: t('維持現狀'), hint: '', tag: 'skip' })
    return scene({
      ...common, story: t('回到你的資產。目前等級「{level}」,年租金約 {rent},市值約 {value}{ins}。{news}', { level: LEVELS[lv].name, rent: wan(rentOf(p, lv)), value: wan(mine.value), ins: mine.insured ? t(',已投保財產險') : t(',尚未投保'), news }),
      base: { propId: p.id, status: 'mine', owner: 'you' }, choices,
    })
  }
  if (owner) {
    const toll = Math.round((tollOf(p, owner.level) * (owner.full ? AREA_BONUS : 1)) / 1000) * 1000
    const fullNote = owner.full ? t('對方在「{area}」擁有 {n} 處以上,過路費 ×1.5。', { area: t(areaById(p.area).name), n: AREA_NEED }) : ''
    return scene({
      ...common, story: t('這處資產屬於「{owner}」({level})。你借住在他的地段,需要付過路費。{news}', { owner: owner.name, level: LEVELS[owner.level].name, news: fullNote + news }),
      base: { propId: p.id, status: 'rival', owner: owner.name, ownerIdx: owner.idx, toll },
      choices: [{ label: t('支付過路費 {toll}', { toll: wan(toll) }), hint: t('付給 {owner}', { owner: owner.name }), tag: 'pay' }],
    })
  }
  const liquid = s.cash + s.hold.deposit + s.hold.bond + s.hold.stock + s.hold.spec
  const down = Math.round(p.price * 0.3)
  const cashAfter = ((liquid - p.price) / (s.expense / 12))
  return scene({
    ...common, tone: 'good',
    story: t('{blurb}無人持有。售價 {price},年租金約 {rent}(報酬率 {yield}%)。天災年機率:{risks}。{news}', { blurb: p.blurb, price: wan(p.price), rent: wan(baseRent(p)), yield: (p.yield * 100).toFixed(1), risks, news }),
    base: { propId: p.id, status: 'unowned', price: p.price },
    choices: [
      { label: t('全額購買({price})', { price: wan(p.price) }), hint: liquid >= p.price ? t('買完現金與投資約剩 {months} 個月生活費', { months: cashAfter.toFixed(1) }) : t('資金不足,會動用投資甚至借款'), tag: 'buy_cash' },
      { label: t('貸款購買(頭期款 {down})', { down: wan(down) }), hint: t('房貸 7 成、年利率約 3%、分 15 年還'), tag: 'buy_loan' },
      { label: t('先不買(交給對手競價)'), hint: t('對手可能會買走'), tag: 'skip' },
    ],
  })
}

function buildEvent(s, rng) {
  const inflation = Math.pow(1.025, s.turn)
  // 健康越差、年紀越大(55 歲以上),生病的機率越高
  const healthMult = (1 + (100 - s.health) / 120) * (1 + Math.max(0, s.age - 55) / 40)
  const pool = EVENT_DEFS.filter((d) => {
    if (s.retired && WORK_ONLY.includes(d.id)) return false
    if (d.minAge && s.age < d.minAge) return false
    if (d.minTurn && s.turn < d.minTurn) return false
    if (d.once && seenCount(s, d.id) > 0) return false
    if (d.req && !d.req(s)) return false
    return true
  })
  const d = rng.weighted(pool, (x) => {
    const w = wOf(x, s) * recentMult(s, x.id)
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
      cancer: !!d.cancer,
      carRepair: !!(d.carRepair && s.car),
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
    kind: 'market', aiable: true, defId: m.id, icon: m.icon, tone: up ? 'good' : 'bad', title: m.title,
    story: paren(t(m.headline), t(m.analog)) + (hasRisk ? '' : t('。你目前沒有持有股票類資產,這次和你的資產無關,但也許是個進場的機會。')),
    lesson: t(m.note),
    base: { ret: m.ret, rebound: m.rebound, house: m.house ?? null },
    choices: [
      { label: t('繼續持有,耐心等待'), hint: t('不動作'), tag: 'hold' },
      { label: up ? t('獲利了結,賣出股票類資產') : t('先賣出,避免再跌'), hint: t('把股票與個股轉成現金'), tag: 'sell' },
      { label: t('趁機加碼(現金的 30% 買 ETF)'), hint: t('提高股票型 ETF 部位'), tag: 'buy' },
    ],
  })
}

function buildBonus(s, rng) {
  const b = pickDef(s, rng, BONUS_DEFS, { once: false })
  const amount = b.pct ? round1k(s.income * rng.range(b.pct[0], b.pct[1])) : round1k(rng.int(b.amount[0], b.amount[1]))
  return scene({
    kind: 'bonus', defId: b.id, icon: b.icon, tone: 'good', title: b.title,
    story: t(b.story) + t('(約 {n} 萬元)', { n: Math.max(1, Math.round(amount / 10000)) }),
    base: { amount },
    choices: [
      { label: t('全部存進現金'), hint: t('提高緊急預備金'), tag: 'save' },
      { label: t('一半存起來、一半買股票型 ETF'), hint: t('分散運用'), tag: 'split' },
      { label: t('拿來補強保障缺口'), hint: t('加保最重要的一項'), tag: 'cover' },
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
    title: t('理專諮詢時間'),
    story: top
      ? t('理專幫你做了保障健檢,最大的缺口是「{name}」。', { name: PRODUCTS[top.id].name })
      : t('理專檢視你的保障配置,目前沒有明顯的缺口,做得很好!'),
    base: { analysis },
    choices: top
      ? [
          { label: t('採納建議,補強缺口'), hint: t('自動加保最重要的 2 項'), tag: 'accept' },
          { label: t('我自己決定'), hint: t('回到規劃再調整'), tag: 'skip' },
        ]
      : [{ label: t('很好,繼續前進'), hint: '', tag: 'skip' }],
  })
}

const buffer = (s) => s.expense * 0.25
const spendable = (s, pct) => Math.max(0, round1k(Math.min(s.cash * pct, s.cash - buffer(s))))

function buildShop(s) {
  const etf = spendable(s, 0.25), bond = spendable(s, 0.25), dep = spendable(s, 0.3)
  const w = (n) => `${Math.round(n / 10000)} 萬` // i18n-ignore:同上
  return scene({
    kind: 'shop', defId: 'shop', icon: '🛒', title: t('理財商城:本週熱門商品'),
    story: t('櫃檯推薦了幾種商品。投資是為了累積資產,但別忘了:賺錢的是投資,擋風險的是保險。'),
    base: {},
    choices: [
      { label: t('買股票型 ETF({amt})', { amt: w(etf) }), hint: t('長期報酬較高,波動大'), tag: 'buy:stock:0.25' },
      { label: t('買債券基金({amt})', { amt: w(bond) }), hint: t('波動較小'), tag: 'buy:bond:0.25' },
      { label: t('轉入定存({amt})', { amt: w(dep) }), hint: t('幾乎不波動'), tag: 'buy:deposit:0.3' },
      { label: t('先不買'), hint: t('保留現金'), tag: 'skip' },
    ],
  })
}

function buildBank(s) {
  const hasLoan = s.loan > 0
  return scene({
    kind: 'bank', defId: 'bank', icon: '🏦', title: t('銀行櫃檯'),
    story: hasLoan
      ? t('你目前有 {n} 萬的貸款,利率約 7%。要不要先還一部分?', { n: Math.round(s.loan / 10000) })
      : t('行員向你介紹信用貸款:最高 30 萬、年利率約 7%。借錢可以投資,但報酬不確定,利息卻是確定的。'),
    base: {},
    choices: hasLoan
      ? [
          { label: t('還款(現金的一半)'), hint: t('減少利息支出'), tag: 'repay' },
          { label: t('把閒置現金轉定存'), hint: t('賺取 1.5% 利息'), tag: 'buy:deposit:0.4' },
          { label: t('維持現狀'), hint: t('不動作'), tag: 'skip' },
        ]
      : [
          { label: t('辦信貸 30 萬'), hint: t('現金增加,年利率 7%'), tag: 'borrow' },
          { label: t('把閒置現金轉定存'), hint: t('賺取 1.5% 利息'), tag: 'buy:deposit:0.4' },
          { label: t('維持現狀'), hint: t('不動作'), tag: 'skip' },
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
  const tx = taxFor(s)
  return scene({
    kind: 'tax', defId: 'tax', icon: '🧾', title: t('年度綜合所得稅申報'),
    story: t('又到了報稅季。除了稅款,人身保險費也能列舉扣除(每人每年有上限),保險不只是保障,也有稅務上的考量。'),
    base: tx,
    choices: [{ label: t('完成申報'), hint: t('稅率約 {n}%', { n: Math.round(tx.rate * 100) }), tag: 'ok' }],
  })
}

// 醫院格:身體還好就是健檢日;身體差(或運氣不好的急診)就要住院,之後停等幾個回合休養。
// 有醫療險或住院日額險,可以選更好的病房、提早出院。
function buildHospital(s, rng) {
  const pAdmit = clamp((95 - s.health) / 45, 0.08, 0.9)
  if (rng.next() < pAdmit) {
    const inflation = Math.pow(1.025, s.turn)
    const bill = round1k(rng.int(45000, 90000) * inflation)
    const insured = (s.coverage.medical || 0) > 0 || (s.coverage.daily || 0) > 0
    return scene({
      kind: 'event', cat: 'medical', defId: 'hospital_stay', icon: '🏥', tone: 'bad', title: t('住院觀察(停等 1–2 回合)'),
      story: s.health < 70
        ? t('你的身體狀況不太好,醫生要求你住院觀察幾天。住院期間無法正常工作,接下來的幾個回合要在醫院休養。')
        : t('突然的急診讓你住進了醫院,醫生要求你至少休養一陣子。接下來的幾個回合要在醫院休養。'),
      base: { medical: bill, other: 0, hospital: true, healthHit: 0 },
      choices: [
        { label: t('健保病房'), hint: t('自付較少;{note}', { note: insured ? t('有保險可提早 1 回合出院') : t('沒有保險要多休養 1 回合') }), costMult: 0.6, stay: 2 },
        { label: t('單人病房(自付差額)'), hint: t('舒適、恢復快,自付較多;停等 1 回合'), costMult: 1.6, stay: 1 },
      ],
    })
  }
  return scene({
    kind: 'hospital', defId: 'hospital', icon: '🏥', title: t('健康檢查日'),
    story: t('趁著健康好好檢查一下吧。早期發現,治療成本通常更低;但別忘了,健康時才買得到最划算的保障。'),
    base: {},
    choices: [
      { label: t('完整健檢'), hint: t('約 1.8 萬,健康 +12,降低未來重病風險'), tag: 'full' },
      { label: t('基本健檢'), hint: t('約 6 千,健康 +5'), tag: 'basic' },
      { label: t('太忙了,不去'), hint: t('不動作'), tag: 'skip' },
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
    base: { game: id }, choices: [{ label: t('開始挑戰'), hint: '', tag: 'play' }],
  })
}

function buildQuiz(s, rng) {
  const fresh = QUIZ_DEFS.map((q, i) => i).filter((i) => !s.seen['quiz' + i] && !(s.recent || []).includes('quiz' + i))
  const unseen = fresh.length ? fresh : QUIZ_DEFS.map((q, i) => i).filter((i) => !s.seen['quiz' + i])
  const idx = unseen.length ? rng.pick(unseen) : rng.int(0, QUIZ_DEFS.length - 1)
  const q = QUIZ_DEFS[idx]
  return scene({
    kind: 'quiz', defId: 'quiz' + idx, icon: '🎓', title: t('保險小學堂:搶答時間'),
    story: q.q, base: { idx },
    choices: q.options.map((o, i) => ({ label: o, hint: '', tag: i === q.answer ? 'right' : 'wrong' })),
  })
}

function buildTip(s, rng) {
  const tp = rng.pick(TIP_DEFS)
  return scene({
    kind: 'tip', defId: 'tip', icon: tp.icon, title: tp.title, story: tp.story, base: {},
    choices: [{ label: t('學到了'), hint: '', tag: 'ok' }],
  })
}

// ======================= 結算 =======================

export function resolveScene(s, rng, sc, choice, add, opts = {}) {
  s.seen[sc.defId] = (s.seen[sc.defId] || 0) + 1
  switch (sc.kind) {
    case 'property': return resolveProperty(s, sc, choice, add)
    case 'event': return resolveEvent(s, sc, choice, add)
    case 'market': return resolveMarket(s, sc, choice, add)
    case 'bonus': return resolveBonus(s, sc, choice, add)
    case 'advisor': return resolveAdvisor(s, rng, choice, add)
    case 'shop':
    case 'bank': return resolveFinance(s, choice, add)
    case 'tax': return resolveTax(s, sc, add)
    case 'hospital': return resolveHospital(s, choice, add)
    case 'quiz': return resolveQuiz(s, sc, choice, add)
    case 'minigame': return resolveMinigame(s, rng, sc, add, opts)
    case 'chance':
    case 'minor':
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

  // 免災金牌:這次的壞事直接不發生
  if (sc.cat !== 'family' && (medicalCost + otherCost > 0 || lossRatio > 0) && useCard(s, 'shield')) {
    add(t('{icon} 免災金牌生效:這件事沒有發生,你什麼都不用付', { icon: CARDS.shield.icon }), 0, 'cover')
    add(t(CARDS.shield.tip), 0, 'lesson')
    return
  }

  const payout = payoutFor(s.coverage, {
    cat: sc.cat, medicalCost, otherCost, income: s.income, years: lossYears || 3, accident: b.accident,
    cancer: b.cancer, carRepair: b.carRepair,
  })
  if (medicalCost) { s.cash -= medicalCost; add(t('醫療與治療費用'), -medicalCost) }
  if (otherCost) {
    s.cash -= otherCost
    add(t(sc.cat === 'family' ? '教育費用' : sc.cat === 'home' ? '房屋修繕費用' : sc.cat === 'liability' ? '對方的賠償費用' : '額外支出'), -otherCost)
  }
  const pays = [
    ['medical', '醫療險給付'], ['lump', '重大傷病險給付'], ['disability', '失能所得補償給付'], // i18n-ignore
    ['ltc', '長照險給付'], ['accident', '意外險給付'], ['home', '住宅火險給付'], // i18n-ignore
    ['cancer', '癌症險給付'], ['daily', '住院日額險給付'], ['auto', '汽車險給付'], // i18n-ignore
  ]
  for (const [k, label] of pays) {
    if (payout[k]) { s.cash += payout[k]; add(t(label), payout[k], 'cover') }
  }
  if (medicalCost > 0 && ['medical', 'critical'].includes(sc.cat) && hasCard(s, 'medaid')) {
    const aid = Math.min(300000, Math.round(medicalCost * 0.5), Math.max(0, medicalCost - payout.total))
    if (aid > 0 && useCard(s, 'medaid')) { s.cash += aid; add(t('{icon} 醫療補助卡:減免自付費用', { icon: CARDS.medaid.icon }), aid, 'cover') }
  }
  if (lossRatio > 0) {
    s.effects.push({ ratio: lossRatio, yearsLeft: lossYears, label: sc.title })
    add(t('收入中斷:每年少 {pct}%,持續 {years} 年', { pct: Math.round(lossRatio * 100), years: lossYears }), 0, 'note')
  }
  if (b.recurring) {
    const amount = Math.round(b.recurring.amount * (choice.recurMult ?? 1))
    s.recurring.push({ amount, yearsLeft: b.recurring.years, label: b.recurring.label })
    add(t('{label}:每年 {n} 萬,持續 {years} 年', { label: b.recurring.label, n: Math.round(amount / 10000), years: b.recurring.years }), 0, 'note')
  }
  if (b.hospital) {
    const covered = (s.coverage.medical || 0) > 0 || (s.coverage.daily || 0) > 0
    const n = Math.max(1, (choice.stay || 1) - (covered ? 1 : 0))
    s.hospitalTurns = n
    add(t('住院:接下來要休養 {n} 個回合{note}', { n, note: covered && (choice.stay || 1) > 1 ? t('(有醫療保障,提早 1 回合出院)') : '' }), 0, 'warn')
  }
  if (b.rest) s.health = Math.min(100, s.health + 12)
  if (choice.tag === 'upskill') s.income = Math.round(s.income * 1.06)
  const hit = (b.healthHit || 0) * (choice.health ?? 1)
  if (hit) s.health = clamp(s.health - hit, 5, 100)
  if (sc.cat === 'critical' || sc.cat === 'disability') {
    s.blocked.critical = s.blocked.disability = s.blocked.medical = true
    add(t('已有傷病紀錄:相關保障日後無法再加保'), 0, 'warn')
  }
  s.year.shockCost += medicalCost + otherCost
  s.year.payout += payout.total
  s.year.shocks.push({
    cat: sc.cat, medicalCost, otherCost, income: s.income, years: lossYears || 3, accident: b.accident,
  })
  if (!payout.total && (medicalCost + otherCost) > 0 && sc.cat !== 'family') {
    add(t('這次沒有任何保險給付,全部由自己承擔'), 0, 'warn')
  }
}

function resolveDeath(s, add) {
  const payout = payoutFor(s.coverage, { cat: 'death' })
  const yearsSupport = s.dependents > 0 ? 12 : s.partner ? 8 : 5
  const mortgage = s.house ? s.house.balance : 0
  const need = s.expense * yearsSupport + mortgage + s.loan
  const funds = s.cash + holdingsTotal(s) + s.savings + (s.ilv || 0) + (s.house ? s.house.value : 0) + payout.life + payout.invlinked
  s.year.payout += payout.life + payout.invlinked
  s.year.shocks.push({ cat: 'death', medicalCost: 0, otherCost: 0, income: s.income, years: 0 })
  add(t('壽險身故給付'), payout.life, 'cover')
  if (payout.invlinked) add(t('投資型保單身故保障'), payout.invlinked, 'cover')
  if (s.ilv) add(t('投資型保單帳戶價值'), s.ilv, 'cover')
  add(t('家人未來生活所需(生活費+房貸+負債)'), -Math.round(need), 'out')
  add(t('家人可動用資金(含保險金與房產)'), Math.round(funds), 'in')
  s.ended = {
    reason: 'death', need: Math.round(need), funds: Math.round(funds),
    ratio: Math.round((funds / need) * 100) / 100, payout: payout.life + payout.invlinked, yearsSupport,
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
    add(t('賣出股票類資產(以接近谷底的價格成交)'), stockVal + specVal - before, stockVal + specVal >= before ? 'in' : 'out')
    if (ret < 0) s.panicSells++
    add(t('已轉為現金,錯過後續的反彈'), 0, 'note')
    return
  }
  if (ret < 0 && riskHoldings(s) > 0) {
    s.crashesHeld++
    if (useCard(s, 'crash_guard')) {
      s.year.marketReturn = ret * 0.5
      add(t('{icon} 行情避險卡生效:這波跌幅減半', { icon: CARDS.crash_guard.icon }), 0, 'cover')
    }
  }
  if (choice.tag === 'buy') {
    const amt = spendable(s, 0.3)
    if (amt > 0) {
      s.cash -= amt
      s.hold.stock += amt
      add(t('加碼股票型 ETF'), -amt, 'note')
    } else add(t('現金不足,無法加碼'), 0, 'note')
  } else add(t('選擇持有,等待市場'), 0, 'note')
  add(t('今年股市整體 {pct}%(於年底結算)', { pct: `${ret >= 0 ? '+' : ''}${Math.round(ret * 100)}` }), 0, ret >= 0 ? 'in' : 'out')
  if (house) add(t('房市 {pct}%{note}', { pct: `${house > 0 ? '+' : ''}${Math.round(house * 100)}`, note: s.house ? t('(影響你的房產價值)') : '' }), 0, 'note')
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
    add(t('存入現金'), amount - half)
    add(t('買入股票型 ETF'), half)
  } else if (choice.tag === 'cover') {
    s.cash += amount
    add(t('存入現金'), amount)
    const gaps = topGaps(s, 1)
    if (!gaps.length) add(t('目前沒有可補強的缺口,錢先留著當預備金'), 0, 'note')
    for (const g of gaps) {
      s.coverage[g.id] = g.need
      add(t('已加保:{name}({label})', { name: PRODUCTS[g.id].name, label: PRODUCTS[g.id].tiers[g.need].label }), 0, 'cover')
    }
  } else {
    s.cash += amount
    add(t('存入現金'), amount)
  }
}

function resolveAdvisor(s, rng, choice, add) {
  s.advisorUsed++
  if (choice.tag !== 'accept') return add(t('你決定自己規劃'), 0, 'note')
  const gaps = topGaps(s, 2)
  if (!gaps.length) add(t('目前沒有可以補強的項目'), 0, 'note')
  for (const g of gaps) {
    s.coverage[g.id] = g.need
    add(t('已加保:{name}({label})', { name: PRODUCTS[g.id].name, label: PRODUCTS[g.id].tiers[g.need].label }), 0, 'cover')
  }
  if (rng.next() < 0.5) giveCard(s, rng, 'protect', add)
}

function buyAsset(s, cls, pct, add) {
  const amt = spendable(s, pct)
  if (amt <= 0) return add(t('現金不足(需保留緊急預備金),無法購買'), 0, 'note')
  s.cash -= amt
  s.hold[cls] += amt
  add(t('買入{name}', { name: ASSETS[cls].name }), -amt, 'note')
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
    add(t('撥款入帳'), 300000)
    add(t('提醒:這筆錢需要付 7% 的利息,用來投資要先想清楚'), 0, 'warn')
  } else if (tag === 'repay') {
    const amt = Math.min(s.loan, Math.max(0, round1k(s.cash * 0.5)))
    s.cash -= amt
    s.loan -= amt
    add(t('提前還款'), -amt, 'note')
  } else add(t('維持現狀'), 0, 'note')
}

function resolveTax(s, sc, add) {
  const { rate, tax } = sc.base
  const personal = Math.min(24000, Object.keys(s.coverage).reduce((a, id) => a + (s.coverage[id] ? PRODUCTS[id].tiers[s.coverage[id]].premium : 0), 0))
  const saved = Math.round(personal * rate)
  const net = Math.max(0, tax - saved)
  s.cash -= net
  add(t('綜合所得稅(稅率約 {n}%)', { n: Math.round(rate * 100) }), -tax)
  if (saved > 0) add(t('保險費列舉扣除,節稅'), saved, 'cover')
  add(t('人身保險費每人每年可列舉扣除約 2.4 萬(簡化說明,以最新稅法為準)'), 0, 'note')
}

function resolveHospital(s, choice, add) {
  if (choice.tag === 'full') {
    s.cash -= 18000
    s.health = Math.min(100, s.health + 12)
    s.checkupYears = 2
    add(t('完整健檢費用'), -18000)
    add(t('健康 +12,接下來兩年重病風險降低'), 0, 'cover')
  } else if (choice.tag === 'basic') {
    s.cash -= 6000
    s.health = Math.min(100, s.health + 5)
    add(t('基本健檢費用'), -6000)
  } else add(t('你選擇不去健檢'), 0, 'note')
}

function resolveQuiz(s, sc, choice, add) {
  const { idx } = sc.base
  const q = QUIZ_DEFS[idx]
  s.quizTotal++
  if (choice.tag === 'right') {
    s.quizRight++
    s.cash += 10000
    add(t('答對了!獲得獎金'), 10000, 'cover')
  } else add(t('答錯了。正確答案:{answer}', { answer: q.options[q.answer] }), 0, 'warn')
  add(t(q.why), 0, 'lesson')
}

// ---- 資產格的結算(落點事件與規劃面板共用)----
export function acquireProperty(s, p, mode, add) {
  const price = p.price
  if (mode === 'loan') {
    const down = Math.round(price * 0.3)
    const balance = price - down
    s.cash -= down
    cover(s)
    s.props[p.id] = { level: 1, value: price, bought: price, insured: false, damaged: false, mortgage: { balance, rate: 0.03, payment: mortgagePayment(balance), yearsLeft: 15 } }
    add(t('頭期款(買下{name})', { name: p.name }), -down)
    add(t('房貸 {balance},每年還款約 {pay}', { balance: wan(balance), pay: wan(mortgagePayment(balance)) }), 0, 'note')
  } else {
    s.cash -= price
    cover(s)
    s.props[p.id] = { level: 1, value: price, bought: price, insured: false, damaged: false, mortgage: null }
    add(t('全額購買{name}', { name: p.name }), -price)
  }
  add(t('每年租金約 {rent};天災會造成修繕費,記得投保財產險', { rent: wan(baseRent(p)) }), 0, 'note')
  // 區域連鎖:同一區擁有 3 處以上,租金與過路費 ×1.5
  const area = areaById(p.area)
  const have = areaCount(s.props, p.area)
  if (have === AREA_NEED) add(t('🎉 你在「{area}」已擁有 {n} 處!這一區的租金與過路費 ×1.5', { area: t(area.name), n: have }), 0, 'cover')
  else if (have < AREA_NEED) add(t('你在「{area}」擁有 {n} 處,再買 {k} 處,這一區的租金與過路費 ×1.5', { area: t(area.name), n: have, k: AREA_NEED - have }), 0, 'note')
}

export function upgradeProp(s, p, add) {
  const mine = s.props[p.id]
  const cost = upgradeCost(p, mine.level)
  s.cash -= cost
  cover(s)
  const ratio = LEVELS[mine.level + 1].valueX / LEVELS[mine.level].valueX
  mine.level += 1
  mine.value = Math.round(mine.value * ratio)
  add(t('升級為「{name}」', { name: LEVELS[mine.level].name }), -cost)
  add(t('年租金提升到約 {rent}', { rent: wan(rentOf(p, mine.level)) }), 0, 'in')
}

export function insureProp(s, p, add) {
  s.props[p.id].insured = true
  add(t('{name}已投保財產險,年繳約 {prem}', { name: p.name, prem: wan(propPremium(s.props[p.id].value)) }), 0, 'cover')
}

export function sellProp(s, p, add) {
  const mine = s.props[p.id]
  const proceeds = Math.round(mine.value * 0.95) - (mine.mortgage?.balance || 0)
  s.cash += proceeds
  delete s.props[p.id]
  cover(s)
  add(t('出售{name}(扣除房貸與 5% 費用)', { name: p.name }), proceeds)
}

function resolveProperty(s, sc, choice, add) {
  const p = propById(sc.base.propId)
  s.seen['prop_' + p.id] = (s.seen['prop_' + p.id] || 0) + 1
  switch (choice.tag) {
    case 'buy_cash': return acquireProperty(s, p, 'cash', add)
    case 'buy_loan': return acquireProperty(s, p, 'loan', add)
    case 'upgrade': return upgradeProp(s, p, add)
    case 'insure': return insureProp(s, p, add)
    case 'sell': return sellProp(s, p, add)
    case 'pay': {
      const toll = sc.base.toll
      s.cash -= toll
      s.pendingOps.push({ op: 'toll', toIdx: sc.base.ownerIdx, amount: toll, propId: p.id })
      add(t('過路費(付給 {owner})', { owner: sc.base.owner }), -toll)
      return undefined
    }
    default:
      if (sc.base.status === 'unowned') {
        s.pendingOps.push({ op: 'auction', propId: p.id, price: p.price })
        add(t('你沒有出手,資產交給對手競價'), 0, 'note')
      } else add(t('維持現狀'), 0, 'note')
      return undefined
  }
}

function resolveMinigame(s, rng, sc, add, opts) {
  const m = MINIGAMES[sc.base.game]
  const stars = clamp(Math.round(opts.stars ?? 1), 0, 3)
  const reward = MINIGAME_REWARD[stars]
  s.miniPlayed++
  s.miniStars += stars
  if (stars === 3) s.miniPerfect++
  s.cash += reward
  add(t('完成「{title}」:{result}', { title: m.title, result: stars ? '⭐'.repeat(stars) : t('再接再厲') }), 0, stars ? 'in' : 'note')
  if (reward) add(t('小遊戲獎金'), reward, 'cover')
  if (opts.note) add(opts.note, 0, 'note')
  if (stars === 3) giveCard(s, rng, 'random', add)
  add(t(m.lesson), 0, 'lesson')
}

// ---- 機會卡與里程碑:以 fx 描述效果 ----
function resolveFxScene(s, rng, sc, choice, add) {
  if (choice.special) specials[choice.special](s, rng, add)
  let fx = choice.fx
  const scam = ['scam_call', 'high_return', 'm_line'].includes(sc.defId) && fx && (fx.gamble || fx.cashPct < 0)
  if (scam && useCard(s, 'antiscam')) {
    add(t('{icon} 防詐提醒卡生效:你一眼識破,錢保住了', { icon: CARDS.antiscam.icon }), 0, 'cover')
    fx = null
  }
  if (fx) applyFx(s, rng, fx, add)
  if (fx?.independent && sc.base.kid != null) kidIndependent(s, sc.base.kid, add)
  if (fx?.retire) retire(s, fx.retire, add)
  if (sc.base.lesson) add(t(sc.base.lesson), 0, 'lesson')
}

function applyFx(s, rng, fx, add) {
  if (fx.invest2) {
    const amt = spendable(s, fx.invest2.pct)
    if (amt > 0) { s.cash -= amt; s.hold[fx.invest2.cls] += amt; add(t('買入{name}', { name: ASSETS[fx.invest2.cls].name }), -amt, 'note') }
  }
  // 資產配置:把投資部位重新分配成目標比例
  if (fx.rebalance) rebalance(s, fx.rebalance, add)
  // 借錢投資:貸款增加,錢放進股票型 ETF
  if (fx.borrowInvest) {
    const a = fx.borrowInvest
    s.loan += a
    s.hold.stock += a
    add(t('信用貸款 {amt},全部買入股票型 ETF', { amt: wan(a) }), 0, 'warn')
    add(t('之後每年要付利息並攤還本金;市場下跌時虧損也會被放大'), 0, 'note')
  }
  // 小事件:依年收入發一筆錢(可以直接拿去投資)
  if (fx.incomeCash) {
    const got = round1k(s.income * fx.incomeCash)
    s.cash += got
    add(t('收入'), got)
    if (fx.investAll) { s.cash -= got; s.hold[fx.investAll] += got; add(t('買入{name}', { name: ASSETS[fx.investAll].name }), -got, 'note') }
  }
  // 人生階段:接下來幾年每年固定的支出(學費、補習費)
  if (fx.recurring) {
    const r = fx.recurring
    s.recurring.push({ amount: r.amount, yearsLeft: r.years, label: t(r.label) })
    add(t('接下來 {n} 年,每年{label}約 {amt}', { n: r.years, label: t(r.label), amt: wan(r.amount) }), 0, 'note')
  }
  // 晚年照顧:每年的照顧費,長照險可以分擔
  if (fx.care) {
    const perYear = PRODUCTS.ltc.tiers[s.coverage.ltc || 0].perYear || 0
    const net = Math.max(0, fx.care - perYear)
    s.recurring.push({ amount: net, yearsLeft: 10, label: t('長期照顧費用') })
    add(t('長期照顧每年約 {amt}', { amt: wan(fx.care) }), 0, 'note')
    if (perYear) add(t('長照險每年給付 {amt},自付剩 {net}', { amt: wan(perYear), net: wan(net) }), 0, 'cover')
    else add(t('沒有長照險,照顧費全部自己付'), 0, 'warn')
  }
  // 小意外:先付錢,有對應的保險再理賠
  if (fx.hit) {
    const h = fx.hit
    const cost = (h.medical || 0) + (h.other || 0)
    s.cash -= cost
    add(t(h.label), -cost)
    const p = payoutFor(s.coverage, { cat: h.cat, medicalCost: h.medical || 0, otherCost: h.other || 0, income: s.income, years: 0, accident: !!h.accident })
    if (p.total > 0) { s.cash += p.total; s.year.payout += p.total; add(t('保險理賠'), p.total, 'cover') }
    else add(t('沒有對應的保險,全部由自己承擔'), 0, 'warn')
  }
  if (fx.cash) { s.cash += fx.cash; add(t(fx.cash > 0 ? '收入' : '花費'), fx.cash) }
  if (fx.cashPct) {
    const amt = round1k(Math.max(0, s.cash) * fx.cashPct)
    s.cash += amt
    if (amt) add(t(amt > 0 ? '收入' : '損失'), amt)
  }
  if (fx.invest) {
    const amt = spendable(s, fx.invest.pct)
    if (amt > 0) { s.cash -= amt; s.hold[fx.invest.cls] += amt; add(t('買入{name}', { name: ASSETS[fx.invest.cls].name }), -amt, 'note') }
    else add(t('現金不足,無法投入'), 0, 'note')
  }
  if (fx.gamble) {
    const g = fx.gamble
    const lose = rng.next() < g.lossP
    const part = lose ? g.lose : g.win
    const amt = part.cash ?? round1k(Math.max(0, s.cash) * (part.cashPct || 0))
    s.cash += amt
    if (lose) add(t('結果:血本無歸,損失 {n} 萬', { n: Math.round(Math.abs(amt) / 10000) }), amt, 'out')
    else add(t(amt ? '結果:這次運氣不錯' : '結果:對方準時還了錢'), amt, 'in')
  }
  if (fx.expense) { s.expense += fx.expense; add(t('每年支出 {n} 萬', { n: `${fx.expense > 0 ? '+' : ''}${Math.round(fx.expense / 10000 * 10) / 10}` }), 0, 'note') }
  if (fx.expenseMult) s.expense = Math.round(s.expense * fx.expenseMult)
  if (fx.incomeMult) { s.income = Math.round(s.income * fx.incomeMult); add(t('年收入調整為約 {n} 萬', { n: Math.round(s.income / 10000) }), 0, 'in') }
  if (fx.health) { s.health = clamp(s.health + fx.health, 5, 100); }
  if (fx.card) giveCard(s, rng, fx.card, add)
  if (fx.checkup) s.checkupYears = 2
  if (fx.car) s.car = true
  if (fx.trip) s.trips++
  if (fx.promo) s.promotions++
  if (fx.risk) {
    const r = fx.risk
    s.cash -= r.cost
    add(t(r.label || '意外損失'), -r.cost)
    const p = payoutFor(s.coverage, { cat: r.cat, otherCost: r.cost })
    if (p.total) { s.cash += p.total; s.year.payout += p.total; add(t('旅平險給付'), p.travel, 'cover') }
    else add(t('沒有對應的保險,全部由自己承擔'), 0, 'warn')
  }
  if (fx.coverage) {
    if (fx.coverage === 'topGap') {
      const g = topGaps(s, 1)[0]
      if (g) { s.coverage[g.id] = g.need; add(t('已加保:{name}({label})', { name: PRODUCTS[g.id].name, label: PRODUCTS[g.id].tiers[g.need].label }), 0, 'cover') }
      else add(t('目前沒有可補強的缺口'), 0, 'note')
    } else {
      const { id, tier } = fx.coverage
      if (!canIncrease(s, id)) add(t('這項保障已無法加保'), 0, 'warn')
      else if ((s.coverage[id] || 0) < tier) { s.coverage[id] = tier; add(t('已加保:{name}({label})', { name: PRODUCTS[id].name, label: PRODUCTS[id].tiers[tier].label }), 0, 'cover') }
    }
  }
}

// 給規劃面板用(家庭計畫:結婚、生小孩)
export const applySpecial = (s, rng, name, add) => specials[name](s, rng, add)

const specials = {
  marry(s, rng, add) {
    s.partner = { income: round1k(s.income * rng.range(0.7, 1.1)) }
    s.cash -= 300000
    s.expense += Math.round(s.expense * 0.4 / 1000) * 1000
    add(t('婚禮與新家花費'), -300000)
    add(t('配偶年收入約 {n} 萬,家庭支出同步增加', { n: Math.round(s.partner.income / 10000) }), 0, 'note')
    add(t('兩個人互為依靠,壽險與失能保障需要重新檢視'), 0, 'warn')
  },
  baby(s, rng, add) {
    s.dependents += 1
    ;(s.kids ||= []).push({ age: 0, done: [] })
    s.cash -= 100000
    s.expense += 180000
    add(t('新生兒一次性花費'), -100000)
    add(t('每年生活支出增加 18 萬'), 0, 'note')
    add(t('責任變重了,記得檢視壽險與失能保障'), 0, 'warn')
  },
  buyHouse(s, rng, add) {
    const price = clamp(round1k(householdIncome(s) * 7), 5000000, 18000000)
    const down = Math.round(price * 0.2)
    if (s.cash + holdingsTotal(s) < down) {
      add(t('頭期款需要約 {n} 萬,目前資金不足,這次買不起', { n: Math.round(down / 10000) }), 0, 'warn')
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
    add(t('買房頭期款(房價約 {n} 萬)', { n: Math.round(price / 10000) }), -down)
    add(t('房貸 {n} 萬,每年還款約 {pay} 萬', { n: Math.round(balance / 10000), pay: Math.round(payment / 10000 * 10) / 10 }), 0, 'note')
    add(t('擁有房子後:房貸壓力、天災風險都變大,記得檢視壽險與住宅火險'), 0, 'warn')
  },
  inheritHouse(s, rng, add) {
    const price = 6000000
    s.cash -= 800000
    cover(s)
    s.house = { price, value: price, balance: 0, rate: 0.022, payment: 0, yearsLeft: 0 }
    s.expense = Math.round(s.expense * 0.85)
    add(t('整修老房子'), -800000)
    add(t('房子產權清楚、沒有房貸,但天災風險還是你的,記得投保住宅火險'), 0, 'warn')
  },
  jobChange(s, rng, add) {
    s.income = Math.round(s.income * 1.15)
    s.effects.push({ ratio: 0.1, yearsLeft: 1, label: t('新工作試用期') })
    add(t('年收入調整為約 {n} 萬(第一年試用期打 9 折)', { n: Math.round(s.income / 10000) }), 0, 'in')
  },
  retire(s, rng, add) {
    if (canIncrease(s, 'annuity') && (s.coverage.annuity || 0) < 1) {
      s.coverage.annuity = 1
      add(t('已加保:儲蓄年金險(年繳 6 萬)'), 0, 'cover')
    }
    buyAsset(s, 'bond', 0.25, add)
  },
}

// ---------- 每年的小事 ----------
export function buildMinorScene(s, id, k, m) {
  const st = stageById(id)
  if (st) {
    // 人生階段:孩子長大、自己變老(標題裡的 {kid} 換成老大、老二…)
    const kid = st.kid == null ? '' : t(KID_NAMES[st.kid] || KID_NAMES[0])
    const d = st.def
    return {
      kind: 'minor', defId: d.id, icon: d.icon, tone: 'neutral', title: t(d.title, { kid }), story: t(d.story, { kid }),
      stage: true,
      choices: trDeep(d.choices.map((c) => ({ ...c }))), base: { lesson: d.lesson ? t(d.lesson) : undefined, kid: st.kid },
    }
  }
  const d = minorById(id)
  return trDeep({
    kind: 'minor', defId: d.id, icon: d.icon, tone: 'neutral', title: d.title, story: d.story,
    tag: t('今年的小事 {k}/{m}', { k, m }),
    choices: d.choices.map((c) => ({ ...c })), base: { lesson: d.lesson },
  })
}

// 孩子畢業獨立:不再算扶養人口,生活支出減少
function kidIndependent(s, i, add) {
  const k = (s.kids || [])[i]
  if (!k || k.independent) return
  k.independent = true
  s.dependents = Math.max(0, s.dependents - 1)
  s.expense = Math.max(Math.round(s.expense * 0.6), s.expense - 180000)
  add(t('孩子獨立了:扶養人口 -1,每年生活支出減少約 18 萬'), 0, 'in')
}

// 退休:收入改成勞保年金(約薪水的 35%)+ 儲蓄年金險分年領回;兼職再加原本收入的 3 成
function retire(s, mode, add) {
  if (mode === 'delay') {
    s.retireAt = s.age + 3
    s.stagesDone = (s.stagesDone || []).filter((x) => x !== 's_retire')
    add(t('延後到 {age} 歲退休,繼續領薪水', { age: s.retireAt }), 0, 'note')
    return
  }
  const salary = s.income
  const pension = round1k(salary * 0.35)
  s.annuityPay = round1k((s.savings || 0) / 20)
  s.income = pension + (mode === 'part' ? round1k(salary * 0.3) : 0)
  s.retired = true
  s.coverage.annuity = 0
  if (s.partner) s.partner.income = round1k(s.partner.income * 0.4)
  s.expense = Math.round(s.expense * 0.85)
  add(t('勞保年金每年約 {amt}', { amt: wan(pension) }), 0, 'in')
  if (mode === 'part') add(t('兼職收入每年約 {amt}', { amt: wan(round1k(salary * 0.3)) }), 0, 'in')
  if (s.annuityPay) add(t('儲蓄年金險開始分年領回,每年約 {amt}', { amt: wan(s.annuityPay) }), 0, 'cover')
  else add(t('沒有準備年金險:退休後的缺口要靠存款與投資'), 0, 'warn')
  add(t('不再工作,生活支出也降低一些'), 0, 'note')
}

// 資產配置:target 是比例物件,或 'age'(100 減年齡法則)、'safety'(先補足 6 個月預備金)
function rebalance(s, target, add) {
  const total = ASSET_ORDER.reduce((a, k) => a + s.hold[k], 0)
  if (target === 'safety') {
    const need = Math.max(0, Math.round(s.expense / 2) - Math.max(0, s.cash) - s.hold.deposit)
    let moved = 0
    for (const k of ['spec', 'stock', 'bond']) {
      const m = Math.min(s.hold[k], need - moved)
      if (m > 0) { s.hold[k] -= m; s.hold.deposit += m; moved += m }
    }
    if (moved > 0) add(t('把 {amt} 從投資轉到定存,當作緊急預備金', { amt: wan(moved) }), 0, 'note')
    else add(t('你的現金與定存已經夠 6 個月生活費了'), 0, 'note')
    return
  }
  if (total < 10000) { add(t('目前幾乎沒有投資部位,可以先從定期定額開始'), 0, 'note'); return }
  let w = target
  if (target === 'age') {
    const st = clamp((100 - s.age) / 100, 0.2, 0.8)
    w = { deposit: 0.1, bond: Math.max(0, 0.9 - st), stock: st, spec: 0 }
  }
  for (const k of ASSET_ORDER) s.hold[k] = Math.round(total * (w[k] || 0))
  add(t('重新配置 {amt}:定存 {d}%、債券 {b}%、股票 ETF {st}%、個股 {sp}%', { amt: wan(total), d: Math.round((w.deposit || 0) * 100), b: Math.round((w.bond || 0) * 100), st: Math.round((w.stock || 0) * 100), sp: Math.round((w.spec || 0) * 100) }), 0, 'note')
}
