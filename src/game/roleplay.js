// AI 客戶對練:玩家扮理專,客戶由 AI(Gemini)或離線規則扮演。
// 分數全部由這個檔案的規則計算:同一段對話一定得到同樣的分數,每一分都說得出理由。
// AI 只負責「客戶怎麼說話」與文字回饋,不決定分數、不決定客戶透露了什麼。
import { t } from '../i18n.js'
import { CLIENTS } from './clients.js'
import { PRODUCTS } from './products.js'
import { analyzeGaps, householdIncome } from './core.js'

export const MAX_TURNS = 6
const clamp = (x, a, b) => Math.max(a, Math.min(b, x))
const norm = (s) => String(s || '').toLowerCase()

// ---------- 從理專的話裡讀出訊號 ----------
// 較長的詞先比對,比對到就挖掉,避免「房貸壽險」又被算成「壽險」
const PRODUCT_KEYS = [
  ['mortgage', ['房貸壽險', '房貸型壽險', '信用保障', 'mortgage life', 'mortgage protection']], // i18n-ignore
  ['ltc', ['長照險', '長期照顧險', '長照保險', '長照保障', 'long-term care', 'ltc']], // i18n-ignore
  ['critical', ['重大傷病', '重疾', '癌症險', 'critical illness', 'cancer cover']], // i18n-ignore
  ['disability', ['失能', 'disability', 'income protection']], // i18n-ignore
  ['invlinked', ['投資型', '類全委', '撥回', '月配', 'investment-linked', 'unit-linked', 'payout policy']], // i18n-ignore
  ['annuity', ['年金險', '年金保險', '儲蓄險', '儲蓄型', 'annuity', 'savings policy']], // i18n-ignore
  ['medical', ['醫療險', '實支實付', '住院', '手術', 'medical', 'hospital']], // i18n-ignore
  ['accident', ['意外險', '傷害險', 'accident']], // i18n-ignore
  ['life', ['定期壽險', '壽險', 'term life', 'life insurance', 'life cover']], // i18n-ignore
  ['emergency', ['預備金', '緊急', 'emergency fund', 'rainy day']], // i18n-ignore
  ['deposit', ['定存', 'time deposit']], // i18n-ignore
]

// 說明一項商品時,「有講到重點」的關鍵字(講清楚它保什麼、限制在哪)
const EXPLAIN = {
  mortgage: ['餘額', '遞減', '清償', '還清', '保住房子', '不會留給', 'balance', 'pay off', 'pays off', 'decreas'], // i18n-ignore
  life: ['家人', '保額', '生活費', '身故', '定期', '收入的', 'family', 'sum assured', 'term', 'years of'], // i18n-ignore
  disability: ['收入', '無法工作', '不能工作', '薪水', '中斷', 'income', 'unable to work', "can't work", 'cannot work'], // i18n-ignore
  medical: ['自費', '實支實付', '團保', '離職', '換工作', '帶不走', 'out-of-pocket', 'group', 'leave the job', 'job change'], // i18n-ignore
  critical: ['一次給付', '一次領', '癌症', '中風', '治療期間', 'lump', 'cancer', 'stroke', 'treatment'], // i18n-ignore
  accident: ['機車', '骨折', '外來', '突發', 'scooter', 'injur', 'fracture'], // i18n-ignore
  ltc: ['照顧', '看護', '長照 2.0', '長照2.0', '每個月', 'care', 'nursing', 'carer'], // i18n-ignore
  annuity: ['領回', '年期', '解約', '流動', '綁', '利率', 'surrender', 'lock', 'liquid', 'rate'], // i18n-ignore
  invlinked: ['波動', '風險', '費用', '本金', '虧損', '不保證', '沒有保證', 'volatil', 'risk', 'fee', 'principal', 'not guaranteed', 'no guarantee'], // i18n-ignore
  emergency: ['3 到 6', '3~6', '三到六', '六個月', '6 個月', '生活費', 'months'], // i18n-ignore
  deposit: ['保本', '利息', '隨時', '流動', 'interest', 'liquid', 'anytime'], // i18n-ignore
}

const QUESTION = /[?？]|嗎|呢|什麼|多少|怎麼|如何|哪|是否|有沒有|會不會|可不可以|能不能|請問|說說|聊聊|介紹|^(what|how|why|when|where|who|which|do|does|did|is|are|can|could|would|will|tell me)\b/i // i18n-ignore
const OPEN_Q = /說說|聊聊|狀況|情況|介紹|多說|生活|tell me|situation|more about/i // i18n-ignore
const EMPATHY = /了解|理解|明白|我懂|確實|沒錯|很正常|辛苦|放心|不用急|慢慢|謝謝您|understand|makes sense|that's fair|no rush|take your time|good question/i // i18n-ignore
const CLOSING = /總結|整理一下|我的建議|建議您|下一步|可以考慮|回去想想|跟家人討論|in summary|to sum up|my suggestion|i suggest|next step|you could consider/i // i18n-ignore
const NEGATE = /不(太)?(適合|建議|需要|急著)|先不要|不用買|暫時不|not (suitable|recommend|necessary|needed)|don't need|wouldn't recommend/i // i18n-ignore

// 違反公平待客的說法。principal 只在談投資型 / 儲蓄型商品時才算。
export const RED_FLAGS = [
  { id: 'guarantee', re: /(?<!不|沒有|無|非|不是)保證(獲利|收益|報酬|賺|配息|撥回|領)|穩賺|(?<!不)一定(會)?賺|(?<!不是|不能說)不會虧|(?<!不是|並非|沒有)零風險|(?<!不是|並不是)沒有(任何)?風險|guarantee[ds]?\b.{0,14}(return|profit|gain|income|payout)|can'?t lose|cannot lose|risk[- ]free|no risk/i, label: '保證收益', why: '投資一定有風險。「保證獲利」「穩賺不賠」「零風險」都是誤導性說法。' }, // i18n-ignore
  { id: 'principal', re: /保本|本金(不會|沒有)(虧|損|風險)|principal is (safe|protected)/i, onlyWith: ['invlinked', 'annuity'], label: '把投資說成保本', why: '投資型保單沒有保本,撥回也可能來自本金;不能說成「保本」。' }, // i18n-ignore
  { id: 'pressure', re: /今天(就)?(要)?(簽|買|決定)|最後一天|錯過就沒|名額有限|限時|趕快(簽|買)|sign today|last day|limited time|only today/i, label: '施壓成交', why: '用時間壓力逼客戶決定,違反公平待客。客戶有權回家考慮。' }, // i18n-ignore
  { id: 'tiein', re: /(一定|必須|規定)要?(先)?(買|保|投保).{0,8}(才|才能|才可以).{0,6}(貸|核|過)|must buy .{0,20} (to|for) (get|the) (loan|mortgage)/i, label: '搭售', why: '房貸與保險不能綁在一起,不能把投保當成核貸條件。' }, // i18n-ignore
  { id: 'deposit', re: /(跟|和|就像|等於)定存(一樣|差不多)|比定存(還|更)(好|安全)|same as a (time )?deposit|safer than a deposit/i, label: '把保單比成定存', why: '保險不是存款,不能把保單說成定存或比定存安全。' }, // i18n-ignore
]

export function readSignals(text) {
  const raw = String(text || '')
  let rest = norm(raw)
  const products = []
  for (const [id, keys] of PRODUCT_KEYS) {
    const hit = keys.filter((k) => rest.includes(k))
    if (hit.length) { products.push(id); for (const k of hit) rest = rest.split(k).join(' ') }
  }
  const flags = RED_FLAGS.filter((f) => f.re.test(raw) && (!f.onlyWith || f.onlyWith.some((p) => products.includes(p)))).map((f) => f.id)
  const explained = products.filter((p) => (EXPLAIN[p] || []).some((k) => norm(raw).includes(k)))
  return {
    products, flags, explained,
    question: QUESTION.test(raw.trim()),
    open: OPEN_Q.test(raw),
    empathy: EMPATHY.test(raw),
    closing: CLOSING.test(raw),
    negated: NEGATE.test(raw),
    length: raw.trim().length,
  }
}

// ---------- 客戶設定 ----------
export const CLIENT_LIST = CLIENTS

const DEFAULT_OBJECTION = {
  mortgage: '銀行是不是規定一定要買房貸壽險才能貸款?',
  life: '我還年輕,壽險會不會太早?',
  disability: '失能險是什麼?跟意外險有什麼不一樣?',
  medical: '我有健保跟公司團保,還需要醫療險嗎?',
  critical: '重大傷病險跟醫療險有什麼不一樣?',
  accident: '意外險不是很便宜嗎?要買多少才夠?',
  ltc: '不是有政府的長照 2.0 嗎?還需要自己準備?',
  invlinked: '這個會不會虧本?',
  annuity: '儲蓄險跟定存比起來怎麼樣?',
  emergency: '預備金要放多少才夠?',
  deposit: '可是定存利息很少耶。',
}
const objectionFor = (c, p) => c.objections?.[p] || DEFAULT_OBJECTION[p]

// 用剛玩完的這一局,把玩家自己的角色變成客戶
export function clientFromGame(s) {
  const an = analyzeGaps(s)
  const gaps = an.gaps.filter((g) => !g.blocked).slice(0, 3)
  const owned = Object.entries(s.coverage).filter(([, v]) => v > 0).map(([k]) => t(PRODUCTS[k].name))
  const join = (a) => a.join('、') // i18n-ignore
  const facts = [
    { id: 'income', label: t('收入與預算'), text: t('我們家年收入大約 {inc} 萬,一年生活開銷大約 {exp} 萬。', { inc: Math.round(householdIncome(s) / 10000), exp: Math.round(s.expense / 10000) }), keys: ['收入', '薪水', '預算', '開銷', '支出', 'income', 'salary', 'budget', 'spend'] }, // i18n-ignore
    { id: 'cover', label: t('現有保障'), text: owned.length ? t('我現在有:{list}。', { list: join(owned) }) : t('我目前沒有任何保單。'), keys: ['保險', '保單', '保障', '投保', 'insurance', 'policy', 'cover'] }, // i18n-ignore
    { id: 'cash', label: t('緊急預備金'), text: t('手邊的現金大概夠撐 {m} 個月。', { m: Math.max(0, Math.round(an.emergencyMonths)) }), keys: ['現金', '存款', '預備金', '積蓄', '存', 'cash', 'savings', 'emergency'] }, // i18n-ignore
  ]
  if (s.partner || s.dependents > 0) facts.unshift({ id: 'family', label: t('家庭狀況'), text: s.dependents > 0 ? t('我已婚,要扶養 {n} 個人。', { n: s.dependents }) : t('我已婚,目前還沒有小孩。'), keys: ['家', '太太', '先生', '老婆', '小孩', '孩子', '扶養', 'family', 'wife', 'husband', 'kid', 'child'] }) // i18n-ignore
  if (s.house && s.house.balance > 0) facts.push({ id: 'loan', label: t('房貸'), text: t('房貸還有 {b} 萬。', { b: Math.round(s.house.balance / 10000) }), keys: ['房貸', '貸款', '房子', 'mortgage', 'loan', 'house', 'home'] }) // i18n-ignore
  const needs = gaps.map((g) => ({ id: g.id, label: t(PRODUCTS[g.id].name), any: g.id === 'life' || g.id === 'mortgage' ? ['life', 'mortgage'] : [g.id] }))
  if (an.emergencyMonths < 3) needs.push({ id: 'emergency', label: t('緊急預備金'), any: ['emergency'] })
  const careful = /穩健/.test(s.player.style || '') // i18n-ignore:比對內部的個性名稱
  const bold = /冒險/.test(s.player.style || '') // i18n-ignore
  return {
    id: 'game', icon: '🪞', name: s.player.name, age: s.age, risk: bold ? '積極型' : '穩健型', // i18n-ignore:顯示時再 t()
    title: t('剛走完這一局的你'),
    brief: t('{age} 歲{title}{fam}{house}。', { age: s.age, title: t(s.player.title), fam: s.partner ? t(',已婚') : '', house: s.house ? t(',有房') : '' }),
    goal: t('想重新檢視自己的保障還缺什麼。'),
    opening: t('我剛走完這一段人生,經歷了不少事。你可以幫我看看,我的保障還缺什麼嗎?'),
    facts,
    needs: needs.length ? needs : [{ id: 'review', label: t('定期檢視'), any: ['life', 'medical', 'disability', 'emergency'] }],
    avoid: careful ? ['invlinked'] : [],
    objections: {},
  }
}

// ---------- 一回合:理專說一句,客戶(離線規則)回一句 ----------
export function newSession(client) {
  return { client, msgs: [{ role: 'client', text: t(client.opening) }], trust: 50, revealed: [], raised: {}, accepted: {}, pushed: {}, mentioned: {}, pending: null, turn: 0, done: false }
}

const ACCEPT = ['原來是這樣,這樣我比較懂了。那保費大概要多少?', '好,這一塊我會認真考慮。', '嗯,有道理,我回去會再想想。']
const FLAG_REPLY = {
  guarantee: '保證?投資不是都有風險嗎?你這樣說我反而有點擔心。',
  principal: '保本?可是我聽說撥回有可能是拿我自己的本金耶。',
  pressure: '我不想今天就決定,讓我回去跟家人商量一下。',
  tiein: '真的嗎?我記得銀行不能把保險跟貸款綁在一起吧?',
  deposit: '保單跟定存應該不一樣吧?你這樣比我有點不放心。',
}
// 回答客戶疑慮時常見的說法(有回應、有解釋)
const ANSWER = /不是|其實|因為|所以|簡單說|舉例|例如|差別|不一樣|不同|actually|because|for example|in short|the difference/i // i18n-ignore

export function clientTurn(session, text) {
  const c = session.client
  const sig = readSignals(text)
  const s = { ...session, msgs: [...session.msgs, { role: 'advisor', text }], revealed: [...session.revealed], raised: { ...session.raised }, accepted: { ...session.accepted }, pushed: { ...session.pushed }, mentioned: { ...session.mentioned }, turn: session.turn + 1 }
  let trust = s.trust + (sig.empathy ? 5 : 0)
  const parts = []
  const newFacts = []
  const pushes = sig.negated ? [] : sig.products
  const avoidPushed = pushes.filter((p) => (c.avoid || []).includes(p))
  const needSet = new Set((c.needs || []).flatMap((n) => n.any))
  for (const p of pushes) s.mentioned[p] = true

  // 1. 誤導或施壓:客戶馬上起疑
  if (sig.flags.length) {
    trust -= 20 * sig.flags.length
    parts.push(t(FLAG_REPLY[sig.flags[0]]))
  }
  // 2. 上一句客戶提出的疑慮,這一句有沒有回應
  const pend = s.pending
  s.pending = null
  if (pend && !sig.flags.length) {
    if (sig.explained.includes(pend) || (ANSWER.test(text) && sig.length >= 12)) {
      s.accepted[pend] = true
      trust += 6
      parts.push(t(ACCEPT[Object.keys(s.accepted).length % ACCEPT.length]))
    } else if (!sig.question) {
      parts.push(t('可是你還沒回答我剛剛的問題耶。'))
      s.pending = pend
    }
  }
  // 3. 問到的事情:有對到關鍵字就說;開放式問題就說下一件還沒講的事
  if (sig.question) {
    const lower = norm(text)
    let hits = c.facts.filter((f) => !s.revealed.includes(f.id) && f.keys.some((k) => lower.includes(norm(k))))
    if (!hits.length && sig.open) hits = c.facts.filter((f) => !s.revealed.includes(f.id)).slice(0, 1)
    for (const f of hits.slice(0, 2)) { s.revealed.push(f.id); newFacts.push(f.id); parts.push(t(f.text)) }
    if (hits.length) trust += 4
  }
  // 4. 推薦商品:推了不適合的會反彈;適合的,客戶會提出一個疑慮(一次一個)
  if (!sig.flags.length) {
    for (const p of avoidPushed) {
      if (s.pushed[p]) continue
      s.pushed[p] = true
      trust -= 10
      parts.push(t(objectionFor(c, p)))
    }
    if (!s.pending && parts.length < 2) {
      const next = pushes.find((p) => needSet.has(p) && !avoidPushed.includes(p) && !s.raised[p])
      if (next) { s.raised[next] = true; s.pending = next; parts.push(t(objectionFor(c, next))) }
    }
  }
  // 5. 收尾:有照顧到真正的需要,客戶願意回去考慮
  if (!parts.length && sig.closing) {
    const covered = (c.needs || []).filter((n) => n.any.some((p) => s.mentioned[p])).length
    if (covered) { parts.push(t('好,我回去跟家人討論,下次再來找你。謝謝你講得這麼清楚。')); s.done = true } else parts.push(t('可是你還沒告訴我,我到底需要什麼?'))
  }
  if (!parts.length && sig.question && s.revealed.length >= c.facts.length) parts.push(t('我的狀況大概就是這樣了。你覺得我應該先處理什麼?'))
  if (!parts.length && sig.empathy) parts.push(t('謝謝你,聽你這樣說我比較放心。'))
  if (!parts.length) parts.push(t('嗯…可以再說得具體一點嗎?'))

  s.trust = clamp(trust, 0, 100)
  if (s.turn >= MAX_TURNS) s.done = true
  const reply = parts.slice(0, 2).join(' ')
  s.msgs.push({ role: 'client', text: reply })
  return { session: s, reply, signals: { ...sig, newFacts, avoidPushed, objection: s.pending } }
}

// ---------- 評分(四項各 25 分)----------
export function scoreSession(session) {
  const c = session.client
  const adv = session.msgs.filter((m) => m.role === 'advisor').map((m) => m.text)
  const sigs = adv.map(readSignals)
  const mentioned = new Set(sigs.flatMap((x) => (x.negated ? [] : x.products)))
  const explained = new Set(sigs.flatMap((x) => x.explained))
  const questions = sigs.filter((x) => x.question).length
  const firstPitch = sigs.findIndex((x) => x.products.length && !x.negated)
  const askedFirst = sigs.findIndex((x) => x.question) >= 0 && (firstPitch < 0 || sigs.findIndex((x) => x.question) < firstPitch)
  const notes = { discovery: [], clarity: [], compliance: [], suitability: [] }

  // 1. 需求探詢
  const factPart = c.facts.length ? (session.revealed.length / c.facts.length) * 15 : 15
  const discovery = Math.round(factPart + Math.min(questions, 3) * 2 + (askedFirst ? 4 : 0))
  const missed = c.facts.filter((f) => !session.revealed.includes(f.id))
  if (missed.length) notes.discovery.push(t('還沒問到:{list}', { list: missed.map((f) => t(f.label)).join(', ') }))
  if (!askedFirst) notes.discovery.push(t('先問清楚客戶的狀況,再介紹商品'))

  // 2. 說明清楚
  const relevant = [...mentioned].filter((p) => p !== 'deposit')
  const expRatio = relevant.length ? relevant.filter((p) => explained.has(p)).length / relevant.length : 0
  const raisedIds = Object.keys(session.raised)
  const answered = raisedIds.filter((p) => session.accepted[p]).length
  const objRatio = raisedIds.length ? answered / raisedIds.length : 0
  const avgLen = adv.length ? adv.reduce((a, x) => a + x.length, 0) / adv.length : 0
  const concise = avgLen && avgLen <= 160 ? 4 : avgLen <= 260 ? 2 : 0
  const clarity = Math.round(expRatio * 15 + objRatio * 6 + concise)
  const unexplained = relevant.filter((p) => !explained.has(p) && PRODUCTS[p])
  if (unexplained.length) notes.clarity.push(t('提到但沒講清楚:{list}', { list: unexplained.map((p) => t(PRODUCTS[p].name)).join(', ') }))
  if (raisedIds.length > answered) notes.clarity.push(t('客戶提出的疑慮,有 {n} 個還沒回應', { n: raisedIds.length - answered }))
  if (avgLen > 160) notes.clarity.push(t('一次講太多,試著一次只講一個重點'))

  // 3. 合規與公平待客
  const flags = []
  sigs.forEach((x, i) => x.flags.forEach((f) => flags.push({ id: f, turn: i + 1, text: adv[i] })))
  const sellsInvestment = mentioned.has('invlinked')
  const disclosed = adv.some((a) => EXPLAIN.invlinked.some((k) => norm(a).includes(k)))
  const noRisk = sellsInvestment && !disclosed
  const compliance = clamp(25 - flags.length * 10 - (noRisk ? 8 : 0), 0, 25)
  for (const f of flags) { const def = RED_FLAGS.find((r) => r.id === f.id); notes.compliance.push(t('第 {n} 句「{label}」:{why}', { n: f.turn, label: t(def.label), why: t(def.why) })) }
  if (noRisk) notes.compliance.push(t('介紹投資型保單時,要說明價值會波動、費用與可能虧損'))

  // 4. 建議適合度
  const needs = c.needs || []
  const met = needs.filter((n) => n.any.some((p) => mentioned.has(p)))
  const pushedAvoid = (c.avoid || []).filter((p) => sigs.some((x) => !x.negated && x.products.includes(p)))
  const suitability = clamp(Math.round((needs.length ? (met.length / needs.length) * 20 : 20) - pushedAvoid.length * 8 + (session.trust >= 70 ? 5 : 0)), 0, 25)
  const unmet = needs.filter((n) => !met.includes(n))
  if (unmet.length) notes.suitability.push(t('沒有談到客戶真正的需要:{list}', { list: unmet.map((n) => t(n.label)).join(', ') }))
  for (const p of pushedAvoid) notes.suitability.push(t('「{name}」不適合這位客戶({risk})', { name: t(PRODUCTS[p]?.name || p), risk: t(c.risk) }))

  const parts = [
    { id: 'discovery', label: t('需求探詢'), score: clamp(discovery, 0, 25), max: 25, notes: notes.discovery },
    { id: 'clarity', label: t('說明清楚'), score: clamp(clarity, 0, 25), max: 25, notes: notes.clarity },
    { id: 'compliance', label: t('合規與公平待客'), score: compliance, max: 25, notes: notes.compliance },
    { id: 'suitability', label: t('建議適合度'), score: suitability, max: 25, notes: notes.suitability },
  ]
  const total = parts.reduce((a, p) => a + p.score, 0)
  return {
    total, grade: total >= 85 ? 'A' : total >= 70 ? 'B' : total >= 55 ? 'C' : 'D', parts,
    flags: flags.map((f) => f.id), revealed: session.revealed.length, facts: c.facts.length,
    met: met.map((n) => n.id), unmet: unmet.map((n) => n.id), trust: session.trust, turns: adv.length,
  }
}

// ---------- 沒有 AI 時的教練回饋 ----------
const BETTER = {
  mortgage: '房貸是家裡最大的負債。萬一發生不幸,房貸壽險可以直接清償剩下的房貸,讓家人保住房子;要不要買由您決定,也可以用足額的定期壽險代替。',
  life: '我們先算一下:如果您不在了,家人每年的生活費、房貸和孩子的教育費還需要多少?定期壽險就是用比較低的保費,補上這個缺口。',
  disability: '您最大的資產其實是未來的收入。如果因為生病或意外不能工作,失能險可以每年補一部分收入,讓家裡的生活不中斷。',
  medical: '公司團保離職就沒了。趁現在健康,先準備一張自己的實支實付醫療險,換工作也帶得走。',
  critical: '重大傷病險是確診時一次給付,可以補治療期間的收入和自費藥物,跟實支實付醫療險是互補的。',
  accident: '您每天騎機車通勤,意外險可以補意外造成的醫療和失能;保費不高,但記得它不保生病。',
  ltc: '長照 2.0 是基本的照顧資源,但每個月的看護費常常要好幾萬。長照險可以在需要照顧時,每年給付一筆錢。',
  emergency: '在投資之前,先準備 3 到 6 個月的生活費當緊急預備金,遇到意外才不用被迫賣掉投資。',
  annuity: '年金險適合確定長期不會用到的錢;中途解約可能拿不回全部的錢,要先確認資金的用途。',
  deposit: '這筆錢是您的養老金,不能承受虧損。可以先把一部分維持在定存或隨時能用的地方,其他再依您的風險屬性規劃。',
}

// 給翻譯檢查用:這些句子是用 t(變數) 顯示的,英文字典裡都要有
export const ROLEPLAY_TEXTS = [
  ...Object.values(DEFAULT_OBJECTION), ...Object.values(FLAG_REPLY), ...ACCEPT, ...Object.values(BETTER),
  ...RED_FLAGS.flatMap((f) => [f.label, f.why]),
]

export function offlineFeedback(session, score) {
  const strengths = []
  const improve = []
  const best = [...score.parts].sort((a, b) => b.score / b.max - a.score / a.max)
  for (const p of best.slice(0, 2)) if (p.score / p.max >= 0.6) strengths.push(t('「{label}」做得不錯({s}/{m})', { label: p.label, s: p.score, m: p.max }))
  if (score.revealed >= Math.ceil(score.facts / 2)) strengths.push(t('有花時間了解客戶,問出 {n} 項重要資訊', { n: score.revealed }))
  if (!score.flags.length) strengths.push(t('沒有使用誤導性或施壓的話術'))
  for (const p of [...score.parts].sort((a, b) => a.score / a.max - b.score / b.max)) for (const n of p.notes) if (improve.length < 3) improve.push(n)
  const c = session.client
  const target = (c.needs || []).find((n) => score.unmet.includes(n.id)) || (c.needs || [])[0]
  const key = target ? target.any.find((p) => BETTER[p]) : null
  return {
    strengths: strengths.slice(0, 3),
    improve: improve.length ? improve : [t('試著用更多開放式問題,讓客戶說出真正的擔心')],
    betterLine: key ? t(BETTER[key]) : t(BETTER.emergency),
  }
}
