import { coachInvest, coachLoan } from '../game/coach.js'
import { useState } from 'react'
import { PRODUCTS, PRODUCT_ORDER, PRODUCT_GROUPS, OPTIONAL_PRODUCTS, premiumFor, totalPremium } from '../game/products.js'
import { ASSETS, ASSET_ORDER, canIncrease, recommended, analyzeGaps, householdIncome, holdingsTotal } from '../game/engine.js'
import { wan } from '../game/format.js'
import { PROPERTIES, LEVELS, rentOf, baseRent, upgradeCost, propPremium, tollOf, RISK_NAME } from '../game/properties.js'

const STEPS = [
  [50000, '5 萬'],
  [100000, '10 萬'],
  [300000, '30 萬'],
  [1000000, '100 萬'],
]

export default function PlanModal({ s, world, onCoverage, onTrade, onBorrow, onRepay, onPropAction, onClose, coach, title = '年度規劃' }) {
  const [tab, setTab] = useState('cover')
  const [step, setStep] = useState(100000)
  const rec = recommended(s)
  const premium = totalPremium(s.coverage, s.age)
  const hi = householdIncome(s)
  const ratio = (premium / hi) * 100
  const months = s.cash / (s.expense / 12)
  const analysis = analyzeGaps(s)
  const loanLimit = Math.max(0, hi * 1.5 - s.loan)

  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label={title}>
      <div className="modal plan">
        <header className="modal-h">
          <div>
            <h2>{title}</h2>
            <p className="muted">在擲骰前調整保障、投資與貸款。保費與房貸每年年底自動扣款。</p>
          </div>
          <button className="btn primary" onClick={onClose}>完成,去擲骰</button>
        </header>

        <div className="tabs" role="tablist">
          {[['cover', '🛡️ 保障'], ['invest', '📈 理財'], ['assets', '🏘️ 資產'], ['loan', '🏦 貸款']].map(([k, n]) => (
            <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{n}</button>
          ))}
        </div>

        <div className="plan-grid">
          <section>
            {tab === 'cover' && (
              <>
                {s.flash && <div className="flash">{s.flash}</div>}
                {PRODUCT_GROUPS.map(([gid, gname]) => {
                  const ids = PRODUCT_ORDER.filter((id) => PRODUCTS[id].group === gid && !(PRODUCTS[id].needsHouse && !s.house) && !(PRODUCTS[id].needsCar && !s.car))
                  if (!ids.length) return null
                  return (
                    <div key={gid} className="prod-group">
                      <h4>{gname}</h4>
                      <div className="prod-list">
                        {ids.map((id) => {
                          const p = PRODUCTS[id]
                          const cur = s.coverage[id] || 0
                          const locked = !canIncrease(s, id)
                          return (
                            <div key={id} className="prod">
                              <div className="prod-top">
                                <span className="prod-ico" aria-hidden>{p.icon}</span>
                                <div>
                                  <div className="prod-name">{p.name} <small>{p.sub}</small>{OPTIONAL_PRODUCTS.includes(id) && <em className="opt-tag">選配</em>}</div>
                                  <div className="prod-blurb">{p.blurb}</div>
                                </div>
                              </div>
                              <div className="seg" role="radiogroup" aria-label={p.name}>
                                {p.tiers.map((t, i) => {
                                  const disabled = locked && i > cur
                                  const isRec = coach && rec[id] === i && i > 0
                                  return (
                                    <button key={i} role="radio" aria-checked={cur === i} className={`seg-b ${cur === i ? 'on' : ''} ${isRec ? 'rec' : ''}`} disabled={disabled} onClick={() => onCoverage(id, i)}>
                                      <span>{t.label}</span>
                                      <small>{i === 0 ? '$0' : `${wan(premiumFor(id, i, s.age), 1)}/年`}</small>
                                      {isRec && <i className="rec-tag">建議</i>}
                                    </button>
                                  )
                                })}
                              </div>
                              {locked && <div className="lock">🔒 已有相關傷病紀錄,無法加保</div>}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </>
            )}

            {tab === 'invest' && (
              <>
                <div className="note-box">💡 投資是為了累積資產,賺的是報酬;保險買的是「壞事發生時的現金流」。兩者用途不同,先把保障與緊急預備金顧好,再拿多餘的錢去投資。</div>
                {coach && (
                  <div className="coachbox">
                    <b>🧑‍🏫 教練提示</b>
                    <ul>{coachInvest(s).map((x, i) => <li key={i} className={`tone-${x.tone}`}>{x.text}</li>)}</ul>
                  </div>
                )}
                <div className="step-row">
                  <span>每次金額</span>
                  {STEPS.map(([v, n]) => <button key={v} className={step === v ? 'on' : ''} onClick={() => setStep(v)}>{n}</button>)}
                </div>
                <div className="asset-list">
                  {ASSET_ORDER.map((k) => (
                    <div key={k} className="asset">
                      <div className="asset-top">
                        <span className="prod-ico" aria-hidden>{ASSETS[k].icon}</span>
                        <div>
                          <div className="prod-name">{ASSETS[k].name} <small>風險:{ASSETS[k].risk}</small></div>
                          <div className="prod-blurb">{ASSETS[k].blurb}</div>
                        </div>
                        <b className="asset-v">{wan(s.hold[k])}</b>
                      </div>
                      <div className="asset-btns">
                        <button className="btn" onClick={() => onTrade(k, step)} disabled={s.cash <= 0}>買入</button>
                        <button className="btn" onClick={() => onTrade(k, -step)} disabled={s.hold[k] <= 0}>賣出</button>
                        <button className="btn ghost" onClick={() => onTrade(k, -s.hold[k])} disabled={s.hold[k] <= 0}>全賣</button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {tab === 'assets' && (
              <>
                <div className="note-box">🏘️ 棋盤上有 8 處資產,走到才能買。擁有後每年收租、別人走到你的資產要付過路費。<b>行動點:{s.ap} / 2</b>(升級、投保、出售各花 1 點)。天災(火災、地震、淹水)會在年底檢查,沒保險要自己付修繕費。</div>
                {s.flash && <div className="flash">{s.flash}</div>}
                <div className="prop-list">
                  {PROPERTIES.map((p) => {
                    const mine = s.props[p.id]
                    const owner = world?.owners?.[p.id]
                    return (
                      <div key={p.id} className={`propc ${mine ? 'mine' : owner ? 'rival' : ''}`}>
                        <div className="propc-top">
                          <span className="prod-ico" aria-hidden>{p.icon}</span>
                          <div className="propc-t">
                            <div className="prod-name">{p.region} · {p.name} <small>{p.kind}</small></div>
                            <div className="prod-blurb">售價 {wan(p.price, 0)} · 年租約 {wan(baseRent(p), 0)}({(p.yield * 100).toFixed(1)}%) · 風險:{Object.entries(p.risk).map(([k, v]) => `${RISK_NAME[k]}${(v * 100).toFixed(1)}%`).join(' ')}</div>
                          </div>
                          <span className={`own-tag ${mine ? 'me' : owner ? 'ri' : ''}`}>{mine ? '你的' : owner ? owner.name : '無人持有'}</span>
                        </div>
                        {mine && (
                          <>
                            <div className="prod-blurb">等級「{LEVELS[mine.level].name}」· 市值 {wan(mine.value)} · 年租約 {wan(rentOf(p, mine.level))}{mine.mortgage ? ` · 房貸餘額 ${wan(mine.mortgage.balance)}` : ''} · {mine.insured ? `🛡️ 已投保(年繳 ${wan(propPremium(mine.value))})` : '⚠️ 未投保'}</div>
                            <div className="asset-btns">
                              <button className="btn" disabled={s.ap <= 0 || mine.level >= 3} onClick={() => onPropAction(p.id, 'upgrade')}>升級{mine.level < 3 ? `(${wan(upgradeCost(p, mine.level), 0)})` : ''}</button>
                              <button className="btn" disabled={s.ap <= 0 || mine.insured} onClick={() => onPropAction(p.id, 'insure')}>投保財產險</button>
                              <button className="btn ghost" disabled={s.ap <= 0} onClick={() => onPropAction(p.id, 'sell')}>出售</button>
                            </div>
                          </>
                        )}
                        {owner && !mine && <div className="prod-blurb">他人持有(等級「{LEVELS[owner.level].name}」),你走到要付過路費約 {wan(tollOf(p, owner.level))}。</div>}
                      </div>
                    )
                  })}
                </div>
              </>
            )}

            {tab === 'loan' && (
              <>
                <div className="note-box">⚠️ 借錢投資是「用確定的利息,賭不確定的報酬」。貸款年利率約 7%,每年會自動還本金的 10%;現金不夠時,系統也會自動幫你借。</div>
                {coach && (
                  <div className="coachbox">
                    <b>🧑‍🏫 教練提示</b>
                    <ul>{coachLoan(s).map((x, i) => <li key={i} className={`tone-${x.tone}`}>{x.text}</li>)}</ul>
                  </div>
                )}
                <div className="move">
                  <div className="move-box"><div className="muted">目前貸款</div><b>{wan(s.loan)}</b><small>年利率約 7%</small></div>
                  <div className="move-ctl">
                    <button className="btn" onClick={() => onBorrow(step)} disabled={loanLimit <= 0}>借款 {STEPS.find((x) => x[0] === step)?.[1]}</button>
                    <button className="btn" onClick={() => onRepay(step)} disabled={s.loan <= 0 || s.cash <= 0}>還款 {STEPS.find((x) => x[0] === step)?.[1]}</button>
                    <select value={step} onChange={(e) => setStep(Number(e.target.value))} aria-label="每次金額">
                      {STEPS.map(([v, n]) => <option key={v} value={v}>每次 {n}</option>)}
                    </select>
                  </div>
                  <div className="move-box"><div className="muted">可借額度</div><b>{wan(loanLimit)}</b><small>家庭年收入 1.5 倍為上限</small></div>
                </div>
                {s.flash && <div className="flash">{s.flash}</div>}
                {s.house && <p className="muted small">🏠 房貸餘額 {wan(s.house.balance)},每年還款 {wan(s.house.payment)}(自動扣款)。</p>}
              </>
            )}
          </section>

          <section>
            <h3>📋 目前狀態</h3>
            <div className="summary">
              <div className="sum-row"><span>現金</span><b>{wan(s.cash)}</b></div>
              <div className="sum-row"><span>緊急預備金</span><b className={months < 3 ? 'neg' : 'pos'}>{months.toFixed(1)} 個月</b></div>
              <div className="sum-row"><span>投資合計</span><b>{wan(holdingsTotal(s))}</b></div>
              <div className="sum-row"><span>貸款</span><b className={s.loan ? 'neg' : ''}>{wan(s.loan)}</b></div>
              <hr />
              <div className="sum-row"><span>每年保費</span><b>{wan(premium)}</b></div>
              <div className="sum-row">
                <span>占家庭年收入</span>
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
