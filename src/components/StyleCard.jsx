import { classifyStyle, STYLE_INFO, STYLE_LABELS, STYLE_MODEL } from '../game/ml/index.js'
import { t } from '../i18n.js'

// 結算頁:AI 理財性格分析(用自己訓練的分群模型,不呼叫外部 AI)
export default function StyleCard({ s }) {
  const r = classifyStyle(s)
  if (!r) return null
  const info = STYLE_INFO[r.id]
  const fmt = (id, v) => (id === 'cashMonths' ? t('{n} 個月', { n: Math.round(v * 12) }) : `${Math.round(v * 100)}%`)
  const max = (id) => (id === 'cashMonths' ? 2 : 1)
  return (
    <section className="card style-card">
      <h3>🤖 {t('AI 理財性格分析')}</h3>
      <div className="style-head">
        <span className="style-ico" aria-hidden>{info.icon}</span>
        <div>
          <b>{t(info.name)}</b>
          <small>{t('其次像:{name}', { name: t(STYLE_INFO[r.second].name) })}</small>
        </div>
      </div>
      <p>{t(info.desc)}</p>
      <div className="style-bars">
        {r.features.map((id, j) => (
          <div key={id} className="style-row">
            <span>{t(STYLE_LABELS[id])}</span>
            <div className="style-track">
              <i className="you" style={{ width: `${Math.min(100, (r.you[j] / max(id)) * 100)}%` }} />
              <em className="typ" style={{ left: `${Math.min(100, (r.typical[j] / max(id)) * 100)}%` }} title={t('這一型的平均')} />
            </div>
            <b>{fmt(id, r.you[j])}</b>
          </div>
        ))}
      </div>
      <p className="style-advice">💡 {t(info.advice)}</p>
      <p className="risk-foot">{t('機器學習模型(k-means 分群),依 {n} 局模擬人生的整局行為分成 5 種理財性格;長條是你,細線是這一型的平均。', { n: STYLE_MODEL.metrics.games.toLocaleString() })}</p>
    </section>
  )
}
