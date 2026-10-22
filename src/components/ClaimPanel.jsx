import { useState } from 'react'
import { DOCS } from '../game/claims.js'
import { wan } from '../game/format.js'
import { t } from '../i18n.js'

// 理賠申請:勾選要附上的文件,送出後逐項說明為什麼需要(或不需要)
export default function ClaimPanel({ claim, onFile }) {
  const [picks, setPicks] = useState([])
  const filed = claim.filed
  const toggle = (id) => setPicks((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))
  return (
    <section className="claim-panel">
      <h3>📝 {t('申請理賠')} · {wan(claim.amount)}</h3>
      {!filed && <p className="claim-hint">{t('要拿到理賠金,得先把文件附齊。勾選這次需要的文件:')}</p>}
      {filed && (
        <p className={`claim-result ${filed.missing.length ? 'bad' : 'good'}`}>
          {filed.missing.length
            ? t('缺件!保險公司通知補件,這筆理賠金要到下一年才會入帳。')
            : filed.extra.length ? t('文件齊全,理賠金已入帳。(有幾份其實不用附)') : t('一次就附齊,理賠金很快入帳!')}
        </p>
      )}
      <ul className="claim-docs">
        {claim.options.map((id) => {
          const d = DOCS[id]
          const need = claim.need.includes(id)
          const picked = filed ? filed.picks.includes(id) : picks.includes(id)
          const mark = !filed ? '' : need && picked ? 'ok' : need ? 'miss' : picked ? 'extra' : 'skip'
          return (
            <li key={id} className={`claim-doc ${mark}`}>
              <label>
                <input type="checkbox" checked={picked} disabled={!!filed} onChange={() => toggle(id)} />
                <span aria-hidden>{d.icon}</span> {t(d.name)}
                {filed && <b className="claim-mark">{mark === 'ok' ? '✓' : mark === 'miss' ? t('缺') : mark === 'extra' ? t('不用') : ''}</b>}
              </label>
              {filed && mark !== 'skip' && <small>{t(d.why)}</small>}
            </li>
          )
        })}
      </ul>
      {!filed && <button className="btn primary wide" onClick={() => onFile(picks)} disabled={!picks.length}>{t('送出申請')}</button>}
    </section>
  )
}
