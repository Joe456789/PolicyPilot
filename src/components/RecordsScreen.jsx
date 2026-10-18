import { ACHIEVEMENTS, loadRecords } from '../game/records.js'
import { wan } from '../game/format.js'

export default function RecordsScreen({ onBack }) {
  const rec = loadRecords()
  const unlocked = Object.keys(rec.unlocked).length
  return (
    <div className="screen records">
      <header className="screen-h">
        <button className="btn ghost" onClick={onBack}>← 返回</button>
        <h1>成就與戰績</h1>
        <p className="muted">紀錄只存在這台裝置的瀏覽器裡(尚未提供帳號登入)。已解鎖 {unlocked} / {ACHIEVEMENTS.length}。</p>
      </header>
      <div className="ach-grid">
        {ACHIEVEMENTS.map((a) => {
          const on = !!rec.unlocked[a.id]
          return (
            <div key={a.id} className={`ach ${on ? 'on' : ''}`}>
              <span className="ach-i" aria-hidden>{on ? a.icon : '🔒'}</span>
              <div><b>{a.title}</b><p>{a.desc}</p></div>
            </div>
          )
        })}
      </div>
      <section className="card">
        <h3>歷史戰績</h3>
        {rec.games.length === 0 ? <p className="muted">還沒有完成過任何一局人生。</p> : (
          <div className="hist">
            {rec.games.map((g, i) => (
              <div key={i} className="hist-row">
                <span>{new Date(g.t).toLocaleDateString()}</span>
                <b>{g.name} · {g.career}</b>
                <span>{g.score} 分({g.grade})</span>
                <span>淨資產 {wan(g.net)}</span>
                <span>{g.players > 1 ? `第 ${g.rank} / ${g.players} 名` : '單人'}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
