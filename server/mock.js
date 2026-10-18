// 離線/測試用:GEMINI_MOCK=1 時回傳固定格式的假資料,用來驗證整條 AI 管線與畫面。
export function mockNarrate(sc, ch) {
  return {
    title: sc.title,
    story: `【AI 劇情】${ch.name}(${ch.career})的故事:${sc.story}`,
    choices: sc.choices.map((c) => ({ label: c.label, hint: c.hint })),
  }
}
export function mockAdvisor(an, ch) {
  const g = an.gaps[0]
  return { message: g ? `【AI 理專】${ch.name},我建議優先處理:${g.text}。` : `【AI 理專】${ch.name},目前配置很完整。` }
}
export function mockStage(report) {
  return {
    title: '人生階段回顧(mock)',
    analysis: `【AI 分析】${report.character.name}目前 ${report.stageAge} 歲,淨資產約 ${Math.round(report.net / 10000)} 萬。`,
    strengths: ['有持續累積資產'],
    risks: ['保障仍有缺口'],
    next: ['先補最大的保障缺口', '保留 3 到 6 個月預備金', '分散投資'],
  }
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
