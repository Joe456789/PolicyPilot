// 觀念前後測:玩之前考 A 卷、玩完考 B 卷。兩份考卷考的是同樣的 7 個觀念,只是題目不同,
// 這樣「進步」才不是因為背到同一題。結果存在訓練紀錄,主管後台可以看全班的進步幅度。
export const CONCEPTS = [
  { id: 'emergency', name: '緊急預備金' },
  { id: 'income', name: '收入中斷(失能)' },
  { id: 'life', name: '壽險需求' },
  { id: 'mortgage', name: '房貸壽險' },
  { id: 'invest', name: '投資型保單' },
  { id: 'market', name: '市場波動與配置' },
  { id: 'kyc', name: '適合度與公平待客' },
]

export const FORMS = {
  pre: [
    { c: 'emergency', q: '「緊急預備金」一般建議準備多少?', options: ['1 個月的薪水', '3 到 6 個月的生活費', '不用準備,全部拿去投資比較划算'], answer: 1, why: '先有 3 到 6 個月生活費的預備金,遇到失業或意外才不必借錢或被迫賣掉投資。' },
    { c: 'income', q: '對靠薪水過活、存款不多的上班族,哪一種風險對家庭財務衝擊最大?', options: ['感冒看病', '長期失能、無法工作', '手機摔壞'], answer: 1, why: '失能讓收入中斷、支出卻增加,是最傷家庭財務的風險;失能險就是補這一塊。' },
    { c: 'life', q: '估算壽險保額,比較合理的做法是?', options: ['越高越好', '家人未來的生活費 + 房貸等負債 − 已有的資產', '大家都買 100 萬'], answer: 1, why: '壽險要補的是「你不在之後,家人還需要的錢」,扣掉已經準備好的資產。' },
    { c: 'mortgage', q: '遞減型房貸壽險的保額通常怎麼變化?', options: ['固定不變', '隨房貸餘額逐年遞減', '逐年增加'], answer: 1, why: '遞減型保額大致等於剩餘房貸,保費也比較低;目的是讓房貸不會留給家人。' },
    { c: 'invest', q: '投資型保單「每月撥回 6%」代表什麼?', options: ['每年保證賺 6%', '撥回可能來自收益或本金,不等於報酬率', '本金一定不會虧'], answer: 1, why: '撥回率不是報酬率;若撥回來自本金,帳戶價值會越領越少。' },
    { c: 'market', q: '股市一年內大跌 30%,長期投資的人比較好的做法是?', options: ['馬上全部賣掉', '照原本的配置持有,必要時再平衡', '借錢加碼全部押上'], answer: 1, why: '恐慌賣出常常賣在低點、錯過反彈;事先定好配置、定期再平衡比猜高低點重要。' },
    { c: 'kyc', q: '銀行銷售投資商品前先做 KYC,主要目的是?', options: ['推銷更多商品', '了解客戶狀況與風險承受度,推薦適合的商品', '只是行政程序'], answer: 1, why: 'KYC 與適合度評估是保護客戶的機制:不適合的商品,再好賣也不該賣。' },
  ],
  post: [
    { c: 'emergency', q: '小資族每月能存 1 萬,手邊只有 2 萬現金,最優先應該?', options: ['全部定期定額買 ETF', '先把預備金存到 3 到 6 個月的生活費', '買年繳 6 萬的儲蓄險'], answer: 1, why: '預備金不足時,任何意外都會逼你借錢或賣掉投資;先存預備金,再談投資與儲蓄。' },
    { c: 'income', q: '失能所得補償險主要在補償什麼?', options: ['醫療費用', '因傷病無法工作而中斷的收入', '車子的維修費'], answer: 1, why: '年輕人最大的資產是未來的收入,失能險保護的就是這份收入。' },
    { c: 'life', q: '35 歲、有兩個小孩和房貸的家長,最該優先檢視的是?', options: ['壽險保額夠不夠照顧家人與房貸', '旅遊平安險', '手機保險'], answer: 0, why: '家庭責任越重,萬一身故留下的缺口越大;壽險是家庭支柱的基本功課。' },
    { c: 'mortgage', q: '客戶問「是不是一定要買房貸壽險才能貸款?」正確的回答是?', options: ['是,規定一定要買', '不是,要不要投保由客戶決定', '只有首購族要買'], answer: 1, why: '銀行不能把保險當成核貸條件;客戶可以選擇房貸壽險,或用足額的定期壽險代替。' },
    { c: 'invest', q: '介紹投資型保單時,哪一句話是恰當的?', options: ['「這張保證穩賺不賠」', '「帳戶價值會隨市場波動,前幾年的費用比較高」', '「它跟定存一樣安全」'], answer: 1, why: '投資型保單沒有保證收益,要如實說明波動、費用與可能虧損。' },
    { c: 'market', q: '哪一個做法最能降低單一市場大跌對你的衝擊?', options: ['把資產分散在股票、債券、現金等不同類型', '全部買同一檔熱門股', '用信貸加碼'], answer: 0, why: '分散配置讓單一資產大跌時,整體資產不會一起重挫。' },
    { c: 'kyc', q: '63 歲、風險屬性保守、定存即將到期的客戶,最不適合的建議是?', options: ['保留足夠的現金與定存', '把全部定存轉成高波動的投資型保單', '先評估將來的長照需求'], answer: 1, why: '建議要符合客戶的風險屬性與資金用途;養老金不適合全部放進高波動的商品。' },
  ],
}

// answers:每題選的選項(index,沒作答為 -1)
export function gradeTest(phase, answers) {
  const form = FORMS[phase] || []
  const byConcept = {}
  let correct = 0
  form.forEach((it, i) => {
    const ok = answers[i] === it.answer
    if (ok) correct++
    byConcept[it.c] = ok ? 1 : 0
  })
  return { phase, correct, total: form.length, byConcept }
}

// 前測與後測比較(以觀念為單位)
export function compareTests(pre, post) {
  if (!pre || !post) return null
  return {
    gain: post.correct - pre.correct,
    concepts: CONCEPTS.map((c) => ({ id: c.id, name: c.name, pre: pre.byConcept?.[c.id] ?? null, post: post.byConcept?.[c.id] ?? null })),
  }
}
