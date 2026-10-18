import { useEffect, useRef, useState } from 'react'

const HAZ = ['🌪️', '🚗', '🤒', '🔥', '💥']
const DURATION = 15

export default function RiskCatch({ onDone }) {
  const [items, setItems] = useState([])
  const [score, setScore] = useState({ got: 0, missed: 0, bad: 0 })
  const [time, setTime] = useState(DURATION)
  const [started, setStarted] = useState(false)
  const id = useRef(0)
  const done = useRef(false)
  const scoreRef = useRef(score)
  scoreRef.current = score

  useEffect(() => {
    if (!started) return undefined
    const spawn = setInterval(() => {
      const coin = Math.random() < 0.2
      setItems((a) => [...a, { id: ++id.current, x: 6 + Math.random() * 82, y: -8, e: coin ? '💰' : HAZ[Math.floor(Math.random() * HAZ.length)], coin, v: 0.9 + Math.random() * 0.7 }])
    }, 560)
    const move = setInterval(() => {
      setItems((a) => {
        const keep = []
        let missed = 0
        for (const it of a) {
          const y = it.y + it.v
          if (y > 100) { if (!it.coin) missed++ } else keep.push({ ...it, y })
        }
        if (missed) setScore((s) => ({ ...s, missed: s.missed + missed }))
        return keep
      })
    }, 50)
    const clock = setInterval(() => setTime((t) => t - 1), 1000)
    return () => { clearInterval(spawn); clearInterval(move); clearInterval(clock) }
  }, [started])

  useEffect(() => {
    if (started && time <= 0 && !done.current) {
      done.current = true
      const g = scoreRef.current
      const net = g.got - g.bad
      const stars = net >= 13 ? 3 : net >= 8 ? 2 : net >= 3 ? 1 : 0
      setTimeout(() => onDone({ stars, note: `攔截 ${g.got} 個風險,漏掉 ${g.missed} 個,誤點金幣 ${g.bad} 次。` }), 400)
    }
  }, [time, started, onDone])

  function hit(it) {
    setItems((a) => a.filter((x) => x.id !== it.id))
    setScore((s) => (it.coin ? { ...s, bad: s.bad + 1 } : { ...s, got: s.got + 1 }))
  }

  return (
    <div className="mg">
      <div className="mg-bar"><span>⏱ {Math.max(0, time)} 秒</span><span>攔截 {score.got} · 漏掉 {score.missed}</span></div>
      <div className="catch-field" role="group" aria-label="風險攔截區">
        {!started && <button className="btn primary big catch-start" onClick={() => setStarted(true)}>開始!</button>}
        {items.map((it) => (
          <button key={it.id} className={`faller ${it.coin ? 'coin' : ''}`} style={{ left: `${it.x}%`, top: `${it.y}%` }} onPointerDown={() => hit(it)} aria-label={it.coin ? '金幣' : '風險'}>{it.e}</button>
        ))}
      </div>
    </div>
  )
}
