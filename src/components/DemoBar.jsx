import { Pause, Play, FastForward, X, RotateCcw } from 'lucide-react'
import { t } from '../i18n.js'

// 展示模式的字幕列:固定在畫面底部,說明現在在做什麼;可以暫停、加快、離開。
export default function DemoBar({ caption, year, years, paused, fast, done, onPause, onFast, onExit, onRestart }) {
  return (
    <div className="demo-bar" role="region" aria-label={t('展示模式')} aria-live="polite">
      <div className="demo-badge">🎬 {t('展示模式')}</div>
      <div className="demo-text">
        <b>{caption.title}</b>
        <span>{caption.text}</span>
      </div>
      {!done && <div className="demo-prog" aria-label={t('第 {n} / {m} 年', { n: year, m: years })}><i style={{ width: `${Math.min(100, (year / years) * 100)}%` }} /><small>{t('第 {n} / {m} 年', { n: year, m: years })}</small></div>}
      <div className="demo-btns">
        {done
          ? <button className="btn primary" onClick={onRestart}><RotateCcw size={15} aria-hidden /> {t('重新展示')}</button>
          : (
            <>
              <button className="btn ghost" onClick={onPause} aria-pressed={paused} title={paused ? t('繼續') : t('暫停')}>{paused ? <Play size={16} aria-hidden /> : <Pause size={16} aria-hidden />} {paused ? t('繼續') : t('暫停')}</button>
              <button className={`btn ghost ${fast ? 'on' : ''}`} onClick={onFast} aria-pressed={fast} title={t('加快節奏')}><FastForward size={16} aria-hidden /> {t('加快')}</button>
            </>
          )}
        <button className="btn ghost" onClick={onExit} title={t('離開展示模式')}><X size={16} aria-hidden /> {t('離開')}</button>
      </div>
    </div>
  )
}
