// 離線/測試用:GEMINI_MOCK=1 時回傳固定格式的假資料,用來驗證整條 AI 管線與畫面。
export function mockNarrate(sc, ch) {
  return {
    title: sc.title,
    story: `【AI 劇情】${ch.name}(${ch.career})的故事:${sc.story}`,
    choices: sc.choices.map((c) => ({ label: c.label, hint: c.hint })),
    lesson: '【AI 觀念】先保障、再投資,輸得起的錢才拿去冒險。',
  }
}
export function mockDirector(info, ch) {
  return {
    title: `AI 事件:${info.catName}`,
    story: `【AI 導演】${ch.name}遇到了一件${info.catName}的麻煩,需要馬上做出決定。這是 AI 即時設計的情境。`,
    choices: [
      { label: '省著點處理', hint: '花費少、後續較辛苦', style: 'frugal' },
      { label: '依標準流程處理', hint: '一般做法', style: 'standard' },
      { label: '用最好的方式處理', hint: '花費多、恢復好', style: 'premium' },
    ],
    lesson: '【AI 觀念】重大事件的花費,常取決於你事前準備了多少。',
  }
}
export function mockAsk(q) {
  return { answer: `【AI 理專助教】關於「${q}」:先確認你的風險缺口與現金流,再決定要不要補強。`, followups: ['我的缺口是什麼?', '保費怎麼抓比較合理?'] }
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
    epilogue: '【AI 結語】這是一段由 AI 寫的人生結語(mock)。',
  }
}

export function mockBanter(bots) {
  const lines = {}
  for (const b of bots) lines[b.id] = [`【AI】${b.name}:這局我不會輸你的!`, `【AI】${b.name}:看我的配置!`, `【AI】${b.name}:運氣也是實力的一部分。`, `【AI】${b.name}:你的保單夠全嗎?`]
  return { lines }
}
