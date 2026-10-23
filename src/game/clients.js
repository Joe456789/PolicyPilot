// AI 客戶對練的客戶設定:都是銀行分行理專每天會遇到的典型客戶。
// facts:客戶不會主動說,要理專「問到」才會透露(需求探詢);keys 是判斷有沒有問到的關鍵字(中英都收)。
// needs:這位客戶真正需要的保障(任一項就算照顧到);avoid:推給他不適合的商品。
// concerns:就算理專已經解釋過,客戶還是會提出的擔心(其他疑慮只要理專講清楚了,客戶就不會再問)。
// 客戶名字與情境是虛構的教學案例。
export const CLIENTS = [
  {
    id: 'newhome', icon: '🏠', name: '林先生', age: 32, risk: '穩健型',
    title: '剛辦房貸的新手爸爸',
    brief: '32 歲工程師,剛在銀行辦了 800 萬房貸,太太懷孕中。',
    goal: '來分行辦房貸對保,順便了解一下保險。',
    opening: '你好,我今天來辦房貸對保,行員說可以順便跟你聊聊保險。不過我其實不太懂,也有點怕被推銷。',
    facts: [
      { id: 'family', label: '家庭狀況', text: '太太懷孕 5 個月,預產期在年底,生完她想先在家帶小孩一陣子。',
        keys: ['家', '太太', '老婆', '小孩', '孩子', '寶寶', '扶養', '結婚', 'family', 'wife', 'kid', 'child', 'baby'] }, // i18n-ignore
      { id: 'income', label: '收入與預算', text: '我年收入大概 110 萬,房貸每個月要繳 3 萬左右,保險一個月最多能放 3,500 吧。',
        keys: ['收入', '薪水', '年薪', '月薪', '預算', '負擔', '開銷', '支出', '花費', 'income', 'salary', 'budget', 'afford', 'spend'] }, // i18n-ignore
      { id: 'cover', label: '現有保障', text: '目前只有公司團保,有醫療跟意外,自己沒有買過任何保單。',
        keys: ['保險', '保單', '團保', '保障', '醫療', '投保', 'insurance', 'policy', 'cover', 'medical'] }, // i18n-ignore
      { id: 'loan', label: '房貸條件', text: '房貸 800 萬、30 年,沒有寬限期,一開始就本利攤還。',
        keys: ['房貸', '貸款', '房子', '年限', '餘額', '利率', 'mortgage', 'loan', 'house', 'home'] }, // i18n-ignore
    ],
    needs: [
      { id: 'loan', label: '房貸與家人的保障', any: ['mortgage', 'life'] },
      { id: 'income', label: '收入中斷', any: ['disability'] },
      { id: 'medical', label: '離職後的醫療保障', any: ['medical'] },
    ],
    avoid: ['invlinked'],
    concerns: ['mortgage', 'life'],
    objections: {
      mortgage: '銀行是不是規定一定要買房貸壽險,才能核貸?',
      life: '我才 32 歲,壽險會不會太早?',
      disability: '失能險是什麼?跟意外險不一樣嗎?',
      medical: '公司團保不是就有醫療了嗎?',
      invlinked: '這個聽起來比較像投資?我現在比較擔心的是房貸。',
    },
  },
  {
    id: 'retiree', icon: '👵', name: '陳阿姨', age: 63, risk: '保守型',
    title: '定存到期的退休族',
    brief: '63 歲退休會計,定存 600 萬下個月到期。',
    goal: '想讓到期的定存「每個月多一點收入」。',
    opening: '我的定存下個月到期,行員說現在有一種每個月都會撥回的保單,年化 6%,你可以跟我說說嗎?',
    facts: [
      { id: 'income', label: '退休收入', text: '我現在每個月領勞保年金大約 2 萬,生活費要 3 萬左右,差的就從存款拿。',
        keys: ['收入', '年金', '退休金', '每個月', '生活費', '開銷', '支出', 'income', 'pension', 'month', 'living', 'spend'] }, // i18n-ignore
      { id: 'money', label: '資金用途', text: '這 600 萬是我的養老錢,幾乎是全部的積蓄了,我不能虧。',
        keys: ['定存', '存款', '積蓄', '資金', '用途', '這筆錢', '本金', 'deposit', 'savings', 'money', 'fund'] }, // i18n-ignore
      { id: 'health', label: '健康狀況', text: '我有高血壓,一直在吃藥;去年膝蓋也開過刀。',
        keys: ['健康', '身體', '病', '吃藥', '看醫生', '醫療', '住院', 'health', 'ill', 'medic', 'doctor', 'hospital'] }, // i18n-ignore
      { id: 'family', label: '家人', text: '先生幾年前走了,兒子在美國工作,我一個人住。',
        keys: ['家', '先生', '兒子', '女兒', '小孩', '照顧', '一個人', 'family', 'son', 'daughter', 'husband', 'alone', 'care'] }, // i18n-ignore
      { id: 'risk', label: '風險承受度', text: '我以前買基金虧過,看到帳面虧損會睡不著。',
        keys: ['風險', '虧', '投資經驗', '基金', '股票', '波動', '承受', 'risk', 'loss', 'lose', 'fund', 'stock', 'volatil'] }, // i18n-ignore
    ],
    needs: [
      { id: 'ltc', label: '晚年的照顧費', any: ['ltc'] },
      { id: 'cash', label: '穩定、不虧本的現金流', any: ['emergency', 'annuity', 'deposit'] },
    ],
    avoid: ['invlinked'],
    concerns: ['ltc', 'annuity'],
    objections: {
      invlinked: '每個月撥回 6%,那我的本金會不會越領越少?',
      ltc: '不是有政府的長照 2.0 嗎?還需要自己準備?',
      annuity: '年金險跟定存比起來好嗎?中途要用錢可以拿出來嗎?',
      emergency: '那我身邊要留多少現金比較好?',
      deposit: '可是定存利息很少耶。',
    },
  },
  {
    id: 'young', icon: '🛵', name: '王小姐', age: 26, risk: '積極型',
    title: '想開始投資的小資族',
    brief: '26 歲行銷專員,剛開戶想定期定額買 ETF。',
    goal: '想問投資,覺得自己年輕不需要保險。',
    opening: '我想開始定期定額買 ETF,朋友說保險不用買那麼早,錢要先拿去投資才會變多,對嗎?',
    facts: [
      { id: 'income', label: '收入與存款', text: '我月薪 4 萬 2,房租 1 萬 2,扣掉生活費每個月大概能存 1 萬,現在存款 8 萬左右。',
        keys: ['收入', '薪水', '月薪', '存款', '存', '房租', '預算', '開銷', 'income', 'salary', 'save', 'rent', 'budget'] }, // i18n-ignore
      { id: 'commute', label: '通勤方式', text: '我每天騎機車上班,單程大概 40 分鐘。',
        keys: ['上班', '通勤', '交通', '機車', '騎車', '開車', '工作', 'commute', 'scooter', 'work', 'ride', 'drive'] }, // i18n-ignore
      { id: 'cover', label: '現有保障', text: '只有爸媽小時候幫我買的一張住院日額,金額很小,其他都沒有。',
        keys: ['保險', '保單', '保障', '醫療', '爸媽', 'insurance', 'policy', 'cover', 'parent'] }, // i18n-ignore
      { id: 'goal', label: '理財目標', text: '我想 5 年內存到 100 萬,之後也許出國念書。',
        keys: ['目標', '計畫', '未來', '夢想', '幾年', '打算', 'goal', 'plan', 'future', 'dream'] }, // i18n-ignore
    ],
    needs: [
      { id: 'medical', label: '生病或意外的醫療費', any: ['medical', 'accident'] },
      { id: 'emergency', label: '緊急預備金', any: ['emergency'] },
      { id: 'income', label: '收入中斷', any: ['disability'] },
    ],
    avoid: ['annuity', 'invlinked'],
    concerns: ['medical', 'emergency'],
    objections: {
      medical: '我還年輕,很少生病耶。',
      accident: '意外險要買多少才夠?',
      disability: '失能聽起來好遙遠喔。',
      emergency: '存現金會不會太保守?我想多買一點 ETF。',
      annuity: '儲蓄險要綁好幾年,我可能要出國念書耶。',
      invlinked: '投資型保單跟我自己買 ETF 差在哪?',
    },
  },
  {
    id: 'family', icon: '👨‍👩‍👧‍👦', name: '張先生', age: 41, risk: '穩健型',
    title: '雙薪家庭的業務主管',
    brief: '41 歲業務主管,雙薪、兩個小孩,五年前買過一張投資型保單。',
    goal: '同事中風後,想檢查自己的保障夠不夠。',
    opening: '最近有個同事中風,我開始擔心。我五年前買過一張投資型保單,應該夠了吧?',
    facts: [
      { id: 'kids', label: '家庭成員', text: '兩個小孩,8 歲跟 5 歲;太太在上班,年收入大概 60 萬。',
        keys: ['家', '小孩', '孩子', '太太', '老婆', '扶養', '家人', 'family', 'kid', 'child', 'wife'] }, // i18n-ignore
      { id: 'income', label: '收入結構', text: '我年收入大概 150 萬,其中一半是業績獎金,不太穩定。',
        keys: ['收入', '薪水', '年薪', '獎金', '業績', '預算', '負擔', 'income', 'salary', 'bonus', 'budget', 'afford'] }, // i18n-ignore
      { id: 'loan', label: '房貸', text: '房貸還有 600 萬,還要繳 20 年。',
        keys: ['房貸', '貸款', '房子', '負債', 'mortgage', 'loan', 'house', 'debt'] }, // i18n-ignore
      { id: 'cover', label: '現有保單', text: '那張投資型保單年繳 12 萬,壽險保額 240 萬;另外還有一張實支實付醫療險。',
        keys: ['保單', '保險', '保額', '保障', '投資型', '醫療', 'policy', 'insurance', 'cover', 'medical'] }, // i18n-ignore
    ],
    needs: [
      { id: 'life', label: '家人的生活與房貸', any: ['life', 'mortgage'] },
      { id: 'income', label: '收入中斷', any: ['disability'] },
      { id: 'critical', label: '重大傷病', any: ['critical'] },
    ],
    avoid: ['invlinked'],
    concerns: ['life', 'disability'],
    objections: {
      life: '我已經有投資型保單了,保額 240 萬不夠嗎?',
      mortgage: '房貸壽險跟一般壽險要選哪一個?',
      disability: '我收入一半是獎金,失能險怎麼算?',
      critical: '重大傷病險跟我的醫療險會不會重複?',
      invlinked: '再加一張投資型保單,保障會比較夠嗎?',
    },
  },
]

export const clientById = (id) => CLIENTS.find((c) => c.id === id) || null
