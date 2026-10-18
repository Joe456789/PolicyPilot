import { useState } from 'react'

const KEYS = [['live', '🍜 生活開銷'], ['save', '🛟 儲蓄與預備金'], ['cover', '🛡️ 保險保障'], ['invest', '📈 投資']]

// 依主角目前的人生階段,決定「合理」的配置比例。
function target(s) {
  const family = s.dependents > 0
  const married = !!s.partner
  if (family) return { live: 62, save: 13, cover: 15, invest: 10 }
  if (married || s.house) return { live: 60, save: 14, cover: 13, invest: 13 }
  return { live: 58, save: 17, cover: 10, invest: 15 }
}

export default function BudgetPlan({ s, onDone }) {
  const t = target(s)
  const [v, setV] = useState({ live: 40, save: 20, cover: 20, invest: 20 })
  const total = Object.values(v).reduce((a, b) => a + b, 0)
  const left = 100 - total
  const adj = (k, d) => {
    if (d > 0 && left <= 0) return
    if (d < 0 && v[k] <= 0) return
    setV((x) => ({ ...x, [k]: x[k] + d }))
  }
  function submit() {
    const diff = KEYS.reduce((a, [k]) => a + Math.abs(v[k] - t[k]), 0)
    const score = Math.max(0, 100 - diff)
    const stars = score >= 88 ? 3 : score >= 76 ? 2 : score >= 62 ? 1 : 0
    onDone({ stars, note: `你的分數 ${score} 分。參考配置:生活 ${t.live}、儲蓄 ${t.save}、保障 ${t.cover}、投資 ${t.invest}。` })
  }
  return (
    <div className="mg">
      <p className="mg-sub">{s.dependents > 0 ? '你有家庭要扶養' : s.partner ? '你已婚、有房貸或家庭支出' : '你目前單身'},請把 100 點預算分配好。</p>
      <div className="budget">
        {KEYS.map(([k, n]) => (
          <div key={k} className="bud-row">
            <span>{n}</span>
            <div className="bud-bar"><i style={{ width: `${v[k]}%` }} /></div>
            <button className="step" onClick={() => adj(k, -5)} aria-label={`${n} 減少`}>−</button>
            <b>{v[k]}</b>
            <button className="step" onClick={() => adj(k, 5)} aria-label={`${n} 增加`}>＋</button>
          </div>
        ))}
      </div>
      <div className={`bud-left ${left === 0 ? 'ok' : ''}`}>剩餘可分配:{left} 點</div>
      <button className="btn primary wide" onClick={submit} disabled={left !== 0}>送出配置</button>
    </div>
  )
}
