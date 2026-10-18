import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Board from './components/Board.jsx'
import Dashboard from './components/Dashboard.jsx'
import PlanModal from './components/PlanModal.jsx'
import SceneModal, { YearModal, StageModal } from './components/SceneModal.jsx'
import CharacterCreator from './components/CharacterCreator.jsx'
import ResultScreen from './components/ResultScreen.jsx'
import Avatar from './components/Avatar.jsx'
import { defaultLook, LOOKS } from './game/careers.js'
import {
  createGame, roll, choose, endYear, setCoverage, trade, borrow, repay, ackStage, buildStageReport,
} from './game/engine.js'
import { advisorFallback, stageFallback } from './game/fallback.js'
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
  const [stage, setStage] = useState(null)
  const token = useRef(0)

  useEffect(() => {
    aiHealth().then(setAiInfo)
    if (params.get('auto')) {
      start({
        name: params.get('name') || '小明',
        look: { ...defaultLook(), top: LOOKS.tops[1] },
        career: params.get('career') || 'office',
        background: params.get('bg') || 'normal',
        style: params.get('style') || 'steady',
        length: params.get('len') || 'standard',
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const start = useCallback((setup) => {
    const raw = params.get('seed')
    const seed = raw && Number.isFinite(Number(raw)) ? Number(raw) : Math.floor(Math.random() * 100000)
    setG(createGame(setup, seed))
    setScreen('game')
    setPlanOpen(true)
    setYearOpen(false)
    setSceneReady(false)
    setAiText(null)
    setStage(null)
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
    const sc = ng.scene
    if (!aiInfo.ai || !sc || !(sc.aiable || sc.kind === 'advisor')) return
    const my = ++token.current
    setLoadingAi(true)
    let out = null
    if (sc.kind === 'advisor') {
      const r = await ai.advisor(sc.base.analysis, ng)
      out = r ? { story: r.message } : null
    } else {
      out = await ai.narrate(sc, ng)
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
    if (base.kind === 'advisor') return { ...base, story: `${base.story} ${advisorFallback(base.base.analysis, g.player)}` }
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

  async function openStage(cur) {
    const report = buildStageReport(cur)
    setStage({ loading: true, data: null, fromAi: false })
    const out = aiInfo.ai ? await ai.stage(report) : null
    setStage({ loading: false, data: out || stageFallback(report), fromAi: !!out })
  }

  function onYearNext() {
    setYearOpen(false)
    if (g.phase === 'ended') return setScreen('result')
    if (g.pendingStage) openStage(g)
  }

  function closeStage() {
    setStage(null)
    setG((cur) => ackStage(cur))
  }

  const showScene = scene && ((g.phase === 'scene' && sceneReady) || g.phase === 'result')

  if (screen === 'title') return <Title aiInfo={aiInfo} onStart={() => setScreen('create')} />
  if (screen === 'create') return <CharacterCreator onStart={start} onBack={() => setScreen('title')} />
  if (!g) return null
  if (screen === 'result') return <ResultScreen s={g} aiOn={aiInfo.ai} onAgain={() => setScreen('create')} />

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
          <button className="btn ghost" onClick={() => setScreen('create')}>重新開始</button>
        </div>
      </header>

      <main className="layout">
        <section className="stage">
          <Board
            pos={g.pos}
            dice={g.dice}
            rolling={rolling}
            look={g.player.look}
            turnKey={g.turn + ':' + g.dice}
            onWalkDone={() => setSceneReady(true)}
            centerSlot={
              <div className="center-actions">
                <div className="center-year">{g.age} 歲 · 第 {Math.min(g.turn + 1, g.years)} / {g.years} 年</div>
                <button className="btn primary big" onClick={onRoll} disabled={g.phase !== 'plan' || rolling || planOpen || !!stage} aria-label="擲骰子">
                  {rolling ? '擲骰中…' : '🎲 擲骰子'}
                </button>
                <button className="btn" onClick={() => setPlanOpen(true)} disabled={g.phase !== 'plan' || rolling}>🛡️ 規劃與理財</button>
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
          title={g.turn === 0 ? `開局規劃:${g.player.name} · 22 歲` : `${g.age} 歲 · 年度規劃`}
          onCoverage={(id, t) => setG((c) => setCoverage(c, id, t))}
          onTrade={(cls, d) => setG((c) => trade(c, cls, d))}
          onBorrow={(a) => setG((c) => borrow(c, a))}
          onRepay={(a) => setG((c) => repay(c, a))}
          onClose={() => setPlanOpen(false)}
        />
      )}
      {showScene && (
        <SceneModal scene={scene} phase={g.phase} onChoose={onChoose} onContinue={onContinue} aiTag={!!aiText} loadingAi={loadingAi} />
      )}
      {yearOpen && <YearModal s={g} onNext={onYearNext} last={g.phase === 'ended'} />}
      {stage && <StageModal data={stage.data} fromAi={stage.fromAi} loading={stage.loading} onClose={closeStage} age={g.age} />}
    </div>
  )
}

function Timeline({ s }) {
  const items = s.history.flatMap((h) =>
    h.events.filter((e) => ['event', 'milestone'].includes(e.kind)).map((e) => ({ age: h.age, ...e })),
  )
  if (!items.length) return <div className="timeline empty">人生足跡:還沒發生大事。保障要在事情發生「之前」準備好。</div>
  return (
    <div className="timeline" aria-label="人生足跡">
      <b>人生足跡</b>
      {items.map((e, i) => (
        <span key={i} className={`tl-item ${e.kind}`}><i>{e.age}歲</i> {e.icon} {e.title}</span>
      ))}
    </div>
  )
}

function Title({ aiInfo, onStart }) {
  const looks = [
    { ...defaultLook(), style: 'short', top: LOOKS.tops[0], extra: 'headphones' },
    { ...defaultLook(), style: 'long', top: LOOKS.tops[2], hair: LOOKS.hairs[1] },
    { ...defaultLook(), style: 'bun', top: LOOKS.tops[1], extra: 'glasses' },
    { ...defaultLook(), style: 'messy', top: LOOKS.tops[4], hair: LOOKS.hairs[2], extra: 'beanie' },
  ]
  return (
    <div className="screen title">
      <div className="title-card">
        <div className="title-badge">Cardif InsurHack 2026 · 題目 1-1</div>
        <h1>保險大富翁</h1>
        <p className="title-sub">財務人生模擬遊戲 · Financial Life Simulator</p>
        <p className="title-desc">
          從 22 歲、一無所有開始。擲骰子、做決策:結婚、買房、投資、遇到意外……
          <br />
          在不同的人生與市場情境中,親身體驗風險管理、資產配置與保險保障的重要性。
          <br />
          劇情與學習回饋由 AI 依你的處境即時產生;金額與保險給付由規則引擎精算,結果公平可驗證。
        </p>
        <div className="title-avatars">
          {looks.map((l, i) => <Avatar key={i} look={l} size={72} />)}
        </div>
        <button className="btn primary huge" onClick={onStart}>開始新的人生</button>
        <ol className="how">
          <li><b>1 創角</b>選職業、家境與個性,從 0 開始</li>
          <li><b>2 規劃</b>配置保障、投資與貸款</li>
          <li><b>3 擲骰</b>機會、事件、行情、里程碑</li>
          <li><b>4 結算</b>平行人生對照與 AI 教練</li>
        </ol>
        <div className={`ai-pill ${aiInfo.ai ? '' : 'dim'}`}>{aiInfo.ai ? '✨ AI 編劇與教練已連線' : '離線備援模式(使用內建題庫)'}</div>
      </div>
    </div>
  )
}
