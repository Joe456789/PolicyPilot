import { useEffect, useRef, useState } from 'react'
import { CLIENT_LIST, clientFromGame, newSession, clientTurn, scoreSession, offlineFeedback, MAX_TURNS } from '../game/roleplay.js'
import { addTraining } from '../training.js'
import { ai } from '../ai.js'
import { sfx } from '../sfx.js'
import { t } from '../i18n.js'

// AI 客戶對練:你是理專,客戶由 Gemini 扮演(沒有 AI 時用離線規則)。
// 客戶「這一句要表達什麼」與分數都由規則決定(src/game/roleplay.js),AI 只負責把話說得像真人。
export default function RoleplayCenter({ game, initialClient, aiOn, onClose }) {
  const [client, setClient] = useState(initialClient || null)
  const [round, setRound] = useState(0)
  if (!client) return <ClientPicker game={game} onPick={setClient} onClose={onClose} />
  return <Session key={`${client.id}-${round}`} client={client} aiOn={aiOn} onBack={() => setClient(null)} onRetry={() => setRound((r) => r + 1)} onClose={onClose} />
}

function ClientPicker({ game, onPick, onClose }) {
  const mine = game ? clientFromGame(game) : null
  const list = mine ? [mine, ...CLIENT_LIST] : CLIENT_LIST
  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label={t('AI 客戶對練')} onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal rp-pick">
        <header className="modal-h">
          <div>
            <h2>🎭 {t('AI 客戶對練')}</h2>
            <p className="muted">{t('這次換你當理專。挑一位客戶,用 {n} 句話以內了解他、說明清楚、給出適合的建議。', { n: MAX_TURNS })}</p>
          </div>
          <button className="btn" onClick={onClose}>{t('關閉')}</button>
        </header>
        <ul className="rp-clients">
          {list.map((c) => (
            <li key={c.id}>
              <button type="button" className="rp-client-card" onClick={() => { sfx.click(); onPick(c) }}>
                <span className="rp-ico" aria-hidden>{c.icon}</span>
                <span className="rp-ct">
                  <b>{t(c.name)} · {t('{age} 歲', { age: c.age })}</b>
                  <span className="rp-tag">{t(c.title)}</span>
                  <small>{t(c.brief)}</small>
                  <small className="muted">{t('風險屬性:{risk}', { risk: t(c.risk) })}</small>
                </span>
              </button>
            </li>
          ))}
        </ul>
        <p className="muted small">{t('評分由規則計算:需求探詢、說明清楚、合規與公平待客、建議適合度各 25 分。客戶與情境皆為虛構的教學案例。')}</p>
      </div>
    </div>
  )
}

const STARTERS = ['可以先聊聊您的家庭狀況嗎?', '您目前有哪些保險或保單?', '您每個月的收入和預算大概是多少?']

// 送給 AI 的客戶資料:只送顯示用的文字
const payload = (c) => ({
  name: t(c.name), age: c.age, title: t(c.title), brief: t(c.brief), goal: t(c.goal), risk: t(c.risk),
  facts: c.facts.map((f) => t(f.text)), needs: (c.needs || []).map((n) => t(n.label)),
})

function Session({ client, aiOn, onBack, onRetry, onClose }) {
  const [session, setSession] = useState(() => newSession(client))
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState(null)
  const end = useRef(null)
  useEffect(() => { end.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }) }, [session.msgs.length, busy, !!result])

  async function send(text) {
    const said = (text ?? input).trim()
    if (!said || busy || session.done || result) return
    sfx.click()
    setInput('')
    const { session: next, reply } = clientTurn(session, said)
    const withoutReply = next.msgs.slice(0, -1)
    setSession({ ...next, msgs: withoutReply })
    setBusy(true)
    const voiced = aiOn ? await ai.roleplay({ client: payload(client), history: session.msgs.slice(-12), advisor: said, plan: reply, trust: next.trust }) : null
    setBusy(false)
    setSession({ ...next, msgs: [...withoutReply, { role: 'client', text: voiced?.reply || reply, ai: !!voiced }] })
    if (next.trust < session.trust - 10) sfx.bad?.()
  }

  async function finish() {
    if (result) return
    sfx.click()
    const score = scoreSession(session)
    setResult({ score, feedback: offlineFeedback(session, score), ai: false, loading: aiOn })
    addTraining('roleplay', {
      client: client.id, clientName: client.name, total: score.total, grade: score.grade, turns: score.turns, flags: score.flags,
      parts: Object.fromEntries(score.parts.map((p) => [p.id, p.score])),
    })
    if (!aiOn) return
    const out = await ai.roleplayReview({
      client: payload(client), history: session.msgs,
      score: { total: score.total, parts: score.parts.map((p) => ({ label: p.label, score: p.score, max: p.max })), notes: score.parts.flatMap((p) => p.notes) },
    })
    setResult((r) => ({
      ...r, loading: false, ai: !!out,
      feedback: out ? { strengths: out.strengths?.length ? out.strengths : r.feedback.strengths, improve: out.improve?.length ? out.improve : r.feedback.improve, betterLine: out.betterLine || r.feedback.betterLine } : r.feedback,
    }))
  }

  const turnsLeft = MAX_TURNS - session.turn
  const mood = session.trust < 40 ? 'low' : session.trust < 70 ? 'mid' : 'high'
  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label={t('AI 客戶對練')}>
      <div className="modal rp">
        <header className="rp-head">
          <span className="rp-ico big" aria-hidden>{client.icon}</span>
          <div className="rp-who">
            <b>{t(client.name)} · {t('{age} 歲', { age: client.age })} · {t(client.title)}</b>
            <small>{t(client.brief)} {t(client.goal)}</small>
          </div>
          <div className={`rp-trust ${mood}`} aria-label={t('信任度 {n}', { n: session.trust })}>
            <span>{t('信任度')}</span><i><em style={{ width: `${session.trust}%` }} /></i>
          </div>
          <button className="btn ghost" onClick={onClose} aria-label={t('關閉')}>✕</button>
        </header>
        <div className="rp-body">
          <div className="chat rp-chat" aria-live="polite">
            {session.msgs.map((m, i) => (
              <div key={i} className={`msg ${m.role === 'advisor' ? 'me' : 'bot'}`}>
                <div className="bubble2">{m.text}</div>
                <small className="msg-tag">{m.role === 'advisor' ? t('你(理專)') : `${t(client.name)}${m.ai ? ' · ' + t('✨ AI 扮演') : ''}`}</small>
              </div>
            ))}
            {busy && <div className="msg bot"><div className="bubble2 typing"><i /><i /><i /></div></div>}
            {result && <Result score={result.score} feedback={result.feedback} aiTag={result.ai} loading={result.loading} />}
            <div ref={end} />
          </div>
          <aside className="rp-side">
            <h4>{t('探詢到的資訊 {n}/{m}', { n: session.revealed.length, m: client.facts.length })}</h4>
            <ul className="rp-facts">
              {client.facts.map((f) => {
                const on = session.revealed.includes(f.id)
                return <li key={f.id} className={on ? 'on' : ''}>{on ? '✓' : '🔒'} {on ? t(f.label) : t('還沒問到')}</li>
              })}
            </ul>
            <p className="muted small">{t('客戶不會主動說出所有狀況。先問清楚,再給建議。')}</p>
            <p className="muted small">{t('還可以說 {n} 句', { n: Math.max(0, turnsLeft) })}</p>
          </aside>
        </div>
        {!result ? (
          <>
            {session.turn < 2 && !session.done && (
              <div className="chips">
                {STARTERS.map((q) => <button key={q} className="chip-q" onClick={() => send(t(q))} disabled={busy}>{t(q)}</button>)}
              </div>
            )}
            {session.done && <p className="rp-done">{t('對話結束了,按「結束並評分」看看你的表現。')}</p>}
            <form className="ask-form rp-form" onSubmit={(e) => { e.preventDefault(); send() }}>
              <textarea id="rp-q" value={input} rows={2} maxLength={300} disabled={session.done}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); send() } }}
                placeholder={t('用理專的身分回應客戶…(Enter 送出,Shift+Enter 換行)')} aria-label={t('你要對客戶說的話')} />
              <div className="rp-actions">
                <button className="btn primary" type="submit" disabled={busy || !input.trim() || session.done}>{t('送出')}</button>
                <button className="btn" type="button" onClick={finish} disabled={busy || session.turn === 0}>{t('結束並評分')}</button>
              </div>
            </form>
          </>
        ) : (
          <div className="rp-actions end">
            <button className="btn primary" onClick={onRetry}>{t('再練一次')}</button>
            <button className="btn" onClick={onBack}>{t('換一位客戶')}</button>
            <button className="btn" onClick={onClose}>{t('關閉')}</button>
          </div>
        )}
      </div>
    </div>
  )
}

function Result({ score, feedback, aiTag, loading }) {
  return (
    <section className="rp-result" aria-live="polite">
      <div className="rp-total"><b>{score.total}</b><span>/100 · {score.grade}</span></div>
      <ul className="rp-parts">
        {score.parts.map((p) => (
          <li key={p.id}>
            <div className="rp-part-h"><span>{p.label}</span><b>{p.score}/{p.max}</b></div>
            <i className="rp-bar"><em style={{ width: `${(p.score / p.max) * 100}%` }} /></i>
            {p.notes.map((n, i) => <small key={i}>{n}</small>)}
          </li>
        ))}
      </ul>
      <div className="rp-fb">
        <h4>{aiTag ? t('✨ AI 教練回饋') : t('教練回饋')}{loading ? ' …' : ''}</h4>
        {feedback.strengths.map((x, i) => <p key={'s' + i} className="good">✓ {x}</p>)}
        {feedback.improve.map((x, i) => <p key={'i' + i} className="warn">→ {x}</p>)}
        <blockquote><b>{t('示範說法')}</b>{feedback.betterLine}</blockquote>
      </div>
    </section>
  )
}
