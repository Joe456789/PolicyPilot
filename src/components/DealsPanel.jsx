import { buyOffers, sellBids, loanRequest, buyFromBot, sellToBot, lendTo, dealUsed, LOAN_RATE } from '../game/deals.js'
import { propById, LEVELS } from '../game/properties.js'
import { wan } from '../game/format.js'
import { t } from '../i18n.js'

// 規劃視窗「交易」分頁:向對手收購地產、把地產賣給對手、借錢給對手
export default function DealsPanel({ players, onDeal }) {
  if (!players || players.length < 2) return <div className="note-box">{t('這一局沒有電腦對手,沒有人可以交易。')}</div>
  const me = players[0].s
  const used = dealUsed(me)
  const offers = buyOffers(players)
  const bids = sellBids(players)
  const req = loanRequest(players)
  const lent = (me.lent || []).filter((l) => l.left > 0 || l.lost)
  return (
    <>
      <div className="note-box">🤝 {t('可以向對手收購地產,或把地產賣給對手;每年最多一筆地產交易。過戶後財產險要重新投保。')}{used && <b> {t('今年已經交易過了。')}</b>}</div>

      {req && (
        <section className="deal-card loan-req">
          <h3>💬 {t('{name}想跟你借錢', { name: req.name })}</h3>
          <p>{t('借 {amt},年利率 {rate}%,分 {years} 年還本金加利息。', { amt: wan(req.amount), rate: Math.round(LOAN_RATE * 100), years: req.years })}</p>
          {req.risky && <p className="deal-warn">⚠ {t('對方負債偏高或沒有保險,萬一破產,錢可能收不回來。')}</p>}
          <p className="muted small">{t('借錢給別人也是一種投資:利息是報酬,對方還不出來就是風險。只借「拿不回來也沒關係」的金額。')}</p>
          <button className="btn" disabled={me.cash < req.amount} onClick={() => onDeal(lendTo, req)}>{t('借給他')}</button>
        </section>
      )}

      {lent.length > 0 && (
        <section className="deal-card">
          <h3>📒 {t('你借出去的錢')}</h3>
          <ul className="deal-list">
            {lent.map((l, i) => (
              <li key={i}>{l.lost ? t('{name}:{amt} 收不回來', { name: l.name, amt: wan(l.lost) }) : t('{name}:剩 {amt} 未還,還有 {years} 年,已賺利息 {int}', { name: l.name, amt: wan(l.balance), years: l.left, int: wan(l.earned) })}</li>
            ))}
          </ul>
        </section>
      )}

      <section className="deal-card">
        <h3>🏷️ {t('收購對手的地產')}</h3>
        {!offers.length && <p className="muted">{t('對手目前沒有地產。')}</p>}
        <ul className="deal-list">
          {offers.map((o) => {
            const p = propById(o.id)
            return (
              <li key={o.id}>
                <span>{p.icon} {t(p.name)} <small>({t(o.name)} · {t(LEVELS[o.level].name)} · {t('市值 {amt}', { amt: wan(o.value) })})</small></span>
                <button className="btn" disabled={used || !o.afford} onClick={() => onDeal(buyFromBot, o.idx, o.id)}>{t('開價 {amt}', { amt: wan(o.price) })}</button>
              </li>
            )
          })}
        </ul>
      </section>

      <section className="deal-card">
        <h3>💰 {t('把地產賣給對手')}</h3>
        {!Object.keys(me.props || {}).length && <p className="muted">{t('你還沒有地產。')}</p>}
        {Object.keys(me.props || {}).length > 0 && !bids.length && <p className="muted">{t('對手目前沒有足夠的錢出價。')}</p>}
        <ul className="deal-list">
          {bids.map((b) => {
            const p = propById(b.id)
            return (
              <li key={b.id}>
                <span>{p.icon} {t(p.name)} <small>({t('市值 {amt}', { amt: wan(b.value) })}{b.mortgage ? ` · ${t('房貸餘額 {amt}', { amt: wan(b.mortgage) })}` : ''})</small></span>
                <button className="btn" disabled={used} onClick={() => onDeal(sellToBot, b.id)}>{t('{name}出價 {amt}', { name: t(b.name), amt: wan(b.bid) })}</button>
              </li>
            )
          })}
        </ul>
      </section>
    </>
  )
}
