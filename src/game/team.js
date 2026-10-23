// 主管後台的資料:把訓練紀錄整理成「每位學員一列」,再彙總成整組的指標。
// 本機紀錄 = 這台瀏覽器裡的真實紀錄(一位學員);示範團隊 = 用固定種子產生的模擬資料,只用來展示後台的樣子。
// 正式導入時,學員紀錄改由學習平台(LMS)彙整,這裡的彙總與圖表可以直接沿用。
import { Rng } from './rng.js'
import { CONCEPTS } from './assess.js'

export const MISTAKES = {
  panic: '大跌時恐慌賣出',
  shortfall: '緊急預備金不足,被迫借錢',
  'gap:disability': '失能險不足',
  'gap:life': '壽險保額不足',
  'gap:medical': '沒有醫療險',
  'gap:critical': '重大傷病險不足',
  'gap:mortgage': '有房貸卻沒有房貸壽險',
  'gap:accident': '意外險不足',
  'gap:ltc': '沒有長照準備',
  'gap:home': '沒有住宅火險',
  'gap:auto': '沒有汽車險',
  'gap:annuity': '退休準備不足',
  'flag:guarantee': '對練說出「保證收益」',
  'flag:principal': '對練把投資說成保本',
  'flag:pressure': '對練施壓成交',
  'flag:tiein': '對練把保險和貸款綁在一起',
  'flag:deposit': '對練把保單比成定存',
}

export const PARTS = [
  { id: 'discovery', label: '需求探詢' },
  { id: 'clarity', label: '說明清楚' },
  { id: 'compliance', label: '合規與公平待客' },
  { id: 'suitability', label: '建議適合度' },
]

const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null)
const bump = (o, k, n = 1) => { o[k] = (o[k] || 0) + n }

// 這台裝置的紀錄 → 一位學員
export function learnerFromLocal(train, records, name) {
  const pre = train.tests.find((x) => x.phase === 'pre')
  const post = train.tests.find((x) => x.phase === 'post')
  const rp = train.roleplay
  const mistakes = {}
  for (const g of records.games || []) for (const m of g.mistakes || []) bump(mistakes, m)
  for (const r of rp) for (const f of r.flags || []) bump(mistakes, 'flag:' + f)
  const parts = {}
  for (const p of PARTS) parts[p.id] = mean(rp.map((r) => r.parts?.[p.id]).filter((x) => Number.isFinite(x)))
  return {
    id: 'me', name: name || '本機學員', branch: '本機', games: (records.games || []).length,
    pre: pre ? pre.correct / pre.total : null, post: post ? post.correct / post.total : null,
    preBy: pre?.byConcept || null, postBy: post?.byConcept || null,
    rpCount: rp.length, rpBest: rp.length ? Math.max(...rp.map((r) => r.total)) : null, rpParts: parts,
    flags: rp.reduce((a, r) => a + (r.flags || []).length, 0),
    caseBest: train.cases.length ? Math.max(...train.cases.map((c) => c.total)) : null,
    mistakes,
  }
}

// 示範團隊:3 個分行、各 8 位學員。數字是模擬的,但走向符合「玩過之後觀念進步」的設計目標。
const PRE = { emergency: 0.6, income: 0.42, life: 0.55, mortgage: 0.32, invest: 0.28, market: 0.5, kyc: 0.55 }
const GAIN = { emergency: 0.15, income: 0.22, life: 0.12, mortgage: 0.3, invest: 0.28, market: 0.2, kyc: 0.15 }
export const DEMO_BRANCHES = ['A 分行', 'B 分行', 'C 分行']

export function demoTeam(seed = 2026) {
  const rng = new Rng(seed, 0)
  const clamp01 = (x) => Math.max(0.03, Math.min(0.97, x))
  const out = []
  DEMO_BRANCHES.forEach((branch, b) => {
    for (let i = 0; i < 8; i++) {
      const skill = rng.normal(0, 0.1)
      const preBy = {}, postBy = {}
      const tookPost = rng.next() < 0.85
      for (const c of CONCEPTS) {
        preBy[c.id] = rng.next() < clamp01(PRE[c.id] + skill) ? 1 : 0
        postBy[c.id] = rng.next() < clamp01(PRE[c.id] + GAIN[c.id] + skill) ? 1 : 0
      }
      const sum = (o) => Object.values(o).reduce((a, x) => a + x, 0)
      const rpCount = rng.int(0, 5)
      const rpParts = {}
      const pm = { discovery: 15, clarity: 15, compliance: 21, suitability: 16 }
      for (const p of PARTS) rpParts[p.id] = rpCount ? Math.round(Math.max(5, Math.min(25, rng.normal(pm[p.id] + skill * 20, 3))) * 10) / 10 : null
      const mistakes = {}
      let flags = 0
      for (let k = 0; k < rpCount; k++) {
        if (rng.next() < 0.18) { flags++; bump(mistakes, 'flag:' + rng.weighted([{ id: 'guarantee', w: 3 }, { id: 'pressure', w: 2 }, { id: 'deposit', w: 1 }, { id: 'tiein', w: 1 }]).id) }
      }
      const games = rng.int(1, 6)
      for (let k = 0; k < games; k++) {
        if (rng.next() < 0.3) bump(mistakes, 'panic')
        if (rng.next() < 0.25) bump(mistakes, 'shortfall')
        if (rng.next() < 0.5) bump(mistakes, 'gap:disability')
        if (rng.next() < 0.3) bump(mistakes, 'gap:mortgage')
        if (rng.next() < 0.28) bump(mistakes, 'gap:life')
        if (rng.next() < 0.2) bump(mistakes, 'gap:critical')
      }
      out.push({
        id: `d${b}${i}`, name: null, num: String(b * 8 + i + 1).padStart(2, '0'), branch, games,
        pre: sum(preBy) / CONCEPTS.length, post: tookPost ? sum(postBy) / CONCEPTS.length : null,
        preBy, postBy: tookPost ? postBy : null,
        rpCount, rpBest: rpCount ? Math.min(100, Math.round(Object.values(rpParts).reduce((a, x) => a + x, 0) + rng.int(0, 6))) : null, rpParts,
        flags, caseBest: rng.next() < 0.7 ? rng.int(48, 95) : null, mistakes,
      })
    }
  })
  return out
}

// 整組的彙總:圖表與 KPI 都從這裡來,篩選分行時一起重算,數字才會一致
export function summarize(learners) {
  const paired = learners.filter((l) => l.pre != null && l.post != null)
  const concepts = CONCEPTS.map((c) => {
    const pre = mean(learners.filter((l) => l.preBy).map((l) => l.preBy[c.id]).filter((x) => x != null))
    const post = mean(learners.filter((l) => l.postBy).map((l) => l.postBy[c.id]).filter((x) => x != null))
    return { id: c.id, name: c.name, pre, post }
  })
  const parts = PARTS.map((p) => ({ ...p, avg: mean(learners.map((l) => l.rpParts?.[p.id]).filter((x) => Number.isFinite(x))) }))
  const mistakes = {}
  for (const l of learners) for (const [k, n] of Object.entries(l.mistakes || {})) bump(mistakes, k, n)
  return {
    n: learners.length,
    games: learners.reduce((a, l) => a + (l.games || 0), 0),
    paired: paired.length,
    preAvg: mean(paired.map((l) => l.pre)),
    postAvg: mean(paired.map((l) => l.post)),
    rpAvg: mean(learners.map((l) => l.rpBest).filter((x) => x != null)),
    rpUsers: learners.filter((l) => l.rpCount > 0).length,
    flags: learners.reduce((a, l) => a + (l.flags || 0), 0),
    concepts, parts,
    mistakes: Object.entries(mistakes).filter(([k]) => MISTAKES[k]).map(([id, count]) => ({ id, label: MISTAKES[id], count })).sort((a, b) => b.count - a.count),
  }
}

// 匯出 CSV(Excel 可直接開啟)。header 與數字由呼叫端決定語言。
export function toCsv(header, rows) {
  const esc = (v) => { const s = v == null ? '' : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s }
  return '﻿' + [header, ...rows].map((r) => r.map(esc).join(',')).join('\r\n')
}
