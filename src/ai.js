// 前端呼叫自家後端(後端再呼叫 Gemini)。任何失敗一律回傳 null,由畫面使用離線備援文字。
async function post(path, body, timeout = 12000) {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), timeout)
  try {
    const res = await fetch(path, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    })
    if (!res.ok) return null
    const j = await res.json()
    return j.ok ? j.data : null
  } catch {
    return null
  } finally {
    clearTimeout(t)
  }
}

export async function aiHealth() {
  try {
    const res = await fetch('/api/health')
    if (!res.ok) return { ai: false }
    return await res.json()
  } catch {
    return { ai: false }
  }
}

const brief = (s) => ({
  age: s.age,
  dependents: s.dependents,
  married: !!s.partner,
  ownsHouse: !!s.house,
  emergencyMonths: Math.round((s.cash / (s.expense / 12)) * 10) / 10,
  hasLoan: s.loan > 0,
})
const who = (p) => ({ name: p.name, career: p.title, background: p.background, style: p.style })

const recentTitles = (s) => s.history.flatMap((h) => h.events.filter((e) => e.kind === 'event').map((e) => e.title)).slice(-6)
const context = (s) => {
  const names = Object.entries(s.coverage).filter(([, v]) => v > 0).map(([k]) => k).join('、') || '無'
  return `${s.age} 歲 ${s.player.title}、${s.partner ? '已婚' : '單身'}、扶養 ${s.dependents} 人、${s.house ? '有房' : '無房'}、現金可撐約 ${Math.round((s.cash / (s.expense / 12)) * 10) / 10} 個月、貸款 ${Math.round(s.loan / 10000)} 萬、已投保(代碼):${names}`
}

export const ai = {
  director: (info, s) => post('/api/director', { info, character: who(s.player), brief: brief(s), recent: recentTitles(s) }, 12000),
  ask: (question, s) => post('/api/ask', { question, context: context(s) }, 15000),
  narrate: (scene, s) =>
    post(
      '/api/narrate',
      {
        scene: { kind: scene.kind, cat: scene.cat, title: scene.title, story: scene.story, choices: scene.choices.map((c) => ({ label: c.label, hint: c.hint })) },
        character: who(s.player),
        brief: brief(s),
      },
      9000,
    ),
  advisor: (analysis, s) =>
    post('/api/advisor', { character: who(s.player), analysis: { gaps: analysis.gaps.map((g) => ({ text: g.text })), emergencyMonths: analysis.emergencyMonths, premiumRatio: analysis.premiumRatio }, brief: brief(s) }, 9000),
  stage: (report) => post('/api/stage', { report }, 15000),
  coach: (report) => post('/api/coach', { report }, 20000),
}
