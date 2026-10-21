// 每年的「小事」:擲骰的年度大事之外,一年裡還會遇到 1~2 件生活小事,要你做個選擇。
// 金額小、選項簡單,但累積起來就是理財習慣;有些小意外也會用到保險(醫療、責任、住宅)。
// 選項的 fx 和機會卡同一套(scenes.js 的 applyFx);hit 是「小意外」:先付錢,有保險再理賠。

export const MINOR_DEFS = [
  {
    id: 'm_phone', icon: '📱', title: '手機摔裂了',
    story: '早上趕捷運,手機從口袋滑出去,螢幕裂成蜘蛛網。',
    choices: [
      { label: '直接換新旗艦機', hint: '-3.5 萬', fx: { cash: -35000 } },
      { label: '送修換螢幕', hint: '-8 千', fx: { cash: -8000 } },
      { label: '貼個保護貼繼續用', hint: '省錢,但有點不方便', fx: { health: -1 } },
    ],
    lesson: '這種「小額、可以承擔」的損失,通常自己付比買保險划算;保險要留給付不起的大風險。',
  },
  {
    id: 'm_wedding', icon: '💌', title: '朋友寄來喜帖',
    story: '大學好友要結婚了,邀請你出席。',
    choices: [
      { label: '出席,包 6,600', hint: '-6,600,友情加溫', fx: { cash: -6600, health: 2 } },
      { label: '出席,包 3,600', hint: '-3,600', fx: { cash: -3600, health: 1 } },
      { label: '禮到人不到,包 2,000', hint: '-2,000', fx: { cash: -2000 } },
    ],
    lesson: '紅白帖、聚餐這些人情開銷,年度預算裡要先留一筆,才不會月底才發現超支。',
  },
  {
    id: 'm_ticket', icon: '🚓', title: '收到交通罰單', req: (s) => !!s.car,
    story: '上個月趕時間,被測速照相拍到了。',
    choices: [
      { label: '乖乖繳罰款', hint: '-3,000', fx: { cash: -3000 } },
      { label: '拖著不繳', hint: '之後會加罰', fx: { cash: -9000 } },
    ],
    lesson: '罰單不能用保險理賠;最便宜的保險是遵守交通規則。',
  },
  {
    id: 'm_tooth', icon: '🦷', title: '牙齒隱隱作痛',
    story: '吃冰的時候牙齒一陣酸痛,好像蛀牙了。',
    choices: [
      { label: '馬上去看牙醫', hint: '-1.5 萬', fx: { cash: -15000, health: 2 } },
      { label: '先忍一下', hint: '省錢,但小病拖成大病', fx: { health: -7 } },
    ],
    lesson: '牙齒治療多半不在醫療險範圍內;定期檢查、早點處理,花費最少。',
  },
  {
    id: 'm_bonus', icon: '🧧', title: '公司加發一筆績效獎金',
    story: '今年專案表現不錯,主管幫你爭取到一筆額外獎金。',
    choices: [
      { label: '全部存起來', hint: '現金增加', fx: { incomeCash: 0.06 } },
      { label: '拿去買 ETF', hint: '投入股票型 ETF', fx: { incomeCash: 0.06, investAll: 'stock' } },
      { label: '犒賞自己去旅行', hint: '花掉一大半,身心放鬆', fx: { incomeCash: 0.02, health: 5, trip: true } },
    ],
    lesson: '意外之財最好先分配:一部分補緊急預備金、一部分投資,再留一點犒賞自己。',
  },
  {
    id: 'm_gig', icon: '💻', title: '有人找你接案',
    story: '朋友的公司臨時缺人,問你週末能不能幫忙做一個小專案。',
    choices: [
      { label: '接!多賺一筆', hint: '收入增加,但比較累', fx: { incomeCash: 0.05, health: -4 } },
      { label: '婉拒,週末好好休息', hint: '身體加分', fx: { health: 3 } },
    ],
    lesson: '斜槓收入能加速存錢,但健康也是資產;身體出狀況時,失能險才能補上收入。',
  },
  {
    id: 'm_sale', icon: '🛍️', title: '購物節大促銷',
    story: '雙 11 倒數計時,購物車已經塞滿了。',
    choices: [
      { label: '全部結帳', hint: '-2.5 萬', fx: { cash: -25000, health: 1 } },
      { label: '只買真的需要的', hint: '-5 千', fx: { cash: -5000 } },
      { label: '關掉 App', hint: '不花錢', fx: {} },
    ],
    lesson: '「省下來的錢」不是賺到的錢;沒在預算裡的東西,打折還是多花。',
  },
  {
    id: 'm_sprain', icon: '🏀', title: '打球扭傷腳踝',
    story: '下班打球落地時踩到別人的腳,腳踝腫了起來。',
    choices: [
      { label: '去醫院照 X 光、做復健', hint: '醫療費約 2.5 萬,有保險可以理賠', fx: { hit: { cat: 'medical', medical: 25000, accident: true, label: '扭傷就醫與復健' }, health: 1 } },
      { label: '冰敷休息就好', hint: '省錢,但恢復比較慢', fx: { health: -6 } },
    ],
    lesson: '意外受傷就醫,醫療險和意外險都可能理賠;小傷也記得留收據。',
  },
  {
    id: 'm_leak', icon: '💧', title: '家裡漏水', req: (s) => !!s.house,
    story: '連續大雨後,天花板滲水,牆壁也開始發霉。',
    choices: [
      { label: '請師傅徹底修好', hint: '約 8 萬,住宅險可能理賠', fx: { hit: { cat: 'home', other: 80000, label: '抓漏與牆面修繕' } } },
      { label: '先簡單補一下', hint: '-1.5 萬,之後可能更嚴重', fx: { cash: -15000, health: -2 } },
    ],
    lesson: '住宅火險加上附加險,可以涵蓋部分漏水與颱風損失;投保前要看清楚條款。',
  },
  {
    id: 'm_scrape', icon: '🛵', title: '騎車擦撞到別人',
    story: '路口轉彎時不小心擦到一台機車,對方的車殼和手機都摔壞了。',
    choices: [
      { label: '照價賠償對方', hint: '約 4 萬,有汽機車責任險可以理賠', fx: { hit: { cat: 'liability', other: 40000, label: '賠償對方車損' } } },
      { label: '跟對方討價還價', hint: '少賠一點,但吵了一架', fx: { hit: { cat: 'liability', other: 28000, label: '賠償對方車損' }, health: -3 } },
    ],
    lesson: '強制險只賠「人」不賠「車」;第三人責任險才會賠對方的財物損失。',
  },
  {
    id: 'm_parents', icon: '🎂', title: '爸媽生日快到了',
    story: '想好好幫爸媽慶生,讓他們開心一下。',
    choices: [
      { label: '帶全家去吃大餐', hint: '-1.2 萬', fx: { cash: -12000, health: 2 } },
      { label: '包紅包給他們', hint: '-2 萬', fx: { cash: -20000, health: 1 } },
      { label: '親手做卡片、回家吃飯', hint: '心意最重要', fx: { cash: -1000, health: 2 } },
    ],
  },
  {
    id: 'm_course', icon: '📚', title: '想報名進修課程',
    story: '看到一門和工作相關的線上課程,上完可以考證照。',
    choices: [
      { label: '報名,認真上完', hint: '-1.8 萬,之後收入小幅提升', fx: { cash: -18000, incomeMult: 1.02 } },
      { label: '先收藏,有空再說', hint: '不動作', fx: {} },
    ],
    lesson: '投資自己是報酬率最穩定的投資之一。',
  },
  {
    id: 'm_refund', icon: '🧾', title: '收到退稅通知',
    story: '今年有列舉保費與醫療費用,國稅局退了一筆稅給你。',
    choices: [
      { label: '存進緊急預備金', hint: '現金增加', fx: { cash: 8000 } },
      { label: '拿去繳下一期保費', hint: '現金增加', fx: { cash: 8000 } },
    ],
    lesson: '人身保險費每人每年最多可列舉 2.4 萬;健保費則可以全額列舉。',
  },
  {
    id: 'm_line', icon: '💬', title: 'LINE 群組報明牌',
    story: '陌生的投資群組說「老師帶單、保證月賺 20%」,只要先匯 5 萬入金。',
    choices: [
      { label: '匯款試試看', hint: '高報酬?', fx: { gamble: { lossP: 0.92, lose: { cash: -50000 }, win: { cash: 20000 } } } },
      { label: '封鎖並檢舉', hint: '不理會', fx: {} },
    ],
    lesson: '「保證獲利」「老師帶單」都是詐騙的典型話術;有疑問可以撥 165 反詐騙專線。',
  },
  {
    id: 'm_rent', icon: '🏢', title: '房東說要漲房租', req: (s) => !s.house,
    story: '租約到期,房東說附近房價漲了,房租每月要多 1,500。',
    choices: [
      { label: '接受漲價', hint: '每年支出 +1.8 萬', fx: { expense: 18000 } },
      { label: '搬到便宜一點的地方', hint: '搬家花 3 萬,支出不變', fx: { cash: -30000 } },
    ],
    lesson: '租屋族的支出會隨租金上漲;要不要買房,除了房價也要比較長期的租金與房貸。',
  },
  {
    id: 'm_check', icon: '🩺', title: '收到免費健檢通知', req: (s) => s.age >= 30,
    story: '政府提供的成人健檢名額開放預約了。',
    choices: [
      { label: '請假去做', hint: '健康加分,及早發現問題', fx: { health: 4, checkup: true } },
      { label: '太忙了,下次', hint: '不動作', fx: {} },
    ],
    lesson: '很多疾病早期沒有症狀;定期健檢加上醫療險,是最基本的健康保障。',
  },
  {
    id: 'm_pet', icon: '🐶', title: '撿到一隻流浪狗',
    story: '下雨天在巷口遇到一隻發抖的小狗,一直跟著你。',
    choices: [
      { label: '帶回家養', hint: '結紮與疫苗 -1 萬,每年支出 +1.5 萬', fx: { cash: -10000, expense: 15000, health: 4 } },
      { label: '聯絡動物之家', hint: '幫牠找到好人家', fx: { health: 1 } },
    ],
  },
  {
    id: 'm_invoice', icon: '🎫', title: '統一發票中獎',
    story: '對發票時發現中了一張!',
    choices: [
      { label: '開心收下', hint: '+2,000', fx: { cash: 2000 } },
    ],
  },
  {
    id: 'm_friendloan', icon: '🤝', title: '老同學開口借錢',
    story: '很久沒聯絡的同學說周轉不靈,想跟你借 3 萬,下個月就還。',
    choices: [
      { label: '借他', hint: '可能拿不回來', fx: { gamble: { lossP: 0.45, lose: { cash: -30000 }, win: { cash: 0 } } } },
      { label: '婉拒,但請他吃頓飯', hint: '-800', fx: { cash: -800 } },
    ],
    lesson: '借錢給別人,最好只借「拿不回來也沒關係」的金額。',
  },
]

// 這一年要發生哪些小事:1 件,有時 2 件;同一局不會重複太多次
export function drawMinors(s, rng) {
  const pool = MINOR_DEFS.filter((d) => (!d.req || d.req(s)) && (s.seen[d.id] || 0) < 2)
  const n = rng.next() < 0.45 ? 2 : 1
  const out = []
  for (let k = 0; k < n && pool.length; k++) {
    const i = Math.floor(rng.next() * pool.length)
    out.push(pool.splice(i, 1)[0].id)
  }
  return out
}

export const minorById = (id) => MINOR_DEFS.find((d) => d.id === id)
