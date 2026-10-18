import Avatar from './Avatar.jsx'
import { PRODUCTS, PRODUCT_ORDER } from '../game/products.js'
import { wan, signed } from '../game/format.js'
import { netWorth } from '../game/engine.js'

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
  return (
    <aside className="dash" aria-label="角色儀表板">
      <div className="persona">
        <Avatar look={s.char.avatar} size={76} title={s.char.name} />
        <div className="persona-t">
          <div className="persona-name">{s.char.name}</div>
          <div className="persona-sub">{s.char.title} · {s.age} 歲</div>
          <div className="persona-tags">
            {s.dependents > 0 && <span className="tag">扶養 {s.dependents} 人</span>}
            {s.char.soleEarner && <span className="tag warn">唯一收入來源</span>}
            {s.mortgage > 0 && <span className="tag">房貸 {wan(s.mortgage, 0)}</span>}
          </div>
        </div>
      </div>

      <div className="progress" aria-label={`進度 ${s.turn} / ${s.char.years} 年`}>
        <div className="progress-bar"><i style={{ width: `${(s.turn / s.char.years) * 100}%` }} /></div>
        <span>第 {Math.min(s.turn + 1, s.char.years)} / {s.char.years} 年</span>
      </div>

      <div className="stats">
        <Stat label="淨資產" value={wan(nw)} tone={nw < 0 ? 'bad' : 'ok'} />
        <Stat label="現金" value={wan(s.cash)} sub={`約 ${months.toFixed(1)} 個月生活費`} tone={months < 3 ? 'warn' : ''} />
        <Stat label="投資" value={wan(s.invest)} />
        <Stat label="負債" value={wan(s.debt)} tone={s.debt > 0 ? 'bad' : ''} />
        {s.savings > 0 && <Stat label="儲蓄險價值" value={wan(s.savings)} />}
        <Stat label="年收入" value={wan(s.income, 0)} sub={`年支出 ${wan(s.expense, 0)}`} />
      </div>

      <div className="health" aria-label={`健康 ${Math.round(s.health)}`}>
        <span>健康</span>
        <div className="health-bar"><i style={{ width: `${s.health}%`, background: s.health > 60 ? 'var(--green)' : s.health > 30 ? 'var(--amber)' : 'var(--red)' }} /></div>
        <b>{Math.round(s.health)}</b>
      </div>

      <div className="cov">
        <div className="cov-h">目前保障</div>
        <div className="cov-list">
          {PRODUCT_ORDER.map((id) => {
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
          <div className="ly-row"><span>支出+保費</span><b>{signed(-(last.expense + last.premiums + last.recurring))}</b></div>
          {last.payout > 0 && <div className="ly-row cover"><span>保險給付</span><b>{signed(last.payout)}</b></div>}
          <div className="ly-row"><span>投資報酬</span><b className={last.ret < 0 ? 'neg' : 'pos'}>{(last.ret * 100).toFixed(1)}%</b></div>
        </div>
      )}
    </aside>
  )
}
