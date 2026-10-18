// 事件資料庫(保底題庫)。數字由規則引擎決定;AI 只負責改寫 title / story / choices 的文字,
// 所以即使沒有網路或 API 額度用完,遊戲也能完整運作。
//
// 範圍欄位:[min, max],由亂數取值。choices 的機制欄位:
//   costMult  醫療/費用倍率      lossMult  收入中斷倍率
//   health    此選擇的健康影響倍率(越小越好)  tag 供特殊處理
export const EVENT_DEFS = [
  {
    id: 'flu',
    cat: 'medical',
    icon: '🤧',
    tone: 'bad',
    w: 6,
    title: '重感冒併發肺炎',
    story: '連續高燒不退,醫師建議住院觀察幾天。',
    medical: [40000, 90000],
    healthHit: 8,
    choices: [
      { label: '健保病房,正常治療', hint: '花費較省', costMult: 1, health: 1 },
      { label: '升級單人房、完整檢查', hint: '花費約 1.8 倍', costMult: 1.8, health: 0.6 },
    ],
  },
  {
    id: 'surgery',
    cat: 'medical',
    icon: '🦴',
    tone: 'bad',
    w: 5,
    title: '意外骨折,需要開刀',
    story: '週末運動時摔了一跤,醫生說要手術並休養一段時間。',
    medical: [150000, 420000],
    loss: { ratio: 0.15, years: 1 },
    healthHit: 20,
    choices: [
      { label: '健保給付的一般材料', hint: '自付較少,恢復較慢', costMult: 1, lossMult: 1.2, health: 1 },
      { label: '自費高階人工關節/鋼板', hint: '花費約 1.7 倍,恢復快', costMult: 1.7, lossMult: 0.6, health: 0.5 },
    ],
  },
  {
    id: 'cancer',
    cat: 'critical',
    once: true,
    icon: '🎗️',
    tone: 'bad',
    w: 2.3,
    title: '健檢發現早期癌症',
    story: '例行健檢出現異常,確診為癌症。除了醫療費用,接下來兩年工作也會大受影響。',
    medical: [700000, 1400000],
    loss: { ratio: 0.4, years: 2 },
    healthHit: 35,
    choices: [
      { label: '標準治療(健保給付)', hint: '花費較低,療程較長', costMult: 1, lossMult: 1.15, health: 1 },
      { label: '自費標靶與免疫治療', hint: '花費約 1.9 倍,恢復較好', costMult: 1.9, lossMult: 0.8, health: 0.5 },
    ],
  },
  {
    id: 'disability',
    cat: 'disability',
    once: true,
    icon: '🦽',
    tone: 'bad',
    w: 1.7,
    title: '車禍導致長期失能',
    story: '一場意外讓你無法正常工作,復健之路要走好幾年。',
    medical: [80000, 220000],
    loss: { ratio: 0.6, years: 3 },
    healthHit: 40,
    choices: [
      { label: '專心復健,暫停工作', hint: '收入中斷較大,恢復較好', costMult: 1, lossMult: 1, health: 0.6 },
      { label: '勉強兼職,邊工作邊復健', hint: '收入損失較少,但恢復較差', costMult: 0.8, lossMult: 0.75, health: 1.3 },
    ],
  },
  {
    id: 'jobloss',
    cat: 'jobloss',
    icon: '📉',
    tone: 'bad',
    w: 3,
    title: '公司裁員,你被資遣了',
    story: '景氣不好,部門整併,你突然需要重新找工作。',
    loss: { ratio: 0.45, years: 1 },
    choices: [
      { label: '盡快接受較低薪的工作', hint: '收入損失較少', lossMult: 0.6, tag: 'quick' },
      { label: '花一些錢進修,找更好的機會', hint: '費用 6 萬,之後收入 +6%', lossMult: 1, other: 60000, tag: 'upskill' },
    ],
  },
  {
    id: 'parent_care',
    cat: 'care',
    icon: '👵',
    tone: 'bad',
    w: 2,
    minAge: 36,
    title: '父母需要長期照顧',
    story: '長輩中風後生活無法自理,家人需要決定如何分工照顧。',
    recurring: { amount: 240000, years: 3, label: '父母照護費' },
    choices: [
      { label: '聘請外籍看護', hint: '每年 24 萬,持續 3 年', recurMult: 1, lossMult: 0 },
      { label: '自己請假照顧', hint: '每年 6 萬,但收入少 30%、為期 2 年', recurMult: 0.25, lossMult: 1, loss: { ratio: 0.3, years: 2 } },
    ],
  },
  {
    id: 'ltc_self',
    cat: 'ltc',
    icon: '🧓',
    tone: 'bad',
    w: 1.6,
    minAge: 52,
    title: '中風後需要長期照顧',
    story: '醫師說你需要長期的照顧與復健,生活品質與支出都將改變。',
    recurring: { amount: 500000, years: 3, label: '自身長照費用' },
    healthHit: 30,
    choices: [
      { label: '入住長照機構', hint: '每年 50 萬,持續 3 年', recurMult: 1, health: 0.7 },
      { label: '居家照顧搭配部分外援', hint: '每年約 35 萬', recurMult: 0.7, health: 1 },
    ],
  },
  {
    id: 'house_repair',
    cat: 'property',
    icon: '🔧',
    tone: 'bad',
    w: 3,
    title: '家裡突發狀況:漏水與車禍',
    story: '房子漏水又遇上小車禍,雜支一件接著一件來。',
    other: [60000, 150000],
    choices: [
      { label: '先修好,從存款支付', hint: '花費照舊', otherMult: 1 },
      { label: '只修必要的部分', hint: '花費約 6 成,但日後仍有隱憂', otherMult: 0.6 },
    ],
  },
  {
    id: 'tuition',
    cat: 'family',
    icon: '🎓',
    tone: 'neutral',
    w: 3,
    needsDependents: true,
    title: '孩子升學:教育費用來了',
    story: '孩子要升學,補習費、學費與才藝課一次到位。',
    other: [150000, 300000],
    choices: [
      { label: '公立學校、基本補習', hint: '花費照舊', otherMult: 1 },
      { label: '私立名校與多元課程', hint: '花費約 1.6 倍', otherMult: 1.6 },
    ],
  },
  {
    id: 'death',
    cat: 'death',
    icon: '🕊️',
    tone: 'bad',
    w: 0.6,
    minTurn: 3,
    needsFamilyOrAge: true,
    title: '一場突如其來的不幸',
    story: '你因急性疾病過世。接下來要看的,是你留給家人什麼樣的保障。',
    choices: [{ label: '看看家人的狀況', hint: '遊戲將在此結束', tag: 'death' }],
  },
]

export const MARKET_SCENARIOS = [
  { id: 'bull', icon: '🚀', title: '科技股大噴發', story: '新技術帶動資金湧入,股市一路走高。', ret: 0.22, rebound: 0, w: 2 },
  { id: 'steady', icon: '📈', title: '緩步走升的一年', story: '景氣平穩,市場小幅成長。', ret: 0.05, rebound: 0, w: 3 },
  { id: 'rally', icon: '🏦', title: '降息帶動反彈', story: '央行降息,資金回流股債市場。', ret: 0.12, rebound: 0, w: 1.5 },
  { id: 'crash', icon: '💥', title: '金融海嘯式崩盤', story: '全球金融危機爆發,股市大幅重挫。', ret: -0.35, rebound: 0.18, w: 1.4 },
  { id: 'covid', icon: '🦠', title: '疫情衝擊市場', story: '突發疫情造成恐慌,股市短期急跌。', ret: -0.22, rebound: 0.2, w: 1.4 },
  { id: 'inflation', icon: '🔥', title: '通膨升溫、升息壓力', story: '物價上漲、利率提高,資產評價下修。', ret: -0.09, rebound: 0.04, w: 1.6 },
]

export const BONUS_SCENARIOS = [
  { id: 'bonus', icon: '🧧', title: '年終獎金發放', story: '公司業績不錯,你領到一筆額外獎金。', pct: [0.08, 0.15], base: 'income' },
  { id: 'side', icon: '💼', title: '斜槓接案成功', story: '下班接的案子結案了,多了一筆外快。', amount: [60000, 140000] },
  { id: 'refund', icon: '🎁', title: '退稅與意外之財', story: '年度報稅退稅,加上舊保單的小額退費。', amount: [30000, 90000] },
]

export const MILESTONES = [
  {
    id: 'promotion',
    icon: '🏅',
    title: '升遷加薪',
    story: '你的表現被看見了,薪資調高 12%。你打算怎麼運用這筆加薪?',
    w: 3,
    choices: [
      { label: '維持原本生活,多存下來', hint: '支出幾乎不變', incomeMult: 1.12, expenseMult: 1.02 },
      { label: '順便升級生活品質', hint: '支出同步增加', incomeMult: 1.12, expenseMult: 1.1 },
    ],
  },
  {
    id: 'newchild',
    icon: '👶',
    title: '新生命報到',
    story: '家裡迎來新成員!開心之餘,責任也更重了。記得重新檢視保障。',
    w: 2.5,
    cond: (s) => s.char.family && s.dependents < 3 && s.age <= 40,
    choices: [{ label: '迎接新生命', hint: '一次性花費 10 萬,每年支出 +18 萬', tag: 'newchild' }],
  },
  {
    id: 'creep',
    icon: '🛍️',
    title: '消費升級的誘惑',
    story: '朋友都換了新手機、新車、新旅行方式。你要跟上嗎?',
    w: 2,
    choices: [
      { label: '量力而為,維持原本習慣', hint: '支出不變', expenseMult: 1 },
      { label: '跟上潮流,生活更精緻', hint: '每年支出 +8%', expenseMult: 1.08 },
    ],
  },
]

export const TIPS = [
  { icon: '💡', title: '緊急預備金', story: '建議保留 3 到 6 個月的生活費,遇到收入中斷時才不用賣資產或借錢。' },
  { icon: '💡', title: '保險不是越多越好', story: '保費占年收入約 10% 到 15% 較為健康,先補最大的風險缺口,再談其他。' },
  { icon: '💡', title: '健康時才投保', story: '一旦罹患重大疾病,日後很可能無法再加保或被加費、除外,保障要趁健康時規劃。' },
  { icon: '💡', title: '市場起伏是常態', story: '長期投資看的是資產配置與時間,恐慌賣出常常錯過後續的反彈。' },
]
