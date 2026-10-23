import { useEffect, useMemo, useRef, useState } from 'react'
import { CASES, CASE_MINUTES, evaluatePlan, bestPlan, monthly } from '../game/cases.js'
import { PRODUCTS, premiumFor } from '../game/products.js'
import { clientById } from '../game/clients.js'
import { addTraining } from '../training.js'
import { wan } from '../game/format.js'
import { sfx } from '../sfx.js'
import { t } from '../i18n.js'

// 10 分鐘情境挑戰:看完客戶資料,在預算內配置保障;交卷後用壓力測試和「預算內最佳配置」比較。
export default function CaseChallenge({ onClose, onRoleplay }) {
  const [cs, setCs] = useState(null)
  const [round, setRound] = useState(0)
  if (!cs) {
    return (
      <div className="overlay" role="dialog" aria-modal="true" aria-label={t('10 分鐘情境挑戰')} onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
        <div className="modal rp-pick">
          <header className="modal-h">
            <div>
              <h2>⏱️ {t('10 分鐘情境挑戰')}</h2>
              <p className="muted">{t('不用玩完整的一生。看完客戶資料,在 {m} 分鐘內、預算之內幫他配置保障,再用壓力測試看看效果。', { m: CASE_MINUTES })}</p>
            </div>
            <button className="btn" onClick={onClose}>{t('關閉')}</button>
          </header>
          <ul className="rp-clients">
            {CASES.map((c) => (
              <li key={c.id}>
                <button type="button" className="rp-client-card" onClick={() => { sfx.click(); setCs(c) }}>
                  <span className="rp-ico" aria-hidden>{c.icon}</span>
                  <span className="rp-ct">
                    <b>{t(c.title)}</b>
                    <small>{t(c.facts[0])}</small>
                    <small className="muted">{t('每月保費預算 {amt} 元', { amt: c.budget.toLocaleString('en-US') })}</small>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    )
  }
  return <Challenge key={`${cs.id}-${round}`} cs={cs} onBack={() => setCs(null)} onRetry={() => setRound((r) => r + 1)} onClose={onClose} onRoleplay={onRoleplay} />
}

function Challenge({ cs, onBack, onRetry, onClose, onRoleplay }) {
  const [plan, setPlan] = useState({})
  const [left, setLeft] = useState(CASE_MINUTES * 60)
  const [result, setResult] = useState(null)
  const started = useRef(Date.now())
  const best = useMemo(() => bestPlan(cs), [cs])
  const prem = monthly(cs, plan)
  const ctx = { mortgage: cs.mortgage }

  useEffect(() => {
    if (result) return undefined
    const id = setInterval(() => setLeft((x) => Math.max(0, x - 1)), 1000)
    return () => clearInterval(id)
  }, [result])
  useEffect(() => { if (left === 0 && !result) submit(true) }, [left]) // eslint-disable-line react-hooks/exhaustive-deps

  function submit(timeout = false) {
    if (result) return
    const ev = evaluatePlan(cs, plan)
    const used = Math.round((Date.now() - started.current) / 1000)
    setResult({ ev, timeout, used })
    addTraining('cases', { case: cs.id, total: ev.total, best: best.ev.total, premium: ev.premium, budget: cs.budget, seconds: used, avoided: ev.avoided })
    if (ev.total >= best.ev.total - 3) sfx.fanfare?.()
    else sfx.click()
  }

  const mm = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`
  const desc = (p) => Object.entries(p).filter(([, v]) => v > 0).map(([k, v]) => `${t(PRODUCTS[k].name)}(${t(PRODUCTS[k].tiers[v].label)})`).join(', ') || t('什麼都沒買')
  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label={t('10 分鐘情境挑戰')}>
      <div className="modal case">
        <header className="rp-head">
          <span className="rp-ico big" aria-hidden>{cs.icon}</span>
          <div className="rp-who"><b>{t(cs.title)}</b><small>{t('在預算內配置保障,交卷後用壓力測試評分')}</small></div>
          {!result && <div className={`case-timer ${left < 60 ? 'low' : ''}`} aria-label={t('剩餘時間')}>⏱️ {mm}</div>}
          <button className="btn ghost" onClick={onClose} aria-label={t('關閉')}>✕</button>
        </header>
        <ul className="case-facts">{cs.facts.map((f, i) => <li key={i}>{t(f)}</li>)}</ul>
        {cs.have && <p className="muted small">{t('已有:{list}', { list: desc(cs.have) })}</p>}

        {!result ? (
          <>
            <div className="case-products">
              {cs.products.map((id) => {
                const p = PRODUCTS[id]
                const cur = plan[id] || 0
                return (
                  <div key={id} className="case-prod">
                    <div className="case-prod-h"><b>{p.icon} {t(p.name)}</b><small>{t(p.sub)}</small></div>
                    <div className="seg" role="radiogroup" aria-label={t(p.name)}>
                      {p.tiers.map((tier, i) => (
                        <button key={i} type="button" role="radio" aria-checked={cur === i} className={`seg-b ${cur === i ? 'on' : ''}`} onClick={() => setPlan((x) => ({ ...x, [id]: i }))}>
                          {t(tier.label)}
                          <small>{i === 0 ? '$0' : t('{amt}/月', { amt: Math.round(premiumFor(id, i, cs.age, ctx) / 12).toLocaleString('en-US') })}</small>
                        </button>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
            <div className={`case-budget ${prem > cs.budget ? 'over' : ''}`}>
              <span>{t('每月保費 {p} / 預算 {b} 元', { p: prem.toLocaleString('en-US'), b: cs.budget.toLocaleString('en-US') })}</span>
              <i><em style={{ width: `${Math.min(100, (prem / cs.budget) * 100)}%` }} /></i>
            </div>
            <button className="btn primary wide" onClick={() => submit(false)}>{t('交卷,看壓力測試')}</button>
          </>
        ) : (
          <CaseResult cs={cs} result={result} best={best} desc={desc} plan={plan} />
        )}
        {result && (
          <div className="rp-actions end">
            <button className="btn primary" onClick={() => onRoleplay(clientById(cs.clientId))}>🎭 {t('跟這位客戶對練')}</button>
            <button className="btn" onClick={onRetry}>{t('再挑戰一次')}</button>
            <button className="btn" onClick={onBack}>{t('換一個案例')}</button>
          </div>
        )}
      </div>
    </div>
  )
}

function CaseResult({ cs, result, best, desc, plan }) {
  const { ev } = result
  const bestRows = Object.fromEntries(best.ev.rows.map((r) => [r.id, r]))
  return (
    <section className="rp-result" aria-live="polite">
      {result.timeout && <p className="warn">{t('時間到!系統自動幫你交卷。')}</p>}
      <div className="case-scores">
        <div className="rp-total"><b>{ev.total}</b><span>/100 · {t('你的配置')}</span></div>
        <div className="rp-total best"><b>{best.ev.total}</b><span>/100 · {t('預算內最佳配置')}</span></div>
      </div>
      <p className="muted small">{t('保障 {a}/70 · 預算 {b}/20 · 適合度 {c}/10', { a: ev.parts.protect, b: ev.parts.budget, c: ev.parts.fit })}</p>
      <div className="table-wrap">
        <table className="case-table">
          <thead><tr><th>{t('如果發生')}</th><th>{t('損失')}</th><th>{t('你的缺口')}</th><th>{t('最佳配置的缺口')}</th></tr></thead>
          <tbody>
            {ev.rows.map((r) => (
              <tr key={r.id}>
                <td>{t(r.title)}</td>
                <td>{wan(r.loss)}</td>
                <td className={r.gap > 0 ? 'neg' : 'pos'}>{r.gap > 0 ? wan(r.gap) : t('✓ 補滿')}</td>
                <td>{bestRows[r.id].gap > 0 ? wan(bestRows[r.id].gap) : t('✓ 補滿')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p><b>{t('你的配置:')}</b>{desc(plan)}{t('(每月 {amt} 元)', { amt: ev.premium.toLocaleString('en-US') })}</p>
      <p><b>{t('預算內最佳配置:')}</b>{desc(best.plan)}{t('(每月 {amt} 元)', { amt: best.ev.premium.toLocaleString('en-US') })}</p>
      {ev.overBudget && <p className="warn">⚠ {t('超出客戶的預算。保障再好,客戶繳不起就會中途解約。')}</p>}
      {ev.avoided.map((id) => <p key={id} className="warn">⚠ {t('「{name}」不適合這位客戶:它不是用來轉移風險的,也不符合客戶的狀況。', { name: t(PRODUCTS[id].name) })}</p>)}
      <p className="muted small">{t('壓力測試與最佳配置都由規則引擎計算(同一份保險給付規則),保費與給付為教學用簡化模型。')}</p>
    </section>
  )
}
