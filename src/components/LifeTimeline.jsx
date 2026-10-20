import { useEffect, useMemo, useRef, useState } from 'react'
import { Play, Pause, RotateCcw, SkipBack } from 'lucide-react'
import { wan } from '../game/format.js'

const KINDS = ['event', 'chance', 'milestone', 'property', 'market']

// 人生時間軸:一年一年回顧發生了什麼事、淨資產怎麼變。可播放、可拖曳。
export default function LifeTimeline({ s }) {
  const hist = s.history
  const [i, setI] = useState(0)
  const [playing, setPlaying] = useState(false)
  const timer = useRef(null)

  useEffect(() => {
    if (!playing) return undefined
    timer.current = setInterval(() => {
      setI((v) => {
        if (v >= hist.length - 1) { setPlaying(false); return v }
        return v + 1
      })
    }, 1100)
    return () => clearInterval(timer.current)
  }, [playing, hist.length])

  const W = 640, H = 150, L = 8, R = 8, T = 14, B = 22
  const geo = useMemo(() => {
    const vals = hist.map((h) => h.netWorth)
    const min = Math.min(0, ...vals), max = Math.max(1, ...vals)
    const x = (k) => L + (hist.length <= 1 ? 0.5 : k / (hist.length - 1)) * (W - L - R)
    const y = (v) => T + (1 - (v - min) / (max - min)) * (H - T - B)
    return { x, y, zero: y(0), path: hist.map((h, k) => `${k ? 'L' : 'M'}${x(k).toFixed(1)},${y(h.netWorth).toFixed(1)}`).join(' ') }
  }, [hist])

  if (!hist.length) return null
  const cur = hist[i]
  const prev = i > 0 ? hist[i - 1].netWorth : s.startNetWorth
  const delta = cur.netWorth - prev
  const events = cur.events.filter((e) => KINDS.includes(e.kind)).slice(0, 5)

  return (
    <section className="card life-timeline">
      <h3>🎞️ 人生時間軸</h3>
      <p className="muted small">一年一年回顧:按播放,看你的人生怎麼走到這裡。也可以拖曳下面的捲軸。</p>
      <svg className="tl-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="淨資產時間軸">
        <line x1={L} x2={W - R} y1={geo.zero} y2={geo.zero} className="tl-zero" />
        <path d={geo.path} className="tl-line" />
        {hist.map((h, k) => (
          <circle key={k} cx={geo.x(k)} cy={geo.y(h.netWorth)} r={k === i ? 7 : 3.2}
            className={`tl-dot ${h.borrowed > 0 ? 'bad' : h.payout > 0 ? 'good' : ''} ${k === i ? 'cur' : ''}`} onClick={() => { setPlaying(false); setI(k) }} />
        ))}
        <text x={geo.x(i)} y={H - 4} textAnchor="middle" className="tl-age">{cur.age} 歲</text>
      </svg>
      <div className="tl-ctl">
        <button className="btn" onClick={() => { setPlaying(false); setI(0) }} aria-label="回到開頭"><SkipBack size={16} aria-hidden /></button>
        <button className="btn primary" onClick={() => { if (i >= hist.length - 1) setI(0); setPlaying((p) => !p) }} aria-label={playing ? '暫停' : '播放'}>
          {playing ? <Pause size={16} aria-hidden /> : <Play size={16} aria-hidden />} {playing ? '暫停' : '播放人生'}
        </button>
        <input type="range" min="0" max={hist.length - 1} value={i} aria-label="年份" onChange={(e) => { setPlaying(false); setI(Number(e.target.value)) }} />
        <button className="btn ghost" onClick={() => { setPlaying(false); setI(hist.length - 1) }} aria-label="跳到結尾"><RotateCcw size={16} aria-hidden style={{ transform: 'scaleX(-1)' }} /></button>
      </div>
      <div className="tl-year" key={i}>
        <div className="tl-age-big">{cur.age}<small>歲</small></div>
        <div className="tl-info">
          <div className="tl-nw">淨資產 <b>{wan(cur.netWorth)}</b> <em className={delta >= 0 ? 'pos' : 'neg'}>{delta >= 0 ? '▲' : '▼'} {wan(Math.abs(delta))}</em></div>
          <ul className="tl-events">
            {events.length ? events.map((e, k) => <li key={k}><span aria-hidden>{e.icon}</span>{e.title}</li>) : <li className="muted">平靜的一年</li>}
          </ul>
          <div className="tl-notes">
            {cur.payout > 0 && <span className="tl-chip good">保險理賠 {wan(cur.payout)}</span>}
            {cur.borrowed > 0 && <span className="tl-chip bad">被迫借款 {wan(cur.borrowed)}</span>}
            {cur.rent > 0 && <span className="tl-chip">租金 {wan(cur.rent)}</span>}
            {cur.forced > 0 && <span className="tl-chip bad">資產被拍賣</span>}
          </div>
        </div>
      </div>
    </section>
  )
}
