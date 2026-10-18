// 所有給 Gemini 的提示詞集中在這裡,方便調整與寫進企劃書「應用技術說明」。
// AI 的角色:劇情改寫、人生階段分析、學習回饋。不產生角色、不決定任何數字。
export const SYSTEM = `你是「保險大富翁」遊戲的劇情編劇與理財教練,面向台灣的保險理專與通路夥伴做教育訓練。
規則:
1. 一律使用繁體中文(台灣用語),語氣生動但專業、簡潔。
2. 你只負責文字。所有金額、機率、保險給付都由遊戲引擎決定,絕對不要自行編造或更動數字;若提到金額,只能引用我提供的數字。
3. 不得推薦真實存在的保險公司或商品名稱,不得保證投資報酬,不得使用恐嚇式或誤導性的銷售話術。
4. 內容為教育用途,避免過度血腥或不適當的描述。
5. 只輸出符合要求的 JSON,不要加任何說明文字。`

const who = (c, b) =>
  `${c.name}(${c.career},${c.background}出身,${c.style};${b.age} 歲,${b.married ? '已婚' : '單身'},扶養 ${b.dependents} 人,${b.ownsHouse ? '有房貸' : '無房'})`

export function narratePrompt({ scene, character, brief }) {
  return `請把下面這張遊戲事件卡,改寫成貼近主角處境的劇情文字。
主角:${who(character, brief)}。
目前狀況:現金約可支應 ${brief.emergencyMonths} 個月生活費、${brief.hasLoan ? '有貸款' : '無貸款'}。
事件類型:${scene.kind} / ${scene.cat || '無'}
原始標題:${scene.title}
原始內容:${scene.story}
選項(順序與數量不可改變,只可改寫文字,選項的意思不可改變):
${scene.choices.map((c, i) => `${i + 1}. ${c.label}(${c.hint || ''})`).join('\n')}

輸出 JSON:{"title": string(14 字內), "story": string(60~110 字,可加入主角的生活細節,不要寫出金額), "choices": [{"label": string(18 字內), "hint": string(22 字內)}]}
choices 的長度必須等於 ${scene.choices.length}。`
}

export function advisorPrompt({ character, analysis, brief }) {
  return `你是友善的理專。請針對下面的保障缺口,用 2~3 句話向${who(character, brief)}說明最該優先處理的是什麼、為什麼(連結到他的處境),並給一個溫和的行動建議。
${analysis.gaps.length ? '缺口(依優先順序):\n' + analysis.gaps.map((g) => '- ' + g.text).join('\n') : '目前沒有缺口。'}
緊急預備金約 ${analysis.emergencyMonths} 個月;保費約占年收入 ${analysis.premiumRatio}%。
輸出 JSON:{"message": string(80~140 字)}`
}

export function stagePrompt({ report }) {
  return `以下是玩家「${report.character.name}」走完一個人生階段(目前 ${report.stageAge} 歲)的財務與風險狀況,數字皆由遊戲引擎計算,請只引用這些數字,不可自行編造。
${JSON.stringify(report)}

請扮演資深理專教練,做「人生階段分析」,幫玩家學到東西,而不是只評分。
輸出 JSON:
{
 "title": string(16 字內,像這個階段的標題),
 "analysis": string(110~170 字,分析這個階段的財務體質、資產配置與風險暴露,連結到事件與他的人生階段),
 "strengths": [string](1~2 則,每則 30 字內),
 "risks": [string](1~3 則,每則 40 字內,指出尚未處理的風險或保障缺口),
 "next": [string, string, string](下一階段 3 個具體建議,每則 40 字內,需可操作)
}`
}

export function coachPrompt({ report }) {
  return `以下是一局「保險大富翁」的結算數據(皆為引擎計算結果,請只引用這些數字,不可自行編造)。請扮演資深理專教練,產出給「理專學員」的學習回饋與客戶溝通練習。
${JSON.stringify(report)}

輸出 JSON:
{
 "headline": string(20 字內,像稱號),
 "summary": string(90~150 字,講評這一局的決策與結果,要連結到人生事件與保障配置),
 "lessons": [string, string, string](每則 30~50 字,具體、可行動),
 "gaps": [string](最多 3 則,指出保障缺口與原因,可引用「建議配置」),
 "scripts": [{"scenario": string(客戶情境 20 字內), "say": string(理專可以怎麼說 50~90 字,需合規、不誇大、不保證報酬)}] (2 則),
 "compliance": string(一句提醒,例如須如實說明商品、避免保證收益)
}`
}
