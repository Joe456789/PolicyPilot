import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { BoardScene } from '../three/BoardScene.js'
import { BOARD } from '../game/engine.js'
import { loadArt } from '../art.js'
import { t, useLang, getLang } from '../i18n.js'

// React 包裝:把 3D 場景的動作(擲骰、移動、聚焦)以 Promise 介面交給 App 編排。
const Board3D = forwardRef(function Board3D({ players, owners, onFail, onStep }, ref) {
  useLang()
  const host = useRef(null)
  const scene = useRef(null)
  const latest = useRef({ players, onStep })
  latest.current = { players, onStep, owners }
  // 3D 畫風(設定面板切換時重建場景,棋子位置沿用目前的)
  const [style, setStyle] = useState(() => document.documentElement.dataset.scene3d || 'real')
  useEffect(() => {
    const on = (e) => setStyle(e.detail)
    window.addEventListener('pp-scene3d', on)
    return () => window.removeEventListener('pp-scene3d', on)
  }, [])

  useEffect(() => {
    let sc
    try {
      sc = new BoardScene(host.current, BOARD, { style })
    } catch (e) {
      console.warn('3D 初始化失敗,改用 2D 棋盤', e) // i18n-ignore
      onFail?.()
      return undefined
    }
    scene.current = sc
    sc.onStep = (pos, i) => latest.current.onStep?.(pos, i)
    sc.setPlayers(latest.current.players.map((p) => ({ look: p.look, name: p.name, pos: p.pos })))
    sc.overview()
    sc.setOwners(latest.current.owners || {})
    // 地產格貼上 Gemini 插圖(有圖才貼,沒有就維持表情符號)
    loadArt().then((m) => {
      const map = {}
      BOARD.forEach((tile, i) => { if (tile.prop && m['prop_' + tile.prop]) map[i] = `/art/${m['prop_' + tile.prop]}` })
      if (Object.keys(map).length) sc.setArt(map)
    })
    return () => { sc.dispose(); scene.current = null }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [style])

  // 語言切換:用新語言重畫格子貼圖與出售牌
  const lang = getLang()
  const builtLang = useRef(lang)
  useEffect(() => {
    if (builtLang.current === lang) return
    builtLang.current = lang
    scene.current?.refreshLabels?.()
  }, [lang])

  const ownersSig = JSON.stringify(owners || {})
  useEffect(() => { scene.current?.setOwners(owners || {}) }, [ownersSig]) // eslint-disable-line react-hooks/exhaustive-deps

  useImperativeHandle(ref, () => ({
    rollDice: (v) => scene.current?.rollDice(v) ?? Promise.resolve(),
    hideDice: () => scene.current?.hideDice() ?? Promise.resolve(),
    moveToken: (i, pos) => scene.current?.moveToken(i, pos) ?? Promise.resolve(),
    focus: (i) => scene.current?.focusPlayer(i),
    overview: () => scene.current?.overview(),
    teleport: (i, pos) => scene.current?.teleport(i, pos),
    setActiveTile: (pos) => scene.current?.setActiveTile(pos),
    intro: () => scene.current?.playIntro() ?? Promise.resolve(),
    resetPlayers: (ps) => {
      scene.current?.setPlayers(ps.map((p) => ({ look: p.look, name: p.name, pos: p.pos })))
    },
  }))

  return <div className="board3d" ref={host} role="img" aria-label={t('3D 遊戲棋盤')} />
})

export default Board3D
