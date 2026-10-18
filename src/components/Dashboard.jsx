import Avatar from './Avatar.jsx'
import { PRODUCTS, PRODUCT_ORDER } from '../game/products.js'
import { ASSETS, ASSET_ORDER, holdingsTotal, houseEquity, netWorth, householdIncome } from '../game/engine.js'
import { wan, signed } from '../game/format.js'

function Stat({ label, value, tone, sub }) {
  return (
    <div className={`stat ${tone || ''}`}>
      <div className="stat-l">{label}</div>
      <div className="stat-v">{value}</div>
      {sub && <div className="stat-s">{sub}</div>}
    </div>
  )
}

export default function Dashboard({ s }) {
  const nw = netWorth(s)
  const months = s.cash / (s.expense / 12)
  const last = s.lastYear
  const total = holdingsTotal(s)
  return (
    <aside className="dash" aria-label="角色儀表板">
      <div className="persona">
        <Avatar look={s.player.look} size={76} title={s.player.name} />
        <div className="persona-t">
          <div className="persona-name">{s.player.name}</div>
          <div className="persona-sub">{s.player.title} · {s.age} 歲</div>
          <div className="persona-tags">
            {s.partner ? <span className="tag">已婚</span> : <span className="tag">單身</span>}
            {s.dependents > 0 && <span className="tag">扶養 {s.dependents} 人</span>}
            {s.house && <span className="tag">有房</span>}
            {!s.partner && s.dependents > 0 && <span className="tag warn">唯一收入來源</span>}
          </div>
        </div>
      </div>

      <div className="progress" aria-label={`進度 ${s.turn} / ${s.years} 年`}>
        <div className="progress-bar"><i style={{ width: `${(s.turn / s.years) * 100}%` }} /></div>
        <span>第 {Math.min(s.turn + 1, s.years)} / {s.years} 年</span>
      </div>

      <div className="stats">
        <Stat label="淨資產" value={wan(nw)} tone={nw < 0 ? 'bad' : 'ok'} />
        <Stat label="現金" value={wan(s.cash)} sub={`約 ${months.toFixed(1)} 個月生活費`} tone={months < 3 ? 'warn' : ''} />
        <Stat label="家庭年收入" value={wan(householdIncome(s), 0)} sub={`年支出 ${wan(s.expense + (s.house ? s.house.payment : 0), 0)}`} />
        <Stat label="貸款" value={wan(s.loan)} tone={s.loan > 0 ? 'bad' : ''} sub={s.loan ? '年利率約 7%' : ''} />
      </div>

      <div className="assets">
        <div className="cov-h">資產配置 <span className="muted">投資合計 {wan(total)}</span></div>
        <div className="alloc" role="img" aria-label="資產配置比例">
          {ASSET_ORDER.map((k) => (s.hold[k] > 0 ? <i key={k} className={`a-${k}`} style={{ flex: s.hold[k] }} title={`${ASSETS[k].name} ${wan(s.hold[k])}`} /> : null))}
          {total === 0 && <i className="a-none" style={{ flex: 1 }} />}
        </div>
        <div className="alloc-l">
          {ASSET_ORDER.map((k) => (
            <span key={k} className={s.hold[k] ? 'on' : ''}><i className={`dot a-${k}`} />{ASSETS[k].name} {wan(s.hold[k])}</span>
          ))}
        </div>
        {(s.house || s.savings > 0) && (
          <div className="alloc-x">
            {s.house && <span>🏠 房產淨值 {wan(houseEquity(s))}(房貸 {wan(s.house.balance, 0)})</span>}
            {s.savings > 0 && <span>🌱 儲蓄險價值 {wan(s.savings)}</span>}
          </div>
        )}
      </div>

      <div className="health" aria-label={`健康 ${Math.round(s.health)}`}>
        <span>健康</span>
        <div className="health-bar"><i style={{ width: `${s.health}%`, background: s.health > 60 ? 'var(--green)' : s.health > 30 ? 'var(--amber)' : 'var(--red)' }} /></div>
        <b>{Math.round(s.health)}</b>
      </div>

      <div className="cov">
        <div className="cov-h">目前保障</div>
        <div className="cov-list">
          {PRODUCT_ORDER.filter((id) => id !== 'home' || s.house).map((id) => {
            const t = s.coverage[id] || 0
            return (
              <span key={id} className={`chip ${t ? 'on' : ''}`} title={PRODUCTS[id].tiers[t].label}>
                <span aria-hidden>{PRODUCTS[id].icon}</span> {PRODUCTS[id].name}
                <em>{t ? PRODUCTS[id].tiers[t].label : '未投保'}</em>
              </span>
            )
          })}
        </div>
      </div>

      {last && (
        <div className="lastyear">
          <div className="cov-h">上一年結算</div>
          <div className="ly-row"><span>收入</span><b>{signed(last.effIncome)}</b></div>
          <div className="ly-row"><span>支出+保費+房貸</span><b>{signed(-(last.expense + last.premiums + last.recurring + last.houseCost))}</b></div>
          {last.payout > 0 && <div className="ly-row cover"><span>保險給付</span><b>{signed(last.payout)}</b></div>}
          <div className="ly-row"><span>股市</span><b className={last.ret < 0 ? 'neg' : 'pos'}>{(last.ret * 100).toFixed(1)}%</b></div>
        </div>
      )}
    </aside>
  )
}
