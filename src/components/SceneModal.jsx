import { wan, signed } from '../game/format.js'

const KIND = {
  event: '人生事件',
  market: '市場行情',
  bonus: '意外之財',
  milestone: '人生里程碑',
  advisor: '理專諮詢',
  tip: '理財小學堂',
}

export default function SceneModal({ scene, phase, onChoose, onContinue, aiTag, loadingAi }) {
  const result = scene.result
  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label={scene.title}>
      <div className={`modal card-pop tone-${scene.tone}`}>
        <div className="card-top">
          <span className="card-kind">{KIND[scene.kind]}</span>
          {aiTag && <span className="ai-pill" title="劇情由 Gemini 依角色處境生成;金額與給付由規則引擎計算">✨ AI 編劇</span>}
          {loadingAi && !aiTag && <span className="ai-pill dim">AI 編劇中…</span>}
        </div>
        <div className="card-ico" aria-hidden>{scene.icon}</div>
        <h2 className="card-title">{scene.title}</h2>
        <p className="card-story">{scene.story}</p>

        {scene.kind === 'advisor' && scene.base?.analysis?.gaps?.length > 0 && phase === 'scene' && (
          <ul className="gap-list">
            {scene.base.analysis.gaps.slice(0, 3).map((g) => (
              <li key={g.id}>{g.text}{g.blocked && '(已無法加保)'}</li>
            ))}
          </ul>
        )}

        {phase === 'scene' && (
          <div className="choices">
            {scene.choices.map((c, i) => (
              <button key={i} className="choice" onClick={() => onChoose(i)}>
                <b>{c.label}</b>
                {c.hint && <small>{c.hint}</small>}
              </button>
            ))}
          </div>
        )}

        {phase === 'result' && result && (
          <>
            <ul className="lines">
              {result.lines.map((l, i) => (
                <li key={i} className={`line ${l.kind}`}>
                  <span>{l.label}</span>
                  {l.amount !== 0 && <b>{signed(l.amount)}</b>}
                </li>
              ))}
            </ul>
            <button className="btn primary wide" onClick={onContinue}>
              {scene.cat === 'death' ? '查看結果' : '繼續 → 年度結算'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

export function YearModal({ s, onNext, last }) {
  const h = s.history[s.history.length - 1]
  const prev = s.history[s.history.length - 2]
  const prevNw = prev ? prev.netWorth : s.startNetWorth
  const delta = h.netWorth - prevNw
  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label="年度結算">
      <div className="modal year">
        <div className="card-top"><span className="card-kind">年度結算</span></div>
        <h2 className="card-title">{h.age} 歲這一年</h2>
        <ul className="lines">
          <li className="line in"><span>實際收入{h.effIncome < h.grossIncome * 0.98 ? '(含收入中斷影響)' : ''}</span><b>{signed(h.effIncome)}</b></li>
          <li className="line out"><span>生活支出</span><b>{signed(-h.expense)}</b></li>
          <li className="line out"><span>保費</span><b>{signed(-h.premiums)}</b></li>
          {h.recurring > 0 && <li className="line out"><span>長期照護等支出</span><b>{signed(-h.recurring)}</b></li>}
          <li className={`line ${h.ret < 0 ? 'out' : 'in'}`}><span>投資年報酬</span><b>{(h.ret * 100).toFixed(1)}%</b></li>
          {h.savingsIn > 0 && <li className="line note"><span>儲蓄險累積價值</span><b>{wan(h.savings)}</b></li>}
        </ul>
        <div className="nw">
          <span>淨資產</span>
          <b>{wan(h.netWorth)}</b>
          <em className={delta >= 0 ? 'pos' : 'neg'}>{delta >= 0 ? '▲' : '▼'} {wan(Math.abs(delta))}</em>
        </div>
        <button className="btn primary wide" onClick={onNext}>{last ? '查看人生結算' : '進入下一年'}</button>
      </div>
    </div>
  )
}
