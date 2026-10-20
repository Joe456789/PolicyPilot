import { useRef, useState, useEffect } from 'react'
import { lookupGlossary, SUGGESTED_QUESTIONS } from '../game/glossary.js'
import { ai } from '../ai.js'
import { sfx } from '../sfx.js'
import { t, getLang } from '../i18n.js'

// 互動式理專助教:問保險與投資觀念。有 AI 時由 Gemini 依「遊戲資料 + 小辭典」回答,沒有時用離線小辭典。
export default function AskModal({ s, aiOn, onClose }) {
  const [q, setQ] = useState('')
  const [busy, setBusy] = useState(false)
  const [chat, setChat] = useState([{ who: 'bot', text: t('嗨 {name},我是理專助教。保險與投資的問題都可以問我,我會依你目前的狀況回答。', { name: s.player.name }), tag: '' }])
  const [follow, setFollow] = useState(SUGGESTED_QUESTIONS.slice(0, 3))
  const end = useRef(null)
  useEffect(() => { end.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }) }, [chat, busy])

  async function send(text) {
    const question = (text ?? q).trim()
    if (question.length < 2 || busy) return
    sfx.click()
    setQ('')
    const shown = SUGGESTED_QUESTIONS.includes(question) ? t(question) : question
    setChat((c) => [...c, { who: 'me', text: shown }])
    setBusy(true)
    const out = aiOn ? await ai.ask(shown, s) : null
    setBusy(false)
    if (out) {
      setChat((c) => [...c, { who: 'bot', text: out.answer, tag: 'ai' }])
      setFollow(out.followups?.length ? out.followups : SUGGESTED_QUESTIONS.slice(0, 3))
    } else {
      const hits = lookupGlossary(question, 2)
      const text2 = hits.length
        ? hits.map((h) => (getLang() === 'en' ? `[${t(h.title)}] ${t(h.text)}` : `【${h.title}】${h.text}`)).join('\n\n')
        : t('這個問題我在離線小辭典裡找不到。你可以換個說法,例如「醫療險」「緊急預備金」「ETF」「投資型保單」。')
      setChat((c) => [...c, { who: 'bot', text: text2, tag: 'offline' }])
      setFollow(SUGGESTED_QUESTIONS.slice(0, 3))
    }
  }

  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label={t('問理專')}>
      <div className="modal ask">
        <header className="modal-h">
          <div><h2>💬 {t('問理專')}</h2><p className="muted">{t('保險與投資觀念,隨時問。')}{aiOn ? t('由 Gemini 依你的處境回答。') : t('(離線小辭典模式)')}</p></div>
          <button className="btn primary" onClick={onClose}>{t('關閉')}</button>
        </header>
        <div className="chat" aria-live="polite">
          {chat.map((m, i) => (
            <div key={i} className={`msg ${m.who}`}>
              <div className="bubble2">{m.text}</div>
              {m.tag && <small className="msg-tag">{m.tag === 'ai' ? t('✨ AI 回答') : t('離線小辭典')}</small>}
            </div>
          ))}
          {busy && <div className="msg bot"><div className="bubble2 typing"><i /><i /><i /></div></div>}
          <div ref={end} />
        </div>
        <div className="chips">
          {follow.map((f) => <button key={f} className="chip-q" onClick={() => send(f)} disabled={busy}>{t(f)}</button>)}
        </div>
        <form className="ask-form" onSubmit={(e) => { e.preventDefault(); send() }}>
          <input id="ask-q" value={q} onChange={(e) => setQ(e.target.value)} maxLength={120} placeholder={t('輸入你的問題,例如:我需要壽險嗎?')} aria-label={t('輸入問題')} />
          <button className="btn primary" type="submit" disabled={busy || q.trim().length < 2}>{t('送出')}</button>
        </form>
        <p className="muted small">{t('教學用途的一般觀念說明,不構成投保或投資建議;實際商品以條款與核保為準。')}</p>
      </div>
    </div>
  )
}
