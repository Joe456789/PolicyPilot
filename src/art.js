// 插圖:由 scripts/gen-art.mjs 用 Gemini 生成,放在 public/art。
// 沒有圖(或網址不是由伺服器提供,例如單一檔案版)時,畫面自動退回表情符號,遊戲完全不受影響。
import { useEffect, useState } from 'react'

let manifest = null
// 部署在子路徑(例如 GitHub Pages 的 /PolicyPilot/)時,圖片路徑要跟著 base 走
export const ART_BASE = `${import.meta.env?.BASE_URL ?? '/'}art/`
let pending = null

export function loadArt() {
  if (!pending) {
    pending = fetch(`${ART_BASE}manifest.json`)
      .then((r) => (r.ok ? r.json() : {}))
      .catch(() => ({}))
      .then((m) => { manifest = m && typeof m === 'object' ? m : {}; return manifest })
  }
  return pending
}

// 回傳 (id 或 id 陣列) => 圖片網址或 null;陣列時取第一個存在的
export function useArt() {
  const [m, setM] = useState(manifest)
  useEffect(() => { if (!m) loadArt().then(setM) }, [m])
  return (ids) => {
    if (!m) return null
    for (const id of [].concat(ids)) if (id && m[id]) return `${ART_BASE}${m[id]}`
    return null
  }
}

// 事件卡要找哪張圖:成長篇有「出事版」的優先
export const sceneArtIds = (scene) => [scene.defId + (scene._hit ? '_hit' : ''), scene.defId]
