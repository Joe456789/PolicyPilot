import { useEffect, useMemo, useState } from 'react'

const PAIRS = [
  ['🏥 住院手術', '🩺 醫療險'],
  ['🚗 車禍受傷', '🚑 意外險'],
  ['🌪️ 颱風淹水', '🏠 住宅火險'],
  ['🦽 無法工作', '💼 失能險'],
  ['🎗️ 確診癌症', '🎗️ 重大傷病險'],
  ['👨‍👩‍👧 家人失去依靠', '🛡️ 壽險'],
]

function shuffle(a) {
  const r = [...a]
  for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [r[i], r[j]] = [r[j], r[i]] }
  return r
}

export default function MemoryMatch({ onDone }) {
  const cards = useMemo(() => shuffle(PAIRS.flatMap(([a, b], i) => [{ id: `a${i}`, pair: i, text: a, kind: 'risk' }, { id: `b${i}`, pair: i, text: b, kind: 'ins' }])), [])
  const [flipped, setFlipped] = useState([])
  const [matched, setMatched] = useState([])
  const [moves, setMoves] = useState(0)
  const [lock, setLock] = useState(false)

  function flip(i) {
    if (lock || flipped.includes(i) || matched.includes(cards[i].pair)) return
    const next = [...flipped, i]
    setFlipped(next)
    if (next.length === 2) {
      setMoves((m) => m + 1)
      setLock(true)
      const [x, y] = next.map((k) => cards[k])
      if (x.pair === y.pair && x.kind !== y.kind) {
        setTimeout(() => { setMatched((m) => [...m, x.pair]); setFlipped([]); setLock(false) }, 450)
      } else {
        setTimeout(() => { setFlipped([]); setLock(false) }, 800)
      }
    }
  }

  useEffect(() => {
    if (matched.length === PAIRS.length) {
      const stars = moves <= 12 ? 3 : moves <= 17 ? 2 : 1
      const t = setTimeout(() => onDone({ stars, note: `你用了 ${moves} 次翻牌完成配對。` }), 900)
      return () => clearTimeout(t)
    }
    return undefined
  }, [matched, moves, onDone])

  return (
    <div className="mg">
      <div className="mg-bar"><span>翻牌 {moves} 次</span><span>已配對 {matched.length} / {PAIRS.length}</span></div>
      <div className="mem-grid">
        {cards.map((c, i) => {
          const open = flipped.includes(i) || matched.includes(c.pair)
          return (
            <button key={c.id} className={`mem ${open ? 'open' : ''} ${matched.includes(c.pair) ? 'ok' : ''} ${c.kind}`} onClick={() => flip(i)} aria-label={open ? c.text : '未翻開的牌'}>
              <span className="mem-back" aria-hidden>❓</span>
              <span className="mem-front">{c.text}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
