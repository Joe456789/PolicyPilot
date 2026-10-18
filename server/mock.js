// 離線/測試用:GEMINI_MOCK=1 時回傳固定格式的假資料,用來驗證整條 AI 管線與畫面。
export function mockNarrate(sc, ch) {
  return {
    title: sc.title,
    story: `【AI 劇情】${ch.name}的故事:${sc.story}`,
    choices: sc.choices.map((c) => ({ label: c.label, hint: c.hint })),
  }
}
export function mockAdvisor(an, ch) {
  const g = an.gaps[0]
  return { message: g ? `【AI 理專】${ch.name},我建議優先處理:${g.text}。` : `【AI 理專】${ch.name},目前配置很完整。` }
}
export function mockCoach(report) {
  return {
    headline: 'AI 教練稱號(mock)',
    summary: `【AI 教練】${report.character.name}這局得分 ${report.score.total}。`,
    lessons: ['學習重點一', '學習重點二', '學習重點三'],
    gaps: [],
    scripts: [{ scenario: '客戶猶豫', say: '我們先看你的風險缺口在哪裡,再決定要不要規劃。' }],
    compliance: '請如實說明商品內容,避免保證收益。',
  }
}
export function mockPersona(description) {
  return {
    name: '自訂角色', title: description.slice(0, 8), age: 32, tagline: description.slice(0, 30), traits: ['自訂', '示範'],
    income: 1000000, expense: 650000, cash: 200000, invest: 100000, debt: 0, mortgage: 0,
    dependents: 1, volatility: 0.03, laborIns: true, family: true, soleEarner: false, years: 14, focus: '示範用角色',
  }
}
