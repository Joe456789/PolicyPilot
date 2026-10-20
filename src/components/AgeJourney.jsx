import { useEffect, useRef, useState } from 'react'
import { FastForward } from 'lucide-react'
import Avatar from './Avatar.jsx'
import { sfx } from '../sfx.js'

const STAGES = [
  { max: 2, cls: 'baby', name: '嬰兒期', icons: ['🍼', '🧸', '🌙', '⭐'] },
  { max: 5, cls: 'toddler', name: '幼兒園', icons: ['🎈', '🧸', '🎨', '🚲'] },
  { max: 11, cls: 'kid', name: '小學', icons: ['🎒', '✏️', '⚽', '📚'] },
  { max: 14, cls: 'teen', name: '國中', icons: ['📱', '🎮', '📚', '🏀'] },
  { max: 17, cls: 'hs', name: '高中職', icons: ['🏫', '🎤', '🛵', '☕'] },
  { max: 21, cls: 'uni', name: '大學', icons: ['🎓', '💻', '🍜', '🧳'] },
  { max: 99, cls: 'work', name: '踏入社會', icons: ['💼', '🏙️', '💰', '🛡️'] },
]
const stageOf = (a) => STAGES.find((s) => a <= s.max)
// 小孩小一點、大人大一點(同一個角色隨著年齡長大)
const sizeOf = (a) => Math.round(70 + Math.min(a, 22) * 4.2)

// 成長動畫:年齡一歲一歲跳上去,角色長大,最後帶出這一年的情境插圖(約 2~3 秒,可以點一下跳過)
export default function AgeJourney({ from, to, look, art, icon, title, onDone }) {
  const reduce = typeof document !== 'undefined' && document.documentElement.dataset.motion === 'reduce'
  const total = reduce ? 600 : Math.min(3400, 1500 + (to - from) * 260)
  const [age, setAge] = useState(from)
  const [t, setT] = useState(0)
  const done = useRef(false)
  const last = useRef(Math.round(from))

  useEffect(() => {
    const t0 = performance.now()
    let raf
    const tick = (now) => {
      const k = Math.min(1, (now - t0) / total)
      const countK = Math.min(1, k / 0.62)
      const e = 1 - Math.pow(1 - countK, 2.2)
      const a = from + (to - from) * e
      setAge(a)
      setT(k)
      const r = Math.round(a)
      if (r !== last.current) { last.current = r; sfx.step() }
      if (k < 1) raf = requestAnimationFrame(tick)
      else if (!done.current) { done.current = true; setTimeout(onDone, reduce ? 0 : 250) }
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const a = Math.round(age)
  const st = stageOf(a)
  const skip = () => { if (!done.current) { done.current = true; onDone() } }
  const showScene = t > 0.62

  return (
    <div className={`journey stage-${st.cls}`} role="dialog" aria-label="成長動畫" onClick={skip}>
      <div className="journey-icons" aria-hidden>
        {st.icons.map((ic, i) => <span key={`${st.cls}-${i}`} style={{ left: `${12 + i * 24}%`, animationDelay: `${i * 0.35}s` }}>{ic}</span>)}
      </div>
      <div className="journey-main">
        <div className="journey-stage">{st.name}</div>
        <div className="journey-age"><b>{a}</b><small>歲</small></div>
        <div className="journey-avatar" style={{ width: sizeOf(age), height: sizeOf(age) }}><Avatar look={look} size={sizeOf(age)} ring={false} /></div>
        <div className="journey-bar"><i style={{ width: `${Math.min(100, (age / 22) * 100)}%` }} /></div>
        {showScene && (
          <div className="journey-scene">
            {art ? <img src={art} alt="" /> : <span className="journey-emoji" aria-hidden>{icon}</span>}
            <b>{title}</b>
          </div>
        )}
      </div>
      <button className="journey-skip" onClick={(e) => { e.stopPropagation(); skip() }}><FastForward size={14} aria-hidden /> 跳過</button>
    </div>
  )
}
