// 市場走勢:把每年結算時記下的各類資產報酬,換算成「起點 = 100」的指數,供走勢圖使用。
// 只讀取歷史資料,不影響任何數字。
import { ASSET_ORDER } from './core.js'

export function marketSeries(history, startAge) {
  const rows = (history || []).filter((h) => h.returns)
  const first = rows.length ? rows[0].age : startAge
  const pts = [{ i: 0, age: first, ret: null, ...Object.fromEntries(ASSET_ORDER.map((k) => [k, 100])) }]
  rows.forEach((h, n) => {
    const prev = pts[n]
    const p = { i: n + 1, age: h.age + 1, ret: h.returns }
    for (const k of ASSET_ORDER) p[k] = prev[k] * (1 + (h.returns[k] ?? 0))
    pts.push(p)
  })
  return pts
}
