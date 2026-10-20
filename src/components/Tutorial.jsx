import { useCallback, useEffect, useLayoutEffect, useState } from 'react'
import { ChevronRight, X, Dices } from 'lucide-react'

const KEY = 'policypilot.tutorial'

// phase: 'plan' = 開局規劃視窗開著時;'board' = 回到棋盤之後。target 為 CSS 選擇器,沒有就置中說明。
const STEPS = [
  { phase: 'plan', title: '歡迎來到保險大富翁!', body: '這是一場用大富翁走完人生的遊戲:每走一格就是人生的一年,會遇到結婚、買房、投資、意外與市場起伏。你要靠「保障」與「理財」,讓自己和家人撐過去。花 30 秒帶你看一下。' },
  { phase: 'plan', target: '.modal.plan .tabs', title: '四個分頁', body: '保障(買保險)、理財(存錢與投資)、資產(棋盤上的地產)、貸款。每年擲骰子之前,都可以回來調整。' },
  { phase: 'plan', target: '.modal.plan .prod', title: '保險有不同等級', body: '選越高的等級,保費越貴、遇到事情賠得越多。沒買的保障,出事時全部自己扛。保費每年年底自動扣款。' },
  { phase: 'plan', target: '.modal.plan .summary', title: '看這裡的健康狀態', body: '緊急預備金建議至少 3 到 6 個月;保費占收入約 10% 到 15% 比較健康。開啟上方的「教練提示」,會更清楚告訴你缺了什麼。' },
  { phase: 'plan', target: '.modal.plan .modal-h .btn.primary', title: '準備好了就開始', body: '按「完成,去擲骰」關閉這個視窗,回到棋盤。' },
  { phase: 'board', target: '.action-bar .btn.primary', title: '擲骰子前進', body: '擲出幾點就走幾格,每一格都是不同的事件、機會、投資或地產。走一圈接著下一年。' },
  { phase: 'board', target: '.side-l', title: '你的狀態', body: '淨資產、現金、貸款、健康、手牌與目前的保障都在這裡。數字紅色代表要注意。' },
  { phase: 'board', target: '.side-r', title: '排名與任務', body: '電腦對手和你走同一個棋盤。這裡是即時排名、你的人生任務,以及對手的動態與對話。' },
  { phase: 'board', target: '.topbar .switch', title: '教練提示', body: '勾選後,每個選項都會顯示預估花費、保險能賠多少與建議,想學東西時很有用。' },
  { phase: 'board', target: '.settings-fab', title: '設定', body: '深色模式、介面大小、音量、減少動畫與色盲友善配色,都在這裡,也可以重看教學。祝你玩得開心!' },
]

export const resetTutorial = () => { try { localStorage.removeItem(KEY) } catch { /* 忽略 */ } window.dispatchEvent(new Event('pp:tutorial')) }

export default function Tutorial({ enabled, planOpen }) {
  const [idx, setIdx] = useState(() => { try { return localStorage.getItem(KEY) ? -1 : 0 } catch { return -1 } })
  const [rect, setRect] = useState(null)
  const phaseNow = planOpen ? 'plan' : 'board'

  useEffect(() => {
    const on = () => setIdx(0)
    window.addEventListener('pp:tutorial', on)
    return () => window.removeEventListener('pp:tutorial', on)
  }, [])

  const finish = useCallback(() => { setIdx(-1); try { localStorage.setItem(KEY, '1') } catch { /* 忽略 */ } }, [])

  // 規劃視窗被提早關掉,就直接跳到棋盤的步驟;還在規劃時,棋盤的步驟先等著
  useEffect(() => {
    if (idx < 0 || !enabled) return
    if (STEPS[idx].phase === 'plan' && !planOpen) {
      const next = STEPS.findIndex((s) => s.phase === 'board')
      setIdx(next)
    }
  }, [idx, planOpen, enabled])

  const step = idx >= 0 && enabled ? STEPS[idx] : null
  const visible = step && step.phase === phaseNow

  const measure = useCallback(() => {
    if (!step?.target) return setRect(null)
    const el = document.querySelector(step.target)
    if (!el) return setRect(null)
    const r = el.getBoundingClientRect()
    setRect(r.width && r.height ? { x: r.left, y: r.top, w: r.width, h: r.height } : null)
  }, [step])

  useLayoutEffect(() => {
    if (!visible) return undefined
    measure()
    const raf = requestAnimationFrame(measure)
    const t = setTimeout(measure, 80)
    window.addEventListener('resize', measure)
    window.addEventListener('scroll', measure, true)
    const iv = setInterval(measure, 400)
    return () => { cancelAnimationFrame(raf); clearTimeout(t); clearInterval(iv); window.removeEventListener('resize', measure); window.removeEventListener('scroll', measure, true) }
  }, [visible, measure])

  useEffect(() => {
    if (!visible) return undefined
    const onKey = (e) => { if (e.key === 'Escape') finish() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [visible, finish])

  if (!visible) return null
  const last = idx === STEPS.length - 1
  const pad = 8
  const vw = window.innerWidth, vh = window.innerHeight
  const cardW = Math.min(340, vw - 24)
  let cardStyle = { left: (vw - cardW) / 2, top: Math.max(16, vh / 2 - 110), width: cardW }
  if (rect) {
    const below = rect.y + rect.h + pad + 190 < vh
    const top = below ? rect.y + rect.h + pad + 10 : Math.max(12, rect.y - pad - 10 - 190)
    const left = Math.min(Math.max(12, rect.x + rect.w / 2 - cardW / 2), vw - cardW - 12)
    cardStyle = { left, top, width: cardW }
  }
  const next = () => {
    if (last) return finish()
    const n = idx + 1
    // 下一步在棋盤、但規劃視窗還開著:等使用者按「完成」
    setIdx(n)
  }

  return (
    <div className="tour" role="dialog" aria-label="新手教學">
      {rect
        ? <div className="tour-spot" style={{ left: rect.x - pad, top: rect.y - pad, width: rect.w + pad * 2, height: rect.h + pad * 2 }} />
        : <div className="tour-dim" />}
      <div className="tour-card" style={cardStyle}>
        <div className="tour-top">
          <span className="tour-step"><Dices size={14} aria-hidden /> 教學 {idx + 1} / {STEPS.length}</span>
          <button className="tour-skip" onClick={finish} aria-label="略過教學"><X size={14} aria-hidden /> 略過</button>
        </div>
        <h3>{step.title}</h3>
        <p>{step.body}</p>
        <button className="btn primary tour-next" onClick={next}>{last ? '開始玩!' : '下一步'} <ChevronRight size={16} aria-hidden /></button>
      </div>
    </div>
  )
}
