import { useState } from 'react'
import { X, Library } from 'lucide-react'
import { CODEX, CODEX_THEMES, codexProgress } from '../game/codex.js'
import { loadCodex } from '../save.js'
import { t } from '../i18n.js'

const KIND = { event: '生活事件', chance: '機會卡', market: '市場行情', minor: '生活小事', quiz: '小測驗', tip: '小觀念' }

// 觀念圖鑑:四大主題的收集進度,點亮的卡可以重看重點
export default function CodexModal({ onClose }) {
  const have = new Set(loadCodex())
  const [theme, setTheme] = useState('insurance')
  const prog = codexProgress([...have])
  const list = CODEX.filter((c) => c.theme === theme)
  const total = prog.reduce((a, p) => a + p.got, 0)
  return (
    <div className="overlay set-overlay" role="dialog" aria-modal="true" aria-label={t('觀念圖鑑')} onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal help codex">
        <header className="set-h">
          <h2><Library size={22} aria-hidden /> {t('觀念圖鑑')}</h2>
          <button className="btn ghost set-x" onClick={onClose} aria-label={t('關閉')}><X size={20} aria-hidden /></button>
        </header>
        <p className="muted">{t('遊戲裡遇到的事件、行情、小事與測驗都會點亮一張觀念卡,跨局累積。已收集 {got} / {all} 張。', { got: total, all: CODEX.length })}</p>
        <div className="codex-themes" role="tablist">
          {prog.map((p) => (
            <button key={p.id} role="tab" aria-selected={theme === p.id} className={`codex-theme ${theme === p.id ? 'on' : ''}`} onClick={() => setTheme(p.id)}>
              <span>{p.icon} {t(p.name)}</span>
              <span className="codex-bar"><i style={{ width: `${(p.got / Math.max(1, p.total)) * 100}%` }} /></span>
              <small>{p.got} / {p.total}</small>
            </button>
          ))}
        </div>
        <ul className="codex-grid">
          {list.map((c) => (have.has(c.id)
            ? (
              <li key={c.id} className="codex-card got">
                <b><span aria-hidden>{c.icon}</span> {t(c.title)}</b>
                <small className="codex-kind">{t(KIND[c.kind])}</small>
                <p>{t(c.text)}</p>
              </li>
            )
            : (
              <li key={c.id} className="codex-card">
                <b><span aria-hidden>❔</span> {t('尚未收集')}</b>
                <small className="codex-kind">{t(KIND[c.kind])}</small>
              </li>
            )))}
        </ul>
      </div>
    </div>
  )
}
