import { wan, signed } from '../game/format.js'
import { useArt, sceneArtIds } from '../art.js'
import { t } from '../i18n.js'

// 英文字典裡有些詞是小寫術語(句中用),當成標題/按鈕時首字母大寫;中文不受影響
const cap = (x) => x.charAt(0).toUpperCase() + x.slice(1)

const KIND = {
  event: () => t('生活事件'),
  chance: () => t('機會卡'),
  market: () => t('市場行情'),
  bonus: () => t('意外之財'),
  milestone: () => t('人生里程碑'),
  advisor: () => t('理專諮詢'),
  shop: () => t('理財商城'),
  bank: () => t('銀行'),
  tax: () => t('年度報稅'),
  hospital: () => t('健康檢查'),
  quiz: () => t('保險小學堂'),
  tip: () => t('保險小學堂'),
  life: () => t('成長篇'),
  minigame: () => t('小遊戲'),
  minor: () => t('生活小事'),
}

export default function SceneModal({ scene, phase, onChoose, onContinue, aiTag, loadingAi, continueLabel, tips }) {
  const result = scene.result
  const artUrl = useArt()(sceneArtIds(scene))
  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label={scene.title}>
      <div className={`modal card-pop tone-${scene.tone} kind-${scene.kind}`}>
        <div className="card-top">
          <span className="card-kind">{KIND[scene.kind]?.()}{scene.tag ? ` · ${scene.tag}` : ''}</span>
          {aiTag && <span className="ai-pill" title={t('情境由 Gemini 依角色處境生成;金額與給付由規則引擎計算')}>{t('✨ AI 導演')}</span>}
          {loadingAi && !aiTag && scene.aiable && <span className="ai-pill dim">{t('AI 構思情境中…')}</span>}
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
              <li key={g.id}>{g.text}{g.blocked && t('(已無法加保)')}</li>
            ))}
          </ul>
        )}

        {phase === 'scene' && tips?.summary && <div className="coach-scene"><b>🧑‍🏫 {t('教練提示')}</b><p>{tips.summary}</p></div>}

        {phase === 'scene' && (
          <div className="choices">
            {scene.choices.map((c, i) => {
              const pk = tips?.picks?.[i]
              return (
                <button key={i} className={`choice ${pk?.badge ? `pick-${pk.badge}` : ''}`} onClick={() => onChoose(i)}>
                  <b>{c.label}{pk?.badge === 'best' && <em className="pick-tag best">👍 {t('教練推薦')}</em>}{pk?.badge === 'warn' && <em className="pick-tag warn">⚠ {t('小心')}</em>}</b>
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
              {continueLabel || (scene.cat === 'death' ? t('查看結果') : t('繼續 → 年度結算'))}
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
    <div className="overlay" role="dialog" aria-modal="true" aria-label={t('年度結算')}>
      <div className="modal year">
        <div className="card-top"><span className="card-kind">{t('年度結算')}</span></div>
        <h2 className="card-title">{t('{age} 歲這一年', { age: h.age })}</h2>
        {s.ended?.reason === 'bankrupt' && (
          <p className="callout bad">💥 {t('破產出局!現金、投資、借款額度都用完,地產與房子也被低價拍賣,仍缺 {amt}。你的人生到此結束,將以目前的人生積分排名(破產者排在存活者之後)。', { amt: wan(s.ended.debt) })}</p>
        )}
        <ul className="lines">
          <li className="line in"><span>{t('實際收入')}{h.effIncome < h.grossIncome * 0.98 ? t('(含收入中斷影響)') : ''}</span><b>{signed(h.effIncome)}</b></li>
          <li className="line out"><span>{t('生活支出')}</span><b>{signed(-h.expense)}</b></li>
          {h.houseCost > 0 && <li className="line out"><span>{t('房貸還款')}</span><b>{signed(-h.houseCost)}</b></li>}
          <li className="line out"><span>{cap(t('保費'))}</span><b>{signed(-h.premiums)}</b></li>
          {h.recurring > 0 && <li className="line out"><span>{t('長期照護等支出')}</span><b>{signed(-h.recurring)}</b></li>}
          <li className={`line ${h.ret < 0 ? 'out' : 'in'}`}><span>{t('股市年報酬')}</span><b>{(h.ret * 100).toFixed(1)}%</b></li>
          {h.rent > 0 && <li className="line in"><span>{t('地產租金收入')}</span><b>{signed(h.rent)}</b></li>}
          {h.tolls > 0 && <li className="line in"><span>{t('收到的過路費')}</span><b>{signed(h.tolls)}</b></li>}
          {h.propLoan > 0 && <li className="line out"><span>{t('地產貸款還款')}</span><b>{signed(-h.propLoan)}</b></li>}
          {h.propPrem > 0 && <li className="line out"><span>{t('財產險保費')}</span><b>{signed(-h.propPrem)}</b></li>}
          {h.propDamage > 0 && <li className="line warn"><span>{t('地產受災損失')}{h.propPaid > 0 ? t('(保險賠 {amt})', { amt: wan(h.propPaid) }) : t('(沒有投保)')}</span><b>{signed(-h.propDamage)}</b></li>}
          {h.forced > 0 && <li className="line warn"><span>{t('現金見底,{n} 筆資產被低價拍賣', { n: h.forced })}</span><b>⚠</b></li>}
          {h.borrowed > 0 && <li className="line warn"><span>{t('現金不夠,被迫借款')}</span><b>{wan(h.borrowed)}</b></li>}
        </ul>
        <div className="nw">
          <span>{t('淨資產')}</span>
          <b>{wan(h.netWorth)}</b>
          <em className={delta >= 0 ? 'pos' : 'neg'}>{delta >= 0 ? '▲' : '▼'} {wan(Math.abs(delta))}</em>
        </div>
        <button className="btn primary wide" onClick={onNext}>{last ? t('查看人生結算') : t('進入下一年')}</button>
      </div>
    </div>
  )
}

export function StageModal({ data, fromAi, loading, onClose, age }) {
  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label={t('人生階段分析')}>
      <div className="modal stage-modal">
        <div className="card-top">
          <span className="card-kind">{t('人生階段分析')}</span>
          <span className={`ai-pill ${fromAi ? '' : 'dim'}`}>{loading ? t('AI 分析中…') : fromAi ? t('✨ Gemini 分析') : t('離線備援')}</span>
        </div>
        <div className="card-ico" aria-hidden>🧭</div>
        <h2 className="card-title">{data?.title || t('{age} 歲:階段回顧', { age })}</h2>
        {loading || !data ? (
          <div className="skeleton" aria-busy="true"><i /><i /><i /></div>
        ) : (
          <>
            <p className="card-story left">{data.analysis}</p>
            <div className="stage-cols">
              {data.strengths?.length > 0 && (
                <div className="stage-box good"><b>{t('做得好')}</b><ul>{data.strengths.map((x, i) => <li key={i}>{x}</li>)}</ul></div>
              )}
              {data.risks?.length > 0 && (
                <div className="stage-box bad"><b>{t('留意風險')}</b><ul>{data.risks.map((x, i) => <li key={i}>{x}</li>)}</ul></div>
              )}
            </div>
            <div className="stage-box next"><b>{t('下一階段建議')}</b><ol>{data.next.map((x, i) => <li key={i}>{x}</li>)}</ol></div>
          </>
        )}
        <button className="btn primary wide" onClick={onClose} disabled={loading}>{t('繼續人生')}</button>
      </div>
    </div>
  )
}
