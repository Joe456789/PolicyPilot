import { useEffect, useState } from 'react'
import { Settings, Sun, Moon, MonitorCog, X, Volume2, Type, Eye, RotateCcw, Sparkles, GraduationCap, Zap } from 'lucide-react'
import { useSettings } from '../settings.js'
import { sfx } from '../sfx.js'
import { resetTutorial } from './Tutorial.jsx'

const THEMES = [['light', '淺色', Sun], ['dark', '深色', Moon], ['auto', '跟隨系統', MonitorCog]]
const SCALES = [[1, '標準'], [1.12, '大'], [1.25, '特大']]

function Seg({ value, options, onChange, label }) {
  return (
    <div className="seg-row" role="radiogroup" aria-label={label}>
      {options.map(([v, n, Icon]) => (
        <button key={String(v)} type="button" role="radio" aria-checked={value === v} className={`seg-pill ${value === v ? 'on' : ''}`} onClick={() => onChange(v)}>
          {Icon && <Icon size={16} aria-hidden />}{n}
        </button>
      ))}
    </div>
  )
}

function Toggle({ checked, onChange, icon: Icon, title, desc }) {
  return (
    <label className="set-toggle">
      <span className="set-ico"><Icon size={18} aria-hidden /></span>
      <span className="set-txt"><b>{title}</b><small>{desc}</small></span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <i className="set-sw" aria-hidden />
    </label>
  )
}

// 全域設定:右上角的齒輪按鈕 + 設定面板(所有畫面都可用)
export default function SettingsLayer() {
  const [s, set, reset] = useSettings()
  const [open, setOpen] = useState(false)
  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <>
      <button className="settings-fab" onClick={() => setOpen(true)} aria-label="設定" title="設定">
        <Settings size={20} aria-hidden />
      </button>
      {open && (
        <div className="overlay set-overlay" role="dialog" aria-modal="true" aria-label="設定" onClick={(e) => { if (e.target === e.currentTarget) setOpen(false) }}>
          <div className="modal settings">
            <header className="set-h">
              <h2><Settings size={22} aria-hidden /> 設定</h2>
              <button className="btn ghost set-x" onClick={() => setOpen(false)} aria-label="關閉"><X size={20} aria-hidden /></button>
            </header>

            <section>
              <h3>外觀</h3>
              <Seg label="主題" value={s.theme} options={THEMES} onChange={(v) => set({ theme: v })} />
            </section>
            <section>
              <h3><Type size={16} aria-hidden /> 介面大小</h3>
              <Seg label="介面大小" value={s.scale} options={SCALES} onChange={(v) => set({ scale: v })} />
            </section>
            <section>
              <h3><Volume2 size={16} aria-hidden /> 音量</h3>
              <input className="set-range" type="range" min="0" max="1" step="0.05" value={s.volume} aria-label="音量"
                onChange={(e) => set({ volume: Number(e.target.value) })} onPointerUp={() => sfx.coin()} />
            </section>
            <section className="set-list">
              <Toggle icon={Zap} title="動漫風格" desc="粗描邊、漫畫陰影、星芒與數字跳動;關掉會變回柔和風格" checked={s.anime} onChange={(v) => set({ anime: v })} />
              <Toggle icon={Sparkles} title="減少動畫" desc="關閉彈跳、閃光與轉場,適合容易暈眩的人" checked={s.reduceMotion} onChange={(v) => set({ reduceMotion: v })} />
              <Toggle icon={Eye} title="色盲友善配色" desc="把紅綠對比改成藍橘配色,增減數字也會加上符號" checked={s.colorblind} onChange={(v) => set({ colorblind: v })} />
            </section>
            <div className="set-actions">
              <button className="btn" onClick={() => { resetTutorial(); setOpen(false) }}><GraduationCap size={16} aria-hidden /> 重看新手教學</button>
              <button className="btn set-reset" onClick={reset}><RotateCcw size={16} aria-hidden /> 恢復預設</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
