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
    medical: lo(80000, 260000), other: lo(50000, 120000), loss: { ratio: 0.1, years: 1 }, healthHit: 15,
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
    id: 'cancer', cat: 'critical', icon: '🎗️', tone: 'bad', once: true,
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
      { label: '出國玩一趟', hint: '約 9 萬,心情大好', fx: { cash: -90000, health: 6 } },
      { label: '國內小旅行', hint: '約 3 萬', fx: { cash: -30000, health: 3 } },
      { label: '在家休息、存錢', hint: '不動作', fx: {} },
    ],
    lesson: '生活品質也是人生的一部分。重點是花得有計畫,而不是什麼都不花。',
  },
  {
    id: 'car_buy', icon: '🚙', title: '要不要買車?',
    story: '通勤越來越累,朋友勸你買車,但你知道養車的成本不只車價。',
    choices: [
      { label: '買新車', hint: '頭期款 25 萬,每年多 8 萬', fx: { cash: -250000, expense: 80000 } },
      { label: '買二手車', hint: '8 萬,每年多 3.5 萬', fx: { cash: -80000, expense: 35000 } },
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
      { label: '維持原本生活,多存下來', hint: '支出幾乎不變', fx: { incomeMult: 1.12, expenseMult: 1.02 } },
      { label: '順便升級生活品質', hint: '支出同步增加', fx: { incomeMult: 1.12, expenseMult: 1.1 } },
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
export const MARKET_DEFS = [
  { id: 'ai_boom', icon: '🚀', title: '科技股大噴發', story: '新技術帶動資金湧入,股市一路走高。', ret: 0.24, rebound: 0, w: 2 },
  { id: 'steady', icon: '📈', title: '緩步走升的一年', story: '景氣平穩,市場小幅成長。', ret: 0.06, rebound: 0, w: 3 },
  { id: 'rally', icon: '🏦', title: '降息帶動反彈', story: '央行降息,資金回流股債市場。', ret: 0.12, rebound: 0, w: 1.5 },
  { id: 'crash', icon: '💥', title: '金融海嘯式崩盤', story: '全球金融危機爆發,股市大幅重挫。', ret: -0.38, rebound: 0.25, house: -0.05, w: 1.3 },
  { id: 'covid', icon: '🦠', title: '疫情衝擊市場', story: '突發疫情造成恐慌,股市短期急跌。', ret: -0.24, rebound: 0.25, w: 1.3 },
  { id: 'inflation', icon: '🔥', title: '通膨升溫、升息壓力', story: '物價上漲、利率提高,資產評價下修。', ret: -0.1, rebound: 0.06, house: -0.02, w: 1.6 },
  { id: 'bubble', icon: '🫧', title: '概念股泡沫破滅', story: '前陣子漲翻天的題材股一夕崩跌,散戶哀鴻遍野。', ret: -0.2, rebound: 0.12, w: 1.2 },
  { id: 'housing_boom', icon: '🏙️', title: '房市熱絡,房價飆升', story: '資金行情推升房價,新聞天天報創高。', ret: 0.09, rebound: 0, house: 0.15, w: 1.2 },
  { id: 'housing_slump', icon: '📉', title: '房市降溫,價格鬆動', story: '政策與升息影響下,房市成交量明顯萎縮。', ret: 0.02, rebound: 0, house: -0.1, w: 1.0 },
  { id: 'oil_shock', icon: '🛢️', title: '地緣衝突推升油價', story: '國際局勢緊張,能源價格飆升,市場震盪。', ret: -0.08, rebound: 0.08, w: 1.2 },
]

// ---------- 理財小學堂(純學習卡)----------
export const TIP_DEFS = [
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
