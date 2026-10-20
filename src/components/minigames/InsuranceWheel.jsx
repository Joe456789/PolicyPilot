import { useState } from 'react'
import { t } from '../../i18n.js'

const SEGS = [
  { icon: '🏥', name: '住院手術', need: 'medical', cover: '醫療險' }, // i18n-ignore 顯示時用 t()
  { icon: '🎗️', name: '確診癌症', need: 'critical', cover: '重大傷病險' }, // i18n-ignore 顯示時用 t()
  { icon: '🦽', name: '長期失能', need: 'disability', cover: '失能所得補償' }, // i18n-ignore 顯示時用 t()
  { icon: '🚗', name: '車禍受傷', need: 'accident', cover: '意外險' }, // i18n-ignore 顯示時用 t()
  { icon: '🕊️', name: '家人失去依靠', need: 'life', cover: '壽險' }, // i18n-ignore 顯示時用 t()
  { icon: '🌪️', name: '颱風淹水', need: 'home', cover: '住宅火險' }, // i18n-ignore 顯示時用 t()
  { icon: '🧓', name: '需要長照', need: 'ltc', cover: '長照險' }, // i18n-ignore 顯示時用 t()
  { icon: '📉', name: '收入中斷', need: 'cash', cover: '3 個月以上的預備金' }, // i18n-ignore 顯示時用 t()
]
const COLORS = ['#ff6b57', '#f97316', '#f5b301', '#84cc16', '#14b8a6', '#3b82f6', '#8b5cf6', '#ec4899']

function covered(s, need) {
  if (need === 'cash') return s.cash / (s.expense / 12) >= 3
  if (need === 'accident') return (s.coverage.accident || 0) > 0 || (s.coverage.medical || 0) > 0
  if (need === 'home' && !s.house) return null // 沒有房子,這個風險與你無關
  return (s.coverage[need] || 0) > 0
}

export default function InsuranceWheel({ s, onDone }) {
  const [angle, setAngle] = useState(0)
  const [spinning, setSpinning] = useState(false)
  const [results, setResults] = useState([])
  const [last, setLast] = useState(null)
  const spins = results.length

  function spin() {
    if (spinning || spins >= 3) return
    setSpinning(true)
    setLast(null)
    const idx = Math.floor(Math.random() * SEGS.length)
    const seg = 360 / SEGS.length
    // 指針在上方;第 idx 個扇形的中心要轉到 0 度
    const target = 360 * 5 + (360 - (idx * seg + seg / 2))
    setAngle((a) => a - (a % 360) + target)
    setTimeout(() => {
      const ok = covered(s, SEGS[idx].need)
      const r = { seg: SEGS[idx], ok }
      setResults((x) => [...x, r])
      setLast(r)
      setSpinning(false)
    }, 3300)
  }

  function finish() {
    const good = results.filter((r) => r.ok !== false).length
    onDone({ stars: good, note: t('3 次抽到的風險中,有 {good} 次你的保障(或與你無關)擋得住。', { good }) })
  }

  const seg = 360 / SEGS.length
  const grad = SEGS.map((_, i) => `${COLORS[i]} ${i * seg}deg ${(i + 1) * seg}deg`).join(', ')
  return (
    <div className="mg wheel-wrap">
      <div className="mg-bar"><span>{t('已轉 {n} / 3 次', { n: spins })}</span><span>{t('擋住 {n}', { n: results.filter((r) => r.ok !== false).length })}</span></div>
      <div className="wheel-box">
        <div className="wheel-pin" aria-hidden>▼</div>
        <div className="wheel" style={{ background: `conic-gradient(${grad})`, transform: `rotate(${angle}deg)` }}>
          {SEGS.map((sg, i) => (
            <span key={i} className="wheel-ico" style={{ transform: `rotate(${i * seg + seg / 2}deg) translateY(-112px)` }}>
              <i style={{ transform: `rotate(${-(i * seg + seg / 2)}deg)` }}>{sg.icon}</i>
            </span>
          ))}
        </div>
      </div>
      {last && (
        <div className={`fb ${last.ok === false ? 'no' : 'ok'}`}>
          <b>{last.seg.icon} {t(last.seg.name)}</b>
          <p>{last.ok === null ? t('你目前沒有房子,這個風險跟你無關。') : last.ok ? t('你有「{cover}」,這次擋得住!', { cover: t(last.seg.cover) }) : t('你沒有「{cover}」,這筆損失要靠自己的存款承擔。', { cover: t(last.seg.cover) })}</p>
        </div>
      )}
      {spins < 3 ? (
        <button className="btn primary wide" onClick={spin} disabled={spinning}>{spinning ? t('轉動中…') : spins === 0 ? t('🎡 轉!') : t('再轉一次')}</button>
      ) : (
        <button className="btn primary wide" onClick={finish}>{t('看結果')}</button>
      )}
    </div>
  )
}
