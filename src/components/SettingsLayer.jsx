import { useEffect, useState } from 'react'
import { Settings, Sun, Moon, MonitorCog, X, Volume2, Type, Eye, RotateCcw, Sparkles, GraduationCap, Zap, Box, BookOpen, Library } from 'lucide-react'
import { useSettings } from '../settings.js'
import { sfx } from '../sfx.js'
import { resetTutorial } from './Tutorial.jsx'
import HelpModal from './HelpModal.jsx'
import CodexModal from './CodexModal.jsx'
import { t, useLang } from '../i18n.js'

const THEMES = [['light', '淺色', Sun], ['dark', '深色', Moon], ['auto', '跟隨系統', MonitorCog]] // i18n-ignore
const LANGS = [['zh', '繁體中文'], ['en', 'English']] // i18n-ignore
const SCALES = [[1, '標準'], [1.12, '大'], [1.25, '特大']] // i18n-ignore
const SCENES = [['real', '寫實電影'], ['toon', '卡通積木']] // i18n-ignore

function Seg({ value, options, onChange, label, raw }) {
  return (
    <div className="seg-row" role="radiogroup" aria-label={t(label)}>
      {options.map(([v, n, Icon]) => (
        <button key={String(v)} type="button" role="radio" aria-checked={value === v} className={`seg-pill ${value === v ? 'on' : ''}`} onClick={() => onChange(v)}>
          {Icon && <Icon size={16} aria-hidden />}{raw ? n : t(n)}
        </button>
      ))}
    </div>
  )
}

function Toggle({ checked, onChange, icon: Icon, title, desc }) {
  return (
    <label className="set-toggle">
      <span className="set-ico"><Icon size={18} aria-hidden /></span>
      <span className="set-txt"><b>{t(title)}</b><small>{t(desc)}</small></span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <i className="set-sw" aria-hidden />
    </label>
  )
}

// 全域設定:右上角的齒輪按鈕 + 設定面板(所有畫面都可用)
export default function SettingsLayer() {
  useLang()
  const [s, set, reset] = useSettings()
  const [open, setOpen] = useState(false)
  const [help, setHelp] = useState(false)
  const [codex, setCodex] = useState(false)
  // 其他畫面(例如標題頁)可以用事件打開玩法說明、觀念圖鑑
  useEffect(() => {
    const on = () => setHelp(true)
    const onCodex = () => setCodex(true)
    window.addEventListener('pp-help', on)
    window.addEventListener('pp-codex', onCodex)
    return () => { window.removeEventListener('pp-help', on); window.removeEventListener('pp-codex', onCodex) }
  }, [])
  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <>
      <button className="settings-fab" onClick={() => setOpen(true)} aria-label={t('設定')} title={t('設定')}>
        <Settings size={20} aria-hidden />
      </button>
      {open && (
        <div className="overlay set-overlay" role="dialog" aria-modal="true" aria-label={t('設定')} onClick={(e) => { if (e.target === e.currentTarget) setOpen(false) }}>
          <div className="modal settings">
            <header className="set-h">
              <h2><Settings size={22} aria-hidden /> {t('設定')}</h2>
              <button className="btn ghost set-x" onClick={() => setOpen(false)} aria-label={t('關閉')}><X size={20} aria-hidden /></button>
            </header>

            <section>
              <h3>Language / 語言</h3> {/* i18n-ignore */}
              <Seg label="語言" raw value={s.lang} options={LANGS} onChange={(v) => set({ lang: v })} />
              <p className="muted small">{t('切換語言後,新產生的事件與內容會使用新語言;目前已經顯示的卡片維持原樣。')}</p>
            </section>
            <section>
              <h3>{t('外觀')}</h3>
              <Seg label="主題" value={s.theme} options={THEMES} onChange={(v) => set({ theme: v })} />
            </section>
            <section>
              <h3><Box size={16} aria-hidden /> {t('3D 棋盤畫風')}</h3>
              <Seg label="3D 棋盤畫風" value={s.scene3d} options={SCENES} onChange={(v) => set({ scene3d: v })} />
              <p className="muted small">{t('寫實電影:黃昏天空、水面倒影、窗戶燈光與景深,較吃效能;電腦太慢時會自動降低特效。')}</p>
            </section>
            <section>
              <h3><Type size={16} aria-hidden /> {t('介面大小')}</h3>
              <Seg label="介面大小" value={s.scale} options={SCALES} onChange={(v) => set({ scale: v })} />
            </section>
            <section>
              <h3><Volume2 size={16} aria-hidden /> {t('音量')}</h3>
              <input className="set-range" type="range" min="0" max="1" step="0.05" value={s.volume} aria-label={t('音量')}
                onChange={(e) => set({ volume: Number(e.target.value) })} onPointerUp={() => sfx.coin()} />
            </section>
            <section className="set-list">
              <Toggle icon={Zap} title="動漫風格" desc="粗描邊、漫畫陰影、星芒與數字跳動;關掉會變回柔和風格" checked={s.anime} onChange={(v) => set({ anime: v })} /> {/* i18n-ignore */}
              <Toggle icon={Sparkles} title="減少動畫" desc="關閉彈跳、閃光與轉場,適合容易暈眩的人" checked={s.reduceMotion} onChange={(v) => set({ reduceMotion: v })} /> {/* i18n-ignore */}
              <Toggle icon={Eye} title="色盲友善配色" desc="把紅綠對比改成藍橘配色,增減數字也會加上符號" checked={s.colorblind} onChange={(v) => set({ colorblind: v })} /> {/* i18n-ignore */}
            </section>
            <div className="set-actions">
              <button className="btn" onClick={() => { setOpen(false); setHelp(true) }}><BookOpen size={16} aria-hidden /> {t('玩法說明')}</button>
              <button className="btn" onClick={() => { setOpen(false); setCodex(true) }}><Library size={16} aria-hidden /> {t('觀念圖鑑')}</button>
              <button className="btn" onClick={() => { resetTutorial(); setOpen(false) }}><GraduationCap size={16} aria-hidden /> {t('重看新手教學')}</button>
              <button className="btn set-reset" onClick={reset}><RotateCcw size={16} aria-hidden /> {t('恢復預設')}</button>
            </div>
          </div>
        </div>
      )}
      {help && <HelpModal onClose={() => setHelp(false)} />}
      {codex && <CodexModal onClose={() => setCodex(false)} />}
    </>
  )
}
