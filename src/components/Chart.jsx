import { wan } from '../game/format.js'

// 平行人生折線圖:三條線使用相同的事件序列,只有保障配置不同。
export default function Chart({ data }) {
  if (!data.length) return null
  const W = 640, H = 300, L = 54, R = 16, T = 16, B = 34
  const xs = data.map((d) => d.age)
  const all = data.flatMap((d) => [d.none, d.yours, d.rec, 0])
  const min = Math.min(...all), max = Math.max(...all)
  const span = Math.max(max - min, 1)
  const rough = span / 4
  const mag = Math.pow(10, Math.floor(Math.log10(rough)))
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= rough) || mag * 10
  const y0 = Math.floor((min - span * 0.04) / step) * step
  const y1 = Math.ceil((max + span * 0.04) / step) * step
  const tickVals = []
  for (let v = y0; v <= y1 + 1e-6; v += step) tickVals.push(v)
  const x = (a) => L + ((a - xs[0]) / Math.max(1, xs[xs.length - 1] - xs[0])) * (W - L - R)
  const y = (v) => T + (1 - (v - y0) / (y1 - y0)) * (H - T - B)
  const path = (k) => data.map((d, i) => `${i ? 'L' : 'M'}${x(d.age).toFixed(1)},${y(d[k]).toFixed(1)}`).join(' ')
  const last = data[data.length - 1]
  const series = [
    { k: 'none', color: '#e5484d', name: '完全沒保險', dash: '6 5' },
    { k: 'yours', color: '#3b82f6', name: '你的配置', dash: '' },
    { k: 'rec', color: '#00915a', name: '建議配置', dash: '' },
  ]
  return (
    <figure className="chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="平行人生現金緩衝折線圖">
        {tickVals.map((v, i) => (
          <g key={i}>
            <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke="#e7e2d4" />
            <text x={L - 8} y={y(v) + 4} textAnchor="end" fontSize="11" fill="#6b7280">{wan(v, 0)}</text>
          </g>
        ))}
        {min < 0 && <line x1={L} x2={W - R} y1={y(0)} y2={y(0)} stroke="#9ca3af" strokeDasharray="2 3" />}
        {data.map((d, i) => (i % Math.ceil(data.length / 8) === 0 ? (
          <text key={i} x={x(d.age)} y={H - 10} textAnchor="middle" fontSize="11" fill="#6b7280">{d.age}歲</text>
        ) : null))}
        {series.map((s) => (
          <path key={s.k} d={path(s.k)} fill="none" stroke={s.color} strokeWidth="3" strokeDasharray={s.dash} strokeLinejoin="round" strokeLinecap="round" />
        ))}
        {series.map((s) => (
          <circle key={s.k} cx={x(last.age)} cy={y(last[s.k])} r="5" fill={s.color} stroke="#fff" strokeWidth="2" />
        ))}
      </svg>
      <figcaption className="legend">
        {series.map((s) => (
          <span key={s.k}><i style={{ background: s.color }} /> {s.name}:<b>{wan(last[s.k])}</b></span>
        ))}
      </figcaption>
    </figure>
  )
}
