import { useEffect, useRef, useState } from 'react'
import Avatar from './Avatar.jsx'
import { wan } from '../game/format.js'

// 即時排名:你和電腦對手,同一個棋盤、各自的人生。
export function Leaderboard({ rows, activeId }) {
  const prev = useRef({})
  useEffect(() => { prev.current = Object.fromEntries(rows.map((r) => [r.id, r.rank])) })
  return (
    <section className="panel board-rank" aria-label="即時排名">
      <h3>🏁 即時排名</h3>
      <ol>
        {rows.map((r) => {
          const was = prev.current[r.id]
          const delta = was && was !== r.rank ? (was > r.rank ? '▲' : '▼') : ''
          return (
            <li key={r.id} className={`${r.human ? 'me' : ''} ${r.id === activeId ? 'active' : ''} ${r.dead || r.bankrupt ? 'dead' : ''}`}>
              <b className="rk">{r.rank}</b>
              <Avatar look={r.look} size={34} ring={false} />
              <div className="rk-t">
                <div className="rk-n">{r.name}{r.human && <em>你</em>}{delta && <i className={delta === '▲' ? 'up' : 'down'}>{delta}</i>}</div>
                <div className="rk-s">{r.bankrupt ? '💥 破產出局' : r.dead ? '已退場' : `${r.age} 歲 · 淨資產 ${wan(r.net)}`}</div>
              </div>
              <div className="rk-sc">{r.total}<small>分</small></div>
            </li>
          )
        })}
      </ol>
    </section>
  )
}

export function QuestPanel({ quests }) {
  return (
    <section className="panel" aria-label="人生任務">
      <h3>🎯 人生任務</h3>
      <ul className="quests">
        {quests.map((q) => (
          <li key={q.id} className={q.done ? 'done' : ''}>
            <span className="q-ico" aria-hidden>{q.done ? '✅' : q.icon}</span>
            <div className="q-t">
              <div className="q-n">{q.title}</div>
              <div className="q-bar"><i style={{ width: `${(q.value / q.target) * 100}%` }} /></div>
            </div>
            <span className="q-v">{q.done ? '達成' : `${q.value}/${q.target}`}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}

export function Feed({ items }) {
  if (!items.length) return null
  return (
    <section className="panel feed" aria-label="對手動態" aria-live="polite">
      <h3>📣 對手動態</h3>
      <ul>
        {items.slice(0, 6).map((f) => (
          <li key={f.id} className={f.tone}>
            <span aria-hidden>{f.icon}</span>
            <span><b>{f.who}</b> {f.text}{f.ai && <em className="ai-mark" title="Gemini 即時生成"> ✨</em>}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}

// 浮動金額(像手機遊戲的 +300 萬 / -50 萬)
export function Popups({ items }) {
  return (
    <div className="popups" aria-hidden>
      {items.map((p) => (
        <div key={p.id} className={`popup ${p.kind}`} style={{ left: `${p.x}%` }}>{p.text}</div>
      ))}
    </div>
  )
}

export function Toast({ toast }) {
  if (!toast) return null
  return (
    <div className={`toast ${toast.tone || ''}`} role="status">
      <span className="toast-i" aria-hidden>{toast.icon}</span>
      <div><b>{toast.title}</b>{toast.text && <div className="toast-s">{toast.text}</div>}</div>
    </div>
  )
}

export function Confetti({ burst }) {
  const ref = useRef(null)
  useEffect(() => {
    if (!burst) return undefined
    const c = ref.current
    const ctx = c.getContext('2d')
    c.width = c.clientWidth * 2
    c.height = c.clientHeight * 2
    const colors = ['#00915a', '#ffd166', '#ff6b57', '#3b82f6', '#a855f7', '#ec4899']
    const ps = Array.from({ length: 140 }, () => ({
      x: c.width / 2 + (Math.random() - 0.5) * 200, y: c.height * 0.35, vx: (Math.random() - 0.5) * 22, vy: -Math.random() * 22 - 6,
      w: 8 + Math.random() * 10, h: 5 + Math.random() * 8, r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4, color: colors[Math.floor(Math.random() * colors.length)],
    }))
    let raf, n = 0
    const tick = () => {
      ctx.clearRect(0, 0, c.width, c.height)
      ps.forEach((p) => {
        p.vy += 0.55; p.x += p.vx; p.y += p.vy; p.r += p.vr
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.color; ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); ctx.restore()
      })
      if (++n < 150) raf = requestAnimationFrame(tick)
      else ctx.clearRect(0, 0, c.width, c.height)
    }
    tick()
    return () => cancelAnimationFrame(raf)
  }, [burst])
  return <canvas ref={ref} className="confetti" aria-hidden />
}

export function Drawer({ open, onClose, title, children }) {
  if (!open) return null
  return (
    <div className="drawer-wrap" onClick={onClose}>
      <div className="drawer" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={title}>
        <header><b>{title}</b><button className="btn ghost" onClick={onClose}>關閉</button></header>
        <div className="drawer-body">{children}</div>
      </div>
    </div>
  )
}

export function useMedia(q) {
  const [m, setM] = useState(() => window.matchMedia(q).matches)
  useEffect(() => {
    const mm = window.matchMedia(q)
    const f = () => setM(mm.matches)
    mm.addEventListener('change', f)
    return () => mm.removeEventListener('change', f)
  }, [q])
  return m
}
