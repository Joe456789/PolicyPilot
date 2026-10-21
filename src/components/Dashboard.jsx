import { TAGS } from '../game/tags.js'
import { CARDS, MAX_CARDS } from '../game/cards.js'
import Avatar from './Avatar.jsx'
import { PRODUCTS, PRODUCT_ORDER, OPTIONAL_PRODUCTS } from '../game/products.js'
import { ASSETS, ASSET_ORDER, holdingsTotal, houseEquity, netWorth, householdIncome } from '../game/engine.js'
import { wan, signed } from '../game/format.js'
import AnimNum from './AnimNum.jsx'
import { propById, rentOf } from '../game/properties.js'
import { t, getLang } from '../i18n.js'

// 英文字典裡有些詞是小寫術語(句中用),當成標題/按鈕時首字母大寫;中文不受影響
const cap = (x) => x.charAt(0).toUpperCase() + x.slice(1)

function Stat({ label, value, tone, sub, num, fmt }) {
  return (
    <div className={`stat ${tone || ''}`}>
      <div className="stat-l">{label}</div>
      <div className="stat-v">{num != null ? <AnimNum value={num} format={fmt} /> : value}</div>
      {sub && <div className="stat-s">{sub}</div>}
    </div>
  )
}

export default function Dashboard({ s, onQuick }) {
  const colon = getLang() === 'en' ? ': ' : ':'
  const nw = netWorth(s)
  const months = s.cash / (s.expense / 12)
  const last = s.lastYear
  const total = holdingsTotal(s)
  return (
    <aside className="dash" aria-label={t('角色儀表板')}>
      <div className="persona">
        <Avatar look={s.player.look} size={76} title={s.player.name} />
        <div className="persona-t">
          <div className="persona-name">{s.player.name}</div>
          <div className="persona-sub">{t(s.player.title)} · {t('{age} 歲', { age: s.age })}</div>
          <div className="persona-tags">
            {s.partner ? <span className="tag">{cap(t('已婚'))}</span> : <span className="tag">{cap(t('單身'))}</span>}
            {s.dependents > 0 && <span className="tag">{t('扶養 {n} 人', { n: s.dependents })}</span>}
            {s.house && <span className="tag">{cap(t('有房'))}</span>}
            {(s.kids || []).length > 0 && <span className="tag">{t('孩子:{ages}', { ages: s.kids.map((k) => (k.independent ? t('已獨立') : t('{n}歲', { n: k.age }))).join(getLang() === 'en' ? ', ' : '、') })}</span>}
            {s.retired && <span className="tag">{t('已退休')}</span>}
            {!s.partner && s.dependents > 0 && <span className="tag warn">{t('唯一收入來源')}</span>}
          </div>
          {(s.tags || []).length > 0 && (
            <div className="persona-tags life-tags" aria-label={t('人生標籤')}>
              {s.tags.map((id) => <span key={id} className="tag life" title={`${t(TAGS[id].title)}${colon}${t(TAGS[id].desc)}`}>{TAGS[id].icon} {t(TAGS[id].title)}</span>)}
            </div>
          )}
        </div>
      </div>

      <div className="progress" aria-label={t('進度 {n} / {m} 年', { n: s.turn, m: s.years })}>
        <div className="progress-bar"><i style={{ width: `${(s.turn / s.years) * 100}%` }} /></div>
        <span>{t('第 {n} / {m} 年', { n: Math.min(s.turn + 1, s.years), m: s.years })}</span>
      </div>

      {onQuick && (
        <div className="quick-acts" role="group" aria-label={t('快速操作')}>
          {[['invest', '📈', '投資'], ['cover', '🛡️', '保險'], ['life', '🏠', '買房買車'], ['shop', '🛒', '商店']].map(([k, ic, n]) => (
            <button key={k} className="btn quick" disabled={s.phase !== 'plan'} onClick={() => onQuick(k)}><span aria-hidden>{ic}</span> {cap(t(n))}</button>
          ))}
        </div>
      )}

      <div className="stats">
        <Stat label={t('淨資產')} num={nw} fmt={(v) => wan(v)} value={wan(nw)} tone={nw < 0 ? 'bad' : 'ok'} />
        <Stat label={t('現金')} num={s.cash} fmt={(v) => wan(v)} value={wan(s.cash)} sub={t('約 {n} 個月生活費', { n: months.toFixed(1) })} tone={months < 3 ? 'warn' : ''} />
        <Stat label={t('家庭年收入')} value={wan(householdIncome(s), 0)} sub={t('年支出 {amt}', { amt: wan(s.expense + (s.house ? s.house.payment : 0), 0) })} />
        <Stat label={cap(t('貸款'))} num={s.loan} fmt={(v) => wan(v)} value={wan(s.loan)} tone={s.loan > 0 ? 'bad' : ''} sub={s.loan ? t('年利率約 7%') : ''} />
      </div>

      <div className="assets">
        <div className="cov-h">{t('資產配置')} <span className="muted">{t('投資合計 {amt}', { amt: wan(total) })}</span></div>
        <div className="alloc" role="img" aria-label={t('資產配置比例')}>
          {ASSET_ORDER.map((k) => (s.hold[k] > 0 ? <i key={k} className={`a-${k}`} style={{ flex: s.hold[k] }} title={`${t(ASSETS[k].name)} ${wan(s.hold[k])}`} /> : null))}
          {total === 0 && <i className="a-none" style={{ flex: 1 }} />}
        </div>
        <div className="alloc-l">
          {ASSET_ORDER.map((k) => (
            <span key={k} className={s.hold[k] ? 'on' : ''}><i className={`dot a-${k}`} />{t(ASSETS[k].name)} {wan(s.hold[k])}</span>
          ))}
        </div>
        {(s.house || s.savings > 0 || s.ilv > 0) && (
          <div className="alloc-x">
            {s.house && <span>🏠 {t('房產淨值 {equity}(房貸 {loan})', { equity: wan(houseEquity(s)), loan: wan(s.house.balance, 0) })}</span>}
            {s.savings > 0 && <span>🌱 {t('儲蓄險價值 {amt}', { amt: wan(s.savings) })}</span>}
            {s.ilv > 0 && <span>📊 {t('投資型保單帳戶 {amt}', { amt: wan(s.ilv) })}</span>}
          </div>
        )}
      </div>

      {Object.keys(s.props).length > 0 && (
        <div className="assets">
          <div className="cov-h">{t('我的資產格')} <span className="muted">{t('年租合計 {amt}', { amt: wan(Object.entries(s.props).reduce((a, [id, pr]) => a + rentOf(propById(id), pr.level), 0)) })}</span></div>
          <div className="alloc-x">
            {Object.entries(s.props).map(([id, pr]) => <span key={id}>{propById(id).icon} {t(propById(id).name)} Lv{pr.level} {pr.insured ? '🛡️' : '⚠️'}</span>)}
          </div>
        </div>
      )}

      <div className="hand">
        <div className="cov-h">{t('我的手牌')} <span className="muted">{t('{n} 張(最多 {m} 張)', { n: (s.cards || []).length, m: MAX_CARDS })}</span></div>
        <p className="muted small hand-note">{t('不用集滿、也不用按:遇到對應的事件時會自動使用,用完就消失。')}</p>
        <div className="hand-row">
          {(s.cards || []).map((id, i) => (
            <span key={id + i} className={`hcard ${CARDS[id].kind === '保障卡' ? 'prot' : 'opp'}`} tabIndex={0} title={`${t(CARDS[id].name)}${colon}${t(CARDS[id].desc)}`}>
              <b>{CARDS[id].icon}</b>{t(CARDS[id].name)}<small>{t(CARDS[id].desc)}</small>
            </span>
          ))}
          {!(s.cards || []).length && <span className="muted hand-empty">{t('還沒有卡片。機會格、小遊戲三顆星、理專諮詢都有機會抽到,也可以到「商店」買。')}</span>}
        </div>
      </div>

      {s.hospitalTurns > 0 && <p className="callout" role="status">🏥 {t('住院休養中:還要休養 {n} 個回合(不能擲骰、收入打折,身體會慢慢恢復)。', { n: s.hospitalTurns })}</p>}

      {s.cash < 0 && <p className="callout bad" role="alert">⚠ {t('現金為負,年底前補不上就會破產出局。')}</p>}

      <div className="health" aria-label={t('健康 {n}', { n: Math.round(s.health) })}>
        <span>{t('健康')}</span>
        <div className="health-bar"><i style={{ width: `${s.health}%`, background: s.health > 60 ? 'var(--green)' : s.health > 30 ? 'var(--amber)' : 'var(--red)' }} /></div>
        <b>{Math.round(s.health)}</b>
      </div>

      <div className="cov">
        <div className="cov-h">{t('目前保障')}</div>
        <div className="cov-list">
          {PRODUCT_ORDER.filter((id) => (s.coverage[id] || 0) > 0 || (!OPTIONAL_PRODUCTS.includes(id) && (id !== 'home' || s.house) && (id !== 'auto' || s.car))).map((id) => {
            const tier = s.coverage[id] || 0
            return (
              <span key={id} className={`chip ${tier ? 'on' : ''}`} title={t(PRODUCTS[id].tiers[tier].label)}>
                <span aria-hidden>{PRODUCTS[id].icon}</span> {t(PRODUCTS[id].name)}
                <em>{tier ? t(PRODUCTS[id].tiers[tier].label) : t('未投保')}</em>
              </span>
            )
          })}
        </div>
      </div>

      {last && (
        <div className="lastyear">
          <div className="cov-h">{t('上一年結算')}</div>
          <div className="ly-row"><span>{t('收入')}</span><b>{signed(last.effIncome)}</b></div>
          <div className="ly-row"><span>{t('支出+保費+房貸')}</span><b>{signed(-(last.expense + last.premiums + last.recurring + last.houseCost))}</b></div>
          {last.payout > 0 && <div className="ly-row cover"><span>{t('保險給付')}</span><b>{signed(last.payout)}</b></div>}
          <div className="ly-row"><span>{cap(t('股市'))}</span><b className={last.ret < 0 ? 'neg' : 'pos'}>{(last.ret * 100).toFixed(1)}%</b></div>
        </div>
      )}
    </aside>
  )
}
