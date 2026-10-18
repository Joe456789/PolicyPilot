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
  emergencyMonths: Math.round((s.cash / (s.expense / 12)) * 10) / 10,
  hasDebt: s.debt > 0,
})
const who = (c) => ({ name: c.name, title: c.title, traits: c.traits })

export const ai = {
  narrate: (scene, s) =>
    post(
      '/api/narrate',
      {
        scene: { kind: scene.kind, cat: scene.cat, title: scene.title, story: scene.story, choices: scene.choices.map((c) => ({ label: c.label, hint: c.hint })) },
        character: who(s.char),
        brief: brief(s),
      },
      9000,
    ),
  advisor: (analysis, s) =>
    post('/api/advisor', { character: who(s.char), analysis: { gaps: analysis.gaps.map((g) => ({ text: g.text })), emergencyMonths: analysis.emergencyMonths, premiumRatio: analysis.premiumRatio }, brief: brief(s) }, 9000),
  coach: (report) => post('/api/coach', { report }, 20000),
  persona: (description) => post('/api/persona', { description }, 15000),
}
