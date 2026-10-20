// 薄薄一層 Gemini REST 封裝。金鑰只存在伺服器環境變數,瀏覽器永遠看不到。
const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash'
const TIMEOUT_MS = Number(process.env.GEMINI_TIMEOUT_MS || 15000)

export const aiStatus = () => ({
  ai: Boolean(process.env.GEMINI_API_KEY) || process.env.GEMINI_MOCK === '1',
  mock: process.env.GEMINI_MOCK === '1',
  model: MODEL,
})

export async function generateJson({ system, prompt, temperature = 0.9, maxTokens = 1800 }) {
  if (process.env.GEMINI_MOCK === '1') return null // 由呼叫端提供 mock
  const key = process.env.GEMINI_API_KEY
  if (!key) {
    const e = new Error('GEMINI_API_KEY 未設定') // i18n-ignore:伺服器日誌
    e.code = 'no_key'
    throw e
  }
  const body = {
    systemInstruction: { parts: [{ text: system }] },
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      temperature,
      maxOutputTokens: maxTokens,
      responseMimeType: 'application/json',
      ...(MODEL.includes('2.5') ? { thinkingConfig: { thinkingBudget: 0 } } : {}),
    },
  }
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
        body: JSON.stringify(body),
        signal: ctrl.signal,
      },
    )
    if (!res.ok) {
      const t = await res.text()
      const e = new Error(`Gemini ${res.status}: ${t.slice(0, 200)}`)
      e.code = 'upstream'
      throw e
    }
    const data = await res.json()
    const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('') || ''
    const cleaned = text.replace(/^```json\s*|```$/g, '').trim()
    return JSON.parse(cleaned)
  } finally {
    clearTimeout(timer)
  }
}
