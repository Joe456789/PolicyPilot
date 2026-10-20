import { useState } from 'react'
import { Bot, Hand } from 'lucide-react'
import { PERSONAS } from '../game/bots.js'
import { t } from '../i18n.js'

const YEARS = [[1, '1 年'], [3, '3 年'], [5, '5 年'], [Infinity, '到結束']]

// 電腦託管:選一種理財風格,讓 AI 玩家代打幾年(規劃、擲骰、選擇都由它處理),隨時可以接手。
export default function AutopilotMenu({ active, left, defaultPersona, disabled, onStart, onStop }) {
  const [open, setOpen] = useState(false)
  const [persona, setPersona] = useState(defaultPersona)
  const [years, setYears] = useState(3)
  if (active) {
    return <button className="btn ghost on" onClick={onStop} title={t('停止託管,換你操作')}><Hand size={16} aria-hidden /> {t('接手')}</button>
  }
  return (
    <div className="auto-wrap">
      <button className="btn ghost" onClick={() => setOpen((v) => !v)} aria-expanded={open} disabled={disabled} title={t('讓電腦代打幾年')}><Bot size={16} aria-hidden /> {t('電腦託管')}</button>
      {open && (
        <div className="auto-pop" role="dialog" aria-label={t('電腦託管')}>
          <h4>🤖 {t('電腦託管')}</h4>
          <p>{t('選一種理財風格,電腦會代你規劃保障與投資、擲骰、做選擇。只會補強保障,不會把你已買的保險降級。')}</p>
          {PERSONAS.map((p) => (
            <button key={p.id} className={`opt ${persona === p.id ? 'on' : ''}`} onClick={() => setPersona(p.id)} aria-pressed={persona === p.id}>
              <span><b>{t(p.title)}</b><small>{t(p.blurb)}</small></span>
            </button>
          ))}
          <div className="auto-years" role="group" aria-label={t('託管幾年')}>
            {YEARS.map(([n, label]) => <button key={label} className={years === n ? 'on' : ''} onClick={() => setYears(n)} aria-pressed={years === n}>{t(label)}</button>)}
          </div>
          <button className="btn primary" style={{ width: '100%' }} onClick={() => { setOpen(false); onStart(persona, years) }}>{t('開始託管')}</button>
        </div>
      )}
    </div>
  )
}
