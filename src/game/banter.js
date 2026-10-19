// 對手的對話:每個個性有一套離線台詞(零成本、永遠可用);Gemini 可選擇性地替換成更貼近戰況的句子。
// 台詞只表現「個性」與「反應」,不改變任何數字。
export const BANTER = {
  steady: {
    buy_prop: ['這處資產的租金報酬率算過了,穩穩的。', '先把預備金留好,剩下的再買,這樣睡得著。', '我買了,而且保險一定要一起買。'],
    claim: ['看吧,保障先到位就是這種時候用的。', '理賠進來了,計畫沒有被打亂。'],
    big_loss: ['有點痛,但預備金撐得住。', '這次支出比預期大,繼續照計畫走。'],
    toll_collect: ['謝謝,過路費收到了。', '資產就是要這樣慢慢替我賺錢。'],
    toll_pay: ['付過路費,下次我也要買一塊自己的。', '地段是人家的,學費我付。'],
    lead: ['我現在領先,但不鬆懈,風險還是要顧。', '穩穩走,贏的是長跑。'],
    behind: ['被超車了,但我不亂了陣腳。', '慢一點沒關係,不要踩雷就好。'],
    bankrupt: ['怎麼會這樣……', '這次沒守住,下次一定做更好的規劃。'],
    quiet: ['平安,就是最好的消息。', '今年按表操課。'],
  },
  allin: {
    buy_prop: ['貸款全壓!富貴險中求!', '房地產?我全都要!', '頭期款有了,剩下的讓租金去付!'],
    claim: ['欸?原來保險真的會賠?', '好吧……這次算你有道理。'],
    big_loss: ['小意思,下一把賺回來!', '沒事沒事,我還有槓桿!'],
    toll_collect: ['哈!有人踩到我的地了!', '收租收租,我是包租公!'],
    toll_pay: ['可惡,居然踩到別人的地。', '過路費?下一把贏回來就好!'],
    lead: ['看到沒?這就是梭哈的威力!', '第一名!我就說冒險才會贏!'],
    behind: ['落後而已,再押一把就回來了!', '保守派慢慢爬吧,我要翻盤。'],
    bankrupt: ['我……我全押了,居然……', '早知道就留一點預備金。'],
    quiet: ['無聊,下一把玩大的。', '平安的一年?我想要刺激的!'],
  },
  insured: {
    buy_prop: ['買資產之前,我先把財產險看好了。', '地震險、火險,一個都不能少。', '買!但保險要先到位喔。'],
    claim: ['保單發揮作用了,心裡好踏實。', '就說多一層保障多一份安心。'],
    big_loss: ['還好有保險墊著,損失不大。', '這種意外,保單早就想到了。'],
    toll_collect: ['收到過路費,正好再加保一張。', '租金拿去繳保費剛剛好。'],
    toll_pay: ['付過路費,嗯,預算內。', '我的保障完整,這點小錢沒事。'],
    lead: ['領先!保障完整的人心裡最穩。', '我的保單配置很完整,慢慢贏。'],
    behind: ['沒關係,我的保障比較全面。', '被超過也不怕,風險我都顧到了。'],
    bankrupt: ['保費繳太多、投資太少了嗎……', '都怪我只顧著買保險,忘了現金流。'],
    quiet: ['今年平平安安,保費也沒白繳。', '沒事發生就是最好的理賠。'],
  },
  balanced: {
    buy_prop: ['算過現金流了,租金報酬 OK。', '這一塊的天災風險可以接受,買。', '買進,順便設個停損。'],
    claim: ['理賠進來了,收支平衡。', '核心保障果然有用。'],
    big_loss: ['記一筆,檢討一下配置。', '損失在可控範圍內。'],
    toll_collect: ['被動收入 +1。', '租金加過路費,現金流很漂亮。'],
    toll_pay: ['這筆算進成本。', '付了,下次換我當地主。'],
    lead: ['領先了,但數據還要再觀察。', '排名第一,配置不用動。'],
    behind: ['被超過了,回頭看看是哪個環節。', '調整一下配置,追得回來。'],
    bankrupt: ['現金流崩了……我低估了槓桿。', '資料給我看,這局哪裡算錯了。'],
    quiet: ['平穩度過,無事發生。', '今年收支正常。'],
  },
}

// 這次的對手動作,分類成「該說哪一類的話」。回傳 null 代表沒什麼好說的。
export function classifyBanter({ sc, cover, loss, bankrupt, bought, rankNow, rankBefore, human }) {
  if (bankrupt) return 'bankrupt'
  if (bought) return 'buy_prop'
  if (cover > 0) return 'claim'
  if (loss < -150000) return 'big_loss'
  if (rankNow === 1 && rankBefore !== 1) return 'lead'
  if (human && rankBefore === 1 && rankNow > 1) return 'behind'
  if (sc?.kind === 'property' && sc.base?.status === 'rival') return 'toll_pay'
  return null
}

// 挑一句離線台詞(以 seed 決定,可重現)
export function offlineLine(personaId, kind, salt = 0) {
  const lines = BANTER[personaId]?.[kind] || BANTER.balanced[kind]
  if (!lines?.length) return null
  return lines[Math.abs(salt) % lines.length]
}

// 事件是否值得說話:重要事件一定說,其他事件約 35% 機率,避免洗版
export function shouldSpeak(kind, salt) {
  if (!kind) return false
  if (['bankrupt', 'lead', 'behind', 'claim', 'buy_prop'].includes(kind)) return true
  return Math.abs(salt * 2654435761) % 100 < 35
}
