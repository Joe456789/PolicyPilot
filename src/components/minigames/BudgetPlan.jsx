import { useState } from 'react'
import { t } from '../../i18n.js'

const KEYS = [['live', '🍜 生活開銷'], ['save', '🛟 儲蓄與預備金'], ['cover', '🛡️ 保險保障'], ['invest', '📈 投資']] // i18n-ignore 顯示時用 t(n) 翻譯

// 依主角目前的人生階段,決定「合理」的配置比例。
function target(s) {
  const family = s.dependents > 0
  const married = !!s.partner
  if (family) return { live: 62, save: 13, cover: 15, invest: 10 }
  if (married || s.house) return { live: 60, save: 14, cover: 13, invest: 13 }
  return { live: 58, save: 17, cover: 10, invest: 15 }
}

export default function BudgetPlan({ s, onDone }) {
  const tg = target(s)
  const [v, setV] = useState({ live: 40, save: 20, cover: 20, invest: 20 })
  const total = Object.values(v).reduce((a, b) => a + b, 0)
  const left = 100 - total
  const adj = (k, d) => {
    if (d > 0 && left <= 0) return
    if (d < 0 && v[k] <= 0) return
    setV((x) => ({ ...x, [k]: x[k] + d }))
  }
  function submit() {
    const diff = KEYS.reduce((a, [k]) => a + Math.abs(v[k] - tg[k]), 0)
    const score = Math.max(0, 100 - diff)
    const stars = score >= 88 ? 3 : score >= 76 ? 2 : score >= 62 ? 1 : 0
    onDone({ stars, note: t('你的分數 {score} 分。參考配置:生活 {live}、儲蓄 {save}、保障 {cover}、投資 {invest}。', { score, live: tg.live, save: tg.save, cover: tg.cover, invest: tg.invest }) })
  }
  return (
    <div className="mg">
      <p className="mg-sub">{t('{situation},請把 100 點預算分配好。', { situation: s.dependents > 0 ? t('你有家庭要扶養') : s.partner ? t('你已婚、有房貸或家庭支出') : t('你目前單身') })}</p>
      <div className="budget">
        {KEYS.map(([k, n]) => (
          <div key={k} className="bud-row">
            <span>{t(n)}</span>
            <div className="bud-bar"><i style={{ width: `${v[k]}%` }} /></div>
            <button className="step" onClick={() => adj(k, -5)} aria-label={t('{name} 減少', { name: t(n) })}>−</button>
            <b>{v[k]}</b>
            <button className="step" onClick={() => adj(k, 5)} aria-label={t('{name} 增加', { name: t(n) })}>＋</button>
          </div>
        ))}
      </div>
      <div className={`bud-left ${left === 0 ? 'ok' : ''}`}>{t('剩餘可分配:{left} 點', { left })}</div>
      <button className="btn primary wide" onClick={submit} disabled={left !== 0}>{t('送出配置')}</button>
    </div>
  )
}
