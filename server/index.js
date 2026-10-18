import express from 'express'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import fs from 'node:fs'
import { aiStatus, generateJson } from './gemini.js'
import { SYSTEM, narratePrompt, advisorPrompt, coachPrompt, personaPrompt } from './prompts.js'
import { mockNarrate, mockAdvisor, mockCoach, mockPersona } from './mock.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
app.disable('x-powered-by')
app.use(express.json({ limit: '60kb' }))

// 簡易限流:避免公開網址被拿去洗 API 額度(每 IP 每分鐘)。
const hits = new Map()
const LIMIT = Number(process.env.RATE_LIMIT_PER_MIN || 60)
app.use('/api', (req, res, next) => {
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip
  const now = Date.now()
  const rec = (hits.get(ip) || []).filter((t) => now - t < 60000)
  rec.push(now)
  hits.set(ip, rec)
  if (rec.length > LIMIT) return res.status(429).json({ error: 'rate_limited' })
  next()
})

const str = (v, n = 400) => String(v ?? '').slice(0, n)

app.get('/api/health', (_req, res) => res.json(aiStatus()))

async function handle(res, real, mock) {
  try {
    const out = process.env.GEMINI_MOCK === '1' ? mock() : await real()
    res.json({ ok: true, data: out })
  } catch (e) {
    console.error('[ai]', e.code || '', e.message)
    res.status(e.code === 'no_key' ? 503 : 502).json({ ok: false, error: e.code || 'ai_error' })
  }
}

app.post('/api/narrate', (req, res) => {
  const { scene = {}, character = {}, brief = {} } = req.body || {}
  const sc = {
    kind: str(scene.kind, 20),
    cat: str(scene.cat, 20),
    title: str(scene.title, 40),
    story: str(scene.story, 300),
    choices: (Array.isArray(scene.choices) ? scene.choices : []).slice(0, 4).map((c) => ({
      label: str(c.label, 60),
      hint: str(c.hint, 60),
    })),
  }
  const ch = { name: str(character.name, 20), title: str(character.title, 20), traits: (character.traits || []).slice(0, 3).map((t) => str(t, 10)) }
  const br = {
    age: Number(brief.age) || 30,
    dependents: Number(brief.dependents) || 0,
    emergencyMonths: Number(brief.emergencyMonths) || 0,
    hasDebt: !!brief.hasDebt,
  }
  handle(
    res,
    async () => {
      const out = await generateJson({ system: SYSTEM, prompt: narratePrompt({ scene: sc, character: ch, brief: br }), maxTokens: 900 })
      if (!out || !Array.isArray(out.choices) || out.choices.length !== sc.choices.length) {
        const e = new Error('bad narrate shape')
        e.code = 'bad_shape'
        throw e
      }
      return {
        title: str(out.title, 30),
        story: str(out.story, 260),
        choices: out.choices.map((c) => ({ label: str(c.label, 40), hint: str(c.hint, 50) })),
      }
    },
    () => mockNarrate(sc, ch),
  )
})

app.post('/api/advisor', (req, res) => {
  const { character = {}, analysis = {}, brief = {} } = req.body || {}
  const an = {
    gaps: (analysis.gaps || []).slice(0, 5).map((g) => ({ text: str(g.text, 120) })),
    emergencyMonths: Number(analysis.emergencyMonths) || 0,
    premiumRatio: Number(analysis.premiumRatio) || 0,
  }
  const ch = { name: str(character.name, 20), title: str(character.title, 20) }
  const br = { age: Number(brief.age) || 30, dependents: Number(brief.dependents) || 0 }
  handle(
    res,
    async () => {
      const out = await generateJson({ system: SYSTEM, prompt: advisorPrompt({ character: ch, analysis: an, brief: br }), maxTokens: 500 })
      if (!out?.message) throw Object.assign(new Error('bad advisor shape'), { code: 'bad_shape' })
      return { message: str(out.message, 400) }
    },
    () => mockAdvisor(an, ch),
  )
})

app.post('/api/coach', (req, res) => {
  const report = req.body?.report
  if (!report || typeof report !== 'object') return res.status(400).json({ ok: false, error: 'bad_request' })
  handle(
    res,
    async () => {
      const out = await generateJson({ system: SYSTEM, prompt: coachPrompt({ report }), maxTokens: 1800, temperature: 0.8 })
      if (!out?.summary || !Array.isArray(out.lessons)) throw Object.assign(new Error('bad coach shape'), { code: 'bad_shape' })
      return {
        headline: str(out.headline, 40),
        summary: str(out.summary, 400),
        lessons: out.lessons.slice(0, 4).map((x) => str(x, 140)),
        gaps: (out.gaps || []).slice(0, 3).map((x) => str(x, 140)),
        scripts: (out.scripts || []).slice(0, 3).map((x) => ({ scenario: str(x.scenario, 50), say: str(x.say, 260) })),
        compliance: str(out.compliance, 160),
      }
    },
    () => mockCoach(report),
  )
})

app.post('/api/persona', (req, res) => {
  const description = str(req.body?.description, 200).trim()
  if (description.length < 4) return res.status(400).json({ ok: false, error: 'too_short' })
  handle(
    res,
    async () => {
      const out = await generateJson({ system: SYSTEM, prompt: personaPrompt({ description }), maxTokens: 700, temperature: 0.8 })
      if (!out || typeof out !== 'object') throw Object.assign(new Error('bad persona shape'), { code: 'bad_shape' })
      return out
    },
    () => mockPersona(description),
  )
})

// 前端靜態檔(正式環境:同一個容器同時提供 API 與網頁)
const dist = path.join(__dirname, '..', 'dist')
if (fs.existsSync(dist)) {
  app.use(express.static(dist, { maxAge: '1h' }))
  app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')))
}

const port = Number(process.env.PORT || 8080)
app.listen(port, () => {
  const st = aiStatus()
  console.log(`[server] http://localhost:${port}  AI=${st.ai ? (st.mock ? 'mock' : st.model) : 'off(使用離線備援)'}`)
})
