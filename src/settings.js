// 設定:主題、介面大小、動畫、色盲友善、音量。存在瀏覽器,套用到 <html> 的屬性與 CSS 變數。
import { useEffect, useState } from 'react'
import { sfx } from './sfx.js'
import { setLang } from './i18n.js'

const KEY = 'policypilot.settings'
export const DEFAULTS = { theme: 'auto', scale: 1, reduceMotion: false, colorblind: false, volume: 0.8, anime: true, lang: 'zh' }

export function loadSettings() {
  let s = { ...DEFAULTS }
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || 'null')
    if (raw && typeof raw === 'object') s = { ...s, ...raw }
    else if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) s.reduceMotion = true
  } catch { /* 忽略 */ }
  return s
}

const systemDark = () => !!window.matchMedia?.('(prefers-color-scheme: dark)').matches

export function applySettings(s) {
  const root = document.documentElement
  root.dataset.theme = s.theme === 'auto' ? (systemDark() ? 'dark' : 'light') : s.theme
  root.dataset.motion = s.reduceMotion ? 'reduce' : 'full'
  root.dataset.cb = s.colorblind ? '1' : '0'
  root.dataset.style = s.anime ? 'anime' : 'soft'
  document.body.style.zoom = s.scale === 1 ? '' : String(s.scale)
  sfx.setVolume(s.volume)
  setLang(s.lang)
}

export function useSettings() {
  const [settings, setSettings] = useState(loadSettings)
  useEffect(() => {
    applySettings(settings)
    try { localStorage.setItem(KEY, JSON.stringify(settings)) } catch { /* 忽略 */ }
    if (settings.theme !== 'auto' || !window.matchMedia) return undefined
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const on = () => applySettings(settings)
    mq.addEventListener?.('change', on)
    return () => mq.removeEventListener?.('change', on)
  }, [settings])
  return [settings, (patch) => setSettings((s) => ({ ...s, ...patch })), () => setSettings({ ...DEFAULTS })]
}
