import { useEffect, useState } from 'react'
import { t } from '../i18n.js'

// 關鍵時刻的畫面特效:理賠核准 / 補件、雙骰、股市急漲急跌、破產。
// 用 window 事件觸發:window.dispatchEvent(new CustomEvent('pp-fx', { detail: { type, text } }))
// 設定「減少動畫」時只顯示文字,不做動畫(CSS 處理)。
export const fx = (type, text) => window.dispatchEvent(new CustomEvent('pp-fx', { detail: { type, text } }))

const LOOK = {
  approved: { icon: '✅', title: () => t('理賠核准'), cls: 'stamp good' },
  pending: { icon: '📨', title: () => t('補件中'), cls: 'stamp warn' },
  doubles: { icon: '🎲', title: () => t('雙骰!再擲一次'), cls: 'pop gold' },
  crash: { icon: '📉', title: () => t('股市急跌'), cls: 'flashbg bad' },
  rally: { icon: '📈', title: () => t('股市大漲'), cls: 'flashbg good' },
  bankrupt: { icon: '💥', title: () => t('破產出局'), cls: 'flashbg bad' },
}

export default function FxLayer() {
  const [cur, setCur] = useState(null)
  useEffect(() => {
    let timer
    const on = (e) => {
      clearTimeout(timer)
      setCur({ ...e.detail, key: Date.now() })
      timer = setTimeout(() => setCur(null), 1700)
    }
    window.addEventListener('pp-fx', on)
    return () => { window.removeEventListener('pp-fx', on); clearTimeout(timer) }
  }, [])
  if (!cur || !LOOK[cur.type]) return null
  const L = LOOK[cur.type]
  return (
    <div className={`fx-layer fx-${cur.type} ${L.cls}`} key={cur.key} aria-live="polite">
      <div className="fx-badge">
        <span className="fx-icon" aria-hidden>{L.icon}</span>
        <b>{L.title()}</b>
        {cur.text && <small>{cur.text}</small>}
      </div>
      {cur.type === 'doubles' && <div className="fx-sparks" aria-hidden>{Array.from({ length: 10 }, (_, i) => <i key={i} style={{ '--a': `${i * 36}deg` }} />)}</div>}
    </div>
  )
}
