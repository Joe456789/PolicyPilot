import { useEffect, useState } from 'react'
import { Trophy, Sparkles } from 'lucide-react'
import { sfx } from '../sfx.js'
import { Confetti } from './HUD.jsx'

// 成就解鎖:一個一個從上方彈出,配音效與彩帶
export default function AchievementPopups({ items }) {
  const [k, setK] = useState(-1)
  const [burst, setBurst] = useState(0)
  useEffect(() => {
    if (!items?.length) return undefined
    const t = setTimeout(() => setK(0), 900)
    return () => clearTimeout(t)
  }, [items])
  useEffect(() => {
    if (k < 0 || !items) return undefined
    if (k >= items.length) { setK(-1); return undefined }
    sfx.quest(); setBurst((b) => b + 1)
    const t = setTimeout(() => setK((v) => v + 1), 3000)
    return () => clearTimeout(t)
  }, [k, items])
  if (k < 0 || !items || k >= items.length) return null
  const a = items[k]
  return (
    <div className="ach-pop" role="status" aria-live="polite">
      <Confetti burst={burst} />
      <div className="ach-card" key={a.id}>
        <span className="ach-trophy"><Trophy size={26} aria-hidden /></span>
        <div>
          <div className="ach-k"><Sparkles size={13} aria-hidden /> 成就解鎖 {k + 1}/{items.length}</div>
          <b>{a.icon} {a.title}</b>
          <p>{a.desc}</p>
        </div>
      </div>
    </div>
  )
}
