import { useEffect, useState } from 'react'
import { MINIGAMES, MINIGAME_REWARD } from '../game/minigames.js'
import MemoryMatch from './minigames/MemoryMatch.jsx'
import ScamSwipe from './minigames/ScamSwipe.jsx'
import BudgetPlan from './minigames/BudgetPlan.jsx'
import RiskCatch from './minigames/RiskCatch.jsx'
import InsuranceWheel from './minigames/InsuranceWheel.jsx'
import { wan } from '../game/format.js'
import { sfx } from '../sfx.js'
import { t } from '../i18n.js'

export default function MiniGameModal({ game, s, onDone }) {
  const meta = MINIGAMES[game]
  const [playing, setPlaying] = useState(false)
  const finish = (r) => { sfx.fanfare(); onDone(r) }
  // 自動化測試用:?mgauto=1 讓小遊戲立刻以 2 顆星完成
  useEffect(() => {
    if (new URLSearchParams(location.search).get('mgauto') && !new URLSearchParams(location.search).get('mg')) onDone({ stars: 2, note: t('(自動測試)') })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label={t(meta.title)}>
      <div className="modal minigame card-pop tone-neutral">
        <div className="card-top"><span className="card-kind mg-kind">🎮 {t('小遊戲')}</span><span className="mg-reward">{t('最高獎金 {amount}', { amount: wan(MINIGAME_REWARD[3], 0) })}</span></div>
        <div className="card-ico" aria-hidden>{meta.icon}</div>
        <h2 className="card-title">{t(meta.title)}</h2>
        {!playing ? (
          <>
            <p className="card-story">{t(meta.blurb)}</p>
            <p className="mg-rule">{t('玩法:{rule}', { rule: t(meta.rule) })}</p>
            <div className="mg-stars-info">⭐ {wan(MINIGAME_REWARD[1], 0)} · ⭐⭐ {wan(MINIGAME_REWARD[2], 0)} · ⭐⭐⭐ {wan(MINIGAME_REWARD[3], 0)}</div>
            <button className="btn primary wide" onClick={() => { sfx.click(); setPlaying(true) }}>{t('開始挑戰')}</button>
          </>
        ) : game === 'memory' ? <MemoryMatch onDone={finish} />
          : game === 'scam' ? <ScamSwipe onDone={finish} />
            : game === 'budget' ? <BudgetPlan s={s} onDone={finish} />
              : game === 'catch' ? <RiskCatch onDone={finish} />
                : <InsuranceWheel s={s} onDone={finish} />}
      </div>
    </div>
  )
}
