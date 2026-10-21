import { useEffect, useRef, useState } from 'react'
import { BOARD } from '../game/engine.js'
import { MAP_PATH, MAP_COLS, MAP_ROWS, groundCells } from '../game/map.js'
import { areaById } from '../game/properties.js'
import Avatar from './Avatar.jsx'
import { t } from '../i18n.js'

// 2D 備援棋盤:裝置不支援 WebGL 或使用者關閉 3D 時使用。和 3D 棋盤共用 map.js 的彎曲路徑;
// 窄螢幕(直立手機)把整張地圖轉 90 度,讓長邊順著螢幕的長邊。
function useNarrow() {
  const [narrow, setNarrow] = useState(() => window.matchMedia('(max-width: 720px)').matches)
  useEffect(() => {
    const m = window.matchMedia('(max-width: 720px)')
    const on = () => setNarrow(m.matches)
    m.addEventListener('change', on)
    return () => m.removeEventListener('change', on)
  }, [])
  return narrow
}

export default function Board({ tokens, centerSlot, owners = {}, onTileClick }) {
  const tall = useNarrow()
  const me = useRef(null)
  const myPos = tokens[0]?.pos
  // 棋盤很大:你的棋子移動後,自動捲到看得見的位置
  useEffect(() => { me.current?.scrollIntoView?.({ block: 'nearest', inline: 'center', behavior: 'smooth' }) }, [myPos])
  const cols = tall ? MAP_ROWS : MAP_COLS
  const rows = tall ? MAP_COLS : MAP_ROWS
  const coord = (i) => {
    const p = MAP_PATH[i]
    return tall ? { r: p.c, c: p.r } : p
  }
  const { inner, bay } = groundCells()
  const ground = [...inner.map((g) => ({ ...g, kind: 'inner' })), ...bay.map((g) => ({ ...g, kind: 'bay' }))]
  return (
    <div className="board-wrap">
      <div className="board-banner">
        <div className="center-logo">{t('保險大富翁')}</div>
        {centerSlot}
      </div>
      <div className="board" role="group" aria-label={t('遊戲棋盤(2D)')} style={{ '--cols': cols, '--rows': rows }}>
        {ground.map((g, k) => {
          const r = tall ? g.c : g.r, c = tall ? g.r : g.c
          return <div key={`g${k}`} className={`ground ground-${g.kind}`} style={{ gridRow: r + 1, gridColumn: c + 1 }} aria-hidden>{g.kind === 'bay' ? '🌳' : ''}</div>
        })}
        {BOARD.map((tile, i) => {
          const { r, c } = coord(i)
          return (
            <div key={i} onClick={() => onTileClick?.(i)} className={`tile tile-${tile.type} ${tokens.some((t) => t.pos === i && t.active) ? 'is-here' : ''}`} style={{ gridRow: r + 1, gridColumn: c + 1, '--area': areaById(tile.area)?.color }}>
              <span className="tile-n">{i === 0 ? '' : i}</span>
              {owners[i] && <span className={`tile-own o${owners[i].ownerIdx}`} title={`Lv${owners[i].level}`}>Lv{owners[i].level}</span>}
              <span className="tile-ico" aria-hidden>{tile.icon}</span>
              <span className="tile-lbl">{t(tile.label)}</span>
            </div>
          )
        })}
        {tokens.map((t, i) => {
          const { r, c } = coord(t.pos)
          return (
            <div key={i} ref={i === 0 ? me : null} className="token" style={{ gridRow: r + 1, gridColumn: c + 1, transform: `translate(${(i % 2) * 8 - 4}px, ${Math.floor(i / 2) * 8 - 4}px)` }} aria-hidden>
              <Avatar look={t.look} size={36} />
            </div>
          )
        })}
      </div>
    </div>
  )
}
