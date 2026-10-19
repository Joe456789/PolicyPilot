import { wan, signed } from '../game/format.js'
import { useArt, sceneArtIds } from '../art.js'

const KIND = {
  event: '生活事件',
  chance: '機會卡',
  market: '市場行情',
  bonus: '意外之財',
  milestone: '人生里程碑',
  advisor: '理專諮詢',
  shop: '理財商城',
  bank: '銀行',
  tax: '年度報稅',
  hospital: '健康檢查',
  quiz: '保險小學堂',
  tip: '保險小學堂',
  life: '成長篇',
  minigame: '小遊戲',
}

export default function SceneModal({ scene, phase, onChoose, onContinue, aiTag, loadingAi, continueLabel, tips }) {
  const result = scene.result
  const artUrl = useArt()(sceneArtIds(scene))
  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label={scene.title}>
      <div className={`modal card-pop tone-${scene.tone} kind-${scene.kind}`}>
        <div className="card-top">
          <span className="card-kind">{KIND[scene.kind]}</span>
          {aiTag && <span className="ai-pill" title="情境由 Gemini 依角色處境生成;金額與給付由規則引擎計算">✨ AI 導演</span>}
          {loadingAi && !aiTag && scene.aiable && <span className="ai-pill dim">AI 構思情境中…</span>}
        </div>
        {artUrl
          ? <img className="card-art" src={artUrl} alt="" loading="lazy" onError={(e) => { e.currentTarget.style.display = 'none' }} />
          : <div className="card-ico" aria-hidden>{scene.icon}</div>}
        <h2 className="card-title">{scene.title}</h2>
        <p className="card-story">{scene.story}</p>
        {scene.lesson && phase === 'scene' && <div className="scene-lesson">💡 {scene.lesson}</div>}

        {scene.kind === 'advisor' && scene.base?.analysis?.gaps?.length > 0 && phase === 'scene' && (
          <ul className="gap-list">
            {scene.base.analysis.gaps.slice(0, 3).map((g) => (
              <li key={g.id}>{g.text}{g.blocked && '(已無法加保)'}</li>
            ))}
          </ul>
        )}

        {phase === 'scene' && tips?.summary && <div className="coach-scene"><b>🧑‍🏫 教練提示</b><p>{tips.summary}</p></div>}

        {phase === 'scene' && (
          <div className="choices">
            {scene.choices.map((c, i) => {
              const pk = tips?.picks?.[i]
              return (
                <button key={i} className={`choice ${pk?.badge ? `pick-${pk.badge}` : ''}`} onClick={() => onChoose(i)}>
                  <b>{c.label}{pk?.badge === 'best' && <em className="pick-tag best">👍 教練推薦</em>}{pk?.badge === 'warn' && <em className="pick-tag warn">⚠ 小心</em>}</b>
                  {c.hint && <small>{c.hint}</small>}
                  {pk?.text && <small className="pick-text">🧑‍🏫 {pk.text}</small>}
                </button>
              )
            })}
          </div>
        )}

        {phase === 'result' && result && (
          <>
            <ul className="lines">
              {result.lines.map((l, i) => (
                <li key={i} className={`line ${l.kind}`}>
                  {l.kind === 'lesson' && <span aria-hidden>💡</span>}
                  <span>{l.label}</span>
                  {l.amount !== 0 && <b>{signed(l.amount)}</b>}
                </li>
              ))}
            </ul>
            <button className="btn primary wide" onClick={onContinue}>
              {continueLabel || (scene.cat === 'death' ? '查看結果' : '繼續 → 年度結算')}
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
        {s.ended?.reason === 'bankrupt' && (
          <p className="callout bad">💥 破產出局!現金、投資、借款額度都用完,地產與房子也被低價拍賣,仍缺 {wan(s.ended.debt)}。你的人生到此結束,將以目前的人生積分排名(破產者排在存活者之後)。</p>
        )}
        <ul className="lines">
          <li className="line in"><span>實際收入{h.effIncome < h.grossIncome * 0.98 ? '(含收入中斷影響)' : ''}</span><b>{signed(h.effIncome)}</b></li>
          <li className="line out"><span>生活支出</span><b>{signed(-h.expense)}</b></li>
          {h.houseCost > 0 && <li className="line out"><span>房貸還款</span><b>{signed(-h.houseCost)}</b></li>}
          <li className="line out"><span>保費</span><b>{signed(-h.premiums)}</b></li>
          {h.recurring > 0 && <li className="line out"><span>長期照護等支出</span><b>{signed(-h.recurring)}</b></li>}
          <li className={`line ${h.ret < 0 ? 'out' : 'in'}`}><span>股市年報酬</span><b>{(h.ret * 100).toFixed(1)}%</b></li>
          {h.rent > 0 && <li className="line in"><span>地產租金收入</span><b>{signed(h.rent)}</b></li>}
          {h.tolls > 0 && <li className="line in"><span>收到的過路費</span><b>{signed(h.tolls)}</b></li>}
          {h.propLoan > 0 && <li className="line out"><span>地產貸款還款</span><b>{signed(-h.propLoan)}</b></li>}
          {h.propPrem > 0 && <li className="line out"><span>財產險保費</span><b>{signed(-h.propPrem)}</b></li>}
          {h.propDamage > 0 && <li className="line warn"><span>地產受災損失{h.propPaid > 0 ? `(保險賠 ${wan(h.propPaid)})` : '(沒有投保)'}</span><b>{signed(-h.propDamage)}</b></li>}
          {h.forced > 0 && <li className="line warn"><span>現金見底,{h.forced} 筆資產被低價拍賣</span><b>⚠</b></li>}
          {h.borrowed > 0 && <li className="line warn"><span>現金不夠,被迫借款</span><b>{wan(h.borrowed)}</b></li>}
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

export function StageModal({ data, fromAi, loading, onClose, age }) {
  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label="人生階段分析">
      <div className="modal stage-modal">
        <div className="card-top">
          <span className="card-kind">人生階段分析</span>
          <span className={`ai-pill ${fromAi ? '' : 'dim'}`}>{loading ? 'AI 分析中…' : fromAi ? '✨ Gemini 分析' : '離線備援'}</span>
        </div>
        <div className="card-ico" aria-hidden>🧭</div>
        <h2 className="card-title">{data?.title || `${age} 歲:階段回顧`}</h2>
        {loading || !data ? (
          <div className="skeleton" aria-busy="true"><i /><i /><i /></div>
        ) : (
          <>
            <p className="card-story left">{data.analysis}</p>
            <div className="stage-cols">
              {data.strengths?.length > 0 && (
                <div className="stage-box good"><b>做得好</b><ul>{data.strengths.map((x, i) => <li key={i}>{x}</li>)}</ul></div>
              )}
              {data.risks?.length > 0 && (
                <div className="stage-box bad"><b>留意風險</b><ul>{data.risks.map((x, i) => <li key={i}>{x}</li>)}</ul></div>
              )}
            </div>
            <div className="stage-box next"><b>下一階段建議</b><ol>{data.next.map((x, i) => <li key={i}>{x}</li>)}</ol></div>
          </>
        )}
        <button className="btn primary wide" onClick={onClose} disabled={loading}>繼續人生</button>
      </div>
    </div>
  )
}
