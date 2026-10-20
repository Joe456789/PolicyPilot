import Chart from './Chart.jsx'
import { PRODUCTS, PRODUCT_ORDER, OPTIONAL_PRODUCTS } from '../game/products.js'
import { wan } from '../game/format.js'
import { TAGS } from '../game/tags.js'

// 給理專的學習報告(列印 / 另存 PDF 用)。平常隱藏,只在列印時顯示。
export default function PrintReport({ s, score, ending, coach, report, data, rec, quests, ps, netWorth }) {
  const today = new Date().toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric' })
  const rows = PRODUCT_ORDER.filter((id) => (s.coverage[id] || 0) > 0 || (!OPTIONAL_PRODUCTS.includes(id) && (id !== 'home' || s.house) && (id !== 'auto' || s.car)))
  return (
    <section className="print-report" aria-hidden>
      <header className="pr-head">
        <div>
          <h1>保險大富翁・學習報告</h1>
          <p>{s.player.name} · {s.player.title} · {s.history[0]?.age ?? 22} → {s.age} 歲 · {today}</p>
        </div>
        <div className="pr-score"><b>{score.total}</b><span>{score.grade} 級</span></div>
      </header>

      <h2>1. 人生結局:{ending.icon} {ending.title}</h2>
      <p>{coach?.epilogue || ending.epilogue}</p>
      {(s.tags || []).length > 0 && <p><b>人生標籤:</b>{s.tags.map((id) => `${TAGS[id].icon}${TAGS[id].title}`).join('、')}</p>}
      <table className="pr-table">
        <tbody>
          <tr><th>淨資產</th><td>{wan(netWorth)}</td><th>財務韌性</th><td>{score.parts.resilience}/35</td></tr>
          <tr><th>保障完整度</th><td>{score.parts.protection}/25</td><th>資產成長</th><td>{score.parts.growth}/20</td></tr>
          <tr><th>決策與知識</th><td>{score.parts.behavior}/10</td><th>人生任務</th><td>{score.parts.quests}/10({quests.filter((q) => q.done).length}/{quests.length} 完成)</td></tr>
        </tbody>
      </table>

      <h2>2. 教練講評</h2>
      <p>{coach?.summary}</p>
      <ul>{(coach?.lessons || []).map((l, i) => <li key={i}>{l}</li>)}</ul>

      <h2>3. 平行人生:同樣的事件,不同的保障</h2>
      <Chart data={data} />
      <p className="pr-note">三條線使用完全相同的人生事件,只替換保障配置。你的配置累計理賠 {wan(report.claims)}。</p>

      <h2>4. 保障缺口檢視</h2>
      <table className="pr-table pr-gap">
        <thead><tr><th>保障</th><th>你的配置</th><th>建議配置</th><th>結果</th></tr></thead>
        <tbody>
          {rows.map((id) => {
            const have = s.coverage[id] || 0, need = rec[id] || 0
            return <tr key={id}><td>{PRODUCTS[id].name}</td><td>{PRODUCTS[id].tiers[have].label}</td><td>{PRODUCTS[id].tiers[need].label}</td><td>{need === 0 ? '—' : have >= need ? '足夠' : '缺口'}</td></tr>
          })}
        </tbody>
      </table>
      {(coach?.gaps || []).length > 0 && <ul>{coach.gaps.map((g, i) => <li key={i}>{g}</li>)}</ul>}

      {ps.everOwned && (
        <>
          <h2>5. 地產成績</h2>
          <p>累計租金 {wan(ps.rent)}、過路費收入 {wan(ps.tolls)}、天災損失 {wan(ps.damage)}、財產險理賠 {wan(ps.paid)}(保費 {wan(ps.prem)})。</p>
        </>
      )}

      <h2>{ps.everOwned ? '6' : '5'}. 逐年紀錄</h2>
      <table className="pr-table pr-years">
        <thead><tr><th>年齡</th><th>淨資產</th><th>發生的事</th><th>理賠</th><th>被迫借款</th></tr></thead>
        <tbody>
          {s.history.map((h) => (
            <tr key={h.age}>
              <td>{h.age}</td><td>{wan(h.netWorth)}</td>
              <td>{h.events.filter((e) => ['event', 'chance', 'milestone', 'property', 'market'].includes(e.kind)).map((e) => e.title).join('、') || '平靜的一年'}</td>
              <td>{h.payout > 0 ? wan(h.payout) : '—'}</td><td>{h.borrowed > 0 ? wan(h.borrowed) : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>{ps.everOwned ? '7' : '6'}. 給理專:客戶溝通練習</h2>
      {(coach?.scripts || []).map((x, i) => <div key={i} className="pr-script"><b>情境:{x.scenario}</b><p>「{x.say}」</p></div>)}
      {coach?.compliance && <p className="pr-note">⚖ {coach.compliance}</p>}

      <footer className="pr-foot">
        本報告由「保險大富翁」遊戲產生,供教育訓練使用。金額與保險給付由規則引擎計算,保障商品與費率為教學用簡化模型,非真實商品或投資建議。
      </footer>
    </section>
  )
}
