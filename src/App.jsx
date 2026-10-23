import { settleLoans, loanRequest } from './game/deals.js'
import FxLayer, { fx } from './components/FxLayer.jsx'
import { fileClaim, claimPending, correctPicks } from './game/claims.js'
import { coachScene } from './game/coach.js'
import { classifyBanter, offlineLine, shouldSpeak } from './game/banter.js'
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
// 3D 棋盤(three.js)很大,等進到棋盤才載入,標題頁開得比較快
const Board3D = lazy(() => import('./components/Board3D.jsx'))
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
  createGame, roll, choose, endYear, hasMinor, nextMinor, canRollAgain, rollAgain, setCoverage, trade, borrow, repay, ackStage, buildStageReport,
  computeScore, evalQuests, directorInfo, applyAiScene, propAction,
} from './game/engine.js'
import { histYearOf } from './game/history.js'
import { createLife, beginLife, chooseLife, advanceLife, careerOptions, lifeToSetup, skipLife } from './game/prologue.js'
import { PERSONAS, botPlan, botAct, botChoose, botStars, botMinors } from './game/bots.js'
import { createMatch, rank, finishMatch, worldOf, applyOps } from './game/match.js'
import Tutorial from './components/Tutorial.jsx'
import { Volume2, VolumeX, FastForward, Box, Grid2x2, RotateCcw, BedDouble, Dices, ShieldCheck, MessageCircle, BarChart3, Flag } from 'lucide-react'
import { t, useLang, getLang } from './i18n.js'
import { saveGame, loadSave, clearSave, loadRecent, saveRecent, saveCodex } from './save.js'
import { collectedIn } from './game/codex.js'
import AutopilotMenu from './components/AutopilotMenu.jsx'
import DemoBar from './components/DemoBar.jsx'
import TileInfo from './components/TileInfo.jsx'
import { demoCaption, DEMO_SEED, DEMO_YEARS } from './game/demoScript.js'
import SettingsLayer from './components/SettingsLayer.jsx'
import { useArt } from './art.js'
import { adultStart } from './game/starts.js'
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
// 引號與冒號:中文用全形,英文用一般符號
const quote = (x) => (getLang() === 'en' ? `\u201c${x}\u201d` : `「${x}」`)
const colon = () => (getLang() === 'en' ? ': ' : ':')
let uid = 0

function GameApp() {
  const [screen, setScreen] = useState('title')
  const [aiInfo, setAiInfo] = useState({ ai: false })
  // 成長篇
  const [life, setLife] = useState(null)
  const [lifeAi, setLifeAi] = useState(null)
  const [lifeLoading, setLifeLoading] = useState(false)
  const [length, setLength] = useState('standard')
  const [opponents, setOpponents] = useState(2)
  const [histStart, setHistStart] = useState(0) // 0 = 模擬行情;年份 = 照台股真實歷史走
  // 對局
  const [players, setPlayers] = useState([])
  const playersRef = useRef([])
  const boardRef = useRef(null)
  const [gameKey, setGameKey] = useState(0)
  const [activeIdx, setActiveIdx] = useState(0)
  // 介面
  const [planOpen, setPlanOpen] = useState(false)
  const [planTab, setPlanTab] = useState('cover') // 打開規劃視窗時先停在哪個分頁
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
  const [auto, setAuto] = useState(null) // 電腦託管:{ persona, left }
  const [inspect, setInspect] = useState(null) // 點棋盤看格子說明
  const [demo, setDemo] = useState(null) // 展示模式:{ paused, fast, done }
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
  const [newCards, setNewCards] = useState([]) // 這局新點亮的觀念卡
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
  const rolling = useRef(false) // 擲骰動畫進行中:連點兩下不會擲兩次
  // 3D 動畫最多等這麼久:分頁在背景、場景被重建時動畫可能停住,不能讓遊戲卡死
  const anim = (p, ms) => Promise.race([Promise.resolve(p).catch(() => {}), sleep(ms)])

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
    setFeed((f) => [{ id: ++uid, icon: '💬', who: t(pl.name), text: quote(t(text)), tone: 'say', ai: !!aiLine }, ...f].slice(0, 12))
    if (!quiet) showToastRef.current?.({ icon: '💬', title: t(pl.name), text: `${quote(t(text))}${aiLine ? ' ✨' : ''}`, tone: '' }, 2300)
  }, [])

  // 過路費與拍賣:把一個玩家剛做完的選擇,對其他玩家造成的影響處理掉
  const processOps = useCallback((idx) => {
    if (!playersRef.current[idx].s.pendingOps?.length) return
    const cash0 = playersRef.current[0].s.cash
    const { players: np, notes } = applyOps(playersRef.current, idx)
    playersRef.current = np
    setPlayers(np)
    // 你收到過路費:跳出金額、播錢幣聲,讓「收租」看得見
    const got = np[0].s.cash - cash0
    if (idx > 0 && got > 0) setTimeout(() => { popupRef.current?.(`💰 +${wan(got)}`, 'gain'); sfx.coin() }, 300)
    if (notes.length) {
      setFeed((f) => [...notes.map((n) => ({ id: ++uid, icon: n.icon, who: n.who, text: n.text, tone: n.tone })), ...f].slice(0, 12))
      const n = notes[0]
      showToastRef.current?.({ icon: n.icon, title: `${n.who}`, text: n.text, tone: n.tone }, 1800)
      const oi = playersRef.current.findIndex((p) => p.name === n.who || t(p.name) === n.who)
      if (n.icon === '💰' && oi > 0) setTimeout(() => say(oi, 'toll_collect'), 1900)
    }
  }, [say])
  const showToastRef = useRef(null)

  // ---------- 啟動 ----------
  useEffect(() => {
    aiHealth().then(setAiInfo)
    if (params.get('demo')) { startDemo(); return }
    if (params.get('auto')) {
      const setup = {
        name: params.get('name') || t('小明'), look: { ...defaultLook(), top: LOOKS.tops[1] }, career: params.get('career') || 'office',
        background: params.get('bg') || 'normal', style: params.get('style') || '穩健型', length: params.get('len') || 'standard', // i18n-ignore:'穩健型' 是比對用的內部值
      }
      const age = Number(params.get('age') || 22)
      if (age > 22) setup.start = adultStart({ age, bgId: setup.background, careerId: setup.career, seed: seedOf() })
      // ?hist=2008:股市照台股 2008 年起的真實行情走
      if (params.get('hist')) setup.market = { mode: 'history', start: Number(params.get('hist')) }
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
    const startAge = setup.startAge || 22
    const l = skip ? skipLife(created, startAge) : beginLife(created)
    setLife(l)
    setScreen('prologue')
    if (!skip) requestLifeAi(l)
  }

  async function requestLifeAi(l) {
    setLifeAi(null)
    if (!aiInfo.ai || !l.scene) return
    const my = ++token.current
    setLifeLoading(true)
    const fake = { player: { name: l.name, title: t('學生'), background: l.family, style: l.style }, age: l.age, dependents: 0, partner: null, house: null, cash: l.cash, expense: 300000, loan: l.loan }
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
  function startAdult(setup, opp, seedOverride) {
    const seed = seedOverride ?? seedOf()
    // 展示模式用固定劇本,不套用跨局記憶
    const h = createGame(seedOverride != null ? setup : { ...setup, recent: loadRecent() }, seed)
    const m = createMatch(h, opp, seed)
    playersRef.current = m.players
    banterTurns.current.clear()
    banterAi.current = {}
    setPlayers(m.players)
    rolling.current = false
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

  // 繼續上次的人生(自動存檔)
  function resumeGame() {
    const d = loadSave()
    if (!d) return
    sfx.unlock()
    playersRef.current = d.players
    banterTurns.current.clear()
    banterAi.current = {}
    setPlayers(d.players)
    rolling.current = false
    setGameKey((k) => k + 1)
    setActiveIdx(0)
    setFeed(d.feed || [])
    setCoach(!!d.coach)
    setStage(null); setAiText(null); setSceneReady(false); setYearOpen(false); setRanks(null); setFresh([]); setBusy(false)
    setScreen('game')
    setPlanOpen(false)
  }

  // 每年開始規劃時自動存檔;結束後清掉存檔
  useEffect(() => {
    if (screen !== 'game' || !g) return
    if (g.phase === 'plan' && !busy && !demo) saveGame({ players, feed, coach })
    if (g.phase === 'ended' && !demo) clearSave()
  }, [screen, g?.turn, g?.phase, busy]) // eslint-disable-line react-hooks/exhaustive-deps

  // ---------- 電腦託管 ----------
  // 每一步都走和玩家自己操作同一條路(onRoll / onChoose / onContinue…),只是由 bot 的決策函式代按。
  const autoRef = useRef(null)
  autoRef.current = auto
  function stopAuto(msg) {
    setAuto(null)
    if (msg) showToast({ icon: '🤖', title: t('電腦託管結束'), text: msg, tone: '' }, 2200)
  }
  const planBotted = useRef(false)
  function startDemo() {
    sfx.unlock()
    const setup = {
      name: t('小明'), look: { ...defaultLook(), top: LOOKS.tops[1] }, career: 'office', background: 'normal', // i18n-ignore
      style: '穩健型', length: 'short', // i18n-ignore:'穩健型' 是比對用的內部值
    }
    planBotted.current = false
    setDemo({ paused: false, fast: false, done: false, introDone: false })
    setBotFast(false)
    setCoach(true)
    startAdult(setup, 2, DEMO_SEED)
    setPlanOpen(false) // 先播開場運鏡,播完再打開規劃視窗
    setAuto({ persona: 'balanced', left: Infinity })
  }
  function exitDemo() {
    setDemo(null)
    setAuto(null)
    setBotFast(false)
    setCoach(false)
    setStage(null)
    setYearOpen(false)
    setScreen('title')
  }
  function startAuto(personaId, years) {
    planBotted.current = false
    sfx.unlock()
    setAuto({ persona: personaId, left: years })
  }
  useEffect(() => {
    if (!auto || screen !== 'game' || !g || busy || stage || askOpen || demo?.paused || (demo && !demo.introDone)) return
    const slow = !botFast
    const dw = demo && slow ? 1.8 : 1 // 展示模式放慢一點,讓觀眾看得清楚
    const wait = (yearOpen ? (slow ? 1600 : 200) : g.phase === 'scene' && g.scene?.kind === 'minigame' ? (demo && slow ? 1500 : 250) : slow ? 1000 : 150) * dw
    const id = setTimeout(() => {
      const persona = PERSONAS.find((p) => p.id === auto.persona) || PERSONAS[0]
      if (planOpen) {
        // 先讓電腦理專在規劃視窗裡配置好(觀眾看得到),下一拍再關掉視窗
        if (!planBotted.current) { planBotted.current = true; commit(0, botPlan(human(), persona, { keep: true })); return }
        planBotted.current = false
        return setPlanOpen(false)
      }
      if (yearOpen) return onYearNext()
      const cur = human()
      if (cur.phase === 'ended') return
      if (cur.phase === 'plan') {
        if (auto.left <= 0) return stopAuto(t('換你操作了。'))
        commit(0, botPlan(cur, persona, { keep: true }))
        return onRoll()
      }
      if (cur.phase === 'scene' && sceneReady) {
        if (cur.scene.kind === 'minigame') return onMinigameDone({ stars: botStars(cur, persona) })
        return onChoose(botChoose(cur, persona))
      }
      if (cur.phase === 'result' && claimPending(cur)) return onFileClaim(correctPicks(cur))
      if (cur.phase === 'result') { if (!hasMinor(cur) && !canRollAgain(cur)) setAuto((a) => a && { ...a, left: a.left - 1 }); return onContinue() }
    }, wait)
    return () => clearTimeout(id)
  }, [auto, demo?.paused, screen, g, busy, sceneReady, yearOpen, stage, planOpen, askOpen, botFast]) // eslint-disable-line react-hooks/exhaustive-deps
  // 展示模式:先播開場運鏡(2D 棋盤沒有運鏡,直接開始)
  useEffect(() => {
    if (!demo || demo.introDone || screen !== 'game') return undefined
    let alive = true
    const id = setTimeout(async () => {
      // 3D 棋盤是延後載入的,最多等 4 秒讓它準備好
      for (let k = 0; k < 40 && !boardRef.current && use3d; k++) await sleep(100)
      await (boardRef.current?.intro?.() ?? Promise.resolve())
      if (!alive) return
      setDemo((d) => d && { ...d, introDone: true })
      setPlanOpen(true)
    }, 600)
    return () => { alive = false; clearTimeout(id) }
  }, [demo?.introDone, screen, gameKey]) // eslint-disable-line react-hooks/exhaustive-deps
  // 展示模式:階段回顧停留一會兒就自動關閉;body 加標記讓視窗讓出字幕列的位置
  useEffect(() => {
    if (!demo || demo.paused || !stage || stage.loading) return undefined
    const id = setTimeout(() => closeStage(), demo.fast ? 4500 : 9000)
    return () => clearTimeout(id)
  }, [demo, stage]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (demo) document.body.dataset.demo = '1'
    else delete document.body.dataset.demo
    return () => { delete document.body.dataset.demo }
  }, [!!demo])
  useEffect(() => { if (autoRef.current && (screen !== 'game' || (g?.phase === 'ended' && !demo))) setAuto(null) }, [screen, g?.phase]) // eslint-disable-line react-hooks/exhaustive-deps

  function onPickCareer(careerId) {
    sfx.fanfare()
    startAdult({ ...lifeToSetup(life, careerId, length, opponents), market: histStart ? { mode: 'history', start: histStart } : null }, opponents)
  }

  // ---------- 提示 / 特效 ----------
  const showToast = useCallback(async (msg, ms = 1700) => {
    setToast(msg)
    await sleep(ms)
    setToast((cur) => (cur === msg ? null : cur))
  }, [])
  showToastRef.current = showToast
  const popup = useCallback((text, kind, x = 50) => {
    const id = ++uid
    setPopups((p) => [...p, { id, text, kind, x }])
    setTimeout(() => setPopups((p) => p.filter((q) => q.id !== id)), 1900)
  }, [])
  const popupRef = useRef(null)
  popupRef.current = popup
  const doShake = () => { setShake(true); setTimeout(() => setShake(false), 520) }

  function react(sc) {
    const lines = sc.result.lines
    const cover = lines.filter((l) => l.kind === 'cover' && l.amount > 0)
    const gain = lines.filter((l) => l.kind === 'in' && l.amount > 0)
    const loss = lines.filter((l) => l.amount < 0 && l.kind !== 'lesson')
    const sum = (a) => a.reduce((x, l) => x + l.amount, 0)
    let k = 0
    if (cover.length) {
      popup(t('🛡️ 理賠 +{amt}', { amt: wan(sum(cover)) }), 'cover', 50 + (k++ % 2) * 8)
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
    if (busy || rolling.current || cur.phase !== 'plan') return
    rolling.current = true
    setBusy(true)
    try {
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
        await anim(b.rollDice(ng.diceFaces), 7000)
        b.hideDice()
        await anim(b.moveToken(0, ng.pos), 9000)
        b.setActiveTile(ng.pos)
      } else {
        await sleep(900 + ng.dice * 120)
      }
      commit(0, ng)
      if (ng.extraRoll) { fx('doubles'); sfx.doubles() }
      if (ng.extraRoll) showToast({ icon: '🎲', title: t('雙骰!{a} + {b}', { a: ng.diceFaces[0], b: ng.diceFaces[1] }), text: t('這件事結束後可以再擲一次'), tone: 'good' }, 2200)
      requestAi(ng)
      sfx.card()
    } finally {
      // 不論動畫有沒有出錯,都要解鎖,否則之後永遠不能擲骰
      rolling.current = false
      setSceneReady(true)
      setBusy(false)
    }
  }

  async function onRollAgain() {
    if (rolling.current || !canRollAgain(human())) return
    rolling.current = true
    setBusy(true)
    try {
      setSceneReady(false)
      setAiText(null)
      sfx.dice()
      const ng = rollAgain(human(), worldOf(playersRef.current))
      const b = boardRef.current
      if (b) {
        await anim(b.rollDice(ng.diceFaces), 7000)
        b.hideDice()
        await anim(b.moveToken(0, ng.pos), 9000)
        b.setActiveTile(ng.pos)
      } else await sleep(900 + ng.dice * 80)
      commit(0, ng)
      requestAi(ng)
      sfx.card()
    } finally {
      rolling.current = false
      setSceneReady(true)
      setBusy(false)
    }
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
  }, [g, aiText, getLang()]) // eslint-disable-line react-hooks/exhaustive-deps

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

  // 和對手交易(收購 / 出售地產、借錢給對手)
  function onDeal(fn, ...args) {
    const { players: np, note } = fn(playersRef.current, ...args)
    if (!note) return
    playersRef.current = np
    setPlayers(np)
    setFeed((f) => [{ id: ++uid, icon: '🤝', who: t('你'), text: note, tone: 'good' }, ...f].slice(0, 12))
    showToast({ icon: '🤝', title: t('交易完成'), text: note, tone: 'good' }, 2000)
    sfx.coin()
  }

  function onFileClaim(picks) {
    const ng = fileClaim(human(), picks)
    commit(0, ng)
    sfx.stamp()
    if (ng.claim?.filed?.missing.length) { fx('pending', t('理賠金延到下一年入帳')); setTimeout(() => sfx.bad(), 200) } else { fx('approved', `+${wan(ng.claim.amount)}`); setTimeout(() => sfx.claim(), 200) }
  }

  async function onContinue() {
    if (claimPending(human())) return // 理賠還沒申請
    // 雙骰獎勵:先再擲一次
    if (canRollAgain(human())) return onRollAgain()
    // 年度大事之後,還有這一年的小事就先處理
    if (hasMinor(human())) {
      const nm = nextMinor(human())
      commit(0, nm)
      if (nm.scene?.defId === 'mkt_flash') { const up = nm.scene.tone === 'good'; fx(up ? 'rally' : 'crash', nm.scene.title); if (up) sfx.rally(); else sfx.crash() }
      setAiText(null)
      sfx.card()
      return
    }
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
      showToast({ icon: '🎯', title: t('任務達成:{title}', { title: q.title }), tone: 'good' }, 2200)
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
      const note = cover > 0 ? t('保險理賠 {amt}', { amt: wan(cover) }) : loss < 0 ? t('支出 {amt}', { amt: wan(-loss) }) : t('平安度過')
      const tone = cover > 0 ? 'good' : loss < -150000 ? 'bad' : ''
      const item = { id: ++uid, icon: sc.icon, who: t(pl.name), text: `${quote(sc.title)}${getLang() === 'en' ? ' ' : ''}${note}`, tone }
      setFeed((f) => [item, ...f].slice(0, 12))
      if (!botFast) {
        showToast({ icon: sc.icon, title: `${t(pl.name)}${colon()}${sc.title}`, text: note, tone }, 1100)
        if (cover > 0) sfx.claim(); else if (loss < -150000) sfx.bad()
      }
      const rankBefore = rank(playersRef.current).find((r) => r.id === pl.id).rank
      commit(i, s)
      processOps(i)
      // 雙骰:再擲一次、再走一段
      if (canRollAgain(playersRef.current[i].s)) {
        let s2 = rollAgain(playersRef.current[i].s, worldOf(playersRef.current))
        if (b && !botFast) await b.moveToken(i, s2.pos)
        else if (b) b.teleport(i, s2.pos)
        s2 = botAct(s2, pl.persona)
        const sc2 = s2.scene
        setFeed((f) => [{ id: ++uid, icon: '🎲', who: t(pl.name), text: t('雙骰再擲一次:{title}', { title: quote(sc2.title) }), tone: '' }, ...f].slice(0, 12))
        commit(i, s2)
        processOps(i)
      }
      const bought = sc.kind === 'property' && ['buy_cash', 'buy_loan'].includes(sc.choices[s.scene.picked]?.tag)
      s = endYear(botMinors(playersRef.current[i].s, pl.persona))
      commit(i, s)
      const rankNow = rank(playersRef.current)
      const mine = rankNow.find((r) => r.id === pl.id).rank
      const humanBehind = rankNow.find((r) => r.human).rank > mine
      const kind = classifyBanter({ sc, cover, loss, bankrupt: s.ended?.reason === 'bankrupt', bought, rankNow: mine, rankBefore, human: humanBehind })
      if (kind) setTimeout(() => say(i, kind, botFast), botFast ? 0 : 900)
      if (s.ended?.reason === 'bankrupt') {
        const bi = { id: ++uid, icon: '💥', who: t(pl.name), text: t('{age} 歲破產出局!資金斷裂、資產被拍賣', { age: s.ended.age }), tone: 'bad' }
        setFeed((f) => [bi, ...f].slice(0, 12))
        showToast({ icon: '💥', title: t('{name} 破產出局', { name: pl.name }), text: t('現金見底、資產被拍賣'), tone: 'bad' }, 2200)
        fx('bankrupt', t(pl.name))
        sfx.bad()
      }
      if (!botFast) await sleep(500)
    }
    // 借給對手的錢:每一輪結束收一次款;有對手手頭緊就提醒你
    const { players: lp, notes: ln } = settleLoans(playersRef.current)
    if (ln.length) {
      playersRef.current = lp
      setPlayers(lp)
      setFeed((f) => [...ln.map((n) => ({ id: ++uid, icon: n.icon, who: t('你'), text: n.text, tone: n.tone })), ...f].slice(0, 12))
    }
    const req = playersRef.current[0].s.phase !== 'ended' && loanRequest(playersRef.current)
    if (req) setFeed((f) => [{ id: ++uid, icon: '💬', who: t(req.name), text: t('想跟你借 {amt},打開規劃的「交易」分頁看看', { amt: wan(req.amount) }), tone: '' }, ...f].slice(0, 12))
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
      return { id: p.id, name: t(p.name), persona: `${t(p.persona.title)}${colon()}${t(p.persona.blurb)}`, age: p.s.age, rank: r.rank, players: rows.length, netWorthWan: Math.round(r.net / 10000), coverage: t('{n} 項', { n: Object.values(p.s.coverage).filter(Boolean).length }), properties: Object.keys(p.s.props || {}).length }
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
    const fr = demo ? [] : recordGame(ctx).fresh // 展示模式的對局不計入成就與戰績
    if (!demo) saveRecent(Object.keys(h.seen))
    setNewCards(demo ? [] : saveCodex(collectedIn(h)))
    if (demo) setDemo((d) => d && { ...d, done: true })
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
  const tokenPlayers = useMemo(() => players.map((p) => ({ look: p.look, name: p.name, pos: p.s.pos || 0 })), [gameKey]) // eslint-disable-line react-hooks/exhaustive-deps

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
  if (screen === 'title') return <Title aiInfo={aiInfo} onDemo={startDemo} onStart={() => setScreen('create')} onRecords={() => setScreen('records')} save={loadSave()} onResume={resumeGame} />
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
        histStart={histStart}
        setHistStart={setHistStart}
      />
    )
  }
  if (!g) return null
  if (screen === 'result') {
    return (
      <>
        <ResultScreen s={g} aiOn={aiInfo.ai} ranks={ranks} fresh={fresh} newCards={newCards} onAgain={() => setScreen('create')} onRecords={() => setScreen('records')} />
        {demo && <DemoBar caption={demoCaption({ ended: true })} done onExit={exitDemo} onRestart={startDemo} />}
      </>
    )
  }

  const centerSlot = (
    <div className="center-actions">
      <button className="btn primary big" onClick={onRoll} disabled={g.phase !== 'plan' || busy || planOpen || !!stage || !!auto} aria-label={g.hospitalTurns > 0 ? t('住院休養') : t('擲骰子')}>{g.hospitalTurns > 0 ? <><BedDouble size={20} aria-hidden /> {t('住院休養(跳過這回合)')}</> : <><Dices size={22} aria-hidden /> {t('擲骰子')}</>}</button>
    </div>
  )

  return (
    <div className={`game3 ${shake ? 'shake' : ''}`}>
      <header className="topbar">
        <div className="brand"><Dices size={22} aria-hidden /> {t('保險大富翁')}</div>
        <div className="topbar-r">
          <span className={`ai-pill ${aiInfo.ai ? '' : 'dim'}`} title={aiInfo.ai ? `Gemini(${aiInfo.model})` : t('未設定金鑰,使用內建題庫與規則式教練')}>
            {aiInfo.ai ? (aiInfo.mock ? t('✨ AI(模擬)') : t('✨ AI 已連線')) : t('離線備援模式')}
          </span>
          <button className="btn ghost" onClick={toggleMute} aria-pressed={muted} title={t('音效')}>{muted ? <VolumeX size={18} aria-hidden /> : <Volume2 size={18} aria-hidden />}</button>
          {players.length > 1 && <button className={`btn ghost ${botFast ? 'on' : ''}`} onClick={() => setBotFast((v) => !v)} aria-pressed={botFast} title={t('對手回合快轉')}><FastForward size={16} aria-hidden /> {t('快轉')}</button>}
          <button className="btn ghost" onClick={toggle3d} title={t('切換 2D / 3D')}>{use3d ? <Box size={16} aria-hidden /> : <Grid2x2 size={16} aria-hidden />} {use3d ? '3D' : '2D'}</button>
          {!demo && <AutopilotMenu active={!!auto} left={auto?.left} defaultPersona={g.player.style === '冒險型' ? 'balanced' : 'steady'} disabled={g.phase !== 'plan' || busy || planOpen} onStart={startAuto} onStop={() => stopAuto()} />}{/* i18n-ignore:'冒險型' 是比對用的內部值 */}
          <label className="switch"><input type="checkbox" checked={coach} onChange={(e) => setCoach(e.target.checked)} /><span>{t('教練提示')}</span></label>
          <button className="btn ghost" onClick={() => setScreen('create')}><RotateCcw size={15} aria-hidden /> {t('重新開始')}</button>
        </div>
      </header>

      <div className="gbody">
        {wide && <aside className="side side-l"><Dashboard s={g} onQuick={busy || demo || auto ? null : (tab) => { setPlanTab(tab); setPlanOpen(true); setDrawer(null) }} /></aside>}
        <main className="gstage">
          {use3d ? (
            <Suspense fallback={<div className="board3d-loading">{t('3D 棋盤載入中…')}</div>}>
              <Board3D key={gameKey} ref={boardRef} players={tokenPlayers} owners={ownersMap} onFail={() => setUse3d(false)} onStep={() => sfx.step()} onTileClick={(i) => { if (!demo && !busy) setInspect(i) }} />
            </Suspense>
          ) : (
            <div className="board-2d"><Board tokens={players.map((p, i) => ({ pos: p.s.pos, look: p.look, active: i === activeIdx }))} centerSlot={null} owners={ownersMap} onTileClick={(i) => { if (!demo && !busy) setInspect(i) }} /></div>
          )}
          <div className="stage-hud">
            <div className="year-chip">
              <Avatar look={g.player.look} size={30} ring={false} />
              <span><b>{t('{age} 歲', { age: g.age })}</b> · {t('第 {n} / {m} 年', { n: Math.min(g.turn + 1, g.years), m: g.years })}{histYearOf(g) ? ` · ${t('台股 {year} 年', { year: histYearOf(g).year })}` : ''}{players.length > 1 && activeIdx > 0 ? ` · ${t('{name}的回合', { name: players[activeIdx].name })}` : ''}</span>
            </div>
            {auto && !demo && <div className="auto-chip" role="status"><i className="pulse" aria-hidden /> {Number.isFinite(auto.left) ? t('電腦託管中 · 還剩 {n} 年', { n: Math.max(0, auto.left) }) : t('電腦託管中 · 到結束')} <button onClick={() => stopAuto()}>{t('接手')}</button></div>}
            <Toast toast={toast} />
            <Popups items={popups} />
            {use3d && (
              <div className="action-bar">
                <button className="btn primary big" onClick={onRoll} disabled={g.phase !== 'plan' || busy || planOpen || !!stage || !!auto} aria-label={g.hospitalTurns > 0 ? t('住院休養') : t('擲骰子')}>{g.hospitalTurns > 0 ? <><BedDouble size={20} aria-hidden /> {t('住院休養(跳過這回合)')}</> : <><Dices size={22} aria-hidden /> {t('擲骰子')}</>}</button>
                <button className="btn big2" onClick={() => { setPlanTab('cover'); setPlanOpen(true) }} disabled={g.phase !== 'plan' || busy || !!auto}><ShieldCheck size={18} aria-hidden /> {t('規劃與理財')}</button>
                <button className="btn big2" onClick={() => setAskOpen(true)} disabled={busy}><MessageCircle size={18} aria-hidden /> {t('問理專')}</button>
              </div>
            )}
            {!use3d && <div className="action-bar">{centerSlot}<button className="btn big2" onClick={() => { setPlanTab('cover'); setPlanOpen(true) }} disabled={g.phase !== 'plan' || busy || !!auto}><ShieldCheck size={18} aria-hidden /> {t('規劃與理財')}</button><button className="btn big2" onClick={() => setAskOpen(true)}>💬 {t('問理專')}</button></div>}
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
        <nav className="mbar" aria-label={t('面板')}>
          <button onClick={() => setDrawer('status')}><BarChart3 size={18} aria-hidden /> {t('狀態')}</button>
          <button onClick={() => setDrawer('rank')}><Flag size={18} aria-hidden /> {t('排名與任務')}</button>
        </nav>
      )}
      <Drawer open={drawer === 'status'} onClose={() => setDrawer(null)} title={t('我的狀態')}><Dashboard s={g} onQuick={busy || demo || auto ? null : (tab) => { setPlanTab(tab); setPlanOpen(true); setDrawer(null) }} /></Drawer>
      <Drawer open={drawer === 'rank'} onClose={() => setDrawer(null)} title={t('排名與任務')}>
        {rows.length > 1 && <Leaderboard rows={rows} activeId={players[activeIdx]?.id} />}
        <QuestPanel quests={quests} />
        <Feed items={feed} />
      </Drawer>

      {inspect != null && <TileInfo index={inspect} players={players} owner={ownersMap[inspect]} humanPos={g.pos || 0} onClose={() => setInspect(null)} />}
      {askOpen && <AskModal s={g} aiOn={aiInfo.ai} onClose={() => setAskOpen(false)} />}
      {debugMg && <MiniGameModal game={debugMg} s={g} onDone={(r) => { console.log('MG ' + JSON.stringify(r)); setDebugMg(null) }} />}
      {planOpen && !debugMg && (
        <PlanModal
          s={g}
          coach={coach}
          title={g.turn === 0 ? t('開局規劃:{name} · {age} 歲', { name: g.player.name, age: g.age }) : t('{age} 歲 · 年度規劃', { age: g.age })}
          onCoverage={(id, tier) => commit(0, setCoverage(human(), id, tier))}
          onTrade={(cls, d) => commit(0, trade(human(), cls, d))}
          onBorrow={(a) => commit(0, borrow(human(), a))}
          onRepay={(a) => commit(0, repay(human(), a))}
          onPropAction={(id, act) => commit(0, propAction(human(), id, act))}
          onAct={(fn, ...args) => commit(0, fn(human(), ...args))}
          initialTab={planTab}
          world={worldOf(players)}
          players={players}
          onDeal={onDeal}
          onClose={() => setPlanOpen(false)}
        />
      )}
      {showScene && scene.kind === 'minigame' && g.phase === 'scene' && <MiniGameModal key={scene.defId + g.turn} game={scene.base.game} s={g} onDone={onMinigameDone} />}
      {showScene && !(scene.kind === 'minigame' && g.phase === 'scene') && <SceneModal scene={scene} tips={coach && g.phase === 'scene' ? coachScene(g, scene) : null} phase={g.phase} onChoose={onChoose} onContinue={onContinue} aiTag={!!aiText} loadingAi={loadingAi} claim={g.phase === 'result' ? g.claim : null} onFileClaim={onFileClaim} />}
      <Tutorial enabled={g.turn === 0 && !params.get('auto') && !params.get('notut') && !demo} planOpen={planOpen} />
      {yearOpen && <YearModal s={g} onNext={onYearNext} last={g.phase === 'ended'} />}
      <FxLayer />
      {demo && (
        <DemoBar
          caption={demoCaption({
            intro: !demo.introDone, stage: !!stage, yearOpen, lifeStage: !!g.scene?.stage && g.phase !== 'plan', oppTurn: activeIdx > 0 && busy, turn: g.turn, phase: g.phase, kind: g.scene?.kind, aiScene: !!aiText,
            payout: g.phase === 'result' && g.scene?.result ? g.scene.result.lines.filter((l) => l.kind === 'cover' && l.amount > 0).reduce((a, l) => a + l.amount, 0) : 0,
          })}
          year={Math.min(g.turn + 1, g.years)} years={g.years || DEMO_YEARS} paused={demo.paused} fast={demo.fast}
          onPause={() => setDemo((d) => ({ ...d, paused: !d.paused }))}
          onFast={() => { setBotFast(!demo.fast); setDemo((d) => ({ ...d, fast: !d.fast })) }}
          onExit={exitDemo}
        />
      )}
      {stage && <StageModal data={stage.data} fromAi={stage.fromAi} loading={stage.loading} onClose={closeStage} age={g.age} />}
    </div>
  )
}

function Title({ aiInfo, onStart, onRecords, save, onResume, onDemo }) {
  const hero = useArt()('title_hero')
  const looks = [
    { ...defaultLook(), style: 'short', top: LOOKS.tops[0], extra: 'headphones' },
    { ...defaultLook(), style: 'long', top: LOOKS.tops[2], hair: LOOKS.hairs[1] },
    { ...defaultLook(), style: 'bun', top: LOOKS.tops[1], extra: 'glasses' },
    { ...defaultLook(), style: 'messy', top: LOOKS.tops[4], hair: LOOKS.hairs[2], extra: 'beanie' },
  ]
  return (
    <div className="screen title">
      <div className="title-card">
        {hero && <img className="title-hero" src={hero} alt="" onError={(e) => { e.currentTarget.style.display = 'none' }} />}
        <div className="title-badge">{t('Cardif InsurHack 2026 · 題目 1-1')}</div>
        <h1>{t('保險大富翁')}</h1>
        <p className="title-sub">{t('財務人生模擬遊戲 · Financial Life Simulator')}</p>
        <p className="title-desc">
          {t('擲骰子、走格子、抽事件卡,和電腦對手一起在 3D 棋盤上走完人生。')}
          <br />
          {t('途中會遇到結婚、買房、投資、意外與市場起伏,還有各種保險小遊戲:配對翻牌、防詐騙、命運輪盤……')}
          <br />
          {t('想從 0 歲出生開始也可以,或是直接進入棋盤。金額與保險給付由規則引擎精算,劇情與學習回饋由 AI 依你的處境產生。')}
        </p>
        <div className="title-avatars">{looks.map((l, i) => <Avatar key={i} look={l} size={72} />)}</div>
        {save && (
          <div className="resume-box">
            <button className="btn primary huge" onClick={onResume}>▶ {t('繼續上次的人生')}</button>
            <small>{t('{name} · {age} 歲 · 第 {turn} / {years} 年 · {n} 位對手', { name: save.meta.name, age: save.meta.age, turn: Math.min(save.meta.turn + 1, save.meta.years), years: save.meta.years, n: save.meta.opponents })}</small>
          </div>
        )}
        <div className="title-btns">
          <button className="btn primary huge" onClick={onStart}>{t('開始新的人生')}</button>
          <button className="btn huge2" onClick={onRecords}>🏅 {t('成就與戰績')}</button>
          <button className="btn huge2" onClick={onDemo}>🎬 {t('展示模式')}</button>
          <button className="btn huge2" onClick={() => window.dispatchEvent(new Event('pp-help'))}>📖 {t('玩法說明')}</button>
          <button className="btn huge2" onClick={() => window.dispatchEvent(new Event('pp-codex'))}>📚 {t('觀念圖鑑')}</button>
        </div>
        <ol className="how">
          <li><b>{t('1 創角')}</b>{t('可從出生開始,或直接進棋盤')}</li>
          <li><b>{t('2 規劃')}</b>{t('配置保障、投資與貸款')}</li>
          <li><b>{t('3 大富翁')}</b>{t('擲骰、事件卡、小遊戲、對手排名')}</li>
          <li><b>{t('4 結算')}</b>{t('平行人生對照與 AI 教練')}</li>
        </ol>
        <div className={`ai-pill ${aiInfo.ai ? '' : 'dim'}`}>{aiInfo.ai ? t('✨ AI 編劇與教練已連線') : t('離線備援模式(使用內建題庫)')}</div>
      </div>
    </div>
  )
}

export default function App() {
  useLang() // 語言切換時整個畫面重新渲染
  return (
    <>
      <GameApp />
      <SettingsLayer />
    </>
  )
}
