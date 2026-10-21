// 人生階段:孩子長大、自己變老。到了特定年紀一定會發生、而且要你做決定的事。
// 和「生活小事」走同一個流程(年度大事之後一件一件出現),但不是隨機抽的:
//   孩子:上幼兒園 → 上小學 → 國中補習 → 上大學 → 畢業獨立 → 結婚 → 孫子出生
//   自己:50 歲健康檢查、空巢期、65 歲退休、75 歲晚年照顧
// 選項的 fx 跟機會卡同一套(scenes.js 的 applyFx),另外多了:
//   recurring:接下來幾年每年固定多一筆支出(學費、補習費)
//   independent:孩子獨立,不再算扶養人口
//   retire:'now' 準時退休 / 'delay' 延後 3 年 / 'part' 退休後兼職

export const KID_STAGES = [
  {
    id: 'k_kinder', age: 3, icon: '🧸', title: '{kid}要上幼兒園了',
    story: '{kid}三歲了,開始要找幼兒園。公立便宜但名額要抽籤,私立雙語學費高很多。',
    choices: [
      { label: '抽公立/非營利幼兒園', hint: '接下來 3 年每年約 +3 萬', fx: { recurring: { amount: 30000, years: 3, label: '幼兒園學費' } } },
      { label: '讀私立雙語幼兒園', hint: '接下來 3 年每年約 +15 萬', fx: { recurring: { amount: 150000, years: 3, label: '幼兒園學費' } } },
    ],
    lesson: '孩子的教育費是一筆「確定會發生」的長期支出,適合用儲蓄或定期定額提前準備,而不是靠保險。',
  },
  {
    id: 'k_school', age: 6, icon: '🎒', title: '{kid}上小學了',
    story: '{kid}開始上小學。放學後要去安親班、學才藝,還是讓家人接送?',
    choices: [
      { label: '安親班加才藝課', hint: '接下來 6 年每年約 +8 萬', fx: { recurring: { amount: 80000, years: 6, label: '安親與才藝' } } },
      { label: '家人輪流接送,只上學校', hint: '接下來 6 年每年約 +2 萬', fx: { recurring: { amount: 20000, years: 6, label: '學雜費' }, health: -2 } },
    ],
  },
  {
    id: 'k_cram', age: 12, icon: '📝', title: '{kid}上國中,要不要補習?',
    story: '同學幾乎都在補習,{kid}也開口說想去。',
    choices: [
      { label: '全科補習', hint: '接下來 3 年每年約 +12 萬', fx: { recurring: { amount: 120000, years: 3, label: '補習費' } } },
      { label: '只補比較弱的科目', hint: '接下來 3 年每年約 +5 萬', fx: { recurring: { amount: 50000, years: 3, label: '補習費' } } },
      { label: '不補,自己陪讀', hint: '省錢,但比較累', fx: { health: -3 } },
    ],
  },
  {
    id: 'k_college', age: 18, icon: '🎓', title: '{kid}考上大學了',
    story: '放榜了!{kid}有幾個選擇:國立大學、私立大學,或是出國留學。',
    choices: [
      { label: '讀國立大學', hint: '接下來 4 年每年約 +15 萬(學費與生活費)', fx: { recurring: { amount: 150000, years: 4, label: '大學學費與生活費' } } },
      { label: '讀私立大學', hint: '接下來 4 年每年約 +28 萬', fx: { recurring: { amount: 280000, years: 4, label: '大學學費與生活費' } } },
      { label: '出國留學', hint: '接下來 4 年每年約 +120 萬', fx: { recurring: { amount: 1200000, years: 4, label: '留學費用' } } },
      { label: '申請助學貸款,讓孩子自己還', hint: '家裡不用出學費', fx: {} },
    ],
    lesson: '大學 4 年學費加生活費,國立約 60 萬、私立超過 100 萬、留學可能 500 萬起跳。越早開始準備,每年要存的就越少。',
  },
  {
    id: 'k_grad', age: 22, icon: '💼', title: '{kid}畢業,開始工作了',
    story: '{kid}找到第一份工作,準備搬出去自己生活。你不用再負擔{kid}的生活費了。',
    choices: [
      { label: '給一筆租屋與生活的起步金', hint: '-20 萬,之後每年支出減少', fx: { cash: -200000, independent: true, health: 2 } },
      { label: '讓他自己打拚', hint: '之後每年支出減少', fx: { independent: true } },
    ],
    lesson: '孩子獨立後,你的壽險需求通常會下降(要保障的人變少了),可以重新檢視保額。',
  },
  {
    id: 'k_wedding', age: 29, icon: '💒', title: '{kid}要結婚了',
    story: '{kid}帶另一半回家,說明年要結婚,也在看房子。',
    choices: [
      { label: '資助婚禮和購屋頭期款', hint: '-100 萬', fx: { cash: -1000000, health: 3 } },
      { label: '包一個大紅包', hint: '-20 萬', fx: { cash: -200000, health: 2 } },
      { label: '心意到就好', hint: '-6.6 萬', fx: { cash: -66000 } },
    ],
    lesson: '資助子女是愛,但先確定自己的退休金與醫療準備足夠,才不會變成下一代的負擔。',
  },
  {
    id: 'k_grandkid', age: 32, icon: '👶', title: '你當爺爺奶奶了!',
    story: '{kid}的孩子出生了。小倆口工作忙,問你能不能幫忙帶。',
    choices: [
      { label: '幫忙帶孫', hint: '天倫之樂,但體力吃緊', fx: { health: -4, cash: -30000 } },
      { label: '包紅包,偶爾去看看', hint: '-6.6 萬', fx: { cash: -66000, health: 2 } },
    ],
  },
]

export const SELF_STAGES = [
  {
    id: 's_fifty', age: 50, icon: '🩺', title: '五十歲的健康檢查',
    story: '公司的健檢報告出現好幾個紅字:血壓、血糖、膽固醇都偏高。',
    choices: [
      { label: '自費做完整檢查,開始運動', hint: '-3 萬,健康明顯變好', fx: { cash: -30000, health: 8, checkup: true } },
      { label: '先觀察看看', hint: '不動作', fx: { health: -5 } },
    ],
    lesson: '50 歲以後重大疾病與慢性病的機率明顯上升,醫療險、重大傷病險要在健康時就買好,生病之後就很難加保。',
  },
  {
    id: 's_empty', age: 45, icon: '🏡', title: '空巢期',
    req: (s) => (s.kids || []).length > 0 && s.kids.every((k) => k.independent),
    story: '孩子們都離家獨立了,家裡突然安靜下來。接下來的日子想怎麼過?',
    choices: [
      { label: '夫妻一起去旅行', hint: '-15 萬,身心放鬆', fx: { cash: -150000, health: 6, trip: true } },
      { label: '把省下的錢加碼退休準備', hint: '買入債券基金', fx: { invest: { cls: 'bond', pct: 0.25 } } },
    ],
    lesson: '孩子獨立後是加速準備退休金的黃金期:支出變少、收入通常也在高峰。',
  },
  {
    id: 's_retire', age: 65, icon: '🌅', title: '六十五歲,要退休了嗎?',
    req: (s) => !s.retired && s.age >= (s.retireAt || 65),
    story: '到了法定退休年齡。退休後收入會變成勞保年金加上你自己準備的退休金。',
    choices: [
      { label: '準時退休', hint: '收入改成年金,不再有工作收入', fx: { retire: 'now' } },
      { label: '延後 3 年退休', hint: '繼續領薪水,但身體比較累', fx: { retire: 'delay', health: -3 } },
      { label: '退休後兼職', hint: '年金加上原本收入的 3 成', fx: { retire: 'part' } },
    ],
    lesson: '勞保年金大約只有退休前薪水的 3~4 成。退休後的生活費缺口,要靠年金險、投資與存款補上。',
  },
  {
    id: 's_old', age: 75, icon: '🧓', title: '晚年的照顧安排',
    story: '體力大不如前,醫生建議開始規劃長期照顧:在家請看護,還是住進照護機構?',
    choices: [
      { label: '在家請外籍看護', hint: '每年約 +30 萬,長照險可以分擔', fx: { care: 300000, health: 2 } },
      { label: '住進照護機構', hint: '每年約 +45 萬,長照險可以分擔', fx: { care: 450000, health: 4 } },
      { label: '靠家人輪流照顧', hint: '省錢,但家人很辛苦', fx: { health: -4 } },
    ],
    lesson: '台灣平均需要長期照顧的時間約 7 年以上。長照險與長照 2.0 補助,是讓家人不被拖垮的關鍵。',
  },
]

// 孩子的稱呼:老大、老二、老三(英文翻成 your eldest…)
export const KID_NAMES = ['老大', '老二', '老三', '老四']

// 這一年到期的人生階段事件(依序):孩子的、自己的。回傳 'k_school#0' 這種 id(# 後面是第幾個孩子)
export function dueStages(s) {
  const out = []
  ;(s.kids || []).forEach((k, i) => {
    for (const st of KID_STAGES) {
      if (k.age === st.age && !(k.done || []).includes(st.id) && (st.id !== 'k_grad' || !k.independent)) out.push(`${st.id}#${i}`)
    }
  })
  for (const st of SELF_STAGES) {
    if (s.age >= st.age && !(s.stagesDone || []).includes(st.id) && (!st.req || st.req(s))) out.push(st.id)
  }
  return out
}

export function stageById(id) {
  const [base, kid] = id.split('#')
  const d = KID_STAGES.find((x) => x.id === base) || SELF_STAGES.find((x) => x.id === base)
  return d ? { def: d, kid: kid == null ? null : Number(kid) } : null
}

// 開局時已經有孩子(30、40 歲開局):依父母年齡推一個合理的孩子年齡
export function initialKids(startAge, n) {
  const out = []
  for (let k = 0; k < n; k++) out.push({ age: Math.max(0, Math.min(16, startAge - 29 - k * 3)), done: [] })
  return out
}
