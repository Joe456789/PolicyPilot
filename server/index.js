import express from 'express'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import fs from 'node:fs'
import { aiStatus, generateJson } from './gemini.js'
import { SYSTEM, narratePrompt, directorPrompt, askPrompt, advisorPrompt, stagePrompt, coachPrompt, banterPrompt } from './prompts.js'
import { lookupGlossary } from '../src/game/glossary.js'
import { mockNarrate, mockDirector, mockAsk, mockAdvisor, mockStage, mockCoach, mockBanter } from './mock.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
app.disable('x-powered-by')
app.set('trust proxy', true)
app.use(express.json({ limit: '60kb' }))

// ---- 用量保護:避免公開網址被拿去洗 API 額度。超過上限時回傳 429,前端會自動改用離線題庫。----
const PER_MIN = Number(process.env.RATE_LIMIT_PER_MIN || 40)
const PER_IP_DAY = Number(process.env.AI_DAILY_PER_IP || 150)
const GLOBAL_DAY = Number(process.env.AI_DAILY_GLOBAL || 2500)
const minute = new Map()
const day = { key: '', perIp: new Map(), total: 0 }

function today() { return new Date().toISOString().slice(0, 10) }
function limiter(req, res, next) {
  const ip = req.ip || 'unknown'
  const now = Date.now()
  const rec = (minute.get(ip) || []).filter((t) => now - t < 60000)
  rec.push(now)
  minute.set(ip, rec)
  if (rec.length > PER_MIN) return res.status(429).json({ ok: false, error: 'rate_limited' })
  if (day.key !== today()) { day.key = today(); day.perIp = new Map(); day.total = 0 }
  const used = day.perIp.get(ip) || 0
  if (used >= PER_IP_DAY || day.total >= GLOBAL_DAY) return res.status(429).json({ ok: false, error: 'daily_quota' })
  day.perIp.set(ip, used + 1)
  day.total += 1
  next()
}
app.use('/api/narrate', limiter)
app.use('/api/director', limiter)
app.use('/api/ask', limiter)
app.use('/api/advisor', limiter)
app.use('/api/stage', limiter)
app.use('/api/coach', limiter)
app.use('/api/banter', limiter)

const str = (v, n = 400) => String(v ?? '').slice(0, n)
const num = (v, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d)

app.get('/api/health', (_req, res) => res.json({ ...aiStatus(), usedToday: day.total, capToday: GLOBAL_DAY }))

async function handle(res, real, mock) {
  try {
    const out = process.env.GEMINI_MOCK === '1' ? mock() : await real()
    res.json({ ok: true, data: out })
  } catch (e) {
    console.error('[ai]', e.code || '', e.message)
    res.status(e.code === 'no_key' ? 503 : 502).json({ ok: false, error: e.code || 'ai_error' })
  }
}

const cleanChar = (c = {}) => ({ name: str(c.name, 12), career: str(c.career, 12), background: str(c.background, 12), style: str(c.style, 8) })
const cleanBrief = (b = {}) => ({
  age: num(b.age, 30),
  dependents: num(b.dependents),
  married: !!b.married,
  ownsHouse: !!b.ownsHouse,
  emergencyMonths: num(b.emergencyMonths),
  hasLoan: !!b.hasLoan,
})

app.post('/api/narrate', (req, res) => {
  const { scene = {}, character, brief } = req.body || {}
  const sc = {
    kind: str(scene.kind, 20), cat: str(scene.cat, 20), title: str(scene.title, 40), story: str(scene.story, 300),
    choices: (Array.isArray(scene.choices) ? scene.choices : []).slice(0, 4).map((c) => ({ label: str(c.label, 60), hint: str(c.hint, 60) })),
  }
  const ch = cleanChar(character)
  const br = cleanBrief(brief)
  handle(
    res,
    async () => {
      const out = await generateJson({ system: SYSTEM, prompt: narratePrompt({ scene: sc, character: ch, brief: br }), maxTokens: 900 })
      if (!out || !Array.isArray(out.choices) || out.choices.length !== sc.choices.length) {
        throw Object.assign(new Error('bad narrate shape'), { code: 'bad_shape' })
      }
      return {
        title: str(out.title, 30), story: str(out.story, 260),
        choices: out.choices.map((c) => ({ label: str(c.label, 40), hint: str(c.hint, 50) })),
        lesson: str(out.lesson, 100),
      }
    },
    () => mockNarrate(sc, ch),
  )
})

const STYLES = ['frugal', 'standard', 'premium', 'risky']
app.post('/api/director', (req, res) => {
  const { info = {}, character, brief, recent = [] } = req.body || {}
  const inf = { cat: str(info.cat, 20), catName: str(info.catName, 20), severity: Math.min(4, Math.max(1, num(info.severity, 2))), needs: str(info.needs, 80) }
  const ch = cleanChar(character)
  const br = cleanBrief(brief)
  const rc = (Array.isArray(recent) ? recent : []).slice(0, 6).map((x) => str(x, 20))
  handle(
    res,
    async () => {
      const out = await generateJson({ system: SYSTEM, prompt: directorPrompt({ info: inf, character: ch, brief: br, recent: rc }), maxTokens: 900 })
      const choices = Array.isArray(out?.choices) ? out.choices.slice(0, 3) : []
      const styles = choices.map((c) => c.style)
      if (!out?.story || choices.length < 2 || !styles.every((x) => STYLES.includes(x)) || new Set(styles).size !== styles.length) {
        throw Object.assign(new Error('bad director shape'), { code: 'bad_shape' })
      }
      return {
        title: str(out.title, 30), story: str(out.story, 260), lesson: str(out.lesson, 100),
        choices: choices.map((c) => ({ label: str(c.label, 40), hint: str(c.hint, 50), style: c.style })),
      }
    },
    () => mockDirector(inf, ch),
  )
})

app.post('/api/ask', (req, res) => {
  const question = str(req.body?.question, 200).trim()
  const context = str(req.body?.context, 400)
  if (question.length < 2) return res.status(400).json({ ok: false, error: 'too_short' })
  const refs = lookupGlossary(question, 3)
  handle(
    res,
    async () => {
      const out = await generateJson({ system: SYSTEM, prompt: askPrompt({ question, context, refs }), maxTokens: 700, temperature: 0.6 })
      if (!out?.answer) throw Object.assign(new Error('bad ask shape'), { code: 'bad_shape' })
      return { answer: str(out.answer, 600), followups: (out.followups || []).slice(0, 2).map((x) => str(x, 40)) }
    },
    () => mockAsk(question),
  )
})

app.post('/api/advisor', (req, res) => {
  const { character, analysis = {}, brief } = req.body || {}
  const an = {
    gaps: (analysis.gaps || []).slice(0, 5).map((g) => ({ text: str(g.text, 120) })),
    emergencyMonths: num(analysis.emergencyMonths),
    premiumRatio: num(analysis.premiumRatio),
  }
  const ch = cleanChar(character)
  const br = cleanBrief(brief)
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

app.post('/api/stage', (req, res) => {
  const report = req.body?.report
  if (!report || typeof report !== 'object') return res.status(400).json({ ok: false, error: 'bad_request' })
  handle(
    res,
    async () => {
      const out = await generateJson({ system: SYSTEM, prompt: stagePrompt({ report }), maxTokens: 1200, temperature: 0.8 })
      if (!out?.analysis || !Array.isArray(out.next)) throw Object.assign(new Error('bad stage shape'), { code: 'bad_shape' })
      return {
        title: str(out.title, 30),
        analysis: str(out.analysis, 420),
        strengths: (out.strengths || []).slice(0, 2).map((x) => str(x, 80)),
        risks: (out.risks || []).slice(0, 3).map((x) => str(x, 100)),
        next: out.next.slice(0, 3).map((x) => str(x, 100)),
      }
    },
    () => mockStage(report),
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
        headline: str(out.headline, 40), summary: str(out.summary, 400),
        lessons: out.lessons.slice(0, 4).map((x) => str(x, 140)),
        gaps: (out.gaps || []).slice(0, 3).map((x) => str(x, 140)),
        scripts: (out.scripts || []).slice(0, 3).map((x) => ({ scenario: str(x.scenario, 50), say: str(x.say, 260) })),
        compliance: str(out.compliance, 160),
        epilogue: str(out.epilogue, 300),
      }
    },
    () => mockCoach(report),
  )
})

app.post('/api/banter', (req, res) => {
  const raw = Array.isArray(req.body?.bots) ? req.body.bots.slice(0, 3) : []
  if (!raw.length) return res.status(400).json({ ok: false, error: 'bad_request' })
  const bots = raw.map((b) => ({
    id: str(b.id, 16), name: str(b.name, 12), persona: str(b.persona, 60), age: num(b.age), rank: num(b.rank), players: num(b.players),
    netWorthWan: num(b.netWorthWan), coverage: str(b.coverage, 20), properties: num(b.properties),
  }))
  const recent = (Array.isArray(req.body?.recent) ? req.body.recent : []).slice(0, 8).map((x) => str(x, 60))
  const human = str(req.body?.human, 10) || '玩家'
  handle(
    res,
    async () => {
      const out = await generateJson({ system: SYSTEM, prompt: banterPrompt({ bots, recent, human }), maxTokens: 900, temperature: 0.95 })
      const lines = {}
      for (const b of bots) {
        const arr = out?.lines?.[b.id]
        if (Array.isArray(arr)) lines[b.id] = arr.slice(0, 4).map((x) => str(x, 40)).filter(Boolean)
      }
      if (!Object.keys(lines).length) throw Object.assign(new Error('bad banter shape'), { code: 'bad_shape' })
      return { lines }
    },
    () => mockBanter(bots),
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
