import { useEffect, useRef, useState } from 'react'
import { BOARD } from '../game/engine.js'
import Avatar from './Avatar.jsx'
import Dice from './Dice.jsx'

// 8x8 環形棋盤:外圈 28 格,中間 6x6 放骰子與提示。
const N = 8
function coord(i) {
  if (i <= 7) return { r: 0, c: i }
  if (i <= 13) return { r: i - 7, c: 7 }
  if (i <= 21) return { r: 7, c: 21 - i }
  return { r: 28 - i, c: 0 }
}

export default function Board({ pos, dice, rolling, look, centerSlot, onWalkDone, turnKey }) {
  const [shown, setShown] = useState(pos)
  const prev = useRef(pos)
  const cb = useRef(onWalkDone)
  cb.current = onWalkDone

  useEffect(() => {
    if (pos === prev.current) return
    let cur = prev.current
    const steps = (pos - cur + BOARD.length) % BOARD.length
    let n = 0
    const timer = setInterval(() => {
      n++
      cur = (cur + 1) % BOARD.length
      setShown(cur)
      if (n >= steps) {
        clearInterval(timer)
        prev.current = pos
        setTimeout(() => cb.current && cb.current(), 260)
      }
    }, 190)
    return () => clearInterval(timer)
  }, [pos, turnKey])

  const t = coord(shown)
  return (
    <div className="board" role="group" aria-label="遊戲棋盤">
      {BOARD.map((tile, i) => {
        const { r, c } = coord(i)
        return (
          <div
            key={i}
            className={`tile tile-${tile.type} ${i === shown ? 'is-here' : ''}`}
            style={{ gridRow: r + 1, gridColumn: c + 1 }}
          >
            <span className="tile-n">{i === 0 ? '' : i}</span>
            <span className="tile-ico" aria-hidden>{tile.icon}</span>
            <span className="tile-lbl">{tile.label}</span>
          </div>
        )
      })}
      <div className="board-center">
        <div className="center-inner">
          <div className="center-logo">保險大富翁</div>
          <Dice value={dice} rolling={rolling} />
          {centerSlot}
        </div>
      </div>
      <div
        key={shown}
        className="token"
        style={{ gridRow: t.r + 1, gridColumn: t.c + 1 }}
        aria-hidden
      >
        <Avatar look={look} size={44} />
      </div>
    </div>
  )
}
