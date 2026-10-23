// 訓練紀錄:AI 客戶對練、前後測驗、情境挑戰。存在瀏覽器(沒有帳號,換裝置不會同步)。
// 主管後台會讀這裡的資料;正式導入時改成送到公司的學習平台(LMS)即可。
const KEY = 'policypilot.training.v1'
const KINDS = ['roleplay', 'tests', 'cases']
const empty = () => ({ learner: '', roleplay: [], tests: [], cases: [] })

export function loadTraining() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || 'null')
    if (!raw || typeof raw !== 'object') return empty()
    const out = { ...empty(), learner: typeof raw.learner === 'string' ? raw.learner : '' }
    for (const k of KINDS) out[k] = Array.isArray(raw[k]) ? raw[k] : []
    return out
  } catch {
    return empty()
  }
}

function save(rec) {
  try { localStorage.setItem(KEY, JSON.stringify(rec)) } catch { /* 隱私模式等情況下忽略 */ }
}

export function addTraining(kind, row) {
  if (!KINDS.includes(kind)) return loadTraining()
  const rec = loadTraining()
  rec[kind] = [{ at: Date.now(), ...row }, ...rec[kind]].slice(0, 60)
  save(rec)
  return rec
}

export function setLearner(name) {
  const rec = loadTraining()
  rec.learner = String(name || '').slice(0, 16)
  save(rec)
  return rec
}
