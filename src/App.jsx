import { coachScene } from './game/coach.js'
import { classifyBanter, offlineLine, shouldSpeak } from './game/banter.js'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Board3D from './components/Board3D.jsx'
import Board from './components/Board.jsx'
import Dashboard from './components/Dashboard.jsx'
import PlanModal from './components/PlanModal.jsx'
import SceneModal, { YearModal, StageModal } from './components/SceneModal.jsx'
import CharacterCreator from './components/CharacterCreator.jsx'
import PrologueScreen from './components/PrologueScreen.jsx'
import ResultScreen from './components/ResultScreen.jsx'
import MiniGameModal from './components/MiniGameModal.jsx'
import AskModal from './components/AskModal.jsx'
import RecordsScreen from './components/RecordsScreen.jsx'
import Avatar from './components/Avatar.jsx'
import { Leaderboard, QuestPanel, Feed, Popups, Toast, Confetti, Drawer, useMedia } from './components/HUD.jsx'
import { defaultLook, LOOKS } from './game/careers.js'
import {
  createGame, roll, choose, endYear, setCoverage, trade, borrow, repay, ackStage, buildStageReport,
  computeScore, evalQuests, directorInfo, applyAiScene, propAction,
} from './game/engine.js'
import { createLife, beginLife, chooseLife, advanceLife, careerOptions, lifeToSetup, skipLife } from './game/prologue.js'
import { PERSONAS, botPlan, botAct } from './game/bots.js'
import { createMatch, rank, finishMatch, worldOf, applyOps } from './game/match.js'
import { PROPERTIES } from './game/properties.js'
import { BOARD } from './game/engine.js'
import { recordGame } from './game/records.js'
import { computeEnding } from './game/endings.js'
import { advisorFallback, stageFallback } from './game/fallback.js'
import { wan } from './game/format.js'
import { sfx } from './sfx.js'
import { ai, aiHealth } from './ai.js'

const params = new URLSearchParams(location.search)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let uid = 0

export default function App() {
  const [screen, setScreen] = useState('title')
  const [aiInfo, setAiInfo] = useState({ ai: false })
  // 成長篇
  const [life, setLife] = useState(null)
  const [lifeAi, setLifeAi] = useState(null)
  const [lifeLoading, setLifeLoading] = useState(false)
  const [length, setLength] = useState('standard')
  const [opponents, setOpponents] = useState(2)
  // 對局
  const [players, setPlayers] = useState([])
  const playersRef = useRef([])
  const boardRef = useRef(null)
  const [gameKey, setGameKey] = useState(0)
  const [activeIdx, setActiveIdx] = useState(0)
  // 介面
  const [planOpen, setPlanOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [sceneReady, setSceneReady] = useState(false)
  const [yearOpen, setYearOpen] = useState(false)
  const [coach, setCoach] = useState(false)
  const [aiText, setAiText] = useState(null)
  const [loadingAi, setLoadingAi] = useState(false)
  const [stage, setStage] = useState(null)
  const [use3d, setUse3d] = useState(() => { try { return localStorage.getItem('policypilot.2d') !== '1' } catch { return true } })
  const [muted, setMuted] = useState(sfx.isMuted())
  const [botFast, setBotFast] = useState(false)
  const [drawer, setDrawer] = useState(null)
  const [toast, setToast] = useState(null)
  const [popups, setPopups] = useState([])
  const [feed, setFeed] = useState([])
  const feedRef = useRef([])
  feedRef.current = feed
  const [burst, setBurst] = useState(0)
  const [shake, setShake] = useState(false)
  const [ranks, setRanks] = useState(null)
  const [fresh, setFresh] = useState([])
  const [askOpen, setAskOpen] = useState(false)
  const [debugMg, setDebugMg] = useState(params.get('mg')) // 開發用:?mg=wheel 直接開啟某個小遊戲
  const token = useRef(0)
  const wide = useMedia('(min-width: 1100px)')

  const g = players[0]?.s || null
  const commit = useCallback((idx, s) => {
    const ps = playersRef.current.map((p, i) => (i === idx ? { ...p, s } : p))
    playersRef.current = ps
    setPlayers(ps)
  }, [])
  const human = () => playersRef.current[0].s

  // 對手說話:先用 AI 產生的句子(若有),否則用離線台詞。每次最多一句,避免洗版。
  const banterAi = useRef({})
  const say = useCallback((idx, kind, quiet = false) => {
    const pl = playersRef.current[idx]
    if (!pl || pl.human || !kind) return
    const salt = pl.s.turn * 7 + idx * 13 + (pl.s.seed % 17)
    if (!shouldSpeak(kind, salt)) return
    const slot = { lead: 0, behind: 1, big_loss: 2, claim: 2, buy_prop: 3 }[kind]
    const aiLine = slot != null ? banterAi.current[pl.id]?.[slot] : null
    if (aiLine) delete banterAi.current[pl.id][slot]
    const text = aiLine || offlineLine(pl.persona.id, kind, salt)
    if (!text) return
    setFeed((f) => [{ id: ++uid, icon: '💬', who: pl.name, text: `「${text}」`, tone: 'say', ai: !!aiLine }, ...f].slice(0, 12))
    if (!quiet) showToastRef.current?.({ icon: '💬', title: pl.name, text: `「${text}」${aiLine ? ' ✨' : ''}`, tone: '' }, 2300)
  }, [])

  // 過路費與拍賣:把一個玩家剛做完的選擇,對其他玩家造成的影響處理掉
  const processOps = useCallback((idx) => {
    if (!playersRef.current[idx].s.pendingOps?.length) return
    const { players: np, notes } = applyOps(playersRef.current, idx)
    playersRef.current = np
    setPlayers(np)
    if (notes.length) {
      setFeed((f) => [...notes.map((n) => ({ id: ++uid, icon: n.icon, who: n.who, text: n.text, tone: n.tone })), ...f].slice(0, 12))
      const n = notes[0]
      showToastRef.current?.({ icon: n.icon, title: `${n.who}`, text: n.text, tone: n.tone }, 1800)
      const oi = playersRef.current.findIndex((p) => p.name === n.who)
      if (n.icon === '💰' && oi > 0) setTimeout(() => say(oi, 'toll_collect'), 1900)
    }
  }, [say])
  const showToastRef = useRef(null)

  // ---------- 啟動 ----------
  useEffect(() => {
    aiHealth().then(setAiInfo)
    if (params.get('auto')) {
      const setup = {
        name: params.get('name') || '小明', look: { ...defaultLook(), top: LOOKS.tops[1] }, career: params.get('career') || 'office',
        background: params.get('bg') || 'normal', style: params.get('style') || '穩健型', length: params.get('len') || 'standard',
      }
      startAdult(setup, Number(params.get('opp') ?? 2))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const seedOf = () => {
    const raw = params.get('seed')
    return raw && Number.isFinite(Number(raw)) ? Number(raw) : Math.floor(Math.random() * 100000)
  }

  // ---------- 成長篇 ----------
  function startLife(setup, skip = false) {
    sfx.unlock()
    const created = createLife(setup, seedOf())
    const l = skip ? skipLife(created) : beginLife(created)
    setLife(l)
    setScreen('prologue')
    if (!skip) requestLifeAi(l)
  }

  async function requestLifeAi(l) {
    setLifeAi(null)
    if (!aiInfo.ai || !l.scene) return
    const my = ++token.current
    setLifeLoading(true)
    const fake = { player: { name: l.name, title: '學生', background: l.family, style: l.style }, age: l.age, dependents: 0, partner: null, house: null, cash: l.cash, expense: 300000, loan: l.loan }
    const out = await ai.narrate(l.scene, fake)
    if (my !== token.current) return
    setLifeLoading(false)
    if (out) setLifeAi(out)
  }

  const lifeScene = useMemo(() => {
    if (!life?.scene) return null
    const base = life.scene
    if (lifeAi && !base.result) {
      const choices = lifeAi.choices && lifeAi.choices.length === base.choices.length
        ? base.choices.map((c, i) => ({ ...c, label: lifeAi.choices[i].label || c.label, hint: lifeAi.choices[i].hint ?? c.hint })) : base.choices
      return { ...base, title: lifeAi.title || base.title, story: lifeAi.story || base.story, choices }
    }
    return base
  }, [life, lifeAi])

  function onLifeChoose(i) {
    sfx.click()
    const nl = chooseLife(life, i)
    setLife(nl)
    const lines = nl.scene.result.lines
    if (lines.some((l) => l.kind === 'cover')) sfx.claim()
    else if (lines.some((l) => l.kind === 'out' && l.amount < -50000)) sfx.bad()
    else sfx.coin()
  }
  function onLifeContinue() {
    const nl = advanceLife(life)
    setLife(nl)
    if (!nl.done) requestLifeAi(nl)
    else setLifeAi(null)
  }

  // ---------- 進入棋盤 ----------
  function startAdult(setup, opp) {
    const seed = seedOf()
    const h = createGame(setup, seed)
    const m = createMatch(h, opp, seed)
    playersRef.current = m.players
    banterTurns.current.clear()
    banterAi.current = {}
    setPlayers(m.players)
    setGameKey((k) => k + 1)
    setActiveIdx(0)
    setFeed([])
    setStage(null)
    setAiText(null)
    setSceneReady(false)
    setYearOpen(false)
    setRanks(null)
    setFresh([])
    setBusy(false)
    setScreen('game')
    setPlanOpen(true)
  }

  function onPickCareer(careerId) {
    sfx.fanfare()
    startAdult(lifeToSetup(life, careerId, length, opponents), opponents)
  }

  // ---------- 提示 / 特效 ----------
  const showToast = useCallback(async (t, ms = 1700) => {
    setToast(t)
    await sleep(ms)
    setToast((cur) => (cur === t ? null : cur))
  }, [])
  showToastRef.current = showToast
  const popup = useCallback((text, kind, x = 50) => {
    const id = ++uid
    setPopups((p) => [...p, { id, text, kind, x }])
    setTimeout(() => setPopups((p) => p.filter((q) => q.id !== id)), 1900)
  }, [])
  const doShake = () => { setShake(true); setTimeout(() => setShake(false), 520) }

  function react(sc) {
    const lines = sc.result.lines
    const cover = lines.filter((l) => l.kind === 'cover' && l.amount > 0)
    const gain = lines.filter((l) => l.kind === 'in' && l.amount > 0)
    const loss = lines.filter((l) => l.amount < 0 && l.kind !== 'lesson')
    const sum = (a) => a.reduce((x, l) => x + l.amount, 0)
    let k = 0
    if (cover.length) {
      popup(`🛡️ 理賠 +${wan(sum(cover))}`, 'cover', 50 + (k++ % 2) * 8)
      sfx.claim()
      setBurst((b) => b + 1)
    }
    if (loss.length) {
      popup(`${wan(sum(loss))}`, 'loss', 40 + (k++ % 2) * 12)
      if (sum(loss) < -150000) { sfx.bad(); doShake() } else sfx.coin()
    }
    if (gain.length) {
      popup(`+${wan(sum(gain))}`, 'gain', 56)
      if (!cover.length) sfx.good()
    }
    if (!cover.length && !loss.length && !gain.length) sfx.click()
  }

  // ---------- 你的回合 ----------
  async function onRoll() {
    const cur = human()
    if (busy || cur.phase !== 'plan') return
    setBusy(true)
    setSceneReady(false)
    setAiText(null)
    setActiveIdx(0)
    sfx.unlock()
    sfx.dice()
    const ng = roll(cur, worldOf(playersRef.current))
    const b = boardRef.current
    if (ng.dice == null) {
      // 住院休養:這一回合不擲骰、不移動
      b?.focus(0)
      await sleep(700)
      b?.setActiveTile(ng.pos)
    } else if (b) {
      await b.rollDice(ng.dice)
      b.hideDice()
      await b.moveToken(0, ng.pos)
      b.setActiveTile(ng.pos)
    } else {
      await sleep(900 + ng.dice * 120)
    }
    commit(0, ng)
    requestAi(ng)
    sfx.card()
    setSceneReady(true)
    setBusy(false)
  }

  async function requestAi(ng) {
    const sc = ng.scene
    if (!aiInfo.ai || !sc || !(sc.aiable || sc.kind === 'advisor')) return
    const my = ++token.current
    setLoadingAi(true)
    const info = directorInfo(sc)
    if (info) {
      // AI 事件導演:引擎決定類別與嚴重度,AI 設計具體情境與選項
      const out = await ai.director(info, ng)
      if (my !== token.current) return
      setLoadingAi(false)
      if (out) {
        const cur = human()
        if (cur.phase === 'scene' && cur.scene && cur.scene.defId === sc.defId) {
          commit(0, applyAiScene(cur, out))
          setAiText({ director: true })
          return
        }
      }
      // 導演失敗時,退回改寫既有事件的文字
      const rewrite = await ai.narrate(sc, ng)
      if (my === token.current && rewrite) setAiText(rewrite)
      return
    }
    let out = null
    if (sc.kind === 'advisor') {
      const r = await ai.advisor(sc.base.analysis, ng)
      out = r ? { story: r.message } : null
    } else out = await ai.narrate(sc, ng)
    if (my !== token.current) return
    setLoadingAi(false)
    if (out) setAiText(out)
  }

  const scene = useMemo(() => {
    if (!g?.scene) return null
    const base = g.scene
    if (aiText) {
      const choices = aiText.choices && aiText.choices.length === base.choices.length
        ? base.choices.map((c, i) => ({ ...c, label: aiText.choices[i].label || c.label, hint: aiText.choices[i].hint ?? c.hint })) : base.choices
      return { ...base, title: aiText.title || base.title, story: aiText.story || base.story, choices, lesson: aiText.lesson || base.lesson }
    }
    if (base.kind === 'advisor') return { ...base, story: `${base.story} ${advisorFallback(base.base.analysis, g.player)}` }
    return base
  }, [g, aiText])

  function onChoose(i) {
    sfx.click()
    const ng = choose(human(), i)
    commit(0, ng)
    react(ng.scene)
    processOps(0)
  }

  function onMinigameDone(r) {
    const ng = choose(human(), 0, { stars: r.stars, note: r.note })
    commit(0, ng)
    react(ng.scene)
  }

  async function onContinue() {
    const ng = endYear(human())
    commit(0, ng)
    setAiText(null)
    setSceneReady(false)
    boardRef.current?.setActiveTile(null)
    if (ng.ended?.reason === 'death') return finishGame()
    if (players.length <= 1) boardRef.current?.overview()
    setYearOpen(true)
    for (const q of ng.newQuests || []) {
      sfx.quest()
      setBurst((b) => b + 1)
      showToast({ icon: '🎯', title: `任務達成:${q.title}`, tone: 'good' }, 2200)
    }
  }

  async function onYearNext() {
    setYearOpen(false)
    const cur = human()
    if (cur.phase === 'ended') return finishGame()
    if (cur.pendingStage) { await openStage(cur); return }
    await runBots()
  }

  async function openStage(cur) {
    const report = buildStageReport(cur)
    setStage({ loading: true, data: null, fromAi: false })
    const out = aiInfo.ai ? await ai.stage(report) : null
    setStage({ loading: false, data: out || stageFallback(report), fromAi: !!out })
  }

  async function closeStage() {
    setStage(null)
    commit(0, ackStage(human()))
    await runBots()
  }

  // ---------- 電腦對手的回合 ----------
  async function runBots() {
    setBusy(true)
    const b = boardRef.current
    for (let i = 1; i < playersRef.current.length; i++) {
      const pl = playersRef.current[i]
      if (pl.s.phase === 'ended') continue
      setActiveIdx(i)
      let s = botPlan(pl.s, pl.persona)
      s = roll(s, worldOf(playersRef.current))
      const sc = s.scene
      if (b && !botFast) {
        b.focus(i)
        await b.moveToken(i, s.pos)
      } else if (b) b.teleport(i, s.pos)
      s = botAct(s, pl.persona)
      const res = s.scene.result.lines
      const cover = res.filter((l) => l.kind === 'cover' && l.amount > 0).reduce((a, l) => a + l.amount, 0)
      const loss = res.filter((l) => l.amount < 0 && l.kind !== 'lesson').reduce((a, l) => a + l.amount, 0)
      const note = cover > 0 ? `保險理賠 ${wan(cover)}` : loss < 0 ? `支出 ${wan(-loss)}` : '平安度過'
      const tone = cover > 0 ? 'good' : loss < -150000 ? 'bad' : ''
      const item = { id: ++uid, icon: sc.icon, who: pl.name, text: `「${sc.title}」${note}`, tone }
      setFeed((f) => [item, ...f].slice(0, 12))
      if (!botFast) {
        showToast({ icon: sc.icon, title: `${pl.name}:${sc.title}`, text: note, tone }, 1100)
        if (cover > 0) sfx.claim(); else if (loss < -150000) sfx.bad()
      }
      const rankBefore = rank(playersRef.current).find((r) => r.id === pl.id).rank
      commit(i, s)
      processOps(i)
      const bought = sc.kind === 'property' && ['buy_cash', 'buy_loan'].includes(sc.choices[s.scene.picked]?.tag)
      s = endYear(playersRef.current[i].s)
      commit(i, s)
      const rankNow = rank(playersRef.current)
      const mine = rankNow.find((r) => r.id === pl.id).rank
      const humanBehind = rankNow.find((r) => r.human).rank > mine
      const kind = classifyBanter({ sc, cover, loss, bankrupt: s.ended?.reason === 'bankrupt', bought, rankNow: mine, rankBefore, human: humanBehind })
      if (kind) setTimeout(() => say(i, kind, botFast), botFast ? 0 : 900)
      if (s.ended?.reason === 'bankrupt') {
        const bi = { id: ++uid, icon: '💥', who: pl.name, text: `${s.ended.age} 歲破產出局!資金斷裂、資產被拍賣`, tone: 'bad' }
        setFeed((f) => [bi, ...f].slice(0, 12))
        showToast({ icon: '💥', title: `${pl.name} 破產出局`, text: '現金見底、資產被拍賣', tone: 'bad' }, 2200)
        sfx.bad()
      }
      if (!botFast) await sleep(500)
    }
    setActiveIdx(0)
    b?.overview()
    setBusy(false)
    fetchBanter()
  }

  // 對手的 AI 台詞:每局只在第 3、9、16、24 回合各呼叫一次(最多 4 次),失敗就用離線台詞
  const banterTurns = useRef(new Set())
  async function fetchBanter() {
    const cur = playersRef.current
    const turn = cur[0].s.turn
    if (!aiInfo.ai || botFast || cur.length < 2 || ![3, 9, 16, 24].includes(turn) || banterTurns.current.has(turn)) return
    banterTurns.current.add(turn)
    const rows = rank(cur)
    const bots = cur.slice(1).filter((p) => p.s.phase !== 'ended').map((p) => {
      const r = rows.find((x) => x.id === p.id)
      return { id: p.id, name: p.name, persona: `${p.persona.title}:${p.persona.blurb}`, age: p.s.age, rank: r.rank, players: rows.length, netWorthWan: Math.round(r.net / 10000), coverage: `${Object.values(p.s.coverage).filter(Boolean).length} 項`, properties: Object.keys(p.s.props || {}).length }
    })
    if (!bots.length) return
    const recent = feedRef.current.filter((f) => f.tone !== 'say').slice(0, 6).map((f) => `${f.who}${f.text}`)
    const out = await ai.banter({ bots, recent, human: cur[0].name })
    if (out?.lines) for (const [id, lines] of Object.entries(out.lines)) banterAi.current[id] = Object.fromEntries(lines.map((x, i) => [i, x]))
  }

  // ---------- 結算 ----------
  function finishGame() {
    const fin = finishMatch(playersRef.current)
    playersRef.current = fin
    setPlayers(fin)
    const rk = rank(fin)
    const h = fin[0].s
    const score = computeScore(h)
    const myRank = rk.find((r) => r.human).rank
    const cats = h.history.flatMap((x) => x.shocks.map((sh) => sh.cat))
    const ctx = {
      s: h, score, rank: myRank, opponents: fin.length - 1,
      claims: h.history.reduce((a, x) => a + x.payout, 0),
      questsDone: evalQuests(h).filter((q) => q.done).length,
      hadCritical: cats.includes('critical'), hadDisability: cats.includes('disability'),
      ending: computeEnding(h, score),
    }
    const { fresh: fr } = recordGame(ctx)
    setRanks(rk)
    setFresh(fr)
    setScreen('result')
    sfx.fanfare()
  }

  const rows = useMemo(() => (players.length ? rank(players) : []), [players])
  const ownersMap = useMemo(() => {
    const w = worldOf(players).owners
    const m = {}
    for (const p of PROPERTIES) if (w[p.id]) m[BOARD.findIndex((b) => b.prop === p.id)] = { ownerIdx: w[p.id].idx, level: w[p.id].level, insured: w[p.id].insured }
    return m
  }, [players])
  const quests = useMemo(() => (g ? evalQuests(g) : []), [g])
  const showScene = scene && g && ((g.phase === 'scene' && sceneReady) || g.phase === 'result')
  const tokenPlayers = useMemo(() => players.map((p) => ({ look: p.look, name: p.name, pos: 0 })), [gameKey]) // eslint-disable-line react-hooks/exhaustive-deps

  function toggleMute() {
    const m = !muted
    sfx.setMuted(m)
    setMuted(m)
  }
  function toggle3d() {
    const v = !use3d
    setUse3d(v)
    try { localStorage.setItem('policypilot.2d', v ? '0' : '1') } catch { /* 忽略 */ }
  }

  // ---------- 畫面 ----------
  if (screen === 'title') return <Title aiInfo={aiInfo} onStart={() => setScreen('create')} onRecords={() => setScreen('records')} />
  if (screen === 'records') return <RecordsScreen onBack={() => setScreen('title')} />
  if (screen === 'create') return <CharacterCreator onStart={startLife} onBack={() => setScreen('title')} />
  if (screen === 'prologue' && life) {
    return (
      <PrologueScreen
        life={life ? { ...life, scene: lifeScene } : life}
        aiTag={!!lifeAi && !life.scene?.result}
        loadingAi={lifeLoading}
        onChoose={onLifeChoose}
        onContinue={onLifeContinue}
        careerOptions={life.done ? careerOptions(life) : []}
        onPickCareer={onPickCareer}
        length={length}
        setLength={setLength}
        opponents={opponents}
        setOpponents={setOpponents}
      />
    )
  }
  if (!g) return null
  if (screen === 'result') {
    return <ResultScreen s={g} aiOn={aiInfo.ai} ranks={ranks} fresh={fresh} onAgain={() => setScreen('create')} onRecords={() => setScreen('records')} />
  }

  const centerSlot = (
    <div className="center-actions">
      <button className="btn primary big" onClick={onRoll} disabled={g.phase !== 'plan' || busy || planOpen || !!stage} aria-label={g.hospitalTurns > 0 ? '住院休養' : '擲骰子'}>{g.hospitalTurns > 0 ? '🛌 住院休養(跳過這回合)' : '🎲 擲骰子'}</button>
    </div>
  )

  return (
    <div className={`game3 ${shake ? 'shake' : ''}`}>
      <header className="topbar">
        <div className="brand"><span aria-hidden>🎲</span> 保險大富翁</div>
        <div className="topbar-r">
          <span className={`ai-pill ${aiInfo.ai ? '' : 'dim'}`} title={aiInfo.ai ? `Gemini(${aiInfo.model})` : '未設定金鑰,使用內建題庫與規則式教練'}>
            {aiInfo.ai ? (aiInfo.mock ? '✨ AI(模擬)' : '✨ AI 已連線') : '離線備援模式'}
          </span>
          <button className="btn ghost" onClick={toggleMute} aria-pressed={muted} title="音效">{muted ? '🔇' : '🔊'}</button>
          {players.length > 1 && <button className={`btn ghost ${botFast ? 'on' : ''}`} onClick={() => setBotFast((v) => !v)} aria-pressed={botFast} title="對手回合快轉">⏩ 快轉</button>}
          <button className="btn ghost" onClick={toggle3d} title="切換 2D / 3D">{use3d ? '3D' : '2D'}</button>
          <label className="switch"><input type="checkbox" checked={coach} onChange={(e) => setCoach(e.target.checked)} /><span>教練提示</span></label>
          <button className="btn ghost" onClick={() => setScreen('create')}>重新開始</button>
        </div>
      </header>

      <div className="gbody">
        {wide && <aside className="side side-l"><Dashboard s={g} /></aside>}
        <main className="gstage">
          {use3d ? (
            <Board3D key={gameKey} ref={boardRef} players={tokenPlayers} owners={ownersMap} onFail={() => setUse3d(false)} onStep={() => sfx.step()} />
          ) : (
            <div className="board-2d"><Board tokens={players.map((p, i) => ({ pos: p.s.pos, look: p.look, active: i === activeIdx }))} centerSlot={centerSlot} owners={ownersMap} /></div>
          )}
          <div className="stage-hud">
            <div className="year-chip">
              <Avatar look={g.player.look} size={30} ring={false} />
              <span><b>{g.age} 歲</b> · 第 {Math.min(g.turn + 1, g.years)} / {g.years} 年{players.length > 1 && activeIdx > 0 ? ` · ${players[activeIdx].name}的回合` : ''}</span>
            </div>
            <Toast toast={toast} />
            <Popups items={popups} />
            {use3d && (
              <div className="action-bar">
                <button className="btn primary big" onClick={onRoll} disabled={g.phase !== 'plan' || busy || planOpen || !!stage} aria-label={g.hospitalTurns > 0 ? '住院休養' : '擲骰子'}>{g.hospitalTurns > 0 ? '🛌 住院休養(跳過這回合)' : '🎲 擲骰子'}</button>
                <button className="btn big2" onClick={() => setPlanOpen(true)} disabled={g.phase !== 'plan' || busy}>🛡️ 規劃與理財</button>
                <button className="btn big2" onClick={() => setAskOpen(true)} disabled={busy}>💬 問理專</button>
              </div>
            )}
            {!use3d && <div className="action-bar"><button className="btn big2" onClick={() => setPlanOpen(true)} disabled={g.phase !== 'plan' || busy}>🛡️ 規劃與理財</button><button className="btn big2" onClick={() => setAskOpen(true)}>💬 問理專</button></div>}
          </div>
          <Confetti burst={burst} />
        </main>
        {wide && (
          <aside className="side side-r">
            {rows.length > 1 && <Leaderboard rows={rows} activeId={players[activeIdx]?.id} />}
            <QuestPanel quests={quests} />
            <Feed items={feed} />
          </aside>
        )}
      </div>

      {!wide && (
        <nav className="mbar" aria-label="面板">
          <button onClick={() => setDrawer('status')}>📊 狀態</button>
          <button onClick={() => setDrawer('rank')}>🏁 排名與任務</button>
        </nav>
      )}
      <Drawer open={drawer === 'status'} onClose={() => setDrawer(null)} title="我的狀態"><Dashboard s={g} /></Drawer>
      <Drawer open={drawer === 'rank'} onClose={() => setDrawer(null)} title="排名與任務">
        {rows.length > 1 && <Leaderboard rows={rows} activeId={players[activeIdx]?.id} />}
        <QuestPanel quests={quests} />
        <Feed items={feed} />
      </Drawer>

      {askOpen && <AskModal s={g} aiOn={aiInfo.ai} onClose={() => setAskOpen(false)} />}
      {debugMg && <MiniGameModal game={debugMg} s={g} onDone={(r) => { console.log('MG ' + JSON.stringify(r)); setDebugMg(null) }} />}
      {planOpen && !debugMg && (
        <PlanModal
          s={g}
          coach={coach}
          title={g.turn === 0 ? `開局規劃:${g.player.name} · 22 歲` : `${g.age} 歲 · 年度規劃`}
          onCoverage={(id, t) => commit(0, setCoverage(human(), id, t))}
          onTrade={(cls, d) => commit(0, trade(human(), cls, d))}
          onBorrow={(a) => commit(0, borrow(human(), a))}
          onRepay={(a) => commit(0, repay(human(), a))}
          onPropAction={(id, act) => commit(0, propAction(human(), id, act))}
          world={worldOf(players)}
          onClose={() => setPlanOpen(false)}
        />
      )}
      {showScene && scene.kind === 'minigame' && g.phase === 'scene' && <MiniGameModal key={scene.defId + g.turn} game={scene.base.game} s={g} onDone={onMinigameDone} />}
      {showScene && !(scene.kind === 'minigame' && g.phase === 'scene') && <SceneModal scene={scene} tips={coach && g.phase === 'scene' ? coachScene(g, scene) : null} phase={g.phase} onChoose={onChoose} onContinue={onContinue} aiTag={!!aiText} loadingAi={loadingAi} />}
      {yearOpen && <YearModal s={g} onNext={onYearNext} last={g.phase === 'ended'} />}
      {stage && <StageModal data={stage.data} fromAi={stage.fromAi} loading={stage.loading} onClose={closeStage} age={g.age} />}
    </div>
  )
}

function Title({ aiInfo, onStart, onRecords }) {
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
          擲骰子、走格子、抽事件卡,和電腦對手一起在 3D 棋盤上走完人生。
          <br />
          途中會遇到結婚、買房、投資、意外與市場起伏,還有各種保險小遊戲:配對翻牌、防詐騙、命運輪盤……
          <br />
          想從 0 歲出生開始也可以,或是直接進入棋盤。金額與保險給付由規則引擎精算,劇情與學習回饋由 AI 依你的處境產生。
        </p>
        <div className="title-avatars">{looks.map((l, i) => <Avatar key={i} look={l} size={72} />)}</div>
        <div className="title-btns">
          <button className="btn primary huge" onClick={onStart}>開始新的人生</button>
          <button className="btn huge2" onClick={onRecords}>🏅 成就與戰績</button>
        </div>
        <ol className="how">
          <li><b>1 創角</b>可從出生開始,或直接進棋盤</li>
          <li><b>2 規劃</b>配置保障、投資與貸款</li>
          <li><b>3 大富翁</b>擲骰、事件卡、小遊戲、對手排名</li>
          <li><b>4 結算</b>平行人生對照與 AI 教練</li>
        </ol>
        <div className={`ai-pill ${aiInfo.ai ? '' : 'dim'}`}>{aiInfo.ai ? '✨ AI 編劇與教練已連線' : '離線備援模式(使用內建題庫)'}</div>
      </div>
    </div>
  )
}
