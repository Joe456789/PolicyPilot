// 內容資料庫(保底題庫)。數字由規則引擎決定;AI 只負責改寫文字與做學習回饋。
// 即使沒有網路或 API 額度用完,遊戲也完全可玩。
//
// fx(效果)欄位,由 scenes.js 的 applyFx 統一處理:
//   cash 現金增減(元)        cashPct 現金比例(負為支出)   expense 年度支出增減
//   expenseMult 支出倍率      incomeMult 收入倍率          health 健康增減
//   invest {cls, pct} 以現金買入某資產類別(占現金比例)
//   gamble {lossP, lose:{cashPct}, win:{cashPct}}  以機率決定輸贏
//   coverage 'topGap' 或 {id, tier}   special 特殊處理    lesson 學習重點

const lo = (a, b) => [a, b]

// ---------- 生活事件(健康、意外、職場、家庭、房產)----------
export const EVENT_DEFS = [
  {
    id: 'flu', cat: 'medical', icon: '🤧', tone: 'bad', w: 6,
    title: '重感冒併發肺炎', story: '連續高燒不退,醫師建議住院觀察幾天。',
    medical: lo(40000, 90000), healthHit: 8,
    choices: [
      { label: '健保病房,正常治療', hint: '花費較省', costMult: 1, health: 1 },
      { label: '升級單人房、完整檢查', hint: '花費約 1.8 倍', costMult: 1.8, health: 0.6 },
    ],
  },
  {
    id: 'fracture', cat: 'medical', icon: '🦴', tone: 'bad', accident: true,
    w: (s) => 4 + (s.career?.risk === 'mid' ? 1.5 : 0),
    title: '意外骨折,需要開刀', story: '週末運動時摔了一跤,醫生說要手術並休養一段時間。',
    medical: lo(150000, 420000), loss: { ratio: 0.15, years: 1 }, healthHit: 20,
    choices: [
      { label: '健保給付的一般材料', hint: '自付較少,恢復較慢', costMult: 1, lossMult: 1.2, health: 1 },
      { label: '自費高階人工關節/鋼板', hint: '花費約 1.7 倍,恢復快', costMult: 1.7, lossMult: 0.6, health: 0.5 },
    ],
  },
  {
    id: 'car_accident', cat: 'medical', icon: '🚗', tone: 'bad', accident: true, w: 3,
    title: '雨天路滑,發生車禍', story: '路口轉彎時被後方來車追撞,你受了傷,車子也要修。',
    medical: lo(80000, 260000), other: lo(50000, 120000), loss: { ratio: 0.1, years: 1 }, healthHit: 15, carRepair: true,
    choices: [
      { label: '配合治療、走理賠和解', hint: '好好復健', costMult: 1, lossMult: 1, health: 0.7 },
      { label: '勉強提早回去上班', hint: '少請假,但傷勢拖比較久', costMult: 0.8, lossMult: 0.4, health: 1.5 },
    ],
  },
  {
    id: 'chronic', cat: 'medical', icon: '💊', tone: 'bad', once: true, minAge: 34,
    w: (s) => 2.2 * (s.checkupYears > 0 ? 0.5 : 1),
    title: '健檢紅字:慢性病上身', story: '三高指數居高不下,醫師說需要長期用藥與追蹤。',
    medical: lo(60000, 120000), healthHit: 15,
    recurring: { amount: 36000, years: 8, label: '慢性病用藥與追蹤' },
    choices: [
      { label: '認真調整生活、規律回診', hint: '每年約 3.6 萬', recurMult: 1, health: 0.7 },
      { label: '先不管它,有症狀再說', hint: '省錢,但健康風險更高', recurMult: 0.4, health: 1.8 },
    ],
  },
  {
    id: 'cancer', cat: 'critical', icon: '🎗️', tone: 'bad', once: true, cancer: true,
    w: (s) => (s.age < 30 ? 0.7 : s.age < 40 ? 1.5 : 2.6) * (s.checkupYears > 0 ? 0.5 : 1),
    title: '健檢發現早期癌症', story: '例行健檢出現異常,確診為癌症。除了醫療費用,接下來兩年工作也會大受影響。',
    medical: lo(700000, 1400000), loss: { ratio: 0.4, years: 2 }, healthHit: 35,
    choices: [
      { label: '標準治療(健保給付)', hint: '花費較低,療程較長', costMult: 1, lossMult: 1.15, health: 1 },
      { label: '自費標靶與免疫治療', hint: '花費約 1.9 倍,恢復較好', costMult: 1.9, lossMult: 0.8, health: 0.5 },
    ],
  },
  {
    id: 'disability', cat: 'disability', icon: '🦽', tone: 'bad', once: true, accident: true,
    w: (s) => (s.age < 30 ? 0.9 : 1.7),
    title: '嚴重事故導致長期失能', story: '一場意外讓你無法正常工作,復健之路要走好幾年。',
    medical: lo(80000, 220000), loss: { ratio: 0.6, years: 3 }, healthHit: 40,
    choices: [
      { label: '專心復健,暫停工作', hint: '收入中斷較大,恢復較好', costMult: 1, lossMult: 1, health: 0.6 },
      { label: '勉強兼職,邊工作邊復健', hint: '收入損失較少,但恢復較差', costMult: 0.8, lossMult: 0.75, health: 1.3 },
    ],
  },
  {
    id: 'burnout', cat: 'career', icon: '😵', tone: 'bad', minTurn: 2,
    w: (s) => 2.6 * (['engineer', 'nurse', 'sales'].includes(s.player.careerId) ? 1.5 : 1),
    title: '工作壓力爆表,身心亮紅燈', story: '連續幾個月加班,你開始失眠、胃痛,醫生說再這樣下去會出事。',
    medical: lo(15000, 40000), loss: { ratio: 0.2, years: 1 }, healthHit: 12,
    choices: [
      { label: '請長假好好休養', hint: '收入少一些,但恢復快', costMult: 1, lossMult: 1, health: 0.4 },
      { label: '硬撐,不想錯過升遷', hint: '收入不受影響,但健康大扣分', costMult: 0.5, lossMult: 0, health: 2 },
    ],
  },
  {
    id: 'jobloss', cat: 'jobloss', icon: '📉', tone: 'bad', w: 3, minTurn: 1,
    title: '景氣下滑,工作突然中斷', story: '公司裁員或大客戶流失,你需要重新找工作或新客源。',
    loss: { ratio: 0.45, years: 1 },
    choices: [
      { label: '盡快接受較低薪的工作', hint: '收入損失較少', lossMult: 0.6, tag: 'quick' },
      { label: '花一些錢進修,找更好的機會', hint: '費用 6 萬,之後收入 +6%', lossMult: 1, other: 60000, tag: 'upskill' },
    ],
  },
  {
    id: 'parent_care', cat: 'care', icon: '👵', tone: 'bad', w: 2, minAge: 36,
    title: '父母需要長期照顧', story: '長輩中風後生活無法自理,家人需要決定如何分工照顧。',
    recurring: { amount: 240000, years: 3, label: '父母照護費' },
    choices: [
      { label: '聘請外籍看護', hint: '每年 24 萬,持續 3 年', recurMult: 1, lossMult: 0 },
      { label: '自己請假照顧', hint: '每年 6 萬,但收入少 30%、為期 2 年', recurMult: 0.25, lossMult: 1, loss: { ratio: 0.3, years: 2 } },
    ],
  },
  {
    id: 'ltc_self', cat: 'ltc', icon: '🧓', tone: 'bad', w: 1.6, minAge: 47,
    title: '中風後需要長期照顧', story: '醫師說你需要長期的照顧與復健,生活品質與支出都將改變。',
    recurring: { amount: 500000, years: 3, label: '自身長照費用' }, healthHit: 30,
    choices: [
      { label: '入住長照機構', hint: '每年 50 萬,持續 3 年', recurMult: 1, health: 0.7 },
      { label: '居家照顧搭配部分外援', hint: '每年約 35 萬', recurMult: 0.7, health: 1 },
    ],
  },
  {
    id: 'car_liability', cat: 'liability', icon: '⚖️', tone: 'bad', w: 2.4,
    req: (s) => s.car,
    title: '擦撞他人車輛,對方受傷求償', story: '路口變換車道時擦撞到機車騎士,對方受傷住院,律師函寄到家裡要求賠償。',
    other: lo(300000, 1500000),
    choices: [
      { label: '協商和解,一次賠償', hint: '花費照舊', otherMult: 1 },
      { label: '走司法程序,拖比較久', hint: '花費約 1.3 倍(含律師費)', otherMult: 1.3 },
    ],
  },
  {
    id: 'house_repair', cat: 'property', icon: '🔧', tone: 'bad', w: 3,
    title: '家裡突發狀況:漏水與家電壞掉', story: '水管爆裂又碰上冰箱壞掉,雜支一件接著一件來。',
    other: lo(40000, 120000),
    choices: [
      { label: '先修好,從存款支付', hint: '花費照舊', otherMult: 1 },
      { label: '只修必要的部分', hint: '花費約 6 成,但日後仍有隱憂', otherMult: 0.6 },
    ],
  },
  {
    id: 'house_damage', cat: 'home', icon: '🌪️', tone: 'bad', w: 2.4,
    req: (s) => !!s.house,
    title: '颱風夜,房子受損', story: '強烈颱風來襲,窗戶破裂、屋內嚴重泡水,修繕費用相當可觀。',
    other: lo(300000, 1500000),
    choices: [
      { label: '全部修復到原本的樣子', hint: '花費照舊', otherMult: 1 },
      { label: '只做必要的結構修繕', hint: '花費約 7 成', otherMult: 0.7 },
    ],
  },
  {
    id: 'tuition', cat: 'family', icon: '🎓', tone: 'neutral', w: 3,
    req: (s) => s.dependents > 0,
    title: '孩子升學:教育費用來了', story: '孩子要升學,補習費、學費與才藝課一次到位。',
    other: lo(150000, 300000),
    choices: [
      { label: '公立學校、基本補習', hint: '花費照舊', otherMult: 1 },
      { label: '私立名校與多元課程', hint: '花費約 1.6 倍', otherMult: 1.6 },
    ],
  },
  {
    id: 'death', cat: 'death', icon: '🕊️', tone: 'bad', minTurn: 3,
    w: (s) => (s.age < 30 ? 0.2 : 0.5),
    req: (s) => s.dependents > 0 || !!s.partner || !!s.house || s.age >= 40,
    title: '一場突如其來的不幸', story: '你因急性疾病過世。接下來要看的,是你留給家人什麼樣的保障。',
    choices: [{ label: '看看家人的狀況', hint: '遊戲將在此結束', tag: 'death' }],
  },
]

// ---------- 機會卡(需要決策,常和理財與保險觀念有關)----------
export const CHANCE_DEFS = [
  {
    id: 'hot_tip', icon: '🔥', title: '同事報明牌:這檔個股一定噴',
    story: '午餐時間,同事神祕兮兮地說某檔個股有內線,保證三個月翻倍。你要跟嗎?',
    choices: [
      { label: '梭哈!拿 15% 現金買入', hint: '高風險、高波動', fx: { invest: { cls: 'spec', pct: 0.15 } } },
      { label: '小額試水溫,拿 5% 現金', hint: '風險有限', fx: { invest: { cls: 'spec', pct: 0.05 } } },
      { label: '不理會,先把自己的事顧好', hint: '不動作', fx: {} },
    ],
    lesson: '單一個股的波動很大。先有保障與緊急預備金,再談高風險投資,輸得起才玩得起。',
  },
  {
    id: 'scam_call', icon: '☎️', title: '自稱檢警的電話',
    story: '陌生來電說你的身分被盜用涉及洗錢,要你把錢轉到「監管帳戶」配合調查,語氣非常急迫。',
    choices: [
      { label: '掛斷電話,撥 165 查證', hint: '冷靜應對', fx: { lessonOnly: true } },
      { label: '依指示轉帳配合調查', hint: '照他說的做', fx: { cashPct: -0.35 } },
    ],
    lesson: '政府單位不會要求你轉帳。看到「急迫、保密、轉帳」就要警覺,多一個查證動作能保住積蓄。',
  },
  {
    id: 'high_return', icon: '💸', title: '保證月報酬 8% 的投資群組',
    story: '網友熱心邀你加入投資群組,展示一堆獲利截圖,說「穩賺不賠」,現在加入還有早鳥優惠。',
    choices: [
      { label: '投入 25% 現金試試看', hint: '聽起來很誘人', fx: { gamble: { lossP: 0.8, lose: { cashPct: -0.25 }, win: { cashPct: 0.08 } } } },
      { label: '拒絕,保證獲利的多半有問題', hint: '不動作', fx: { lessonOnly: true } },
    ],
    lesson: '「保證高報酬」幾乎都是陷阱。真正的投資一定有風險,合法的保障型商品則是用來轉移風險,不是用來賺錢的。',
  },
  {
    id: 'insurance_pitch', icon: '🧾', title: '親戚熱情推銷保單',
    story: '長輩介紹的業務員拿來一份厚厚的建議書,說這張儲蓄險「又保障又能賺」,今天簽有優惠。',
    choices: [
      { label: '先檢視我的保障缺口,只買真正需要的', hint: '補強最重要的一項', fx: { coverage: 'topGap' } },
      { label: '人情壓力,直接簽下高額儲蓄險', hint: '年繳 12 萬', fx: { coverage: { id: 'annuity', tier: 2 } } },
      { label: '婉拒,說我再研究看看', hint: '不動作', fx: {} },
    ],
    lesson: '買保險前先問三件事:我最大的風險是什麼?缺口多大?保費是否在可負擔範圍?(約占年收入 10% 到 15%)',
  },
  {
    id: 'peer_story', icon: '😢', title: '同事確診了重大疾病',
    story: '隔壁部門的同事才 35 歲,突然確診癌症。他說公司團保只賠一點點,接下來要請長假,家裡經濟立刻吃緊。',
    choices: [
      { label: '回家認真檢視自己的保障', hint: '補強最大缺口', fx: { coverage: 'topGap' } },
      { label: '覺得離我還很遠,先不想', hint: '不動作', fx: {} },
    ],
    lesson: '團保與健保只是基本盤。重大傷病真正的損失,常常是長期的收入中斷,而不只是醫療費。',
  },
  {
    id: 'phone', icon: '📱', title: '新旗艦手機 0 利率分期',
    story: '手機店店員說:月付 1,599 元、24 期零利率,今天辦還送配件。',
    choices: [
      { label: '買旗艦機', hint: '一次性約 3.8 萬', fx: { cash: -38000 } },
      { label: '買中階機就好', hint: '一次性約 1.8 萬', fx: { cash: -18000 } },
      { label: '現在的手機還能用', hint: '不動作', fx: {} },
    ],
    lesson: '分期零利率不等於不用花錢,累積多筆分期會讓每月的固定支出變得沉重。',
  },
  {
    id: 'friend_loan', icon: '🤝', title: '朋友急需借 10 萬',
    story: '多年好友說他週轉不靈,保證下個月就還你。你要借嗎?',
    choices: [
      { label: '借他 10 萬', hint: '有風險拿不回來', fx: { gamble: { lossP: 0.55, lose: { cash: -100000 }, win: { cash: 0 } } } },
      { label: '婉拒,但幫他想其他辦法', hint: '不動作', fx: {} },
    ],
    lesson: '借出去的錢要當作「可能拿不回來」。緊急預備金是用來應付自己的意外,不是拿來當人情的備胎。',
  },
  {
    id: 'travel', icon: '✈️', title: '年度旅行計畫',
    story: '工作了一整年,你想好好放個假。要去哪裡?',
    choices: [
      { label: '出國玩一趟', hint: '約 9 萬,心情大好', fx: { cash: -90000, health: 6, trip: true } },
      { label: '國內小旅行', hint: '約 3 萬', fx: { cash: -30000, health: 3, trip: true } },
      { label: '在家休息、存錢', hint: '不動作', fx: {} },
    ],
    lesson: '生活品質也是人生的一部分。重點是花得有計畫,而不是什麼都不花。',
  },
  {
    id: 'car_buy', icon: '🚙', title: '要不要買車?',
    story: '通勤越來越累,朋友勸你買車,但你知道養車的成本不只車價。',
    choices: [
      { label: '買新車', hint: '頭期款 25 萬,每年多 8 萬', fx: { cash: -250000, expense: 80000, car: true } },
      { label: '買二手車', hint: '8 萬,每年多 3.5 萬', fx: { cash: -80000, expense: 35000, car: true } },
      { label: '不買,繼續搭大眾運輸', hint: '不動作', fx: {} },
    ],
    lesson: '養車的成本包含保險、稅金、停車與保養。有車也讓意外與責任風險變大,記得檢視意外險與第三人責任。',
  },
  {
    id: 'rent_hike', icon: '🏚️', title: '房東通知漲租',
    story: '房東說明年起房租要調漲,不接受就請你搬家。',
    req: (s) => !s.house,
    choices: [
      { label: '接受漲租', hint: '每年多 1.5 萬', fx: { expense: 15000 } },
      { label: '搬家找新房子', hint: '搬家費 2 萬,花費持平', fx: { cash: -20000 } },
    ],
    lesson: '租屋要面對房價與租金的上漲,買房前先確認自己的現金流承擔得起房貸與意外。',
  },
  {
    id: 'travel_trouble', icon: '🧳', title: '旅途中行李遺失、班機取消',
    story: '出國旅行時班機臨時取消,行李也不見了,飯店與改票花了一大筆錢。你有沒有準備旅遊平安險?',
    choices: [
      { label: '自己想辦法處理', hint: '損失約 8 萬', fx: { risk: { cost: 80000, cat: 'trip', label: '旅途額外花費' } } },
    ],
    lesson: '旅平險保費很低,卻能補貼旅途中的突發花費與意外,是低成本的好選擇。',
  },
  {
    id: 'invlinked_pitch', icon: '🏦', title: '銀行理專推薦「投資型保單」',
    story: '理專說這張保單「有壽險保障、又能投資,報酬比定存好」。你要怎麼回應?',
    choices: [
      { label: '先問清楚費用與風險,小額試試(年繳 6 萬)', hint: '前兩年費用高,價值隨市場波動', fx: { coverage: { id: 'invlinked', tier: 1 } } },
      { label: '聽起來不錯,買大一點(年繳 12 萬)', hint: '保費負擔較重', fx: { coverage: { id: 'invlinked', tier: 2 } } },
      { label: '我想保障歸保障、投資歸投資,先不買', hint: '不動作', fx: {} },
    ],
    lesson: '投資型保單同時包含保障與投資,但費用結構較複雜、投資風險由自己承擔。買之前務必看清楚費用與帳戶價值試算。',
  },
  {
    id: 'cancer_news', icon: '📰', title: '新聞:名人罹癌過世',
    story: '一位知名的公眾人物因癌症離世,新聞天天討論。你開始想,萬一是自己怎麼辦?',
    choices: [
      { label: '評估補強癌症險(確診 50 萬)', hint: '癌症險可與重大傷病險疊加', fx: { coverage: { id: 'cancer', tier: 1 } } },
      { label: '先檢查自己的重大傷病險夠不夠', hint: '補強最大缺口', fx: { coverage: 'topGap' } },
      { label: '看看新聞就好', hint: '不動作', fx: {} },
    ],
    lesson: '癌症是常見的重大風險。重點不是買越多越好,而是先確認「收入中斷期間」的現金流能不能撐住。',
  },
  {
    id: 'daily_hospital_ad', icon: '🛏️', title: '同事住院一週,收入也跟著少了',
    story: '同事因腸胃炎住院七天,醫療費健保大部分負擔了,但看護與請假的損失卻讓他很頭痛。',
    choices: [
      { label: '加保住院日額險(日額 1,000 元)', hint: '補貼住院期間的雜支', fx: { coverage: { id: 'daily', tier: 1 } } },
      { label: '覺得健保加醫療險就夠了', hint: '不動作', fx: {} },
    ],
    lesson: '醫療險補的是醫療費用,住院期間的看護、營養品、請假損失,可以靠日額型給付補一補。',
  },
  {
    id: 'etf_dca', icon: '📅', title: '定期定額:要不要每年固定投資?',
    story: '朋友說他每年固定投資一筆錢,不看盤、不預測,幾年下來資產默默長大。你想試試嗎?',
    choices: [
      { label: '每年固定拿現金的 15% 買股票型 ETF', hint: '現在先買一筆', fx: { invest: { cls: 'stock', pct: 0.15 } } },
      { label: '先觀望,等跌了再買', hint: '不動作', fx: {} },
    ],
    lesson: '定期定額是用時間分散進場成本,不必預測市場高低點。重要的是持續,以及先保留好緊急預備金。',
  },
  {
    id: 'credit_card', icon: '💳', title: '信用卡帳單:只繳最低應繳金額?',
    story: '這個月花得有點多,帳單上寫著「最低應繳金額 3,000 元」,看起來很輕鬆。',
    choices: [
      { label: '全額繳清', hint: '本月現金少 4 萬', fx: { cash: -40000 } },
      { label: '只繳最低,剩下循環', hint: '循環利率高,年支出增加', fx: { expense: 9000 } },
    ],
    lesson: '信用卡循環利率常高達十幾個百分點,是最貴的貸款之一。有餘力時優先全額繳清。',
  },
  {
    id: 'pet', icon: '🐶', title: '收養了一隻毛小孩',
    story: '朋友的狗生了小狗,你一時心軟就收養了。毛小孩很療癒,但醫療與飼料都是新的支出。',
    choices: [
      { label: '收養並幫牠做好健康管理', hint: '每年多 3.5 萬,心情變好', fx: { expense: 35000, health: 4 } },
      { label: '婉拒,繼續自由的生活', hint: '不動作', fx: {} },
    ],
    lesson: '毛小孩的醫療費用沒有健保,生一場病可能就是幾萬元。養寵物前也要把預備金想進去。',
  },
  {
    id: 'startup_friend', icon: '🚀', title: '朋友創業,邀你入股',
    story: '朋友的新創公司需要資金,說三年內可能上市,邀請你投資 30 萬。',
    choices: [
      { label: '投入 30 萬', hint: '可能翻很多倍,也可能歸零', fx: { gamble: { lossP: 0.7, lose: { cash: -300000 }, win: { cash: 900000 } } } },
      { label: '投入 5 萬,意思意思', hint: '風險有限', fx: { gamble: { lossP: 0.7, lose: { cash: -50000 }, win: { cash: 150000 } } } },
      { label: '婉拒,留在安全的資產', hint: '不動作', fx: {} },
    ],
    lesson: '新創投資的成功率很低,這種錢一定要用「輸得起」的資金,不能動到緊急預備金與保費。',
  },
  {
    id: 'parents_gift', icon: '🎁', title: '爸媽想贈與你一筆錢',
    story: '爸媽看你努力工作,想一次給你一筆錢當作頭期款或創業基金,但也問你有什麼規劃。',
    choices: [
      { label: '存起來當緊急預備金', hint: '現金 +30 萬', fx: { cash: 300000 } },
      { label: '拿去投資 ETF', hint: '買入 ETF 30 萬', fx: { cash: 300000, invest: { cls: 'stock', pct: 0.45 } } },
      { label: '婉拒,他們的退休金比較重要', hint: '不動作', fx: {} },
    ],
    lesson: '無論資金哪裡來,先確認自己的保障與預備金,再決定投資。',
  },
  {
    id: 'appliance', icon: '🧊', title: '冷氣與電腦同時壞掉',
    story: '夏天剛到,冷氣壞了;偏偏工作用的電腦也在這週當機。',
    choices: [
      { label: '兩個一起換新', hint: '約 5.5 萬', fx: { cash: -55000 } },
      { label: '先修電腦,冷氣再忍忍', hint: '約 2.5 萬', fx: { cash: -25000 } },
    ],
    lesson: '生活裡小額的突發支出很多,緊急預備金就是替這些事準備的。',
  },
  {
    id: 'health_app', icon: '⌚', title: '智慧手環跳出心律警示',
    story: '你的手環說最近心律不太正常,建議就醫。你要理它嗎?',
    choices: [
      { label: '預約心臟科檢查', hint: '約 1.2 萬', fx: { cash: -12000, health: 8, checkup: true } },
      { label: '應該只是太累,不理它', hint: '不動作', fx: {} },
    ],
    lesson: '早期發現通常治療成本較低。但要注意:有病史之後再投保,可能被加費或除外,保障要趁健康時規劃。',
  },
]

// ---------- 意外之財 ----------
export const BONUS_DEFS = [
  { id: 'bonus', icon: '🧧', title: '年終獎金發放', story: '公司業績不錯,你領到一筆額外獎金。', pct: lo(0.08, 0.15), base: 'income' },
  { id: 'side', icon: '💼', title: '斜槓接案成功', story: '下班接的案子結案了,多了一筆外快。', amount: lo(60000, 140000) },
  { id: 'refund', icon: '🎁', title: '退稅與意外之財', story: '年度報稅退稅,加上舊保單的小額退費。', amount: lo(30000, 90000) },
  { id: 'invoice', icon: '🧾', title: '統一發票中獎', story: '隨手對的發票居然中了獎,雖然不大,也是個好心情。', amount: lo(5000, 20000) },
  { id: 'gift', icon: '👴', title: '長輩給的一筆紅包', story: '長輩看你這幾年辛苦,塞了一筆錢給你。', amount: lo(100000, 300000) },
  { id: 'competition', icon: '🏆', title: '參加比賽得名', story: '公司內部創意競賽你拿到名次,獲得一筆獎金。', amount: lo(40000, 100000) },
]

// ---------- 人生里程碑(部分有條件、一生只發生一次)----------
export const MILESTONE_DEFS = [
  {
    id: 'marriage', icon: '💍', title: '遇見對的人,要結婚嗎?', w: 3.4, once: true,
    req: (s) => !s.partner && s.age >= 24 && s.age <= 38 && s.turn >= 2,
    story: '交往幾年的另一半向你求婚了。兩個人的生活會更完整,責任也會更重。',
    choices: [
      { label: '結婚,攜手共組家庭', hint: '婚禮約 30 萬,家庭支出增加,但多一份收入', special: 'marry' },
      { label: '還想先專心衝事業', hint: '收入 +5%', fx: { incomeMult: 1.05 } },
    ],
  },
  {
    id: 'baby', icon: '👶', title: '新生命報到', w: 3.2,
    req: (s) => !!s.partner && s.dependents < 3 && s.age <= 42 && s.turn >= 3,
    story: '家裡迎來新成員!開心之餘,責任也更重了,記得重新檢視保障。',
    choices: [{ label: '迎接新生命', hint: '一次性花費 10 萬,每年支出 +18 萬', special: 'baby' }],
  },
  {
    id: 'house_buy', icon: '🏠', title: '看到心儀的房子', w: 3.2, once: true,
    req: (s) => !s.house && s.age >= 27 && s.age <= 50 && s.turn >= 3,
    story: '你看中一間地點與預算都剛好的房子。買房是人生最大的一筆財務決定,要想清楚。',
    choices: [
      { label: '買下它(付 20% 頭期款、貸款 30 年)', hint: '房貸壓力與意外風險都變大', special: 'buyHouse' },
      { label: '還是繼續租屋,保持彈性', hint: '不動作', fx: {} },
    ],
  },
  {
    id: 'promotion', icon: '🏅', title: '升遷加薪', w: 3, req: (s) => s.turn >= 1,
    story: '你的表現被看見了,薪資調高 12%。你打算怎麼運用這筆加薪?',
    choices: [
      { label: '維持原本生活,多存下來', hint: '支出幾乎不變', fx: { incomeMult: 1.12, expenseMult: 1.02, promo: true } },
      { label: '順便升級生活品質', hint: '支出同步增加', fx: { incomeMult: 1.12, expenseMult: 1.1, promo: true } },
    ],
  },
  {
    id: 'job_change', icon: '🔄', title: '獵人頭來電:要不要跳槽?', w: 2, req: (s) => s.turn >= 2 && s.player.careerId !== 'freelancer',
    story: '一家新公司開出更高的薪水,但需要重新適應,第一年還有試用期。',
    choices: [
      { label: '跳槽,迎接新挑戰', hint: '年收 +15%,第一年試用期打 9 折', special: 'jobChange' },
      { label: '留在原公司穩穩做', hint: '年收 +3%', fx: { incomeMult: 1.03 } },
    ],
  },
  {
    id: 'mba', icon: '📚', title: '進修學位的機會', w: 1.8, once: true,
    req: (s) => s.age >= 25 && s.age <= 40 && s.turn >= 2,
    story: '你考上了在職進修學位,畢業後有機會往上爬,但需要花時間與學費。',
    choices: [
      { label: '去進修', hint: '學費 25 萬,之後年收 +12%', fx: { cash: -250000, incomeMult: 1.12 } },
      { label: '先把錢留著', hint: '不動作', fx: {} },
    ],
  },
  {
    id: 'creep', icon: '🛍️', title: '消費升級的誘惑', w: 2,
    story: '朋友都換了新手機、新車、新旅行方式。你要跟上嗎?',
    choices: [
      { label: '量力而為,維持原本習慣', hint: '支出不變', fx: {} },
      { label: '跟上潮流,生活更精緻', hint: '每年支出 +8%', fx: { expenseMult: 1.08 } },
    ],
    lesson: '小額、長期的固定支出,對淨資產的影響往往比一次性大花費更大。',
  },
  {
    id: 'parents_support', icon: '👨‍👩‍👦', title: '父母的生活費問題', w: 3, once: true,
    req: (s) => s.player.parentsSupport && s.age >= 28 && s.age <= 42,
    story: '父母退休後收入不多,需要你每個月固定幫忙一部分生活費。',
    choices: [
      { label: '全額負擔', hint: '每年 +12 萬', fx: { expense: 120000 } },
      { label: '和兄弟姊妹分攤', hint: '每年 +6 萬', fx: { expense: 60000 } },
    ],
  },
  {
    id: 'family_business', icon: '🏭', title: '家裡的事業要不要接手?', w: 3.5, once: true,
    req: (s) => s.player.bgId === 'biz' && s.age >= 25 && s.age <= 38,
    story: '爸媽經營多年的生意想交棒給你。接手可能收入大增,但風險與責任也跟著來。',
    choices: [
      { label: '接手家業', hint: '年收入 +40%,但現金週轉壓力大', fx: { incomeMult: 1.4, cash: -150000 } },
      { label: '婉拒,走自己的路', hint: '收入 +5%', fx: { incomeMult: 1.05 } },
    ],
  },
  {
    id: 'inherit_house', icon: '🏚️', title: '長輩過世,留下老房子', w: 2.5, once: true,
    req: (s) => !s.house && s.age >= 30 && s.age <= 50 && s.player.bgId === 'heritage',
    story: '長輩留下一間老房子,地點不錯但屋況很舊。是要整修自住,還是賣掉換現金?',
    choices: [
      { label: '整修後自住', hint: '花 80 萬整修,省下租金', special: 'inheritHouse' },
      { label: '賣掉換現金', hint: '現金 +350 萬', fx: { cash: 3500000 } },
    ],
  },
  {
    id: 'retire_plan', icon: '🌅', title: '開始規劃退休', w: 3, once: true,
    req: (s) => s.age >= 46,
    story: '一轉眼就中年了。退休後的生活費從哪裡來?要不要現在就開始準備?',
    choices: [
      { label: '每年固定存年金險與債券', hint: '加保儲蓄年金、買債券基金', special: 'retire' },
      { label: '到時候再說', hint: '不動作', fx: {} },
    ],
    lesson: '退休金的缺口會隨著壽命延長與通膨而擴大。越早開始,每一年需要存的就越少。',
  },
]

// ---------- 市場行情 ----------
// 市場行情:取材自近二十多年常見的市場情境(僅為教學用的「靈感」,不代表真實數字)。
// headline 是情境新聞標題(虛構),analog 說明它對應的歷史情境,note 是投資觀念。
export const MARKET_DEFS = [
  { id: 'ai_boom', icon: '🚀', title: '科技股大噴發', story: '新技術帶動資金湧入,股市一路走高。', ret: 0.24, rebound: 0, w: 2,
    headline: '【財經快訊】AI 概念全面起飛,指數一年大漲兩成', analog: '類似 2023 年前後由新技術題材帶動的多頭行情', note: '好行情時最容易追高。紀律地分批投入,比預測高點更重要。' },
  { id: 'steady', icon: '📈', title: '緩步走升的一年', story: '景氣平穩,市場小幅成長。', ret: 0.06, rebound: 0, w: 3,
    headline: '【財經快訊】景氣溫和,股市穩步向上', analog: '長期平均的「普通年份」', note: '大多數年份是平淡的,資產是靠時間慢慢長大的。' },
  { id: 'rally', icon: '🏦', title: '降息帶動反彈', story: '央行降息,資金回流股債市場。', ret: 0.12, rebound: 0, w: 1.5,
    headline: '【財經快訊】央行宣布降息,資金重返股債市場', analog: '類似央行轉向寬鬆後的資產價格回升', note: '利率變動會影響各類資產,債券價格通常在降息時上漲。' },
  { id: 'crash', icon: '💥', title: '金融海嘯式崩盤', story: '全球金融危機爆發,股市大幅重挫。', ret: -0.38, rebound: 0.25, house: -0.05, w: 1.3,
    headline: '【財經快訊】大型金融機構出現危機,全球股市重挫', analog: '類似 2008 年全球金融海嘯', note: '歷史上大跌後常有反彈,但過程中很多人選擇恐慌賣出,錯過了回升。' },
  { id: 'covid', icon: '🦠', title: '疫情衝擊市場', story: '突發疫情造成恐慌,股市短期急跌。', ret: -0.24, rebound: 0.25, w: 1.3,
    headline: '【財經快訊】疫情擴散、封鎖擴大,全球股市短期急跌', analog: '類似 2020 年初疫情引發的快速下跌與之後的反彈', note: '突發事件造成的下跌可能很快,反彈也可能很快。想想你的資金短期會不會用到。' },
  { id: 'inflation', icon: '🔥', title: '通膨升溫、升息壓力', story: '物價上漲、利率提高,資產評價下修。', ret: -0.1, rebound: 0.06, house: -0.02, w: 1.6,
    headline: '【財經快訊】物價居高不下,央行連續升息', analog: '類似 2022 年通膨與升息使股債同跌', note: '通膨時期連債券也可能下跌,這就是為什麼要分散在不同性質的資產。' },
  { id: 'bubble', icon: '🫧', title: '概念股泡沫破滅', story: '前陣子漲翻天的題材股一夕崩跌,散戶哀鴻遍野。', ret: -0.2, rebound: 0.12, w: 1.2,
    headline: '【財經快訊】熱門題材股崩跌,市場資金大舉撤出', analog: '類似 2000 年前後網路泡沫破滅', note: '漲得太快、人人都在談的東西,風險往往也最大。' },
  { id: 'housing_boom', icon: '🏙️', title: '房市熱絡,房價飆升', story: '資金行情推升房價,新聞天天報創高。', ret: 0.09, rebound: 0, house: 0.15, w: 1.2,
    headline: '【財經快訊】成交量大增、房價創高,購屋族觀望情緒升溫', analog: '類似資金寬鬆時期的房市熱潮', note: '房價上漲時,別忘了房貸的負擔與天災風險,擁有房子要把住宅火險顧好。' },
  { id: 'housing_slump', icon: '📉', title: '房市降溫,價格鬆動', story: '政策與升息影響下,房市成交量明顯萎縮。', ret: 0.02, rebound: 0, house: -0.1, w: 1.0,
    headline: '【財經快訊】房市交易冷清,部分區域價格回落', analog: '類似升息與政策影響下的房市降溫', note: '房子不是只會漲。背著房貸時,收入穩定與保障比價格更重要。' },
  { id: 'oil_shock', icon: '🛢️', title: '地緣衝突推升油價', story: '國際局勢緊張,能源價格飆升,市場震盪。', ret: -0.08, rebound: 0.08, w: 1.2,
    headline: '【財經快訊】地緣衝突升溫,油價大漲、股市震盪', analog: '類似區域衝突造成的能源與供應鏈衝擊', note: '外部事件會讓市場短期波動,長期投資人要看的是自己的規劃,不是每日新聞。' },
  { id: 'euro_crisis', icon: '🇪🇺', title: '歐債風暴,市場不安', story: '海外債務問題擴大,投資人開始擔心連鎖效應。', ret: -0.14, rebound: 0.1, w: 1.0,
    headline: '【財經快訊】海外債務疑慮升高,避險資金湧入', analog: '類似 2011 年前後的歐債危機', note: '遠方的問題也會影響你的資產,分散投資能降低單一事件的衝擊。' },
  { id: 'trade_war', icon: '⚔️', title: '貿易戰升級,供應鏈受影響', story: '大國間的關稅與制裁不斷升高,出口產業首當其衝。', ret: -0.07, rebound: 0.07, w: 1.0,
    headline: '【財經快訊】貿易摩擦升溫,出口股走弱', analog: '類似 2018 年前後的貿易戰', note: '政策消息來得快、去得也快,不要因為單一新聞就大幅改變配置。' },
  { id: 'rate_hold', icon: '🧘', title: '低波動的平靜年', story: '市場波瀾不驚,成交量偏低,投資人沒什麼話題。', ret: 0.04, rebound: 0, w: 1.4,
    headline: '【財經快訊】市場波動降到低檔,投資人觀望', analog: '低波動的平靜時期', note: '平靜的年份是累積資產的好時機,也是檢視保障配置的好時機。' },
]

// ---------- 理財小學堂(純學習卡)----------
export const TIP_DEFS = [
  { icon: '🧮', title: '72 法則', story: '用 72 除以年報酬率,大約就是資產翻倍需要的年數:年報酬 6%,約 12 年翻倍。' },
  { icon: '📉', title: '最大風險是「被迫賣出」', story: '真正的虧損常發生在需要用錢時剛好遇到低點。緊急預備金與保障,就是避免你被迫賣在最低點。' },
  { icon: '⚖️', title: '風險與報酬成正比', story: '想要高報酬,就必須接受高風險。如果有人跟你說「高報酬、零風險」,那一定有問題。' },
  { icon: '🧾', title: '看清楚費用', story: '無論是基金還是投資型保單,費用都會長期侵蝕報酬。買之前先問:總共要付哪些費用?' },
  { icon: '🏥', title: '健保不是萬能', story: '健保負擔了大部分醫療費,但自費項目、看護與收入中斷,仍需要自己準備。' },
  { icon: '👶', title: '人生階段會改變需求', story: '結婚、生子、買房、換工作,每一個階段都會改變你的保障需求,記得每年檢視一次。' },
  { icon: '💳', title: '信用卡是工具,不是收入', story: '刷卡很方便,但帳單是一定要還的錢。避免循環利息,才是真正的理財。' },
  { icon: '🎯', title: '先目標,再工具', story: '先想清楚這筆錢的用途與時間(3 年內要用?20 年後才用?),再選擇適合的工具。' },

  { icon: '💡', title: '緊急預備金', story: '建議保留 3 到 6 個月的生活費,遇到收入中斷時才不用賣資產或借錢。' },
  { icon: '💡', title: '保險不是越多越好', story: '保費約占年收入 10% 到 15% 較為健康。先補最大的風險缺口,再談其他。' },
  { icon: '💡', title: '健康時才投保', story: '一旦罹患重大疾病,日後很可能無法再加保或被加費、除外,保障要趁健康時規劃。' },
  { icon: '💡', title: '市場起伏是常態', story: '長期投資看的是資產配置與時間,恐慌賣出常常錯過後續的反彈。' },
  { icon: '💡', title: '保險與投資要分開看', story: '保險是用小錢轉移大風險;投資是承擔風險換取報酬。兩者用途不同,不要混為一談。' },
  { icon: '💡', title: '收入就是你最大的資產', story: '二十幾歲最大的資產是未來幾十年的收入能力。失能或重病中斷收入,損失遠大於醫療費。' },
  { icon: '💡', title: '負債要看利率', story: '信用卡循環利率高得驚人。有高利負債時,優先還款通常比投資更划算。' },
  { icon: '💡', title: '通膨會悄悄吃掉購買力', story: '只放活存的錢,長期會被通膨侵蝕。適度的資產配置能讓錢跟上物價。' },
  { icon: '💡', title: '房貸不是只有月付金額', story: '買房除了貸款,還有稅費、修繕與天災風險,別忘了住宅火險與地震險。' },
  { icon: '💡', title: '家庭責任越重,保障越重要', story: '有人依靠你的收入時,壽險、失能險的重要性會大幅上升。' },
]

// ---------- 保險小測驗 ----------
export const QUIZ_DEFS = [
  {
    q: '「住院日額險」和「實支實付醫療險」最大的差別是?', options: ['日額險依住院天數定額給付,實支實付依實際收據給付', '兩者完全一樣', '日額險只有車禍才賠'], answer: 0,
    why: '日額險按天給固定金額,補貼看護與請假等雜支;實支實付則依實際醫療單據理賠。兩者可以搭配。',
  },
  {
    q: '關於「投資型保單」,下列何者正確?', options: ['保證每年都有固定報酬', '帳戶價值會隨市場波動,投資風險由自己承擔', '完全沒有任何費用'], answer: 1,
    why: '投資型保單的帳戶價值會隨市場起伏,而且有保險成本與各項費用,買前務必看清楚。',
  },
  {
    q: '年報酬 6% 時,資產大約幾年可以翻倍?(72 法則)', options: ['約 3 年', '約 12 年', '約 30 年'], answer: 1,
    why: '72 ÷ 6 = 12,所以約 12 年。越早開始,複利的力量越大。',
  },
  {
    q: '「定期定額」投資的主要好處是?', options: ['保證不會虧損', '用時間分散進場成本,不必預測高低點', '一定比單筆投資報酬高'], answer: 1,
    why: '定期定額不保證獲利,但能降低「買在最高點」的風險,並養成紀律。',
  },
  {
    q: '有車的人,為什麼要考慮「第三人責任險」?', options: ['補貼自己的修車費', '補貼撞傷他人或損壞他人財物的賠償', '讓保費變便宜'], answer: 1,
    why: '賠償金額可能遠超過存款。第三人責任險就是在這種情況下保護你。',
  },
  {
    q: '投保時有「等待期」,代表什麼?', options: ['投保後馬上全部生效', '投保後一段時間內發生的某些事故不理賠', '可以隨時無條件解約'], answer: 1,
    why: '不同保險的等待期不同,要看條款。目的是避免「明知有病才投保」。',
  },
  {
    q: '用信用卡「只繳最低應繳金額」,最可能發生什麼事?', options: ['沒有任何影響', '剩餘金額會產生高額的循環利息', '利息比定存還低'], answer: 1,
    why: '循環利率常高達十幾個百分點,是最貴的貸款之一。',
  },
  {
    q: '遊戲裡,為什麼「完全沒有保險」的那條線在重大事件後會掉得特別多?', options: ['因為運氣不好', '因為事件的損失全部由自己承擔', '因為利率變高了'], answer: 1,
    why: '同樣的事件,沒有保障的人要用存款、賣資產甚至借錢來承擔,這就是保險轉移風險的價值。',
  },

  {
    q: '「實支實付型醫療險」最主要的功能是什麼?', options: ['住院期間每天固定給付一筆錢', '依實際醫療收據,補貼住院手術的自費項目', '保證你生病期間的薪水'], answer: 1,
    why: '實支實付是依實際單據理賠,主要補貼健保之外的自費醫療費用。',
  },
  {
    q: '下列何者最能補貼「重大傷病期間收入中斷」的損失?', options: ['重大傷病險(一次給付)', '旅平險', '住宅火險'], answer: 0,
    why: '重大傷病險確診後一次給付,可以補貼治療期間的收入損失與長期開銷。',
  },
  {
    q: '一般建議,保費占年收入的合理比例大約是多少?', options: ['約 3% 以下', '約 10% 到 15%', '約 40% 以上'], answer: 1,
    why: '保費過高會壓縮生活與儲蓄;過低則可能保障不足。10% 到 15% 是常見的參考區間。',
  },
  {
    q: '估算壽險保額時,最需要考慮的是?', options: ['家人未來的生活費、房貸與負債,扣掉現有資產', '保險業務員推薦的最高額度', '朋友買了多少'], answer: 0,
    why: '壽險保額應該依「家人需要多少錢」來決定,而不是看別人買多少。',
  },
  {
    q: '為什麼建議年輕時就規劃保障?', options: ['因為年輕時保費通常較低、也比較容易通過核保', '因為保險可以當作投資賺錢', '因為年紀大就沒有保險可以買'], answer: 0,
    why: '年齡與健康狀況都會影響保費與核保結果,健康時規劃通常成本較低。',
  },
  {
    q: '「失能所得補償險」在什麼情況下最有幫助?', options: ['生病住院時的醫療費用', '因傷病無法工作、收入中斷時', '房子被颱風吹壞'], answer: 1,
    why: '它補的是「無法工作造成的收入損失」,對收入是家庭主要來源的人特別重要。',
  },
  {
    q: '緊急預備金建議準備多少個月的生活費?', options: ['1 週', '3 到 6 個月', '5 年'], answer: 1,
    why: '3 到 6 個月可以幫你度過短期收入中斷,不需要賣掉投資或借錢。',
  },
  {
    q: '有人說「這張儲蓄險保證穩賺」,你應該?', options: ['馬上簽,錯過就沒了', '仔細看條款、解約金與費用,確認是否適合自己', '把存款全部投入'], answer: 1,
    why: '任何金融商品都有條件與費用。看清楚條款、提前解約的損失,才是負責任的決定。',
  },
  {
    q: '買了房子之後,下列哪一項最容易被忽略卻很重要?', options: ['住宅火險與地震險', '換新沙發', '買更多個股'], answer: 0,
    why: '房屋是最大的資產之一,火災、地震與水災的損失,靠保險可以大幅轉移。',
  },
  {
    q: '台灣的人身保險費,在報稅時一般可以怎麼處理?(簡化說明)', options: ['完全不能扣', '可列舉扣除,但每人每年有上限(約 2.4 萬)', '可全額扣除'], answer: 1,
    why: '人身保險費可列舉扣除,但有每人每年的上限。實際金額以最新稅法規定為準。',
  },
  {
    q: '下列哪個是「分散風險」的做法?', options: ['把所有錢買同一檔熱門股票', '同時配置定存、債券與股票型資產', '全部放在口袋裡的現金'], answer: 1,
    why: '不要把雞蛋放在同一個籃子裡。不同資產的漲跌時間不同,能降低整體波動。',
  },
  {
    q: '看到「保證高報酬、零風險」的投資廣告,最合理的反應是?', options: ['趕快加入,怕錯過', '提高警覺,可能是詐騙', '借錢也要投入'], answer: 1,
    why: '報酬與風險成正比。保證高報酬、零風險,多半是詐騙手法。',
  },
]
