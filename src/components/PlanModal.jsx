import { useState } from 'react'
import { PRODUCTS, PRODUCT_ORDER, premiumFor, totalPremium } from '../game/products.js'
import { canIncrease, recommended, analyzeGaps } from '../game/engine.js'
import { wan } from '../game/format.js'

export default function PlanModal({ s, onCoverage, onMove, onClose, coach, title = '年度規劃' }) {
  const [step, setStep] = useState(100000)
  const rec = recommended(s)
  const premium = totalPremium(s.coverage, s.age)
  const ratio = (premium / s.income) * 100
  const months = s.cash / (s.expense / 12)
  const analysis = analyzeGaps(s)

  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label={title}>
      <div className="modal plan">
        <header className="modal-h">
          <div>
            <h2>{title}</h2>
            <p className="muted">在擲骰前調整保障與投資。保費每年年底自動扣款。</p>
          </div>
          <button className="btn primary" onClick={onClose}>完成,去擲骰</button>
        </header>

        <div className="plan-grid">
          <section>
            <h3>🛡️ 保障配置</h3>
            {s.flash && <div className="flash">{s.flash}</div>}
            <div className="prod-list">
              {PRODUCT_ORDER.map((id) => {
                const p = PRODUCTS[id]
                const cur = s.coverage[id] || 0
                const locked = !canIncrease(s, id)
                return (
                  <div key={id} className="prod">
                    <div className="prod-top">
                      <span className="prod-ico" aria-hidden>{p.icon}</span>
                      <div>
                        <div className="prod-name">{p.name} <small>{p.sub}</small></div>
                        <div className="prod-blurb">{p.blurb}</div>
                      </div>
                    </div>
                    <div className="seg" role="radiogroup" aria-label={p.name}>
                      {p.tiers.map((t, i) => {
                        const disabled = locked && i > cur
                        return (
                          <button
                            key={i}
                            role="radio"
                            aria-checked={cur === i}
                            className={`seg-b ${cur === i ? 'on' : ''} ${coach && rec[id] === i && i > 0 ? 'rec' : ''}`}
                            disabled={disabled}
                            onClick={() => onCoverage(id, i)}
                          >
                            <span>{t.label}</span>
                            <small>{i === 0 ? '$0' : `${wan(premiumFor(id, i, s.age), 1)}/年`}</small>
                            {coach && rec[id] === i && i > 0 && <i className="rec-tag">建議</i>}
                          </button>
                        )
                      })}
                    </div>
                    {locked && <div className="lock">🔒 已有相關傷病紀錄,無法加保</div>}
                  </div>
                )
              })}
            </div>
          </section>

          <section>
            <h3>📈 現金與投資</h3>
            <div className="move">
              <div className="move-box">
                <div className="muted">現金</div>
                <b>{wan(s.cash)}</b>
                <small>約 {months.toFixed(1)} 個月生活費</small>
              </div>
              <div className="move-ctl">
                <button className="btn" onClick={() => onMove(step)} aria-label="現金轉入投資">現金 → 投資 ▶</button>
                <button className="btn" onClick={() => onMove(-step)} aria-label="投資轉回現金">◀ 投資 → 現金</button>
                <select value={step} onChange={(e) => setStep(Number(e.target.value))} aria-label="每次移動金額">
                  <option value={50000}>每次 5 萬</option>
                  <option value={100000}>每次 10 萬</option>
                  <option value={300000}>每次 30 萬</option>
                  <option value={1000000}>每次 100 萬</option>
                </select>
              </div>
              <div className="move-box">
                <div className="muted">投資</div>
                <b>{wan(s.invest)}</b>
                <small>長期平均約 4%,但年年不同</small>
              </div>
            </div>

            <div className="summary">
              <div className="sum-row"><span>每年保費</span><b>{wan(premium)}</b></div>
              <div className="sum-row">
                <span>占年收入</span>
                <b className={ratio > 18 ? 'neg' : ratio > 0 ? 'pos' : ''}>{ratio.toFixed(1)}%</b>
              </div>
              <div className="meter"><i style={{ width: `${Math.min(100, ratio * 4)}%`, background: ratio > 18 ? 'var(--red)' : 'var(--green)' }} /></div>
              <p className="muted small">保費約占年收入 10%~15% 較為健康;過高會壓縮生活與儲蓄。</p>
            </div>

            {coach && (
              <div className="coachbox">
                <b>🧑‍🏫 教練提示</b>
                {analysis.gaps.length ? (
                  <ul>{analysis.gaps.slice(0, 3).map((g) => <li key={g.id}>{g.text}{g.blocked ? '(已無法加保)' : ''}</li>)}</ul>
                ) : <p>目前保障配置與你的處境相符。</p>}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
