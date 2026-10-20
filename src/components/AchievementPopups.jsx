import { useEffect, useState } from 'react'
import { Trophy, Sparkles } from 'lucide-react'
import { sfx } from '../sfx.js'
import { Confetti } from './HUD.jsx'
import { t } from '../i18n.js'

// 成就解鎖:一個一個從上方彈出,配音效與彩帶
export default function AchievementPopups({ items }) {
  const [k, setK] = useState(-1)
  const [burst, setBurst] = useState(0)
  useEffect(() => {
    if (!items?.length) return undefined
    const timer = setTimeout(() => setK(0), 900)
    return () => clearTimeout(timer)
  }, [items])
  useEffect(() => {
    if (k < 0 || !items) return undefined
    if (k >= items.length) { setK(-1); return undefined }
    sfx.quest(); setBurst((b) => b + 1)
    const timer = setTimeout(() => setK((v) => v + 1), 3000)
    return () => clearTimeout(timer)
  }, [k, items])
  if (k < 0 || !items || k >= items.length) return null
  const a = items[k]
  return (
    <div className="ach-pop" role="status" aria-live="polite">
      <Confetti burst={burst} />
      <div className="ach-card" key={a.id}>
        <span className="ach-trophy"><Trophy size={26} aria-hidden /></span>
        <div>
          <div className="ach-k"><Sparkles size={13} aria-hidden /> {t('成就解鎖 {k}/{n}', { k: k + 1, n: items.length })}</div>
          <b>{a.icon} {t(a.title)}</b>
          <p>{t(a.desc)}</p>
        </div>
      </div>
    </div>
  )
}
