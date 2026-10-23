import { t, trDeep, getLang } from './i18n.js'

// 前端呼叫自家後端(後端再呼叫 Gemini)。任何失敗一律回傳 null,由畫面使用離線備援文字。
// 靜態網頁版(GitHub Pages)沒有後端:不呼叫 API,全部用離線題庫與規則式回饋
const STATIC = !!import.meta.env?.VITE_STATIC

async function post(path, body, timeout = 12000) {
  if (STATIC) return null
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), timeout)
  try {
    const res = await fetch(path, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      // 英文模式:引擎產生的資料(商品名稱、事件標題…)先翻成英文再送出,Gemini 才會用英文回答;中文模式 trDeep 原樣回傳
      body: JSON.stringify({ ...trDeep(body), lang: getLang() }),
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
  if (STATIC) return { ai: false }
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
  const names = Object.entries(s.coverage).filter(([, v]) => v > 0).map(([k]) => k).join(getLang() === 'en' ? ', ' : '、') || t('無')
  return t('{age} 歲 {title}、{marital}、扶養 {dep} 人、{house}、現金可撐約 {months} 個月、貸款 {loan} 萬、已投保(代碼):{names}', {
    age: s.age,
    title: s.player.title,
    marital: s.partner ? t('已婚') : t('單身'),
    dep: s.dependents,
    house: s.house ? t('有房') : t('無房'),
    months: Math.round((s.cash / (s.expense / 12)) * 10) / 10,
    loan: Math.round(s.loan / 10000),
    names,
  })
}

export const ai = {
  banter: (payload) => post('/api/banter', payload, 10000),
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
  // 對練:client 只送顯示用的文字(不送關鍵字),plan 是規則決定的「這一句要表達什麼」
  roleplay: (payload) => post('/api/roleplay', { mode: 'reply', ...payload }, 12000),
  roleplayReview: (payload) => post('/api/roleplay', { mode: 'review', ...payload }, 15000),
}
