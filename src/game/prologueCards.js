// 成長篇卡池:每個年齡階段有一個卡池,依家境、先前的遭遇(flags)與運氣抽出。
// 連鎖卡:前面發生的事(例如爸爸重病、爸媽創業)會在後面的年齡再度出現。
// 卡片欄位:id / icon / title / story(可為函式 (l, hit))/ tone / w 權重 / req 條件 / roll 機率 / choices / after / lesson
// 選項欄位:label / hint / fx 屬性 / cash / gamble / boost / flag / tag / res(自訂結算,回傳結果行)
import { clamp } from './core.js'

const ok = (label = '往下走') => [{ label, hint: '' }]
const poor = (l) => ['tight', 'single'].includes(l.bgId)
const rich = (l) => ['rich', 'pro', 'comfy'].includes(l.bgId)
const bizFam = (l) => l.bgId === 'biz'
const line = (label, amount = 0, kind = 'note') => ({ label, amount, kind })

// 有保險家裡幾乎不受影響;沒有保險就動用存款,不夠的部分變成債務。
export function shock(l, cost, what, { health = 0, noIns = false } = {}) {
  if (health) l.stats.health = clamp(l.stats.health + health, 5, 100)
  if (l.parentsInsured && !noIns) return [line(`${what},保單理賠,家裡幾乎不受影響`, 0, 'cover')]
  const fromCash = Math.min(l.cash, cost)
  l.cash -= fromCash
  const out = [line(`${what},自己負擔`, -cost, 'out')]
  if (cost - fromCash > 0) { l.loan += cost - fromCash; out.push(line('存款不夠,家裡多了一筆借款', 0, 'warn')) }
  return out
}
const gain = (l, n, label) => { l.cash += n; return [line(label, n, 'in')] }
const spend = (l, n, label) => { const c = Math.min(l.cash, n); l.cash -= c; return [line(label, -n, 'out')] }
const crisisPay = (l, label) => {
  if (l.parentsInsured) return [line('保險給付,家裡生活維持正常', 0, 'cover')]
  l.cash = Math.max(0, l.cash - 200000)
  l.loan += 100000
  l.parentsSupport = true
  l.flags.debt = true
  l.stats.finance += 3
  return [line(`${label}:動用家裡存款`, -200000, 'out'), line('家裡背上債務,你長大後要多負責扶養父母', 0, 'warn')]
}

const insHint = (l) => (l.parentsInsured ? '家裡有保險' : '家裡沒有保險')

export const SLOTS = [
  // ---------------- 0 歲 ----------------
  { age: 0, pool: [
    { id: 'birth', icon: '👶', title: '出生抽籤', story: (l) => `你出生在「${l.family}」。${l.familyBlurb}${l.parentsInsured ? '爸媽很有保險觀念,替全家做了基本的醫療與壽險規劃。' : '爸媽沒有買過任何商業保險,覺得「有健保就夠了」。'}`, choices: ok('展開我的人生') },
  ] },

  // ---------------- 3 歲 ----------------
  { age: 3, pool: [
    { id: 'kid_sick', icon: (l, h) => (h ? '🤒' : '🧸'), roll: 0.5, title: (l, h) => (h ? '幼兒腸病毒住院' : '快樂的幼兒時光'), tone: 'neutral',
      story: (l, h) => (h ? `你才三歲就因腸病毒併發症住院一週。爸媽請假照顧,醫療與看護花了不少。${l.parentsInsured ? '家裡有保險,醫療費由保單負擔,影響不大。' : '家裡沒有任何保障,醫療費全靠存款。'}` : '你的幼兒時光健康又快樂,爸媽說你是家裡最開心的小孩。'),
      choices: ok(), after: (l, sc) => { if (!sc._hit) { l.stats.health = Math.min(100, l.stats.health + 3); return [] } l.flags.early_illness = true; return shock(l, 80000, '醫療與看護費用') } },
    { id: 'kid_fall', icon: '🩹', title: '公園跌倒縫了七針', story: (l) => `你在公園追著鴿子跑,跌倒撞到頭,急診縫了七針。${insHint(l)}。`, choices: ok(), after: (l) => shock(l, 15000, '急診費用') },
    { id: 'kid_allergy', icon: '🤧', w: (l) => (l.stats.health < 92 ? 2 : 0.8), title: '過敏與氣喘確診', story: (l) => `你一換季就咳個不停,醫生說是過敏性氣喘,要長期追蹤。${insHint(l)}。`,
      choices: [{ label: '配合治療與改善環境', hint: '健康 -2' , fx: { health: -2 } }], after: (l) => { l.flags.early_illness = true; l.flags.chronic = true; return shock(l, 30000, '長期門診與藥費') }, lesson: '有病史再投保會變困難,健康的時候是投保最好的時機。' },
    { id: 'kid_grand', icon: '👴', w: (l) => (poor(l) || l.bgId === 'normal' ? 2.5 : 0.7), title: '爺爺帶大的孩子', story: '爸媽忙著工作,你大半時間是爺爺奶奶帶大的。爺爺常帶你去市場、教你「錢要一塊一塊存」。',
      choices: [{ label: '黏著爺爺,跟他去市場', hint: '財商 +6', fx: { finance: 6 }, flag: 'close_grand' }, { label: '在家看電視', hint: '人緣 +2', fx: { social: 2 } }] },
    { id: 'kid_class', icon: '🎹', w: (l) => (rich(l) ? 3 : 0.6), title: '學齡前才藝班', story: '爸媽問你想上哪一種才藝班?',
      choices: [{ label: '游泳', hint: '健康 +8', fx: { health: 8 } }, { label: '鋼琴', hint: '人緣 +4、學業 +4', fx: { social: 4, study: 4 } }, { label: '畫畫', hint: '學業 +6', fx: { study: 6 } }] },
    { id: 'kid_policy', icon: '🧾', req: (l) => l.parentsInsured, w: 2, title: '爸媽替你買的第一張保單', story: '爸媽說:「小孩也要有自己的醫療保障。」他們讓你抱著存摺和保單,跟業務員一起看了一下午。',
      choices: [{ label: '好奇地問:這是什麼?', hint: '財商 +5', fx: { finance: 5 }, tag: 'curious' }, { label: '跑去玩積木', hint: '', fx: { social: 2 } }] },
  ] },

  // ---------------- 6 歲 ----------------
  { age: 6, pool: [
    { id: 'hobby', icon: '🎒', w: 2, title: '上小學:培養興趣', story: '爸媽問你想把課餘時間花在哪裡?這會塑造你的個性與能力。',
      choices: [{ label: '運動與戶外', hint: '健康 +10、人緣 +5', fx: { health: 10, social: 5 } }, { label: '補習與閱讀', hint: '學業 +10', fx: { study: 10 } }, { label: '音樂與才藝', hint: '人緣 +10、學業 +3', fx: { social: 10, study: 3 } }] },
    { id: 'piggy', icon: '🐷', w: 1.5, title: '撲滿與第一份零用錢', story: '爸媽給你一個撲滿,說以後每週有零用錢,怎麼用由你決定。',
      choices: [{ label: '全部存起來', hint: '財商 +8、存款 +0.5 萬', fx: { finance: 8 }, cash: 5000, flag: 'saver' }, { label: '一半存、一半花', hint: '財商 +4、人緣 +2', fx: { finance: 4, social: 2 } }, { label: '全部買玩具', hint: '人緣 +5', fx: { social: 5 } }] },
    { id: 'bike_fall', icon: '🚲', roll: 0.55, title: (l, h) => (h ? '騎腳踏車摔斷手' : '學會騎腳踏車了'), story: (l, h) => (h ? `你學騎腳踏車時衝下斜坡,左手骨折打了石膏。${insHint(l)}。` : '你學會騎腳踏車了,騎得比誰都快。'),
      choices: ok(), after: (l, sc) => (sc._hit ? shock(l, 25000, '骨科與復健費用', { health: -3 }) : (l.stats.health += 5, [])) },
    { id: 'camp', icon: '⛺', w: 1.2, title: '暑期夏令營', story: '學校辦夏令營,費用 1.5 萬,同學都報名了。',
      choices: [{ label: '參加', hint: '人緣 +8', fx: { social: 8 }, res: (l) => (rich(l) ? [line('家裡直接幫你付費', 0, 'cover')] : spend(l, 15000, '營隊費用')) }, { label: '在家看書', hint: '學業 +5', fx: { study: 5 } }] },
    { id: 'pet', icon: '🐶', w: 1, title: '想養一隻狗', story: '你在路邊撿到一隻小狗,哀求爸媽讓你養。',
      choices: [{ label: '好好照顧牠', hint: '人緣 +6、花費 0.8 萬', fx: { social: 6, health: 3 }, res: (l) => spend(l, 8000, '飼料與獸醫費') }, { label: '送給有餘力的人', hint: '財商 +3', fx: { finance: 3 } }] },
    { id: 'ins_talk', icon: '👂', req: (l) => l.parentsInsured, w: 2.5, title: '爸媽跟業務員談保單', story: '客廳裡,爸媽跟保險業務員討論「萬一生病或出事,家裡怎麼辦」,你偷偷在旁邊聽。',
      choices: [{ label: '好奇發問:為什麼要買保險?', hint: '財商 +6', fx: { finance: 6 }, tag: 'curious' }, { label: '跑去玩', hint: '', fx: { social: 2 } }], lesson: '保險是用小錢換「萬一發生時的大筆現金流」。' },
    { id: 'transfer', icon: '🚌', w: 1, title: '爸媽工作調動,你要轉學', story: '爸媽工作調動到另一個城市,你要轉到新的學校。',
      choices: [{ label: '很快交到新朋友', hint: '人緣 +5', fx: { social: 5 } }, { label: '適應得很辛苦', hint: '學業 -3、健康 -2', fx: { study: -3, health: -2 } }] },
  ] },

  // ---------------- 9 歲:家庭大事 ----------------
  { age: 9, pool: [
    { id: 'crisis_ill', icon: '🎗️', w: 1.2, tone: 'bad', title: '爸爸確診重大疾病', story: (l) => `爸爸突然確診重大疾病,需要長期治療,家裡經濟立刻吃緊。${l.parentsInsured ? '還好家裡有保險,給付撐住了生活。' : '家裡沒有任何保障,只能動用存款甚至借錢。'}`,
      choices: [{ label: '安靜體貼,幫忙分擔家務', hint: '學業 +3、財商 +5', fx: { finance: 5, study: 3 } }, { label: '偷偷難過,成績下滑', hint: '學業 -5、健康 -3', fx: { study: -5, health: -3 } }],
      after: (l) => { l.flags.parent_ill = true; return crisisPay(l, '醫療與生活費') }, lesson: '重大疾病的花費與收入中斷,是家庭最大的風險之一。' },
    { id: 'crisis_job', icon: '📉', w: 1.2, tone: 'bad', title: '爸媽公司倒閉', story: (l) => `爸媽任職的公司結束營業,家裡的收入一下子少了一半。${l.parentsInsured ? '家裡之前有預備金與保障,撐得過去。' : '家裡沒有任何緩衝,只能動用存款甚至借錢。'}`,
      choices: [{ label: '幫忙省錢,學著記帳', hint: '財商 +6', fx: { finance: 6 } }, { label: '鬧脾氣,要買新玩具', hint: '人緣 +2、財商 -2', fx: { social: 2, finance: -2 } }],
      after: (l) => { l.flags.parent_jobloss = true; return crisisPay(l, '生活費') } },
    { id: 'crisis_acc', icon: '🚑', w: 1.2, tone: 'bad', title: '媽媽發生車禍', story: (l) => `媽媽騎車被撞,需要開刀與復健,一段時間無法工作。${l.parentsInsured ? '還好家裡有意外險與醫療險。' : '家裡沒有任何保障,只能動用存款甚至借錢。'}`,
      choices: [{ label: '放學後陪媽媽復健', hint: '財商 +3、人緣 +2', fx: { finance: 3, social: 2 }, flag: 'caregiver' }, { label: '專心寫作業', hint: '學業 +4', fx: { study: 4 } }],
      after: (l) => { l.flags.parent_acc = true; return crisisPay(l, '醫療費') } },
    { id: 'typhoon', icon: '🌀', w: 1, tone: 'bad', title: '颱風淹水', story: (l) => `颱風夜,老家一樓淹了 50 公分,家電與家具泡水。${l.parentsInsured ? '爸媽有投保住宅火險與地震險。' : '家裡沒有投保任何財產保險。'}`,
      choices: ok(), after: (l) => shock(l, 150000, '水災損失'), lesson: '颱風與水災是台灣最常見的家庭財產風險。' },
    { id: 'grandpa', icon: '🕯️', req: (l) => l.flags.close_grand, w: 10, tone: 'bad', title: '爺爺過世了', story: (l) => `爺爺因病過世。喪禮花了不少錢。${l.parentsInsured ? '爺爺生前有保險,身後費用有著落。' : '爺爺沒有保險,喪葬費用全由家裡負擔。'}`,
      choices: [{ label: '陪著奶奶,常常去看她', hint: '人緣 +3、財商 +3', fx: { social: 3, finance: 3 }, flag: 'caregiver' }, { label: '把難過放在心裡', hint: '健康 -2', fx: { health: -2 } }], after: (l) => shock(l, 60000, '喪葬費用'), lesson: '壽險不只是留給家人的生活費,也包含最後的身後費用。' },
    { id: 'startup', icon: '🏪', w: (l) => (bizFam(l) ? 5 : l.bgId === 'normal' ? 1.5 : 0.6), title: '爸媽決定創業開店', story: '爸媽決定頂下一間小店創業,把積蓄都投進去。他們問你:要不要放學後來幫忙?',
      choices: [{ label: '放學後去店裡幫忙', hint: '財商 +8、學業 -3', fx: { finance: 8, study: -3 }, flag: 'biz_spirit' }, { label: '專心念書就好', hint: '學業 +5', fx: { study: 5 } }], after: (l) => { l.flags.parents_biz = true; return [line('爸媽的店開張了,成敗要看接下來幾年', 0, 'note')] } },
    { id: 'sibling', icon: '🍼', req: (l) => !l.flags.sibling, w: 1.3, title: '弟弟(妹妹)出生了', story: '家裡多了一個新成員,爸媽忙得人仰馬翻,家裡的開銷也變大了。',
      choices: [{ label: '當個好哥哥(姊姊)', hint: '人緣 +3、財商 +2', fx: { social: 3, finance: 2 } }, { label: '吃醋鬧脾氣', hint: '學業 -2', fx: { study: -2 } }], after: (l) => { l.flags.sibling = true; return spend(l, 30000, '新生兒的家庭開銷') } },
    { id: 'family_trip', icon: '✈️', roll: 0.3, title: (l, h) => (h ? '全家出遊遇到小狀況' : '全家旅行'), story: (l, h) => (h ? `全家出國旅行時,你突然腸胃炎、行李也遺失了。${l.parentsInsured ? '爸媽有買旅遊平安險,可以理賠。' : '沒有旅平險,醫療與補買衣物都要自己出。'}` : '爸媽帶你全家旅行,留下滿滿的回憶。'),
      w: (l) => (rich(l) ? 2 : 0.8), choices: ok(), after: (l, sc) => (sc._hit ? shock(l, 25000, '旅途中的醫療與損失') : (l.stats.social += 3, [])) },
    { id: 'quiet9', icon: '🍀', w: 1, tone: 'good', title: '平安的一年', story: '這一年家裡平平安安,沒有任何大事。你開始懂得珍惜日常。', choices: ok(), after: (l) => { l.stats.health = Math.min(100, l.stats.health + 3); l.stats.study += 2; return [] } },
  ] },

  // ---------------- 12 歲 ----------------
  { age: 12, pool: [
    { id: 'red_env', icon: '🧧', w: 2, title: '第一筆壓歲錢', story: (l) => `過年你收到一筆壓歲錢。你${l.style === '冒險型' ? '很想拿去玩點大的' : '想了想要怎麼用'}。`,
      choices: [{ label: '存進撲滿與銀行', hint: '財商 +8、存款 +1 萬', fx: { finance: 8 }, cash: 10000, flag: 'saver' }, { label: '買想要的玩具與遊戲', hint: '人緣 +5', fx: { social: 5 } }, { label: '跟同學一起合資投資(小額)', hint: '財商 +5,結果看運氣', fx: { finance: 5 }, gamble: true, flag: 'gamble_kid' }] },
    { id: 'biz_result', icon: (l, h) => (h ? '🎉' : '🧱'), req: (l) => l.flags.parents_biz && !l.flags.biz_done, w: 12, roll: 0.5, title: (l, h) => (h ? '爸媽的店生意興隆' : '爸媽的店撐不下去了'), tone: 'neutral',
      story: (l, h) => (h ? '爸媽的店越開越順,甚至有加盟的詢問。家裡的生活寬裕了不少。' : `爸媽的店生意不如預期,租金與貨款壓得喘不過氣,最後只好收掉。${l.parentsInsured ? '' : '家裡沒有任何預備金與保障。'}`),
      choices: ok(), after: (l, sc) => { l.flags.biz_done = true; if (sc._hit) { l.flags.biz_ok = true; return gain(l, 100000, '店裡的盈餘分給家用') } l.cash = Math.max(0, l.cash - 150000); l.loan += 200000; l.parentsSupport = true; l.flags.debt = true; return [line('結束營業,清償貨款與租金', -150000, 'out'), line('家裡背上債務,你長大後要多負責扶養父母', 0, 'warn')] }, lesson: '創業有機會也有風險,營運資金與個人保障要分開準備。' },
    { id: 'dad_rehab', icon: '🦽', req: (l) => l.flags.parent_ill, w: 10, title: '爸爸復健期,家裡缺人手', story: '爸爸出院後還要長期復健,不能工作。家裡很需要有人幫忙,你想怎麼做?',
      choices: [{ label: '放學後去打零工', hint: '存款 +3 萬、學業 -4', fx: { study: -4 }, cash: 30000, flag: 'caregiver' }, { label: '專心念書,照顧爸爸起居', hint: '學業 +2、健康 -2', fx: { study: 2, health: -2 }, flag: 'caregiver' }] },
    { id: 'mom_newjob', icon: '🧳', req: (l) => l.flags.parent_jobloss, w: 10, title: '媽媽找到新工作,要搬家', story: '媽媽終於找到新工作,但要搬到遠一點的地方,租金也比較便宜。',
      choices: [{ label: '搬家,重新適應', hint: '財商 +4', fx: { finance: 4 } }, { label: '住外婆家,週末見面', hint: '人緣 -2、存款 +1 萬', fx: { social: -2 }, cash: 10000 }] },
    { id: 'phone', icon: '📱', w: 1.5, title: '同學都有最新的手機', story: '班上同學都拿著最新款手機,你也很想要。',
      choices: [{ label: '央求爸媽買', hint: '人緣 +4(買不買看家境)', fx: { social: 4 }, res: (l) => (rich(l) ? [line('爸媽買給你了', 0, 'note')] : [line('爸媽說:想要就先自己存', 0, 'note')]) }, { label: '自己存錢買二手的', hint: '財商 +5', fx: { finance: 5 } }, { label: '不需要,舊的還能用', hint: '財商 +3', fx: { finance: 3 } }] },
    { id: 'scam_game', icon: '🎮', w: 1.5, title: '「免費領遊戲點數」的私訊', story: '社群上有人私訊你:「點連結輸入爸媽的信用卡,免費領 5000 點!」',
      choices: [{ label: '截圖給爸媽看,問是不是詐騙', hint: '財商 +6', fx: { finance: 6 }, tag: 'scam_aware' }, { label: '點進去輸入資料', hint: '被騙 0.5 萬', fx: { finance: 2 }, tag: 'scam_victim', res: (l) => spend(l, 5000, '被盜刷的金額') }], lesson: '免費的最貴。任何要你輸入卡號或轉帳的連結,先問大人、再查證。' },
    { id: 'team', icon: '🏀', roll: 0.4, title: (l, h) => (h ? '校隊比賽受傷' : '加入校隊'), story: (l, h) => (h ? `你加入校隊,比賽時十字韌帶受傷,要開刀。${insHint(l)}。` : '你加入校隊,每天練球,身體更結實了。'), choices: ok(), after: (l, sc) => (sc._hit ? shock(l, 60000, '手術與復健費用', { health: -4 }) : (l.stats.health += 6, l.stats.social += 4, [])) },
    { id: 'stall', icon: '🍬', w: 1, title: '校園小生意', story: '你跟同學一起在校園賣手作點心,賺零用錢。',
      choices: [{ label: '拿出零用錢多進貨', hint: '財商 +5,結果看運氣', fx: { finance: 5 }, gamble: true, flag: 'biz_spirit' }, { label: '小量試賣', hint: '財商 +3', fx: { finance: 3 }, cash: 3000 }] },
  ] },

  // ---------------- 14 歲 ----------------
  { age: 14, pool: [
    { id: 'exam', icon: '📚', w: 2, title: '會考的壓力', story: '會考快到了,同學都在補習。你想怎麼準備?',
      choices: [{ label: '上名師補習班', hint: '學業 +8、花費 4 萬', fx: { study: 8 }, res: (l) => (rich(l) ? [line('家裡直接支付補習費', 0, 'cover')] : spend(l, 40000, '補習費')) }, { label: '自己讀書', hint: '學業 +4、健康 +2', fx: { study: 4, health: 2 } }, { label: '先放鬆,不要壓力太大', hint: '健康 +5、學業 -3', fx: { health: 5, study: -3 } }] },
    { id: 'pitch', icon: '👔', w: 1.5, title: '親戚來家裡推銷儲蓄險', story: '遠房親戚帶著一疊文件來家裡,說「這個儲蓄險,存 6 年、領 20 年,穩賺不賠」,爸媽讓你坐在旁邊聽。',
      choices: [{ label: '認真聽、問重點', hint: '財商 +6', fx: { finance: 6 }, tag: 'curious' }, { label: '滑手機', hint: '人緣 +2', fx: { social: 2 } }], lesson: '儲蓄險有提早解約的損失,買之前先問清楚:保障多少、提早解約領回多少?' },
    { id: 'classmate', icon: '💐', w: 1, title: '同學的爸爸生重病', story: '班上同學的爸爸重病住院,班上發起募款。',
      choices: [{ label: '拿出零用錢捐款', hint: '人緣 +5、財商 +2', fx: { social: 5, finance: 2 }, res: (l) => spend(l, 2000, '捐款') }, { label: '回家跟爸媽討論:如果是我家怎麼辦?', hint: '財商 +6', fx: { finance: 6 } }], lesson: '別人的故事,是你最便宜的一堂風險教育課。' },
    { id: 'sprain', icon: '🏐', roll: 0.5, title: (l, h) => (h ? '體育課扭傷' : '體育課表現不錯'), story: (l, h) => (h ? `體育課你扭傷了腳踝,韌帶撕裂。${insHint(l)}。` : '你在體育課拿到全班第一,老師鼓勵你繼續練習。'), choices: ok(), after: (l, sc) => (sc._hit ? shock(l, 20000, '急診與復健費用', { health: -3 }) : (l.stats.health += 4, [])) },
    { id: 'summer_stall', icon: '🧃', w: 1, title: '暑假擺攤賺零用錢', story: '暑假你想跟朋友一起擺攤賣飲料。',
      choices: [{ label: '認真研究成本與定價', hint: '財商 +6、存款 +1.5 萬', fx: { finance: 6 }, cash: 15000, flag: 'biz_spirit' }, { label: '隨便賣賣', hint: '人緣 +3', fx: { social: 3 } }] },
    { id: 'game_pay', icon: '🕹️', w: 1.2, title: '手機遊戲課金', story: '你迷上一款手機遊戲,抽卡一直沒抽到想要的角色。',
      choices: [{ label: '偷偷動用零用錢儲值', hint: '花費 0.8 萬、財商 -3', fx: { finance: -3 }, res: (l) => spend(l, 8000, '遊戲儲值') }, { label: '跟爸媽約定每月上限', hint: '財商 +5', fx: { finance: 5 } }], lesson: '機率型商品的期望值是負的,抽越多、花越多。' },
    { id: 'care_sib', icon: '🧒', req: (l) => l.flags.sibling, w: 6, title: '弟妹需要人照顧', story: '爸媽加班的日子,常常是你負責接弟弟(妹妹)放學、煮晚餐。',
      choices: [{ label: '扛起責任', hint: '財商 +3、學業 -2', fx: { finance: 3, study: -2 }, flag: 'caregiver' }, { label: '請爺爺奶奶幫忙', hint: '', fx: {} }] },
  ] },

  // ---------------- 15 歲:升學 ----------------
  { age: 15, pool: [
    { id: 'hs_default', icon: '🏫', w: 1, title: '升學:高中還是高職?', story: '國中畢業了。你想往學術路線走,還是學一技之長?',
      choices: [{ label: '普通高中,準備考大學', hint: '學業 +8', fx: { study: 8 }, track: 'academic' }, { label: '高職,學專業技能', hint: '可直接就業,財商 +5', fx: { finance: 5, social: 3 }, track: 'vocational' }] },
    { id: 'hs_poor', icon: '🏫', req: (l) => poor(l) || l.flags.debt, w: 6, title: '升學:家裡希望你早點賺錢', story: '家裡經濟不寬裕,爸媽沒說出口,但你看得出他們希望你早點能分擔。',
      choices: [{ label: '念高職,學一技之長', hint: '財商 +6、存款 +1 萬', fx: { finance: 6 }, cash: 10000, track: 'vocational' }, { label: '念高中,拚獎學金', hint: '學業 +8、健康 -2', fx: { study: 8, health: -2 }, track: 'academic' }] },
    { id: 'hs_rich', icon: '🏫', req: (l) => rich(l), w: 5, title: '升學:家裡安排了資優班', story: '爸媽替你找好了私立高中的資優班,師資很好。你怎麼想?',
      choices: [{ label: '去念私立高中', hint: '學業 +10、人緣 -2', fx: { study: 10, social: -2 }, track: 'academic' }, { label: '想跟朋友念同一所公立高中', hint: '人緣 +6、學業 +4', fx: { social: 6, study: 4 }, track: 'academic' }, { label: '想念高職學設計', hint: '財商 +4、人緣 +3', fx: { finance: 4, social: 3 }, track: 'vocational' }] },
  ] },

  // ---------------- 17 歲 ----------------
  { age: 17, pool: [
    { id: 'club', icon: '🎤', w: 1.5, title: '社團幹部', story: '學長姐邀你接社團幹部,責任重但很有成就感。',
      choices: [{ label: '接下來', hint: '人緣 +8、學業 -2', fx: { social: 8, study: -2 } }, { label: '專心衝刺學科', hint: '學業 +6', fx: { study: 6 } }] },
    { id: 'parttime', icon: '🍟', roll: 0.25, w: 1.5, title: (l, h) => (h ? '打工時燙傷' : '第一份打工'), story: (l, h) => (h ? '你在速食店打工,被熱油燙傷,休養了兩週。工讀生沒有勞保與雇主補償。' : '你在速食店找到暑期打工,體會到錢真的不好賺。'), choices: ok(), after: (l, sc) => (sc._hit ? [...spend(l, 15000, '醫療費用'), line('打工前先確認有沒有勞保與雇主保障', 0, 'lesson')] : (l.stats.finance += 5, gain(l, 40000, '打工收入'))) },
    { id: 'scooter17', icon: '🛵', roll: 0.45, w: 1.5, title: (l, h) => (h ? '騎車摔車' : '考到機車駕照'), story: (l, h) => (h ? `你騎機車被後方來車擦撞,骨折住院。${l.parentsInsured ? '爸媽先前幫你加保了意外險與醫療險。' : '你從沒想過要保險,覺得風險離學生很遠。'}` : '你考到機車駕照,爸媽叮嚀:一定要戴安全帽。'), choices: ok(), after: (l, sc) => (sc._hit ? shock(l, 100000, '醫療與復健費用', { health: -6 }) : (l.stats.social += 3, [])) },
    { id: 'crypto', icon: '🪙', w: 1.2, title: '同學邀你玩虛擬貨幣', story: '同學給你看他的獲利截圖:「三個月賺三倍!你只要拿零用錢進場!」',
      choices: [{ label: '拿零用錢小額參加', hint: '財商 +3,結果看運氣', fx: { finance: 3 }, gamble: true, flag: 'gamble_kid' }, { label: '拒絕,研究一下再說', hint: '財商 +6', fx: { finance: 6 } }], lesson: '看到「保證獲利」「拉人頭」就要警覺,通常賺到的是別人。' },
    { id: 'slump', icon: '🌧️', w: 1, title: '成績低潮、心情低落', story: '考試連續失利,你覺得很挫折。',
      choices: [{ label: '找老師與家人聊聊', hint: '健康 +5、學業 +2', fx: { health: 5, study: 2 } }, { label: '硬撐', hint: '健康 -6、學業 +3', fx: { health: -6, study: 3 } }] },
    { id: 'contest', icon: '🏅', req: (l) => l.stats.study >= 60, w: 3, title: '科展比賽拿獎', story: '你和組員做的科展作品拿到全縣第二名,老師推薦你參加更大的比賽。',
      choices: [{ label: '繼續深入研究', hint: '學業 +8', fx: { study: 8 }, flag: 'scholar' }, { label: '把時間留給其他事', hint: '人緣 +4', fx: { social: 4 } }] },
    { id: 'tight17', icon: '💸', req: (l) => l.flags.debt || l.flags.parent_ill || l.flags.parent_jobloss, w: 9, title: '家裡學費吃緊', story: '開學前,你發現家裡連註冊費都繳得很吃力,爸媽沒說,但你都看在眼裡。',
      choices: [{ label: '申請助學金與獎學金', hint: '存款 +3 萬、學業 +2', fx: { study: 2 }, cash: 30000 }, { label: '自己去打工,分擔學費', hint: '存款 +5 萬、學業 -3', fx: { study: -3 }, cash: 50000, flag: 'caregiver' }] },
  ] },

  // ---------------- 18 歲:大學志願 ----------------
  { age: 18, pool: [
    { id: 'uni_default', icon: '🎓', w: 1, title: '大學志願:選哪條路?', story: (l) => `指考放榜了(學業指數 ${Math.round(l.stats.study)})。學費與學貸會影響你出社會時的起跑點。`, choices: (l) => majorChoices(l) },
    { id: 'uni_poor', icon: '🎓', req: (l) => poor(l) || l.flags.debt, w: 6, title: '大學志願:學費怎麼辦?', story: (l) => `指考放榜了(學業指數 ${Math.round(l.stats.study)})。家裡很難負擔學費,你可以選擇「半工半讀」來降低學貸。`, choices: (l) => [...majorChoices(l), { label: '公立大學(商管)+ 半工半讀', hint: '學貸只要約 5 萬,學業 -5、財商 +5', major: 'biz', loan: 50000, need: 55, fx: { study: -5, finance: 5 } }] },
    { id: 'uni_rich', icon: '🎓', req: (l) => rich(l), w: 4, title: '大學志願:家人給的選項很多', story: (l) => `指考放榜了(學業指數 ${Math.round(l.stats.study)})。家裡說:不用擔心學費,你可以選自己想念的。`, choices: (l) => [...majorChoices(l), { label: '出國念書(家人全額負擔)', hint: '人緣 +6、財商 +3,存款 -30 萬', major: 'biz', loan: 0, need: 0, fx: { social: 6, finance: 3 }, cash: -300000 }] },
  ] },

  // ---------------- 19 歲:大學生活 ----------------
  { age: 19, pool: [
    { id: 'rent_fire', icon: '🏠', roll: 0.3, w: 2, title: (l, h) => (h ? '租屋處電線走火' : '找到 CP 值高的套房'), story: (l, h) => (h ? `租屋處的延長線走火,你的電腦與衣物都燒壞了。${l.parentsInsured ? '爸媽先前幫你買了租賃保險(含學生宿舍財物)。' : '你沒有投保任何財物保險。'}` : '你終於找到租金划算又安全的套房。房東提醒你:要不要加保租賃火險?'), choices: ok(), after: (l, sc) => (sc._hit ? shock(l, 80000, '財物損失') : [line('租屋族的小保障:租賃火險一年才幾百元', 0, 'lesson')]) },
    { id: 'mlm', icon: '🧩', w: 1.5, title: '被邀請參加「投資講座」', story: '同學神秘地邀你參加講座:「只要拉三個人加入,馬上有被動收入!」',
      choices: [{ label: '去看看', hint: '花費 3 萬、財商 +2', fx: { finance: 2 }, tag: 'scam_victim', res: (l) => spend(l, 30000, '購買「課程」與產品') }, { label: '拒絕,並提醒其他同學', hint: '財商 +6', fx: { finance: 6 }, tag: 'scam_aware' }], lesson: '「拉人頭」「保證被動收入」是常見的詐騙與非法多層次傳銷手法。' },
    { id: 'card', icon: '💳', w: 1.5, title: '辦卡送好禮,分期買手機', story: '校園擺攤的銀行說:辦信用卡就送好禮,還能 0 利率分期買新手機。',
      choices: [{ label: '辦卡分期買手機', hint: '貸款 +3 萬、財商 -3', fx: { finance: -3 }, res: (l) => { l.loan += 30000; return [line('分期付款也是一種負債', 30000, 'warn')] } }, { label: '存錢再買', hint: '財商 +6', fx: { finance: 6 } }] },
    { id: 'scooter_buy', icon: '🏍️', w: 1.5, title: '買了第一台機車', story: '為了通勤與打工,你買了二手機車,要決定保險怎麼買。',
      choices: [{ label: '強制險 + 任意險(第三人責任險)', hint: '花費 0.8 萬、財商 +4', fx: { finance: 4 }, res: (l) => spend(l, 8000, '保險費') }, { label: '只買強制險', hint: '花費 0.2 萬,賭不會出事', fx: {}, res: (l, rng) => { const out = spend(l, 2000, '強制險'); if (rng.next() < 0.2) { out.push(...spend(l, 60000, '擦撞賠償(強制險不賠財損)')); out.push(line('強制險只保人傷,對方的車損與你自己的傷要靠任意險', 0, 'lesson')) } return out } }] },
    { id: 'club19', icon: '🎭', w: 1.5, title: '社團與學生會', story: '大學社團博覽會,你被一個很有趣的社團吸引。',
      choices: [{ label: '加入並擔任幹部', hint: '人緣 +10、學業 -2', fx: { social: 10, study: -2 }, flag: 'social' }, { label: '低調參加', hint: '人緣 +4', fx: { social: 4 } }] },
    { id: 'project', icon: '🔬', req: (l) => l.stats.study >= 55, w: 2, title: '專題競賽', story: '教授邀你參加專題競賽,會吃掉大量課餘時間。',
      choices: [{ label: '全力投入', hint: '學業 +8、健康 -3', fx: { study: 8, health: -3 }, flag: 'scholar' }, { label: '婉拒', hint: '人緣 +3', fx: { social: 3 } }] },
    { id: 'tutor', icon: '✏️', w: 1.5, title: '家教與打工', story: '學長介紹你去當家教,時薪不錯。',
      choices: [{ label: '多接幾個學生', hint: '存款 +8 萬、學業 -3', fx: { study: -3 }, cash: 80000 }, { label: '只接一個', hint: '存款 +3 萬', fx: {}, cash: 30000 }] },
    { id: 'loan_talk', icon: '🧮', req: (l) => l.loan >= 200000, w: 2.5, title: '看見學貸的利息', story: '你收到學貸對帳單,才發現利息一直在跑。',
      choices: [{ label: '用打工存款提前還一部分', hint: '存款 -5 萬、貸款 -5 萬、財商 +6', fx: { finance: 6 }, res: (l) => { const p = Math.min(50000, l.cash, l.loan); l.cash -= p; l.loan -= p; return [line('提前還款', -p, 'out')] } }, { label: '先不管,畢業再說', hint: '', fx: {} }] },
    { id: 'checkup19', icon: '🩺', w: 1, title: '新生健檢發現小問題', story: '新生健檢報告顯示你有輕微的過敏與脂肪肝,醫生建議調整作息。',
      choices: [{ label: '認真調整作息', hint: '健康 +5', fx: { health: 5 } }, { label: '覺得年輕沒問題', hint: '健康 -3', fx: { health: -3 } }], lesson: '健康時買保險最便宜、核保也最容易;有紀錄後選擇會變少。' },
    { id: 'dad_back', icon: '🏥', req: (l) => l.flags.parent_ill, w: 5, title: '爸爸病情反覆,你要請假回家', story: '爸爸的病情又反覆了,媽媽一個人照顧不來,你想請假回家幫忙。',
      choices: [{ label: '請一週假回家', hint: '學業 -3、財商 +3', fx: { study: -3, finance: 3 }, flag: 'caregiver' }, { label: '寄生活費回家,留在學校', hint: '存款 -2 萬', fx: {}, res: (l) => spend(l, 20000, '寄回家的生活費') }] },
  ] },

  // ---------------- 20 歲:暑假 ----------------
  { age: 20, pool: [
    { id: 'summer', icon: '💼', w: 2, title: '暑假:實習還是打工?', story: '大學生活過了一半,這個暑假你想怎麼過?',
      choices: [{ label: '企業實習', hint: '履歷加分,畢業起薪 +5%', fx: { study: 3 }, boost: 1.05 }, { label: '打工賺錢', hint: '存款 +8 萬', fx: {}, cash: 80000 }, { label: '海外交換 / 旅行', hint: '人緣 +10、花費 6 萬', fx: { social: 10 }, cash: -60000 }] },
    { id: 'volunteer', icon: '🌾', w: 1, title: '偏鄉志工', story: '你報名了暑期偏鄉志工團,要在山上住兩週。',
      choices: [{ label: '全心投入', hint: '人緣 +10、健康 +3', fx: { social: 10, health: 3 }, flag: 'social' }, { label: '只做行政支援', hint: '人緣 +4', fx: { social: 4 } }] },
    { id: 'freelance', icon: '🧑‍💻', w: 1.2, title: '接案做網站', story: '學長介紹你接一個小網站案子,報酬不錯,但是第一次接案。',
      choices: [{ label: '全力接案', hint: '存款 +6 萬、健康 -2', fx: { health: -2, finance: 4 }, cash: 60000, flag: 'biz_spirit' }, { label: '婉拒,專心學習', hint: '學業 +4', fx: { study: 4 } }] },
    { id: 'backpack', icon: '🎒', roll: 0.3, w: 1.2, title: (l, h) => (h ? '背包旅行遇到意外' : '背包旅行'), story: (l, h) => (h ? `你自助旅行時在異國急性腸胃炎住院,錢包也被偷。${l.parentsInsured ? '爸媽先前幫你加買了旅平險。' : '你沒有買旅平險。'}` : '你背著背包走了十個城市,學會自己安排預算與行程。'), choices: ok(), after: (l, sc) => (sc._hit ? shock(l, 50000, '醫療費與遺失財物') : (l.stats.social += 5, l.flags.adventurer = true, spend(l, 30000, '旅費'))) },
    { id: 'roadtrip', icon: '🚗', roll: 0.25, w: 1, title: (l, h) => (h ? '朋友開車出遊出了車禍' : '環島旅行'), story: (l, h) => (h ? `朋友開車載你環島,途中被追撞。你輕傷、車子全毀。${l.parentsInsured ? '你有意外險與醫療險。' : '沒有任何保險,醫療與修車都要自己想辦法。'}` : '你和朋友環島一圈,留下一生難忘的回憶。'), choices: ok(), after: (l, sc) => (sc._hit ? shock(l, 80000, '醫療與修車費用', { health: -4 }) : (l.stats.social += 6, l.flags.adventurer = true, [])) },
    { id: 'language', icon: '🗣️', w: 1.2, title: '語言進修', story: '你想趁暑假加強外語能力,畢業找工作更有優勢。',
      choices: [{ label: '報名密集班', hint: '學業 +6、起薪 +2%、花費 3 萬', fx: { study: 6 }, boost: 1.02, res: (l) => (rich(l) ? [line('家裡出錢', 0, 'cover')] : spend(l, 30000, '學費')) }, { label: '自己用 App 學', hint: '學業 +3', fx: { study: 3 } }] },
  ] },

  // ---------------- 21 歲:畢業前 ----------------
  { age: 21, pool: [
    { id: 'bike21', icon: '🏍️', roll: 0.55, w: 2, title: (l, h) => (h ? '騎車摔傷' : '平安的一年'), story: (l, h) => (h ? `趕著上課時機車打滑,你的腳骨折了,住院開刀。${l.parentsInsured ? '爸媽先前幫你加保了學生意外險與醫療險。' : '你從沒想過要保險,學生身分覺得離風險很遠。'}` : '這一年平平安安,沒有任何大事。'),
      choices: ok(), after: (l, sc) => { if (!sc._hit) return []; const out = shock(l, 120000, '醫療費用', { health: -8 }); if (!l.parentsInsured) out.push(line('你體會到:風險不會因為年輕就跳過你', 0, 'lesson')); return out } },
    { id: 'grad_trip', icon: '🎓', roll: 0.35, w: 1.5, title: (l, h) => (h ? '畢業旅行出意外' : '畢業旅行'), story: (l, h) => (h ? `畢業旅行時你在潛水課程中耳膜受傷。${l.parentsInsured ? '你有旅平險,可以理賠。' : '沒有旅平險,醫療費自己出。'}` : '畢業旅行大家玩得很開心,拍了一堆合照。'), choices: ok(), after: (l, sc) => (sc._hit ? shock(l, 45000, '海外就醫費用') : (l.stats.social += 4, [])) },
    { id: 'offers', icon: '📄', w: 2, title: '兩份工作 offer', story: '畢業前,你同時拿到兩份工作邀請。',
      choices: [{ label: '高薪但壓力大的公司', hint: '起薪 +6%、健康 -4', fx: { health: -4 }, boost: 1.06 }, { label: '薪水普通但福利穩定的公司', hint: '健康 +2、財商 +2', fx: { health: 2, finance: 2 } }, { label: '先打工,繼續準備考試', hint: '學業 +5', fx: { study: 5 } }] },
    { id: 'payslip', icon: '🧾', w: 1.5, title: '第一次看懂薪資單', story: '學長教你看薪資單:勞保、健保、勞退各是什麼?你才發現,原來公司有替你保障一部分。',
      choices: [{ label: '認真研究', hint: '財商 +6', fx: { finance: 6 }, tag: 'curious' }, { label: '以後再說', hint: '', fx: {} }], lesson: '勞保、健保是基本保障,但不足以涵蓋所有風險,商業保險是補強。' },
    { id: 'quiet21', icon: '🍀', w: 1, tone: 'good', title: '平安的最後一年', story: '最後一年平平安安,你好好把握在校的時光。', choices: ok(), after: (l) => { l.stats.health = Math.min(100, l.stats.health + 3); l.stats.social += 2; return [] } },
    { id: 'family_biz_offer', icon: '🏪', req: (l) => l.flags.biz_ok, w: 10, title: '回家接班?', story: '爸媽的店越開越好,他們希望你畢業後回來幫忙、接班。',
      choices: [{ label: '回家接班', hint: '起薪 +4%、財商 +4', fx: { finance: 4 }, boost: 1.04, tag: 'entrepreneur' }, { label: '先去外面闖一闖', hint: '人緣 +4', fx: { social: 4 } }] },
    { id: 'debt_talk', icon: '🏚️', req: (l) => l.flags.debt, w: 9, title: '爸媽拜託你分擔家計', story: '爸媽欠的債還沒還完,他們不好意思開口,但你知道你要負起一部分責任。',
      choices: [{ label: '答應每月寄一部分薪水回家', hint: '起薪不變,出社會要扶養父母', fx: { finance: 3 }, tag: 'survivor' }, { label: '先處理自己的學貸,再慢慢幫', hint: '', fx: {} }], after: (l) => { l.parentsSupport = true; return [] } },
  ] },
]

function majorChoices(l) {
  return [
    { label: '公立大學(理工)', hint: '學貸約 10 萬', major: 'stem', loan: 100000, need: 55 },
    { label: '公立大學(商管)', hint: '學貸約 10 萬', major: 'biz', loan: 100000, need: 55 },
    { label: '私立大學(醫護)', hint: '學貸約 35 萬', major: 'med', loan: 350000, need: 0 },
    { label: '私立大學(設計人文)', hint: '學貸約 30 萬', major: 'art', loan: 300000, need: 0 },
    { label: '不升學,直接工作', hint: '沒有學貸,起薪略低', major: 'work', loan: 0, need: 0 },
  ]
}
