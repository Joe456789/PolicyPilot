import { useEffect, useState } from 'react'
import Chart from './Chart.jsx'
import Avatar from './Avatar.jsx'
import { buildReport, counterfactual, recommended, netWorth, evalQuests } from '../game/engine.js'
import { PRODUCTS, PRODUCT_ORDER, OPTIONAL_PRODUCTS } from '../game/products.js'
import { useArt } from '../art.js'
import { TAGS } from '../game/tags.js'
import { computeEnding } from '../game/endings.js'
import { propSummary } from '../game/scoring.js'
import { coachFallback } from '../game/fallback.js'
import { wan } from '../game/format.js'
import { ai } from '../ai.js'

function Ring({ value, grade }) {
  const r = 52, c = 2 * Math.PI * r
  return (
    <svg viewBox="0 0 130 130" width="150" height="150" role="img" aria-label={`總分 ${value}`}>
      <circle cx="65" cy="65" r={r} fill="none" stroke="#e7e2d4" strokeWidth="12" />
      <circle cx="65" cy="65" r={r} fill="none" stroke="var(--green)" strokeWidth="12" strokeLinecap="round"
        strokeDasharray={`${(c * value) / 100} ${c}`} transform="rotate(-90 65 65)" />
      <text x="65" y="64" textAnchor="middle" fontSize="34" fontWeight="800" fill="#1f2a37">{value}</text>
      <text x="65" y="88" textAnchor="middle" fontSize="16" fontWeight="700" fill="var(--green)">{grade} 級</text>
    </svg>
  )
}

const PARTS = [
  ['resilience', '財務韌性', 35],
  ['protection', '保障完整度', 25],
  ['growth', '資產成長', 20],
  ['behavior', '決策與知識', 10],
  ['quests', '人生任務', 10],
]

export default function ResultScreen({ s, aiOn, onAgain, ranks, fresh, onRecords }) {
  const report = buildReport(s)
  const { score } = report
  const ps = propSummary(s)
  const data = counterfactual(s)
  const rec = recommended(s)
  const [coach, setCoach] = useState(null)
  const [fromAi, setFromAi] = useState(false)

  useEffect(() => {
    let alive = true
    setCoach(null)
    ;(async () => {
      const out = aiOn ? await ai.coach(report) : null
      if (!alive) return
      setFromAi(!!out)
      setCoach(out || coachFallback(report))
    })()
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.seed])

  const death = score.family
  const ending = computeEnding(s, score)
  const endingArt = useArt()('ending_' + ending.id)
  const quests = evalQuests(s)
  return (
    <div className="screen result">
      <header className="res-h">
        <Avatar look={s.player.look} size={72} />
        <div>
          <div className="muted">{s.player.name} · {s.player.title} · {s.history[0]?.age ?? 22} → {s.age} 歲的人生結算</div>
          <h1>{coach?.headline || score.archetype}</h1>
        </div>
      </header>

      <section className="card ending">
        {endingArt
          ? <img className="ending-art" src={endingArt} alt="" onError={(e) => { e.currentTarget.style.display = 'none' }} />
          : <div className="ending-ico" aria-hidden>{ending.icon}</div>}
        <div>
          <div className="ending-k">你的結局 · {ending.rarity}</div>
          <h2>{ending.title}</h2>
          <p className="ending-b">{ending.blurb}</p>
          <p className="ending-e">{coach?.epilogue || ending.epilogue}</p>
          {(s.tags || []).length > 0 && (
            <div className="persona-tags life-tags" aria-label="人生標籤">
              {s.tags.map((id) => <span key={id} className="tag life" title={TAGS[id].desc}>{TAGS[id].icon} {TAGS[id].title}</span>)}
            </div>
          )}
        </div>
      </section>

      <div className="res-top">
        <div className="card score">
          <div className="life-sum">
            <span>{s.partner ? '💑 已婚' : '🙂 單身'}</span>
            <span>👶 扶養 {s.dependents} 人</span>
            <span>{s.house ? '🏠 有房' : '🏘️ 租屋'}</span>
            <span>💰 淨資產 {wan(netWorth(s))}</span>
          </div>
          <Ring value={score.total} grade={score.grade} />
          <div className="parts">
            {death ? (
              <p className="death-note">
                這一局在 {s.age} 歲結束。家人需要約 <b>{wan(death.need)}</b>,可動用資金為 <b>{wan(death.funds)}</b>
                (其中保險給付 {wan(death.payout)}),安心指數 <b>{Math.round(death.ratio * 100)}%</b>。
              </p>
            ) : (
              PARTS.map(([k, name, max]) => (
                <div key={k} className="part">
                  <span>{name}</span>
                  <div className="part-bar"><i style={{ width: `${Math.max(0, (score.parts[k] / max) * 100)}%` }} /></div>
                  <b>{score.parts[k]}/{max}</b>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="card coach">
          <div className="coach-h">
            <h3>🧑‍🏫 AI 教練回饋</h3>
            <span className={`ai-pill ${fromAi ? '' : 'dim'}`}>{coach ? (fromAi ? '✨ Gemini 生成' : '離線備援') : '分析中…'}</span>
          </div>
          {!coach ? (
            <div className="skeleton" aria-busy="true"><i /><i /><i /></div>
          ) : (
            <>
              <p className="coach-sum">{coach.summary}</p>
              <ul className="lessons">{coach.lessons.map((l, i) => <li key={i}>{l}</li>)}</ul>
            </>
          )}
        </div>
      </div>

      {ranks && ranks.length > 1 && (
        <section className="card">
          <h3>🏁 最終排名</h3>
          <div className="final-rank">
            {ranks.map((r) => (
              <div key={r.id} className={`fr ${r.human ? 'me' : ''} r${r.rank}`}>
                <b className="fr-n">{r.rank === 1 ? '🥇' : r.rank === 2 ? '🥈' : r.rank === 3 ? '🥉' : r.rank}</b>
                <Avatar look={r.look} size={44} ring={false} />
                <div className="fr-t"><b>{r.name}{r.human && '(你)'}</b><span>{r.title}</span></div>
                <div className="fr-s"><b>{r.total}</b> 分<small>淨資產 {wan(r.net)}{r.bankrupt ? ' · 破產出局' : r.dead ? ' · 中途退場' : ''}</small></div>
              </div>
            ))}
          </div>
          <p className="muted small">對手是用同一套規則的電腦玩家:他們的決策風格不同,結果也就不同。回頭看看哪一種策略在哪些事件裡贏或輸。</p>
        </section>
      )}

      {fresh && fresh.length > 0 && (
        <section className="card unlock">
          <h3>🎉 解鎖新成就</h3>
          <div className="ach-grid">
            {fresh.map((a) => (
              <div key={a.id} className="ach on pop"><span className="ach-i" aria-hidden>{a.icon}</span><div><b>{a.title}</b><p>{a.desc}</p></div></div>
            ))}
          </div>
        </section>
      )}

      <section className="card">
        <h3>🎯 人生任務</h3>
        <ul className="quests big">
          {quests.map((q) => (
            <li key={q.id} className={q.done ? 'done' : ''}>
              <span className="q-ico" aria-hidden>{q.done ? '✅' : '⬜'}</span>
              <div className="q-t"><div className="q-n">{q.title}</div><div className="muted small">{q.desc}</div></div>
              <span className="q-v">{q.done ? '達成' : `${q.value}/${q.target}`}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="card">
        <h3>🌌 平行人生:同樣的人生,不同的保障</h3>
        <p className="muted">三條線使用「完全相同」的人生事件,只替換保障配置,比較淨資產的走勢。保險平常看起來是成本,事件發生時才顯出價值。</p>
        <Chart data={data} />
        {!death && report.claims === 0 && (
          <p className="callout">
            🍀 這一局沒有發生需要理賠的重大事件,保費看起來像是「白付了」。這正是保險的本質:你付的是「萬一發生時不必面對最壞情況」的安心。
            換個隨機種子再玩一次,看看運氣不好的人生會變成什麼樣子。
          </p>
        )}
      </section>

      {ps.everOwned && (
        <section className="card">
          <h3>🏘️ 地產成績單</h3>
          <div className="gap-table" role="table" aria-label="地產成績">
            <div className="gap-row ok"><span>累計租金收入</span><b>{wan(ps.rent)}</b></div>
            <div className="gap-row ok"><span>收到的過路費</span><b>{wan(ps.tolls)}</b></div>
            <div className="gap-row gap"><span>天災損失</span><b>{wan(ps.damage)}</b></div>
            <div className="gap-row ok"><span>財產險理賠 / 保費</span><b>{wan(ps.paid)} / {wan(ps.prem)}</b></div>
          </div>
          <p className="muted">
            {ps.damage > 0 && ps.paid === 0
              ? '你的地產遇到天災時沒有投保,損失全部自己扛。地產是槓桿很高的資產,財產險就是它的安全網。'
              : ps.paid > 0
                ? '財產險在天災時替你分擔了損失:租金是「常態收入」,保險則是處理「少見但很痛」的風險。'
                : '這一局沒遇到天災,但地震、颱風、淹水沒有一定的時間表,投保才不會賭運氣。'}
          </p>
        </section>
      )}

      <section className="card">
        <h3>🔎 保障缺口檢視</h3>
        <div className="gap-table" role="table" aria-label="保障缺口">
          {PRODUCT_ORDER.filter((id) => (s.coverage[id] || 0) > 0 || (!OPTIONAL_PRODUCTS.includes(id) && (id !== 'home' || s.house) && (id !== 'auto' || s.car))).map((id) => {
            const have = s.coverage[id] || 0
            const need = rec[id] || 0
            const ok = have >= need
            return (
              <div key={id} className={`gap-row ${ok ? 'ok' : 'gap'}`} role="row">
                <span role="cell">{PRODUCTS[id].icon} {PRODUCTS[id].name}</span>
                <span role="cell">你:{PRODUCTS[id].tiers[have].label}</span>
                <span role="cell">建議:{PRODUCTS[id].tiers[need].label}</span>
                <b role="cell">{need === 0 ? '—' : ok ? '✓ 足夠' : '⚠ 缺口'}</b>
              </div>
            )
          })}
        </div>
        {coach?.gaps?.length > 0 && <ul className="lessons">{coach.gaps.map((g, i) => <li key={i}>{g}</li>)}</ul>}
      </section>

      {coach && (
        <section className="card scripts">
          <h3>💬 給理專:客戶溝通練習</h3>
          <p className="muted">把遊戲裡的體悟,轉成跟真實客戶對話時可以使用的說法。</p>
          <div className="script-grid">
            {coach.scripts.map((x, i) => (
              <blockquote key={i}>
                <b>情境:{x.scenario}</b>
                <p>「{x.say}」</p>
              </blockquote>
            ))}
          </div>
          <p className="compliance">⚖️ {coach.compliance}</p>
        </section>
      )}

      <p className="footnote">
        遊戲分工:劇情改寫、理專諮詢、人生階段分析與教練回饋由 Gemini 生成;所有金額、機率與保險給付由規則引擎確定性計算,
        同一個隨機種子會得到完全相同的人生(可重現、可驗證)。保障商品與費率為教學用簡化模型,非真實商品。
      </p>
      <div className="res-actions">
        <button className="btn primary" onClick={onAgain}>重新開始,創造新的人生</button>
        <button className="btn" onClick={onRecords}>🏅 成就與戰績</button>
      </div>
    </div>
  )
}
