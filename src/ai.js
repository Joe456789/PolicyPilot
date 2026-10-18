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

export const ai = {
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
