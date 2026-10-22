import { predictRisk, RISK_MODEL } from '../game/ml/index.js'
import { t } from '../i18n.js'

// AI 風險預測卡:用自己訓練的機器學習模型(邏輯迴歸)估計接下來幾年發生財務危機的機率,並列出主要原因
export default function RiskCard({ s, compact }) {
  const r = predictRisk(s)
  const pct = Math.round(r.p * 100)
  const m = RISK_MODEL.metrics
  return (
    <div className={`risk-card lv-${r.level} ${compact ? 'compact' : ''}`} aria-label={t('AI 風險預測')}>
      <div className="risk-h">
        <b>🤖 {t('AI 風險預測')}</b>
        <span className="risk-p">{pct}%</span>
      </div>
      <div className="risk-bar"><i style={{ width: `${Math.max(3, pct)}%` }} /></div>
      <p className="risk-sub">{t('未來 {n} 年發生財務危機(被迫借錢、資產被拍賣或破產)的機率', { n: r.horizon })}</p>
      {r.reasons.length > 0 && (
        <ul className="risk-why">{r.reasons.map((x) => <li key={x.id}>{x.text}</li>)}</ul>
      )}
      {!compact && <p className="risk-foot">{t('機器學習模型(邏輯迴歸),用 {g} 局模擬人生、{n} 筆資料訓練;驗證準確度 {acc}%、AUC {auc}。在瀏覽器裡計算,不呼叫外部 AI。', { g: m.games.toLocaleString(), n: m.samples.toLocaleString(), acc: (m.accuracy * 100).toFixed(1), auc: m.auc.toFixed(2) })}</p>}
    </div>
  )
}
