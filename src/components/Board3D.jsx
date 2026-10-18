import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import { BoardScene } from '../three/BoardScene.js'
import { BOARD } from '../game/engine.js'

// React 包裝:把 3D 場景的動作(擲骰、移動、聚焦)以 Promise 介面交給 App 編排。
const Board3D = forwardRef(function Board3D({ players, onFail, onStep }, ref) {
  const host = useRef(null)
  const scene = useRef(null)
  const latest = useRef({ players, onStep })
  latest.current = { players, onStep }

  useEffect(() => {
    let sc
    try {
      sc = new BoardScene(host.current, BOARD)
    } catch (e) {
      console.warn('3D 初始化失敗,改用 2D 棋盤', e)
      onFail?.()
      return undefined
    }
    scene.current = sc
    sc.onStep = (pos, i) => latest.current.onStep?.(pos, i)
    sc.setPlayers(latest.current.players.map((p) => ({ look: p.look, name: p.name, pos: p.pos })))
    sc.focusPlayer(0)
    return () => { sc.dispose(); scene.current = null }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useImperativeHandle(ref, () => ({
    rollDice: (v) => scene.current?.rollDice(v) ?? Promise.resolve(),
    hideDice: () => scene.current?.hideDice() ?? Promise.resolve(),
    moveToken: (i, pos) => scene.current?.moveToken(i, pos) ?? Promise.resolve(),
    focus: (i) => scene.current?.focusPlayer(i),
    teleport: (i, pos) => scene.current?.teleport(i, pos),
    setActiveTile: (pos) => scene.current?.setActiveTile(pos),
    resetPlayers: (ps) => {
      scene.current?.setPlayers(ps.map((p) => ({ look: p.look, name: p.name, pos: p.pos })))
    },
  }))

  return <div className="board3d" ref={host} role="img" aria-label="3D 遊戲棋盤" />
})

export default Board3D
