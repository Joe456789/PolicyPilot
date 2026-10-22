// 理賠申請:有保險給付時,玩家要自己挑出該附上的文件。
// 文件附齊 → 當年入帳;缺件 → 要補件,這筆理賠金延到下一年才入帳(這一年的現金會比較緊)。
// 電腦對手與託管直接附齊文件;給付金額本身由 payoutFor 決定,這裡只處理「什麼時候拿到錢」。
import { t } from '../i18n.js'
import { run } from './core.js'

export const DOCS = {
  form: { icon: '📝', name: '理賠申請書與存摺影本', why: '每一種理賠都要:確認是誰申請、理賠金要匯到哪個帳戶。' },
  diag: { icon: '🩺', name: '診斷證明書', why: '證明生了什麼病、受了什麼傷;醫療、重大傷病、失能、長照、意外理賠都要。' },
  receipt: { icon: '🧾', name: '醫療費用收據', why: '實支實付型醫療險是「花多少、賠多少」,要用收據證明實際花費;收據副本能不能用要先問保險公司。' },
  catastrophic: { icon: '🪪', name: '健保重大傷病證明', why: '重大傷病險通常以健保核發的重大傷病證明為給付依據。' },
  patho: { icon: '🔬', name: '病理檢驗報告', why: '癌症險要用病理報告確認是癌症,才會給付一次金。' },
  disab: { icon: '♿', name: '失能診斷書', why: '失能險依失能等級給付,需要醫師評估失能程度。' },
  ltcEval: { icon: '🧓', name: '長期照顧狀態診斷證明', why: '長照險要證明日常生活有幾項無法自理,或經醫師診斷為失智。' },
  accident: { icon: '🚑', name: '意外事故證明', why: '意外險要證明傷害是「外來、突發、非疾病」造成的,例如報案紀錄或事故經過說明。' },
  repair: { icon: '🏚️', name: '損失照片與修繕估價單', why: '住宅險要看到損失現場和修復金額;修理前先拍照,損壞的東西先別急著丟。' },
  police: { icon: '🚓', name: '警方事故證明', why: '車禍理賠要有警方紀錄釐清責任;發生事故當下記得報警。' },
  settle: { icon: '🤝', name: '和解書', why: '責任險是幫你賠給對方;和解金額要先讓保險公司同意,私下答應的金額不一定能全賠。' },
  carfix: { icon: '🔧', name: '車輛維修估價單', why: '車損要先讓保險公司查勘估價,再進廠修理。' },
  trip: { icon: '🧳', name: '旅程證明與損失單據', why: '旅平險要附機票或行程證明,以及延誤、遺失的相關證明。' },
  // 用不到的文件(混在選項裡)
  diploma: { icon: '🎓', name: '畢業證書', why: '和理賠無關。', decoy: true },
  credit: { icon: '💳', name: '信用卡帳單', why: '刷卡紀錄不能取代醫療收據或損失證明。', decoy: true },
  deed: { icon: '📜', name: '房屋權狀正本', why: '理賠不需要交權狀正本,看的是保單和損失證明。', decoy: true },
  phone: { icon: '📱', name: '手機門號帳單', why: '和理賠無關。', decoy: true },
  checkup: { icon: '📋', name: '去年的健康檢查報告', why: '理賠看的是這次的診斷證明,不是過去的健檢。', decoy: true },
}
const DECOYS = Object.keys(DOCS).filter((k) => DOCS[k].decoy)

// 每一種給付需要哪些文件
const NEED = {
  medical: ['diag', 'receipt'], daily: ['diag'], lump: ['diag', 'catastrophic'], cancer: ['diag', 'patho'],
  disability: ['diag', 'disab'], ltc: ['diag', 'ltcEval'], accident: ['diag', 'accident'], home: ['repair'], travel: ['trip'],
}

const hash = (str) => { let h = 2166136261; for (const ch of str) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return h >>> 0 }

// 有給付時開一張理賠單(還沒申請);payout 是 payoutFor 的結果
export function openClaim(s, payout, ctx = {}) {
  if (!payout || !(payout.total > 0)) return
  const need = new Set(['form'])
  for (const [k, docs] of Object.entries(NEED)) if (payout[k] > 0) docs.forEach((d) => need.add(d))
  if (payout.auto > 0) {
    need.add('police')
    if (ctx.cat === 'liability') need.add('settle')
    if (ctx.carRepair) need.add('carfix')
  }
  const seed = hash(`${s.turn}-${s.age}-${payout.total}`)
  const decoys = [...DECOYS].sort((a, b) => hash(a + seed) - hash(b + seed)).slice(0, 3)
  const options = [...need, ...decoys].sort((a, b) => hash(a + seed + 1) - hash(b + seed + 1))
  const prev = s.claim && !s.claim.filed ? s.claim : null
  if (prev) {
    // 同一年又有另一筆給付:合併成一次申請
    prev.amount += payout.total
    need.forEach((d) => { if (!prev.need.includes(d)) { prev.need.push(d); prev.options.push(d) } })
    return
  }
  s.claim = { amount: payout.total, need: [...need], options, label: ctx.label || '' }
}

export const claimPending = (s) => !!(s.claim && !s.claim.filed)

// 送出申請:picks 是勾選的文件 id
export function fileClaim(state, picks) {
  return run(state, (s) => {
    const c = s.claim
    if (!c || c.filed) return
    const missing = c.need.filter((d) => !picks.includes(d))
    const extra = picks.filter((d) => !c.need.includes(d))
    c.filed = { missing, extra, picks }
    s.claimStats = s.claimStats || { filed: 0, perfect: 0 }
    s.claimStats.filed++
    if (!missing.length) {
      if (!extra.length) s.claimStats.perfect++
      return
    }
    // 缺件:理賠金先扣回來,下一年補件後才入帳
    s.cash -= c.amount
    s.claimDue = (s.claimDue || 0) + c.amount
    s.year.payout -= c.amount
  })
}

export const correctPicks = (s) => (s.claim ? [...s.claim.need] : [])

// 下一年開始時:補件的理賠金入帳
export function settleDue(s) {
  if (!s.claimDue) return
  s.cash += s.claimDue
  s.year.payout += s.claimDue
  s.year.events.push({ title: t('補件完成,去年的理賠金 {n} 萬入帳', { n: Math.round(s.claimDue / 1000) / 10 }), kind: 'chance', cat: 'card', icon: '📨' })
  s.claimDue = 0
}
