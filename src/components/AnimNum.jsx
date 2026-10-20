import { useEffect, useRef, useState } from 'react'

// 數字跳動:數值改變時平滑滾動到新數字,並閃一下顏色、浮出增減量(像手遊的傷害數字)。
export default function AnimNum({ value, format = (v) => String(Math.round(v)), delta = true, deltaFormat }) {
  const [shown, setShown] = useState(value)
  const [pop, setPop] = useState(null)
  const from = useRef(value)
  const raf = useRef(0)
  const first = useRef(true)

  useEffect(() => {
    if (first.current) { first.current = false; from.current = value; setShown(value); return undefined }
    const a = from.current
    const d = value - a
    if (!d) return undefined
    const reduce = document.documentElement.dataset.motion === 'reduce'
    const t0 = performance.now()
    const dur = reduce ? 0 : 650
    cancelAnimationFrame(raf.current)
    const tick = (now) => {
      const k = dur ? Math.min(1, (now - t0) / dur) : 1
      const e = 1 - Math.pow(1 - k, 3)
      setShown(a + d * e)
      if (k < 1) raf.current = requestAnimationFrame(tick)
      else from.current = value
    }
    raf.current = requestAnimationFrame(tick)
    if (delta) {
      const id = Math.random()
      setPop({ id, d })
      const t = setTimeout(() => setPop((p) => (p && p.id === id ? null : p)), 1300)
      return () => { clearTimeout(t); cancelAnimationFrame(raf.current); from.current = value }
    }
    return () => { cancelAnimationFrame(raf.current); from.current = value }
  }, [value]) // eslint-disable-line react-hooks/exhaustive-deps

  const fmt = deltaFormat || format
  return (
    <span className={`animnum ${pop ? (pop.d > 0 ? 'bump-up' : 'bump-down') : ''}`}>
      {format(shown)}
      {pop && <i key={pop.id} className={`animnum-d ${pop.d > 0 ? 'up' : 'down'}`}>{pop.d > 0 ? '+' : '-'}{fmt(Math.abs(pop.d))}</i>}
    </span>
  )
}
