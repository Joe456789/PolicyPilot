import { ACHIEVEMENTS, loadRecords } from '../game/records.js'
import { ENDINGS } from '../game/endings.js'
import { wan } from '../game/format.js'
import { t, getLang } from '../i18n.js'

export default function RecordsScreen({ onBack }) {
  const rec = loadRecords()
  const unlocked = Object.keys(rec.unlocked).length
  return (
    <div className="screen records">
      <header className="screen-h">
        <button className="btn ghost" onClick={onBack}>{t('← 返回')}</button>
        <h1>{t('成就與戰績')}</h1>
        <p className="muted">{t('紀錄只存在這台裝置的瀏覽器裡(尚未提供帳號登入)。已解鎖 {n} / {m}。', { n: unlocked, m: ACHIEVEMENTS.length })}</p>
      </header>
      <div className="ach-grid">
        {ACHIEVEMENTS.map((a) => {
          const on = !!rec.unlocked[a.id]
          return (
            <div key={a.id} className={`ach ${on ? 'on' : ''}`}>
              <span className="ach-i" aria-hidden>{on ? a.icon : '🔒'}</span>
              <div><b>{t(a.title)}</b><p>{t(a.desc)}</p></div>
            </div>
          )
        })}
      </div>
      <section className="card">
        <h3>{t('結局圖鑑 {n} / {m}', { n: Object.keys(rec.endings || {}).length, m: ENDINGS.length })}</h3>
        <div className="ach-grid">
          {ENDINGS.map((e) => {
            const on = !!(rec.endings || {})[e.id]
            return (
              <div key={e.id} className={`ach ${on ? 'on' : ''}`}>
                <span className="ach-i" aria-hidden>{on ? e.icon : '❔'}</span>
                <div><b>{on ? t(e.title) : '???'}</b><p>{on ? t(e.blurb) : t('{rarity}結局,還沒遇到。', { rarity: t(e.rarity) })}</p></div>
              </div>
            )
          })}
        </div>
      </section>
      <section className="card">
        <h3>{t('歷史戰績')}</h3>
        {rec.games.length === 0 ? <p className="muted">{t('還沒有完成過任何一局人生。')}</p> : (
          <div className="hist">
            {rec.games.map((g, i) => (
              <div key={i} className="hist-row">
                <span>{new Date(g.t).toLocaleDateString(getLang() === 'en' ? 'en-US' : undefined)}</span>
                <b>{t(g.name)} · {t(g.career)}{g.ending ? ` · ${t(g.ending)}` : ''}</b>
                <span>{t('{score} 分({grade})', { score: g.score, grade: g.grade })}</span>
                <span>{t('淨資產 {amount}', { amount: wan(g.net) })}</span>
                <span>{g.players > 1 ? t('第 {rank} / {players} 名', { rank: g.rank, players: g.players }) : t('單人')}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
