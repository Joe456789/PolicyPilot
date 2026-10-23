// 盤中行情:一年當中股市突然大漲或大跌,要你當下決定加碼、賣出還是不動。
// 不消耗亂數(用種子與年份算出漲跌),所以不會改變其他事件的結果。
// 年底結算時,會回頭比較「如果你不動」的結果,讓玩家看到追高殺低的代價。
import { t } from '../i18n.js'
import { wan } from './format.js'

const hash = (n) => { let h = n >>> 0; h = Math.imul(h ^ (h >>> 16), 0x45d9f3b); h = Math.imul(h ^ (h >>> 16), 0x45d9f3b); return ((h ^ (h >>> 16)) >>> 0) / 4294967296 }
const riskyHold = (s) => s.hold.stock + s.hold.spec

// 這一年會不會有盤中行情:手上有股票類資產,而且大約一半的年份
export function flashDue(s) {
  // 歷史行情模式不出現盤中行情,年度漲跌才會和真實資料一致
  if (s.market?.mode === 'history') return false
  return riskyHold(s) >= 100000 && hash(s.seed * 7919 + s.turn * 104729) < 0.45
}

export function buildFlashScene(s) {
  const u = hash(s.seed * 31 + s.turn * 977 + 13)
  // 跌多漲少一點,跌幅也比較大(市場「下樓梯上電梯」的感覺)
  const mid = u < 0.55 ? -(0.08 + hash(s.turn * 131 + s.seed) * 0.14) : 0.06 + hash(s.turn * 137 + s.seed) * 0.1
  const before = riskyHold(s)
  s.hold.stock = Math.round(s.hold.stock * (1 + mid))
  s.hold.spec = Math.round(s.hold.spec * (1 + mid * 1.6))
  const change = riskyHold(s) - before
  const pct = Math.round(Math.abs(mid) * 100)
  const down = mid < 0
  return {
    kind: 'minor', defId: 'mkt_flash', icon: down ? '📉' : '📈', tone: down ? 'bad' : 'good',
    title: down ? t('盤中急跌 {pct}%!', { pct }) : t('盤中大漲 {pct}%!', { pct }),
    story: down
      ? t('新聞快訊:全球股市重挫,你的股票類資產帳面少了 {amt}。手機一直跳通知,你要怎麼做?', { amt: wan(-change) })
      : t('股市連續大漲,你的股票類資產帳面多了 {amt}。身邊的人都在討論要不要再買,你呢?', { amt: wan(change) }),
    tag: t('盤中行情'),
    choices: down
      ? [
          { label: t('逢低加碼買 ETF'), hint: t('用一部分現金買進股票型 ETF'), fx: { flash: 'buy' } },
          { label: t('停損,賣掉一半股票'), hint: t('先跑再說'), fx: { flash: 'sell' } },
          { label: t('不動,照原本的計畫'), hint: t('長期投資,不看短期漲跌'), fx: { flash: 'hold' } },
        ]
      : [
          { label: t('追高,再買一些'), hint: t('用一部分現金買進股票型 ETF'), fx: { flash: 'buy' } },
          { label: t('獲利了結,賣掉一半'), hint: t('落袋為安'), fx: { flash: 'sell' } },
          { label: t('不動,照原本的計畫'), hint: t('長期投資,不看短期漲跌'), fx: { flash: 'hold' } },
        ],
    base: { lesson: t('短期漲跌很難預測。研究一再發現,頻繁進出、追高殺低的投資人,報酬常常輸給「買進後持有」;真正該做的是事先定好配置,定期再平衡。'), mid },
  }
}

// 套用選擇:buy 用可動用現金的 3 成買 ETF;sell 賣掉股票與個股各一半(先放回現金)
export function applyFlash(s, action, add, spendable) {
  const mid = s.scene?.base?.mid || 0
  if (action === 'buy') {
    const amt = spendable(s, 0.3)
    if (amt > 0) { s.cash -= amt; s.hold.stock += amt; add(t('買入股票型 ETF'), -amt, 'note') }
    else add(t('現金不足,無法加碼'), 0, 'note')
    s.year.flash = { action, amount: amt, mid }
  } else if (action === 'sell') {
    const st = Math.round(s.hold.stock / 2), sp = Math.round(s.hold.spec / 2)
    s.hold.stock -= st; s.hold.spec -= sp
    s.cash += st + sp
    add(t('賣出股票類資產'), st + sp, 'in')
    s.year.flash = { action, amount: st + sp, mid }
  } else {
    add(t('你沒有動作,部位維持原樣'), 0, 'note')
    s.year.flash = { action, amount: 0, mid }
  }
}

// 年底:用今年剩下的股市報酬,算出這次決定多賺或少賺多少
export function settleFlash(s, stockRet) {
  const f = s.year.flash
  if (!f || f.action === 'hold' || !f.amount) return
  const diff = Math.round(f.amount * stockRet)
  const pct = Math.round(stockRet * 100)
  let title
  if (f.action === 'sell') {
    title = diff > 0
      ? t('盤中賣掉的部位,之後市場又漲了 {pct}%:少賺約 {amt}', { pct, amt: wan(diff) })
      : t('盤中賣掉的部位,之後市場又跌了 {pct}%:少賠約 {amt}', { pct: -pct, amt: wan(-diff) })
  } else {
    title = diff >= 0
      ? t('盤中加碼的部位,之後漲了 {pct}%:多賺約 {amt}', { pct, amt: wan(diff) })
      : t('盤中加碼的部位,之後又跌了 {pct}%:多賠約 {amt}', { pct: -pct, amt: wan(-diff) })
  }
  s.year.events.push({ title, kind: 'market', cat: null, icon: f.action === 'sell' ? '📤' : '📥' })
  s.flashLog = [...(s.flashLog || []), { turn: s.turn, action: f.action, diff: f.action === 'sell' ? -diff : diff }]
}
