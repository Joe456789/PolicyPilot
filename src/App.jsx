import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Board from './components/Board.jsx'
import Dashboard from './components/Dashboard.jsx'
import PlanModal from './components/PlanModal.jsx'
import SceneModal, { YearModal } from './components/SceneModal.jsx'
import CharacterSelect from './components/CharacterSelect.jsx'
import ResultScreen from './components/ResultScreen.jsx'
import Avatar from './components/Avatar.jsx'
import { CHARACTERS, getCharacter } from './game/characters.js'
import { createGame, roll, choose, endYear, setCoverage, moveMoney, analyzeGaps } from './game/engine.js'
import { advisorFallback } from './game/fallback.js'
import { ai, aiHealth } from './ai.js'

const params = new URLSearchParams(location.search)

export default function App() {
  const [screen, setScreen] = useState('title')
  const [g, setG] = useState(null)
  const [aiInfo, setAiInfo] = useState({ ai: false })
  const [planOpen, setPlanOpen] = useState(false)
  const [rolling, setRolling] = useState(false)
  const [sceneReady, setSceneReady] = useState(false)
  const [yearOpen, setYearOpen] = useState(false)
  const [coach, setCoach] = useState(false)
  const [aiText, setAiText] = useState(null)
  const [loadingAi, setLoadingAi] = useState(false)
  const token = useRef(0)

  useEffect(() => {
    aiHealth().then(setAiInfo)
    const cid = params.get('char')
    if (cid && getCharacter(cid)) start(getCharacter(cid))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const seedFromUrl = () => {
    const v = Number(params.get('seed'))
    return Number.isFinite(v) && params.get('seed') ? v : undefined
  }

  const start = useCallback((char) => {
    const seed = seedFromUrl()
    setG(createGame(char, seed ?? Math.floor(Math.random() * 100000)))
    setScreen('game')
    setPlanOpen(true)
    setYearOpen(false)
    setSceneReady(false)
    setAiText(null)
  }, [])

  // ---- 擲骰 ----
  function onRoll() {
    if (!g || g.phase !== 'plan' || rolling) return
    setRolling(true)
    setSceneReady(false)
    setAiText(null)
    setTimeout(() => {
      const ng = roll(g)
      setG(ng)
      setRolling(false)
      requestAi(ng)
    }, 750)
  }

  async function requestAi(ng) {
    if (!aiInfo.ai || !ng.scene) return
    const my = ++token.current
    setLoadingAi(true)
    let out = null
    if (ng.scene.kind === 'advisor') {
      const r = await ai.advisor(ng.scene.base.analysis, ng)
      out = r ? { story: r.message } : null
    } else if (ng.scene.kind !== 'tip') {
      out = await ai.narrate(ng.scene, ng)
    }
    if (my !== token.current) return
    setLoadingAi(false)
    if (out) setAiText(out)
  }

  const scene = useMemo(() => {
    if (!g?.scene) return null
    const base = g.scene
    if (aiText) {
      const choices =
        aiText.choices && aiText.choices.length === base.choices.length
          ? base.choices.map((c, i) => ({ ...c, label: aiText.choices[i].label || c.label, hint: aiText.choices[i].hint ?? c.hint }))
          : base.choices
      return { ...base, title: aiText.title || base.title, story: aiText.story || base.story, choices }
    }
    if (base.kind === 'advisor') return { ...base, story: `${base.story} ${advisorFallback(base.base.analysis, g.char)}` }
    return base
  }, [g, aiText])

  const onChoose = (i) => setG((cur) => choose(cur, i))

  function onContinue() {
    const ng = endYear(g)
    setG(ng)
    setAiText(null)
    setSceneReady(false)
    if (ng.ended?.reason === 'death') return setScreen('result')
    setYearOpen(true)
  }

  function onYearNext() {
    setYearOpen(false)
    if (g.phase === 'ended') setScreen('result')
  }

  const showScene = scene && ((g.phase === 'scene' && sceneReady) || g.phase === 'result')
  const aiTag = !!aiText

  if (screen === 'title') return <Title aiInfo={aiInfo} onStart={() => setScreen('select')} />
  if (screen === 'select') return <CharacterSelect aiOn={aiInfo.ai} onPick={start} onBack={() => setScreen('title')} />
  if (!g) return null
  if (screen === 'result')
    return (
      <ResultScreen
        s={g}
        aiOn={aiInfo.ai}
        onAgain={() => start(g.char)}
        onChange={() => setScreen('select')}
      />
    )

  return (
    <div className="game">
      <header className="topbar">
        <div className="brand"><span aria-hidden>🎲</span> 保險大富翁</div>
        <div className="topbar-r">
          <span className={`ai-pill ${aiInfo.ai ? '' : 'dim'}`} title={aiInfo.ai ? `Gemini(${aiInfo.model})` : '未設定金鑰,使用內建題庫與規則式教練'}>
            {aiInfo.ai ? (aiInfo.mock ? '✨ AI(模擬)' : '✨ AI 已連線') : '離線備援模式'}
          </span>
          <label className="switch">
            <input type="checkbox" checked={coach} onChange={(e) => setCoach(e.target.checked)} />
            <span>教練提示</span>
          </label>
          <button className="btn ghost" onClick={() => setScreen('select')}>換角色</button>
        </div>
      </header>

      <main className="layout">
        <section className="stage">
          <Board
            pos={g.pos}
            dice={g.dice}
            rolling={rolling}
            look={g.char.avatar}
            turnKey={g.turn + ':' + g.dice}
            onWalkDone={() => setSceneReady(true)}
            centerSlot={
              <div className="center-actions">
                <button className="btn primary big" onClick={onRoll} disabled={g.phase !== 'plan' || rolling || planOpen} aria-label="擲骰子">
                  {rolling ? '擲骰中…' : '🎲 擲骰子'}
                </button>
                <button className="btn" onClick={() => setPlanOpen(true)} disabled={g.phase !== 'plan' || rolling}>🛡️ 年度規劃</button>
              </div>
            }
          />
          <Timeline s={g} />
        </section>
        <Dashboard s={g} />
      </main>

      {planOpen && (
        <PlanModal
          s={g}
          coach={coach}
          title={g.turn === 0 ? `開局規劃:${g.char.name}` : `第 ${g.turn + 1} 年規劃`}
          onCoverage={(id, t) => setG((c) => setCoverage(c, id, t))}
          onMove={(d) => setG((c) => moveMoney(c, d))}
          onClose={() => setPlanOpen(false)}
        />
      )}
      {showScene && (
        <SceneModal scene={scene} phase={g.phase} onChoose={onChoose} onContinue={onContinue} aiTag={aiTag} loadingAi={loadingAi} />
      )}
      {yearOpen && <YearModal s={g} onNext={onYearNext} last={g.phase === 'ended'} />}
    </div>
  )
}

function Timeline({ s }) {
  const items = s.history.flatMap((h) => h.events.filter((e) => e.kind === 'event').map((e) => ({ age: h.age, ...e })))
  if (!items.length) return <div className="timeline empty">人生足跡:還沒發生大事。保障要在事情發生「之前」準備好。</div>
  return (
    <div className="timeline" aria-label="人生足跡">
      <b>人生足跡</b>
      {items.map((e, i) => (
        <span key={i} className="tl-item"><i>{e.age}歲</i> {e.icon} {e.title}</span>
      ))}
    </div>
  )
}

function Title({ aiInfo, onStart }) {
  const preview = [CHARACTERS[0], CHARACTERS[2], CHARACTERS[3], CHARACTERS[4]]
  return (
    <div className="screen title">
      <div className="title-card">
        <div className="title-badge">Cardif InsurHack 2026 · 題目 1-1</div>
        <h1>保險大富翁</h1>
        <p className="title-sub">財務人生模擬遊戲 · Financial Life Simulator</p>
        <p className="title-desc">
          擲骰子、抽事件卡,在不同的人生與市場情境中,體驗風險管理、資產配置與保險保障的重要性。
          <br />
          遊戲的劇情由 AI 依角色處境即時編寫,金額與保險給付由規則引擎精算,結果公平可驗證。
        </p>
        <div className="title-avatars">
          {preview.map((c) => (
            <div key={c.id} className="ta"><Avatar look={c.avatar} size={72} title={c.name} /><span>{c.name}</span></div>
          ))}
        </div>
        <button className="btn primary huge" onClick={onStart}>開始遊戲</button>
        <ol className="how">
          <li><b>1 規劃</b>替主角配置保障與投資</li>
          <li><b>2 擲骰</b>走到事件、行情或理專格</li>
          <li><b>3 面對</b>醫療、失能、市場起伏…</li>
          <li><b>4 結算</b>看平行人生對照與教練回饋</li>
        </ol>
        <div className={`ai-pill ${aiInfo.ai ? '' : 'dim'}`}>{aiInfo.ai ? '✨ AI 編劇與教練已連線' : '離線備援模式(使用內建題庫)'}</div>
      </div>
    </div>
  )
}
