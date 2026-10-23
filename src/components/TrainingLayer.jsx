import { useEffect, useState } from 'react'
import RoleplayCenter from './Roleplay.jsx'
import AssessModal from './AssessModal.jsx'
import CaseChallenge from './CaseChallenge.jsx'
import ManagerDashboard from './ManagerDashboard.jsx'
import { aiHealth } from '../ai.js'
import { useLang } from '../i18n.js'

// 訓練中心:AI 客戶對練等工具,任何畫面都可以用事件打開。
//   window.dispatchEvent(new CustomEvent('pp-roleplay', { detail: { game, client } }))
//   window.dispatchEvent(new CustomEvent('pp-test', { detail: { phase: 'pre' | 'post' } }))
//   window.dispatchEvent(new CustomEvent('pp-case'))、'pp-manager'(主管後台)
export default function TrainingLayer() {
  useLang()
  const [ai, setAi] = useState(false)
  const [panel, setPanel] = useState(null)
  useEffect(() => {
    let alive = true
    aiHealth().then((h) => { if (alive) setAi(!!h.ai) })
    const onRp = (e) => setPanel({ kind: 'roleplay', ...(e.detail || {}) })
    const onTest = (e) => setPanel({ kind: 'test', phase: e.detail?.phase === 'post' ? 'post' : 'pre' })
    const onCase = () => setPanel({ kind: 'case' })
    const onMgr = () => setPanel({ kind: 'manager' })
    const evs = [['pp-roleplay', onRp], ['pp-test', onTest], ['pp-case', onCase], ['pp-manager', onMgr]]
    for (const [n, f] of evs) window.addEventListener(n, f)
    return () => { alive = false; for (const [n, f] of evs) window.removeEventListener(n, f) }
  }, [])
  const close = () => setPanel(null)
  if (!panel) return null
  if (panel.kind === 'roleplay') return <RoleplayCenter game={panel.game} initialClient={panel.client} aiOn={ai} onClose={close} />
  if (panel.kind === 'test') return <AssessModal key={panel.phase} phase={panel.phase} onClose={close} />
  if (panel.kind === 'case') return <CaseChallenge onClose={close} onRoleplay={(client) => setPanel({ kind: 'roleplay', client })} />
  if (panel.kind === 'manager') return <ManagerDashboard onClose={close} />
  return null
}
