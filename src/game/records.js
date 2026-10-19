// 成就與歷史戰績:存在瀏覽器 localStorage(無帳號,換裝置不會同步)。
const KEY = 'policypilot.records.v1'

export const ACHIEVEMENTS = [
  { id: 'first', icon: '🎬', title: '第一次人生', desc: '完成一局人生。', check: () => true },
  { id: 's_grade', icon: '🏆', title: '人生勝利組', desc: '拿到 S 級評價。', check: (c) => c.score.grade === 'S' },
  { id: 'saved', icon: '🛟', title: '保險救了我', desc: '一局之中累計獲得 100 萬以上的理賠。', check: (c) => c.claims >= 1000000 },
  { id: 'burned', icon: '🔥', title: '慘痛教訓', desc: '有 3 年以上現金不足、被迫借款。', check: (c) => c.score.shortfallYears >= 3 },
  { id: 'homeowner', icon: '🏠', title: '有殼蝸牛', desc: '成功買下自己的房子。', check: (c) => !!c.s.house },
  { id: 'rich', icon: '💎', title: '財富自由', desc: '結算淨資產達到 2,000 萬。', check: (c) => c.score.netWorth >= 20000000 },
  { id: 'sage', icon: '🎓', title: '保險小博士', desc: '一局答對 5 題保險小測驗。', check: (c) => c.s.quizRight >= 5 },
  { id: 'calm', icon: '🧊', title: '冷靜投資人', desc: '遇到下跌抱緊持股、沒有恐慌賣出。', check: (c) => c.s.crashesHeld >= 1 && c.s.panicSells === 0 },
  { id: 'beat_all', icon: '🥇', title: '擊敗電腦', desc: '在有電腦對手的對局中拿下第一。', check: (c) => c.opponents > 0 && c.rank === 1 },
  { id: 'family_full', icon: '🏡', title: '美滿家庭', desc: '結婚、有 2 個以上的孩子,而且有自己的房子。', check: (c) => !!c.s.partner && c.s.dependents >= 2 && !!c.s.house },
  { id: 'quest_master', icon: '🎯', title: '任務達人', desc: '一局完成全部 3 個人生任務。', check: (c) => c.questsDone >= 3 },
  { id: 'survivor', icon: '💪', title: '九死一生', desc: '經歷重大傷病與失能事件,仍然平安走完人生。', check: (c) => c.hadCritical && c.hadDisability && c.s.ended?.reason === 'complete' },
  { id: 'gamer', icon: '🎮', title: '小遊戲高手', desc: '一局之中,小遊戲拿到 2 次三顆星。', check: (c) => c.s.miniPerfect >= 2 },
  { id: 'variety', icon: '🎭', title: '見多識廣', desc: '體驗過 3 種不同的職業。', check: (c, rec) => Object.keys(rec.careers || {}).length >= 3 },
]

const empty = () => ({ games: [], unlocked: {}, careers: {}, endings: {} })

export function loadRecords() {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? { ...empty(), ...JSON.parse(raw) } : empty()
  } catch {
    return empty()
  }
}

function save(rec) {
  try { localStorage.setItem(KEY, JSON.stringify(rec)) } catch { /* 隱私模式等情況下忽略 */ }
}

// 結算一局:寫入戰績並回傳新解鎖的成就。
export function recordGame(ctx) {
  const rec = loadRecords()
  rec.careers[ctx.s.player.careerId] = (rec.careers[ctx.s.player.careerId] || 0) + 1
  const row = {
    t: Date.now(),
    name: ctx.s.player.name,
    career: ctx.s.player.title,
    score: ctx.score.total,
    grade: ctx.score.grade,
    net: ctx.score.netWorth,
    rank: ctx.rank,
    ending: ctx.ending?.title || null,
    players: ctx.opponents + 1,
    years: ctx.s.history.length,
  }
  rec.games = [row, ...rec.games].slice(0, 30)
  if (ctx.ending) rec.endings = { ...(rec.endings || {}), [ctx.ending.id]: rec.endings?.[ctx.ending.id] || Date.now() }
  const fresh = []
  for (const a of ACHIEVEMENTS) {
    if (rec.unlocked[a.id]) continue
    let ok = false
    try { ok = a.check(ctx, rec) } catch { ok = false }
    if (ok) { rec.unlocked[a.id] = Date.now(); fresh.push(a) }
  }
  save(rec)
  return { fresh, records: rec }
}
