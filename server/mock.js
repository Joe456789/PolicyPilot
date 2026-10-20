// 離線/測試用:GEMINI_MOCK=1 時回傳固定格式的假資料,用來驗證整條 AI 管線與畫面。
export function mockNarrate(sc, ch, lang = 'zh') {
  if (lang === 'en') {
    return {
      title: sc.title,
      story: `[AI story] The story of ${ch.name} (${ch.career}): ${sc.story}`,
      choices: sc.choices.map((c) => ({ label: c.label, hint: c.hint })),
      lesson: '[AI idea] Protect first, invest second: only risk money you can afford to lose.',
    }
  }
  return {
    title: sc.title,
    story: `【AI 劇情】${ch.name}(${ch.career})的故事:${sc.story}`, // i18n-ignore
    choices: sc.choices.map((c) => ({ label: c.label, hint: c.hint })),
    lesson: '【AI 觀念】先保障、再投資,輸得起的錢才拿去冒險。', // i18n-ignore
  }
}
export function mockDirector(info, ch, lang = 'zh') {
  if (lang === 'en') {
    return {
      title: `AI event: ${info.catName}`,
      story: `[AI director] ${ch.name} runs into a ${info.catName} problem and has to decide right away. This situation was designed by the AI on the spot.`,
      choices: [
        { label: 'Keep it cheap', hint: 'Low cost, harder afterward', style: 'frugal' },
        { label: 'Follow the standard process', hint: 'The usual approach', style: 'standard' },
        { label: 'Do it the best way', hint: 'Costs more, recovers well', style: 'premium' },
      ],
      lesson: '[AI idea] The cost of a big event often depends on how much you prepared beforehand.',
    }
  }
  return {
    title: `AI 事件:${info.catName}`, // i18n-ignore
    story: `【AI 導演】${ch.name}遇到了一件${info.catName}的麻煩,需要馬上做出決定。這是 AI 即時設計的情境。`, // i18n-ignore
    choices: [
      { label: '省著點處理', hint: '花費少、後續較辛苦', style: 'frugal' }, // i18n-ignore
      { label: '依標準流程處理', hint: '一般做法', style: 'standard' }, // i18n-ignore
      { label: '用最好的方式處理', hint: '花費多、恢復好', style: 'premium' }, // i18n-ignore
    ],
    lesson: '【AI 觀念】重大事件的花費,常取決於你事前準備了多少。', // i18n-ignore
  }
}
export function mockAsk(q, lang = 'zh') {
  if (lang === 'en') {
    return { answer: `[AI advisor tutor] About "${q}": first check your coverage gaps and cash flow, then decide whether to strengthen anything.`, followups: ['What are my gaps?', 'How much should I spend on premiums?'] }
  }
  return { answer: `【AI 理專助教】關於「${q}」:先確認你的風險缺口與現金流,再決定要不要補強。`, followups: ['我的缺口是什麼?', '保費怎麼抓比較合理?'] } // i18n-ignore
}
export function mockAdvisor(an, ch, lang = 'zh') {
  if (lang === 'en') {
    const g = an.gaps[0]
    return { message: g ? `[AI advisor] ${ch.name}, I suggest handling this first: ${g.text}.` : `[AI advisor] ${ch.name}, your coverage looks complete right now.` }
  }
  const g = an.gaps[0]
  return { message: g ? `【AI 理專】${ch.name},我建議優先處理:${g.text}。` : `【AI 理專】${ch.name},目前配置很完整。` } // i18n-ignore
}
export function mockStage(report, lang = 'zh') {
  if (lang === 'en') {
    return {
      title: 'Life stage review (mock)',
      analysis: `[AI analysis] ${report.character.name} is now ${report.stageAge}, with a net worth of about NT$${Math.round(report.net / 1000).toLocaleString('en-US')}K.`,
      strengths: ['Keeps building assets'],
      risks: ['Coverage still has gaps'],
      next: ['Close the biggest coverage gap first', 'Keep 3 to 6 months of cash', 'Diversify your investments'],
    }
  }
  return {
    title: '人生階段回顧(mock)', // i18n-ignore
    analysis: `【AI 分析】${report.character.name}目前 ${report.stageAge} 歲,淨資產約 ${Math.round(report.net / 10000)} 萬。`, // i18n-ignore
    strengths: ['有持續累積資產'], // i18n-ignore
    risks: ['保障仍有缺口'], // i18n-ignore
    next: ['先補最大的保障缺口', '保留 3 到 6 個月預備金', '分散投資'], // i18n-ignore
  }
}
export function mockCoach(report, lang = 'zh') {
  if (lang === 'en') {
    return {
      headline: 'AI coach title (mock)',
      summary: `[AI coach] ${report.character.name} scored ${report.score.total} this round.`,
      lessons: ['Key takeaway one', 'Key takeaway two', 'Key takeaway three'],
      gaps: [],
      scripts: [{ scenario: 'Client is hesitating', say: 'Let us first look at where your risk gaps are, then decide whether to plan anything.' }],
      compliance: 'Describe the product honestly and avoid promising returns.',
      epilogue: '[AI epilogue] This is a life epilogue written by the AI (mock).',
    }
  }
  return {
    headline: 'AI 教練稱號(mock)', // i18n-ignore
    summary: `【AI 教練】${report.character.name}這局得分 ${report.score.total}。`, // i18n-ignore
    lessons: ['學習重點一', '學習重點二', '學習重點三'], // i18n-ignore
    gaps: [],
    scripts: [{ scenario: '客戶猶豫', say: '我們先看你的風險缺口在哪裡,再決定要不要規劃。' }], // i18n-ignore
    compliance: '請如實說明商品內容,避免保證收益。', // i18n-ignore
    epilogue: '【AI 結語】這是一段由 AI 寫的人生結語(mock)。', // i18n-ignore
  }
}

export function mockBanter(bots, lang = 'zh') {
  if (lang === 'en') {
    const lines = {}
    for (const b of bots) lines[b.id] = [`[AI] ${b.name}: I am not losing to you this round!`, `[AI] ${b.name}: Check out my setup!`, `[AI] ${b.name}: Luck is part of skill too.`, `[AI] ${b.name}: Is your coverage complete?`]
    return { lines }
  }
  const lines = {}
  for (const b of bots) lines[b.id] = [`【AI】${b.name}:這局我不會輸你的!`, `【AI】${b.name}:看我的配置!`, `【AI】${b.name}:運氣也是實力的一部分。`, `【AI】${b.name}:你的保單夠全嗎?`] // i18n-ignore
  return { lines }
}
