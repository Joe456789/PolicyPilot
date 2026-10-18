import { useEffect, useState } from 'react'
const PIPS = {
  1: [[50, 50]],
  2: [[28, 28], [72, 72]],
  3: [[28, 28], [50, 50], [72, 72]],
  4: [[28, 28], [72, 28], [28, 72], [72, 72]],
  5: [[28, 28], [72, 28], [50, 50], [28, 72], [72, 72]],
  6: [[28, 24], [72, 24], [28, 50], [72, 50], [28, 76], [72, 76]],
}


export default function Dice({ value, rolling }) {
  const [face, setFace] = useState(1)
  useEffect(() => {
    if (!rolling) return
    const t = setInterval(() => setFace(1 + Math.floor(Math.random() * 6)), 90)
    return () => clearInterval(t)
  }, [rolling])
  const v = rolling ? face : value || 1
  return (
    <div className={`dice ${rolling ? 'rolling' : ''}`} aria-label={value ? `骰子點數 ${value}` : '骰子'}>
      <svg viewBox="0 0 100 100" width="100%" height="100%">
        <rect x="4" y="4" width="92" height="92" rx="20" fill="#fff" stroke="#d6d3c8" strokeWidth="3" />
        {PIPS[v].map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="8.5" fill="#1f2a37" />
        ))}
      </svg>
    </div>
  )
}
