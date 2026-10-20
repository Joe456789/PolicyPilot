import { useEffect, useMemo, useState } from 'react'
import { t } from '../../i18n.js'

const PAIRS = [
  ['🏥 住院手術', '🩺 醫療險'], // i18n-ignore 顯示時用 t()
  ['🚗 車禍受傷', '🚑 意外險'], // i18n-ignore 顯示時用 t()
  ['🌪️ 颱風淹水', '🏠 住宅火險'], // i18n-ignore 顯示時用 t()
  ['🦽 無法工作', '💼 失能險'], // i18n-ignore 顯示時用 t()
  ['🎗️ 確診癌症', '🎗️ 重大傷病險'], // i18n-ignore 顯示時用 t()
  ['👨‍👩‍👧 家人失去依靠', '🛡️ 壽險'], // i18n-ignore 顯示時用 t()
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
      const timer = setTimeout(() => onDone({ stars, note: t('你用了 {moves} 次翻牌完成配對。', { moves }) }), 900)
      return () => clearTimeout(timer)
    }
    return undefined
  }, [matched, moves, onDone])

  return (
    <div className="mg">
      <div className="mg-bar"><span>{t('翻牌 {n} 次', { n: moves })}</span><span>{t('已配對 {n} / {m}', { n: matched.length, m: PAIRS.length })}</span></div>
      <div className="mem-grid">
        {cards.map((c, i) => {
          const open = flipped.includes(i) || matched.includes(c.pair)
          return (
            <button key={c.id} className={`mem ${open ? 'open' : ''} ${matched.includes(c.pair) ? 'ok' : ''} ${c.kind}`} onClick={() => flip(i)} aria-label={open ? t(c.text) : t('未翻開的牌')}>
              <span className="mem-back" aria-hidden>❓</span>
              <span className="mem-front">{t(c.text)}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
