// 人生任務:每局抽 3 個目標(至少 1 個和保險有關),邊玩邊看進度。
import { Rng } from './rng.js'
import { holdingsTotal } from './core.js'

const kinds = (s) => ['deposit', 'bond', 'stock', 'spec'].filter((k) => s.hold[k] > 0).length

// final: true 表示要到結算時才判定完成(進度仍會即時顯示)
export const QUEST_POOL = [
  {
    id: 'kids', icon: '👶', tag: 'fin', asp: ['family'], title: '養育 2 個孩子', target: 2,
    desc: '孩子帶來責任,也帶來幸福。記得同步提高壽險與失能保障。',
    progress: (s) => s.dependents,
  },
  {
    id: 'promos', icon: '📈', tag: 'fin', asp: ['career'], title: '升遷加薪 3 次', target: 3,
    desc: '在職場一步一步往上。',
    progress: (s) => s.promotions,
  },
  {
    id: 'income2x', icon: '🏆', tag: 'fin', asp: ['career'], title: '年收入成長到起薪的 2 倍', target: 2,
    desc: '收入成長,保障也要跟著升級。',
    progress: (s) => Math.round((s.income / s.career.income) * 10) / 10,
  },
  {
    id: 'trips', icon: '🧳', tag: 'fin', asp: ['travel'], title: '完成 3 次旅行', target: 3,
    desc: '在機會卡裡選擇旅行,別忘了旅平險。',
    progress: (s) => s.trips,
  },
  {
    asp: ['family','wealth'], id: 'home', icon: '🏠', tag: 'fin', title: '45 歲前買下自己的房子', target: 1,
    desc: '房子是人生最大的一筆財務決定,也是最大的資產。',
    progress: (s) => (s.house ? 1 : 0),
  },
  {
    id: 'emergency', icon: '🛟', tag: 'fin', title: '連續 5 年保有 3 個月以上的緊急預備金', target: 5,
    desc: '收入中斷時,預備金能讓你不用賣資產或借錢。',
    progress: (s) => {
      let best = 0, cur = 0
      for (const h of s.history) { cur = h.monthsCash >= 3 ? cur + 1 : 0; best = Math.max(best, cur) }
      return best
    },
  },
  {
    asp: ['guardian'], id: 'shield', icon: '🛡️', tag: 'ins', title: '保障完整度維持 80% 以上達 8 年', target: 8,
    desc: '依你的人生階段,保持該有的保障。',
    progress: (s) => s.history.filter((h) => h.protRatio >= 0.8).length,
  },
  {
    asp: ['wealth'], id: 'nodebt', icon: '🧘', tag: 'fin', title: '全程不因現金不足而被迫借款', target: 1, final: true,
    desc: '現金流穩定,沒有一年需要被迫舉債。',
    progress: (s) => (s.history.every((h) => h.borrowed === 0) ? 1 : 0),
  },
  {
    id: 'quiz', icon: '🎓', tag: 'ins', title: '答對 3 題保險小測驗', target: 3,
    desc: '在「保險小學堂」格子搶答。',
    progress: (s) => s.quizRight,
  },
  {
    id: 'calm', icon: '🧊', tag: 'fin', title: '市場下跌時抱緊持股,不恐慌賣出', target: 1,
    desc: '持有股票類資產遇到下跌,仍然不賣。',
    progress: (s) => (s.crashesHeld >= 1 && s.panicSells === 0 ? 1 : 0),
  },
  {
    asp: ['wealth'], id: 'diversify', icon: '🧺', tag: 'fin', title: '同時持有 3 種以上的資產類別', target: 3,
    desc: '定存、債券、ETF、個股,分散風險。',
    progress: (s) => Math.max(kinds(s), ...s.history.map((h) => h.assetKinds || 0)),
  },
  {
    asp: ['guardian'], id: 'claim', icon: '💰', tag: 'ins', title: '單次獲得 50 萬以上的保險理賠', target: 1,
    desc: '在重大事件中,讓保險發揮作用。',
    progress: (s) => (s.history.some((h) => h.payout >= 500000) ? 1 : 0),
  },
  {
    asp: ['family'], id: 'family', icon: '👨‍👩‍👧', tag: 'ins', title: '結婚並擁有自己的房子', target: 2,
    desc: '成家立業,記得同步檢視壽險與火險。',
    progress: (s) => (s.partner ? 1 : 0) + (s.house ? 1 : 0),
  },
  {
    asp: ['travel','guardian'], id: 'healthy', icon: '💪', tag: 'fin', title: '結束時健康維持在 70 以上', target: 1, final: true,
    desc: '健康是最重要的資產。',
    progress: (s) => (s.health >= 70 ? 1 : 0),
  },
  {
    id: 'debtfree', icon: '✂️', tag: 'fin', title: '結束時沒有任何貸款(不含房貸)', target: 1, final: true,
    desc: '把高利率貸款還清。',
    progress: (s) => (s.loan <= 0 ? 1 : 0),
  },
  {
    asp: ['wealth'], id: 'wealth', icon: '📈', tag: 'fin', title: '淨資產達到目標', target: 1, dynamic: 'wealth',
    desc: '讓資產穩健地長大。',
    progress: (s, q) => (s.history.length && s.history[s.history.length - 1].netWorth >= q.goal ? 1 : 0),
  },
  {
    id: 'arcade', icon: '🎮', tag: 'fin', title: '小遊戲累積拿到 6 顆星', target: 6,
    desc: '在棋盤的小遊戲格玩得越好,獎金越多。',
    progress: (s) => s.miniStars,
  },
  {
    asp: ['guardian'], id: 'firehouse', icon: '🔥', tag: 'ins', title: '買房後投保住宅火險地震險', target: 1,
    desc: '房子是最大的資產,別讓一場颱風毀掉它。',
    progress: (s) => (s.house && s.coverage.home > 0 ? 1 : 0),
  },
]

export function drawQuests(seed, career, years, aspiration) {
  const rng = new Rng(seed ^ 0x51f3, 0)
  const ok = (q) => !(years < 20 && q.id === 'home') && !(years < 14 && ['kids', 'promos'].includes(q.id))
  const pool = QUEST_POOL.filter(ok)
  const picked = []
  const take = (list) => {
    const l = list.filter((q) => !picked.some((p) => p.id === q.id))
    if (l.length) picked.push(rng.pick(l))
  }
  if (aspiration) take(pool.filter((q) => (q.asp || []).includes(aspiration)))
  take(pool.filter((q) => q.tag === 'ins'))
  while (picked.length < 3) take(pool)
  return picked.map((q) => ({
    id: q.id,
    goal: q.dynamic === 'wealth' ? Math.round((career.income * years * 0.45) / 1000000) * 1000000 : null,
  }))
}

export function evalQuests(s) {
  const ended = !!s.ended
  return s.quests.map((q) => {
    const def = QUEST_POOL.find((d) => d.id === q.id)
    const value = Math.min(def.target, def.progress(s, q))
    const latched = s.questDone[q.id] != null
    const done = latched || (value >= def.target && (!def.final || ended))
    const title = q.goal ? `淨資產達到 ${Math.round(q.goal / 10000)} 萬` : def.title
    return { id: q.id, icon: def.icon, tag: def.tag, title, desc: def.desc, value, target: def.target, done, final: !!def.final }
  })
}

// 每年結算與結束時呼叫:鎖定已完成的任務(避免之後條件變動又失去)。回傳本次新達成的任務。
export function updateQuests(s) {
  const fresh = []
  for (const q of evalQuests(s)) {
    if (q.done && s.questDone[q.id] == null) {
      s.questDone[q.id] = s.age
      fresh.push(q)
    }
  }
  return fresh
}

export const questScore = (s) => {
  const done = evalQuests(s).filter((q) => q.done).length
  return Math.round((10 * done) / Math.max(1, s.quests.length))
}
export { holdingsTotal }
