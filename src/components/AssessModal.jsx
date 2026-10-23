import { useState } from 'react'
import { FORMS, gradeTest, compareTests } from '../game/assess.js'
import { addTraining, loadTraining } from '../training.js'
import { sfx } from '../sfx.js'
import { t } from '../i18n.js'

// 觀念前後測:玩之前考前測、玩完考後測,看看這一局學到多少。
export default function AssessModal({ phase = 'pre', onClose }) {
  const form = FORMS[phase]
  const [answers, setAnswers] = useState(() => form.map(() => -1))
  const [result, setResult] = useState(null)
  const [cmp, setCmp] = useState(null)
  const done = answers.every((a) => a >= 0)

  function submit() {
    if (!done || result) return
    const r = gradeTest(phase, answers)
    if (phase === 'post') {
      const pre = loadTraining().tests.find((x) => x.phase === 'pre')
      setCmp(compareTests(pre, r))
    }
    addTraining('tests', r)
    setResult(r)
    if (r.correct === r.total) sfx.fanfare?.()
    else sfx.click()
  }

  const title = phase === 'pre' ? t('觀念前測') : t('觀念後測')
  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label={title}>
      <div className="modal assess">
        <header className="modal-h">
          <div>
            <h2>📝 {title}</h2>
            <p className="muted">{phase === 'pre'
              ? t('玩之前先測一下:{n} 題、大約 1 分鐘。玩完再做後測,就能看到自己學到多少。', { n: form.length })
              : t('玩完一局了!用另一份題目測一下同樣的 {n} 個觀念。', { n: form.length })}</p>
          </div>
          <button className="btn" onClick={onClose}>{t('關閉')}</button>
        </header>
        {result && (
          <div className="assess-score" aria-live="polite">
            <b>{result.correct} / {result.total}</b>
            {cmp && <span className={cmp.gain >= 0 ? 'up' : 'down'}>{t('前測 {a} → 後測 {b}({g})', { a: result.correct - cmp.gain, b: result.correct, g: `${cmp.gain >= 0 ? '+' : ''}${cmp.gain}` })}</span>}
            {phase === 'post' && !cmp && <span className="muted">{t('沒有找到前測紀錄,下次可以先做前測再玩。')}</span>}
          </div>
        )}
        <ol className="assess-list">
          {form.map((it, i) => {
            const picked = answers[i]
            return (
              <li key={i} className={result ? (picked === it.answer ? 'right' : 'wrong') : ''}>
                <p className="assess-q">{t(it.q)}</p>
                <div className="assess-opts" role="radiogroup" aria-label={t(it.q)}>
                  {it.options.map((o, k) => (
                    <button key={k} type="button" role="radio" aria-checked={picked === k} disabled={!!result}
                      className={`assess-opt ${picked === k ? 'on' : ''} ${result && k === it.answer ? 'ans' : ''}`}
                      onClick={() => setAnswers((a) => a.map((x, j) => (j === i ? k : x)))}>{t(o)}</button>
                  ))}
                </div>
                {result && <small className="assess-why">{picked === it.answer ? '✓ ' : '✗ '}{t(it.why)}</small>}
              </li>
            )
          })}
        </ol>
        {!result
          ? <button className="btn primary wide" disabled={!done} onClick={submit}>{done ? t('交卷') : t('還有 {n} 題沒作答', { n: answers.filter((a) => a < 0).length })}</button>
          : <button className="btn primary wide" onClick={onClose}>{phase === 'pre' ? t('好,開始玩!') : t('完成')}</button>}
      </div>
    </div>
  )
}
