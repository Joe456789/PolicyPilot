import { Shield, TrendingUp, Building2, Landmark } from 'lucide-react'
import { coachInvest, coachLoan } from '../game/coach.js'
import { useState } from 'react'
import { PRODUCTS, PRODUCT_ORDER, PRODUCT_GROUPS, OPTIONAL_PRODUCTS, premiumFor, totalPremium } from '../game/products.js'
import { ASSETS, ASSET_ORDER, canIncrease, recommended, analyzeGaps, householdIncome, holdingsTotal } from '../game/engine.js'
import { wan } from '../game/format.js'
import { PROPERTIES, LEVELS, rentOf, baseRent, upgradeCost, propPremium, tollOf, RISK_NAME } from '../game/properties.js'
import { t } from '../i18n.js'

// 英文字典裡有些詞是小寫術語(句中用),當成標題/按鈕時首字母大寫;中文不受影響
const cap = (x) => x.charAt(0).toUpperCase() + x.slice(1)

const STEPS = [50000, 100000, 300000, 1000000]

export default function PlanModal({ s, world, onCoverage, onTrade, onBorrow, onRepay, onPropAction, onClose, coach, title = t('年度規劃') }) {
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
            <p className="muted">{t('在擲骰前調整保障、投資與貸款。保費與房貸每年年底自動扣款。')}</p>
          </div>
          <button className="btn primary" onClick={onClose}>{t('完成,去擲骰')}</button>
        </header>

        {s.turn === 0 && s.player.intro && <div className="note-box intro-box">📖 <b>{t('你的起點:')}</b>{s.player.intro}</div>}

        <div className="tabs" role="tablist">
          {[['cover', t('保障'), Shield], ['invest', t('理財'), TrendingUp], ['assets', t('資產'), Building2], ['loan', cap(t('貸款')), Landmark]].map(([k, n, Icon]) => (
            <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}><Icon size={17} aria-hidden /> {n}</button>
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
                      <h4>{t(gname)}</h4>
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
                                  <div className="prod-name">{t(p.name)} <small>{t(p.sub)}</small>{OPTIONAL_PRODUCTS.includes(id) && <em className="opt-tag">{t('選配')}</em>}</div>
                                  <div className="prod-blurb">{t(p.blurb)}</div>
                                </div>
                              </div>
                              <div className="seg" role="radiogroup" aria-label={t(p.name)}>
                                {p.tiers.map((tier, i) => {
                                  const disabled = locked && i > cur
                                  const isRec = coach && rec[id] === i && i > 0
                                  return (
                                    <button key={i} role="radio" aria-checked={cur === i} className={`seg-b ${cur === i ? 'on' : ''} ${isRec ? 'rec' : ''}`} disabled={disabled} onClick={() => onCoverage(id, i)}>
                                      <span>{t(tier.label)}</span>
                                      <small>{i === 0 ? '$0' : t('{amt}/年', { amt: wan(premiumFor(id, i, s.age), 1) })}</small>
                                      {isRec && <i className="rec-tag">{t('建議')}</i>}
                                    </button>
                                  )
                                })}
                              </div>
                              {locked && <div className="lock">🔒 {t('已有相關傷病紀錄,無法加保')}</div>}
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
                <div className="note-box">💡 {t('投資是為了累積資產,賺的是報酬;保險買的是「壞事發生時的現金流」。兩者用途不同,先把保障與緊急預備金顧好,再拿多餘的錢去投資。')}</div>
                {coach && (
                  <div className="coachbox">
                    <b>🧑‍🏫 {t('教練提示')}</b>
                    <ul>{coachInvest(s).map((x, i) => <li key={i} className={`tone-${x.tone}`}>{x.text}</li>)}</ul>
                  </div>
                )}
                <div className="step-row">
                  <span>{t('每次金額')}</span>
                  {STEPS.map((v) => <button key={v} className={step === v ? 'on' : ''} onClick={() => setStep(v)}>{wan(v, 0)}</button>)}
                </div>
                <div className="asset-list">
                  {ASSET_ORDER.map((k) => (
                    <div key={k} className="asset">
                      <div className="asset-top">
                        <span className="prod-ico" aria-hidden>{ASSETS[k].icon}</span>
                        <div>
                          <div className="prod-name">{t(ASSETS[k].name)} <small>{t('風險:{risk}', { risk: t(ASSETS[k].risk) })}</small></div>
                          <div className="prod-blurb">{t(ASSETS[k].blurb)}</div>
                        </div>
                        <b className="asset-v">{wan(s.hold[k])}</b>
                      </div>
                      <div className="asset-btns">
                        <button className="btn" onClick={() => onTrade(k, step)} disabled={s.cash <= 0}>{t('買入')}</button>
                        <button className="btn" onClick={() => onTrade(k, -step)} disabled={s.hold[k] <= 0}>{cap(t('賣出'))}</button>
                        <button className="btn ghost" onClick={() => onTrade(k, -s.hold[k])} disabled={s.hold[k] <= 0}>{t('全賣')}</button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {tab === 'assets' && (
              <>
                <div className="note-box">🏘️ {t('棋盤上有 8 處資產,走到才能買。擁有後每年收租、別人走到你的資產要付過路費。')}<b>{t('行動點:{n} / 2', { n: s.ap })}</b>{t('(升級、投保、出售各花 1 點)。天災(火災、地震、淹水)會在年底檢查,沒保險要自己付修繕費。')}</div>
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
                            <div className="prod-name">{t(p.region)} · {t(p.name)} <small>{t(p.kind)}</small></div>
                            <div className="prod-blurb">{t('售價 {price} · 年租約 {rent}({pct}%) · 風險:{risks}', { price: wan(p.price, 0), rent: wan(baseRent(p), 0), pct: (p.yield * 100).toFixed(1), risks: Object.entries(p.risk).map(([k, v]) => `${t(RISK_NAME[k])}${(v * 100).toFixed(1)}%`).join(' ') })}</div>
                          </div>
                          <span className={`own-tag ${mine ? 'me' : owner ? 'ri' : ''}`}>{mine ? t('你的') : owner ? t(owner.name) : t('無人持有')}</span>
                        </div>
                        {mine && (
                          <>
                            <div className="prod-blurb">{t('等級「{level}」· 市值 {value} · 年租約 {rent}', { level: t(LEVELS[mine.level].name), value: wan(mine.value), rent: wan(rentOf(p, mine.level)) })}{mine.mortgage ? ` · ${t('房貸餘額 {amt}', { amt: wan(mine.mortgage.balance) })}` : ''} · {mine.insured ? t('🛡️ 已投保(年繳 {amt})', { amt: wan(propPremium(mine.value)) }) : t('⚠️ 未投保')}</div>
                            <div className="asset-btns">
                              <button className="btn" disabled={s.ap <= 0 || mine.level >= 3} onClick={() => onPropAction(p.id, 'upgrade')}>{mine.level < 3 ? t('升級({amt})', { amt: wan(upgradeCost(p, mine.level), 0) }) : t('升級')}</button>
                              <button className="btn" disabled={s.ap <= 0 || mine.insured} onClick={() => onPropAction(p.id, 'insure')}>{t('投保財產險')}</button>
                              <button className="btn ghost" disabled={s.ap <= 0} onClick={() => onPropAction(p.id, 'sell')}>{t('出售')}</button>
                            </div>
                          </>
                        )}
                        {owner && !mine && <div className="prod-blurb">{t('他人持有(等級「{level}」),你走到要付過路費約 {amt}。', { level: t(LEVELS[owner.level].name), amt: wan(tollOf(p, owner.level)) })}</div>}
                      </div>
                    )
                  })}
                </div>
              </>
            )}

            {tab === 'loan' && (
              <>
                <div className="note-box">⚠️ {t('借錢投資是「用確定的利息,賭不確定的報酬」。貸款年利率約 7%,每年會自動還本金的 10%;現金不夠時,系統也會自動幫你借。')}</div>
                {coach && (
                  <div className="coachbox">
                    <b>🧑‍🏫 {t('教練提示')}</b>
                    <ul>{coachLoan(s).map((x, i) => <li key={i} className={`tone-${x.tone}`}>{x.text}</li>)}</ul>
                  </div>
                )}
                <div className="move">
                  <div className="move-box"><div className="muted">{t('目前貸款')}</div><b>{wan(s.loan)}</b><small>{t('年利率約 7%')}</small></div>
                  <div className="move-ctl">
                    <button className="btn" onClick={() => onBorrow(step)} disabled={loanLimit <= 0}>{t('借款')} {wan(step, 0)}</button>
                    <button className="btn" onClick={() => onRepay(step)} disabled={s.loan <= 0 || s.cash <= 0}>{t('還款')} {wan(step, 0)}</button>
                    <select value={step} onChange={(e) => setStep(Number(e.target.value))} aria-label={t('每次金額')}>
                      {STEPS.map((v) => <option key={v} value={v}>{t('每次 {amt}', { amt: wan(v, 0) })}</option>)}
                    </select>
                  </div>
                  <div className="move-box"><div className="muted">{t('可借額度')}</div><b>{wan(loanLimit)}</b><small>{t('家庭年收入 1.5 倍為上限')}</small></div>
                </div>
                {s.flash && <div className="flash">{s.flash}</div>}
                {s.house && <p className="muted small">🏠 {t('房貸餘額 {bal},每年還款 {pay}(自動扣款)。', { bal: wan(s.house.balance), pay: wan(s.house.payment) })}</p>}
              </>
            )}
          </section>

          <section>
            <h3>📋 {t('目前狀態')}</h3>
            <div className="summary">
              <div className="sum-row"><span>{t('現金')}</span><b>{wan(s.cash)}</b></div>
              <div className="sum-row"><span>{cap(t('緊急預備金'))}</span><b className={months < 3 ? 'neg' : 'pos'}>{t('{n} 個月', { n: months.toFixed(1) })}</b></div>
              <div className="sum-row"><span>{t('投資合計')}</span><b>{wan(holdingsTotal(s))}</b></div>
              <div className="sum-row"><span>{cap(t('貸款'))}</span><b className={s.loan ? 'neg' : ''}>{wan(s.loan)}</b></div>
              <hr />
              <div className="sum-row"><span>{t('每年保費')}</span><b>{wan(premium)}</b></div>
              <div className="sum-row">
                <span>{t('占家庭年收入')}</span>
                <b className={ratio > 18 ? 'neg' : ratio > 0 ? 'pos' : ''}>{ratio.toFixed(1)}%</b>
              </div>
              <div className="meter"><i style={{ width: `${Math.min(100, ratio * 4)}%`, background: ratio > 18 ? 'var(--red)' : 'var(--green)' }} /></div>
              <p className="muted small">{t('保費約占年收入 10%~15% 較為健康;過高會壓縮生活與儲蓄。')}</p>
            </div>
            {coach && (
              <div className="coachbox">
                <b>🧑‍🏫 {t('教練提示')}</b>
                {analysis.gaps.length ? (
                  <ul>{analysis.gaps.slice(0, 3).map((g) => <li key={g.id}>{g.text}{g.blocked ? t('(已無法加保)') : ''}</li>)}</ul>
                ) : <p>{t('目前保障配置與你的處境相符。')}</p>}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
