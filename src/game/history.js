// 歷史行情模式:股市照「台股加權指數」真實的年底收盤走,而不是隨機抽行情。
// 資料:臺灣證券交易所年報 / Fact Book、中央銀行年報,與媒體封關報導(查證紀錄見 docs/DATA_SOURCES.md)。
// 加權指數是「價格指數」,不含股利,所以遊戲裡的報酬會比真實的含息報酬略低。教學用。
// 資料結束(2025 年)之後的年份,回到模擬行情。

// [年份, 年底收盤, 這一年發生了什麼]
export const TAIEX = [
  [1999, 8448.84, ''],
  [2000, 4743.94, '網路泡沫破裂,科技股從高點崩落'],
  [2001, 5551.24, '911 事件後一度重挫,年底強勁反彈'],
  [2002, 4452.45, '全球科技股持續修正'],
  [2003, 5890.69, 'SARS 疫情過後,股市大幅反彈'],
  [2004, 6139.69, '總統大選前後劇烈震盪'],
  [2005, 6548.34, '景氣平穩,指數小幅走高'],
  [2006, 7823.72, '全球景氣擴張,台股穩步上漲'],
  [2007, 8506.28, '美國次貸風暴浮現,高檔大幅震盪'],
  [2008, 4591.22, '全球金融海嘯,雷曼兄弟倒閉'],
  [2009, 8188.11, '各國降息救市,股市 V 型反轉'],
  [2010, 8972.50, '景氣復甦,企業獲利回升'],
  [2011, 7072.08, '日本 311 強震與歐債危機,下半年重挫'],
  [2012, 7699.50, '歐債危機逐漸緩解'],
  [2013, 8611.51, '美國持續寬鬆貨幣政策'],
  [2014, 9307.26, '電子股帶動,穩健上漲'],
  [2015, 8338.06, '中國股災引發全球股市重挫'],
  [2016, 9253.50, '英國脫歐公投衝擊後回升'],
  [2017, 10642.86, '台股站上萬點'],
  [2018, 9727.41, '美中貿易戰,10 月全球股災'],
  [2019, 11997.14, '半導體大漲,台商回流'],
  [2020, 14732.53, '新冠疫情爆發,3 月急跌後強勁反彈'],
  [2021, 18218.84, '航運與半導體熱潮'],
  [2022, 14137.69, '美國聯準會快速升息,股債齊跌'],
  [2023, 17930.81, '生成式 AI 熱潮帶動反彈'],
  [2024, 23035.10, 'AI 伺服器與半導體領漲'],
  [2025, 28963.60, '全年大漲 5,928.5 點,創歷年最大漲點紀錄'],
]

const BY_YEAR = new Map(TAIEX.map(([y, close, news], i) => [y, { year: y, close, news, prev: i > 0 ? TAIEX[i - 1][1] : null }]))
export const FIRST_YEAR = TAIEX[1][0]
export const LAST_YEAR = TAIEX[TAIEX.length - 1][0]

// 可以選的起始年份(選單用)
export const HIST_STARTS = [
  { year: 2000, label: '從 2000 年開始(網路泡沫)' },
  { year: 2008, label: '從 2008 年開始(金融海嘯)' },
  { year: 2014, label: '從 2014 年開始(近十年)' },
]

// 某一年的資料:{ year, close, prev, ret, news };沒有資料回傳 null
export function taiexYear(year) {
  const d = BY_YEAR.get(year)
  if (!d || d.prev == null) return null
  return { ...d, ret: Math.round((d.close / d.prev - 1) * 10000) / 10000 }
}

export const isHistory = (s) => s?.market?.mode === 'history'

// 這個玩家「今年」對應到哪一個真實年份(第 1 年 = 起始年份)
export function histYearOf(s) {
  if (!isHistory(s)) return null
  return taiexYear(s.market.start + s.turn)
}

// 今年的股市報酬:歷史模式且還有資料才回傳數字,否則 null(交給原本的模擬行情)
export function histReturn(s) {
  const h = histYearOf(s)
  return h ? h.ret : null
}

export function normalizeMarket(m) {
  if (!m || m.mode !== 'history') return null
  const start = Number(m.start)
  if (!BY_YEAR.has(start) || start < FIRST_YEAR || start > LAST_YEAR) return null
  return { mode: 'history', start }
}
