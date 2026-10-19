import { BOARD } from '../game/engine.js'
import Avatar from './Avatar.jsx'

// 2D 備援棋盤:裝置不支援 WebGL 或使用者關閉 3D 時使用。8x8 環形,外圈 28 格。
function coord(i) {
  if (i <= 7) return { r: 0, c: i }
  if (i <= 13) return { r: i - 7, c: 7 }
  if (i <= 21) return { r: 7, c: 21 - i }
  return { r: 28 - i, c: 0 }
}

export default function Board({ tokens, centerSlot, owners = {} }) {
  return (
    <div className="board" role="group" aria-label="遊戲棋盤(2D)">
      {BOARD.map((tile, i) => {
        const { r, c } = coord(i)
        return (
          <div key={i} className={`tile tile-${tile.type} ${tokens.some((t) => t.pos === i && t.active) ? 'is-here' : ''}`} style={{ gridRow: r + 1, gridColumn: c + 1 }}>
            <span className="tile-n">{i === 0 ? '' : i}</span>
            {owners[i] && <span className={`tile-own o${owners[i].ownerIdx}`} title={`Lv${owners[i].level}`}>Lv{owners[i].level}</span>}
            <span className="tile-ico" aria-hidden>{tile.icon}</span>
            <span className="tile-lbl">{tile.label}</span>
          </div>
        )
      })}
      <div className="board-center">
        <div className="center-inner">
          <div className="center-logo">保險大富翁</div>
          {centerSlot}
        </div>
      </div>
      {tokens.map((t, i) => {
        const { r, c } = coord(t.pos)
        return (
          <div key={i} className="token" style={{ gridRow: r + 1, gridColumn: c + 1, transform: `translate(${(i % 2) * 8 - 4}px, ${Math.floor(i / 2) * 8 - 4}px)` }} aria-hidden>
            <Avatar look={t.look} size={36} />
          </div>
        )
      })}
    </div>
  )
}
