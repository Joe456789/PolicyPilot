import { useState } from 'react'
import { ASSETS, ASSET_ORDER } from '../game/engine.js'
import { marketSeries } from '../game/market.js'
import { t } from '../i18n.js'

const COLORS = { deposit: '#7c8ba1', bond: '#3b82f6', stock: '#00915a', spec: '#f97316' }
const DASH = { deposit: '2 4', bond: '7 4', stock: '', spec: '' }
const pct = (r) => `${r >= 0 ? '+' : ''}${(r * 100).toFixed(1)}%`

// 各類資產走勢圖:起點 = 100,每過一年更新。點圖上任一位置可以看那一年的數字。
export default function MarketChart({ history, startAge }) {
  const pts = marketSeries(history, startAge)
  const [off, setOff] = useState({})
  const [sel, setSel] = useState(null)
  if (pts.length < 2) {
    return <div className="mchart empty">📈 {t('還沒有市場紀錄:過完第一年,這裡就會畫出各類資產的走勢。')}</div>
  }
  const W = 640, H = 240, L = 44, R = 14, T = 12, B = 28
  const shown = ASSET_ORDER.filter((k) => !off[k])
  const vals = pts.flatMap((p) => shown.map((k) => p[k])).concat(100)
  const lo = Math.min(...vals), hi = Math.max(...vals)
  const span = Math.max(hi - lo, 10)
  const y0 = Math.max(0, lo - span * 0.08), y1 = hi + span * 0.08
  const x = (i) => L + (i / (pts.length - 1)) * (W - L - R)
  const y = (v) => T + (1 - (v - y0) / (y1 - y0)) * (H - T - B)
  const ticks = [0, 1, 2, 3].map((n) => y0 + ((y1 - y0) * n) / 3)
  const cur = pts[sel ?? pts.length - 1]
  const pick = (e) => {
    const r = e.currentTarget.getBoundingClientRect()
    const px = ((e.clientX - r.left) / r.width) * W
    setSel(Math.max(0, Math.min(pts.length - 1, Math.round(((px - L) / (W - L - R)) * (pts.length - 1)))))
  }
  const step = Math.ceil(pts.length / 8)
  return (
    <figure className="mchart">
      <div className="mchart-head">
        <b>📈 {t('各類資產走勢')}</b>
        <small>{t('起點 = 100,點圖看每一年')}</small>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={t('各類資產走勢折線圖')} onPointerDown={pick} onPointerMove={(e) => e.buttons && pick(e)}>
        {ticks.map((v, i) => (
          <g key={i}>
            <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke="var(--line)" />
            <text x={L - 6} y={y(v) + 4} textAnchor="end" fontSize="11" fill="var(--muted)">{Math.round(v)}</text>
          </g>
        ))}
        <line x1={L} x2={W - R} y1={y(100)} y2={y(100)} stroke="var(--muted)" strokeDasharray="1 4" />
        {pts.map((p, i) => (i % step === 0 || i === pts.length - 1 ? (
          <text key={i} x={x(i)} y={H - 8} textAnchor="middle" fontSize="11" fill="var(--muted)">{t('{n}歲', { n: p.age })}</text>
        ) : null))}
        {shown.map((k) => (
          <path key={k} d={pts.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p[k]).toFixed(1)}`).join(' ')} fill="none" stroke={COLORS[k]} strokeWidth="3" strokeDasharray={DASH[k]} strokeLinejoin="round" strokeLinecap="round" />
        ))}
        <line x1={x(cur.i)} x2={x(cur.i)} y1={T} y2={H - B} stroke="var(--ink)" strokeOpacity=".25" />
        {shown.map((k) => <circle key={k} cx={x(cur.i)} cy={y(cur[k])} r="5" fill={COLORS[k]} stroke="var(--surface)" strokeWidth="2" />)}
      </svg>
      <div className="mchart-legend" role="group" aria-label={t('顯示的資產')}>
        {ASSET_ORDER.map((k) => (
          <button key={k} type="button" className={off[k] ? 'off' : ''} aria-pressed={!off[k]} onClick={() => setOff((o) => ({ ...o, [k]: !o[k] }))}>
            <i style={{ background: COLORS[k] }} /> {t(ASSETS[k].name)} <b>{Math.round(cur[k])}</b>
            {cur.ret && <em className={cur.ret[k] >= 0 ? 'up' : 'down'}>{pct(cur.ret[k])}</em>}
          </button>
        ))}
      </div>
      <p className="mchart-note">
        {cur.ret
          ? t('{age} 歲那一年的報酬(標在名稱旁)', { age: cur.age - 1 })
          : t('起點:每類資產都從 100 開始')}
        {' '}{t('過去的漲跌不代表未來;分散配置才能撐過大跌。')}
      </p>
    </figure>
  )
}
