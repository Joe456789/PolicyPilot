import { useEffect, useRef, useState } from 'react'
import { Share2, Download, Image as ImageIcon } from 'lucide-react'
import { wan } from '../game/format.js'
import { TAGS } from '../game/tags.js'
import { t, useLang, getLang } from '../i18n.js'

const W = 1080, H = 1350
const FONT_ZH = '"Noto Sans TC","PingFang TC","Microsoft JhengHei",sans-serif'
// 英文用較窄的無襯線字體(玩家名字若是中文,後面仍有中文字體備援)
const FONT_EN = '"Inter","Segoe UI","Helvetica Neue",Arial,"Noto Sans TC","PingFang TC",sans-serif'

// 設定字體;英文模式下文字太長就縮小(shrink-to-fit),中文維持原樣
function fitFont(g, text, weight, px, maxW, family, minPx = 16) {
  const en = getLang() === 'en'
  let size = px
  g.font = `${weight} ${size}px ${family}`
  if (!en) return
  while (size > minPx && g.measureText(text).width > maxW) { size -= 1; g.font = `${weight} ${size}px ${family}` }
}

function loadImg(url) {
  return new Promise((res) => {
    if (!url) return res(null)
    const im = new Image()
    im.onload = () => res(im)
    im.onerror = () => res(null)
    im.src = url
  })
}

function rr(g, x, y, w, h, r) { g.beginPath(); g.roundRect(x, y, w, h, r) }

async function drawCard({ s, score, ending, headline, rank, players, questsDone, netWorth, artUrl }) {
  const FONT = getLang() === 'en' ? FONT_EN : FONT_ZH
  const c = document.createElement('canvas')
  c.width = W; c.height = H
  const g = c.getContext('2d')
  const bg = g.createLinearGradient(0, 0, W, H)
  bg.addColorStop(0, '#0b3d2e'); bg.addColorStop(0.55, '#0e6b4a'); bg.addColorStop(1, '#f5a524')
  g.fillStyle = bg; g.fillRect(0, 0, W, H)
  // 動漫風放射線與星芒
  g.save(); g.translate(W / 2, 520); g.globalAlpha = 0.07; g.fillStyle = '#fff'
  for (let k = 0; k < 28; k++) { g.rotate((Math.PI * 2) / 28); g.beginPath(); g.moveTo(0, 0); g.lineTo(1400, -26); g.lineTo(1400, 26); g.closePath(); g.fill() }
  g.restore()
  for (const [x, y, r] of [[120, 130, 26], [960, 210, 18], [880, 90, 12], [180, 330, 14]]) {
    g.fillStyle = 'rgba(255,255,255,.85)'; g.beginPath()
    for (let k = 0; k < 8; k++) { const a = (k * Math.PI) / 4; const rad = k % 2 ? r * 0.35 : r; g.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad) }
    g.closePath(); g.fill()
  }
  // 卡片
  g.fillStyle = 'rgba(0,0,0,.25)'; rr(g, 62, 72, W - 124, H - 120, 54); g.fill()
  g.fillStyle = '#fffdf7'; rr(g, 54, 54, W - 124, H - 120, 54); g.fill()
  g.lineWidth = 8; g.strokeStyle = '#1f2a37'; rr(g, 54, 54, W - 124, H - 120, 54); g.stroke()

  const MAXW = 900
  g.textAlign = 'center'; g.fillStyle = '#0a6b43'; g.font = `900 46px ${FONT}`
  g.fillText(t('保險大富翁'), W / 2 - 8, 140)
  g.fillStyle = '#6b7280'
  { const txt = t('財務人生模擬遊戲 · Cardif InsurHack 2026'); fitFont(g, txt, 600, 26, MAXW, FONT); g.fillText(txt, W / 2 - 8, 184) }

  // 結局圖
  const img = await loadImg(artUrl)
  const ix = 120, iy = 214, iw = W - 124 - 132 + 54 - 54, ih = 400
  g.save(); rr(g, ix, iy, iw - 8, ih, 36); g.clip()
  if (img) {
    const sc = Math.max((iw - 8) / img.width, ih / img.height)
    g.drawImage(img, ix + (iw - 8 - img.width * sc) / 2, iy + (ih - img.height * sc) / 2, img.width * sc, img.height * sc)
  } else {
    const gg = g.createLinearGradient(0, iy, 0, iy + ih); gg.addColorStop(0, '#d9f2e5'); gg.addColorStop(1, '#fde9c9')
    g.fillStyle = gg; g.fillRect(ix, iy, iw, ih)
    g.font = `220px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`; g.textBaseline = 'middle'; g.fillStyle = '#000'
    g.fillText(ending.icon, W / 2 - 8, iy + ih / 2 + 10)
    g.textBaseline = 'alphabetic'
  }
  g.restore()
  g.lineWidth = 6; g.strokeStyle = '#1f2a37'; rr(g, ix, iy, iw - 8, ih, 36); g.stroke()

  // 結局名稱
  g.fillStyle = '#b45309'; g.font = `800 28px ${FONT}`
  g.fillText(t('你的結局 · {rarity}', { rarity: t(ending.rarity) }), W / 2 - 8, 680)
  g.fillStyle = '#1f2a37'
  { const txt = t(ending.title); fitFont(g, txt, 900, 78, MAXW, FONT, 34); g.fillText(txt, W / 2 - 8, 764) }
  g.fillStyle = '#4b5563'
  { const txt = `${s.player.name} · ${t(s.player.title)} · ${t('{from}→{to} 歲', { from: s.history[0]?.age ?? 22, to: s.age })}`; fitFont(g, txt, 600, 30, MAXW, FONT); g.fillText(txt, W / 2 - 8, 820) }
  g.fillStyle = '#0a6b43'
  { const txt = t('「{headline}」', { headline: t(headline) }); fitFont(g, txt, 800, 34, MAXW, FONT, 20); g.fillText(txt, W / 2 - 8, 876) }

  // 分數圓 + 數據
  g.save(); g.translate(250, 1010)
  g.lineWidth = 22; g.strokeStyle = '#e7e2d4'; g.beginPath(); g.arc(0, 0, 100, 0, Math.PI * 2); g.stroke()
  g.strokeStyle = '#00915a'; g.lineCap = 'round'; g.beginPath(); g.arc(0, 0, 100, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * score.total) / 100); g.stroke()
  g.fillStyle = '#1f2a37'; g.font = `900 78px ${FONT}`; g.textAlign = 'center'; g.fillText(String(score.total), 0, 18)
  g.fillStyle = '#00915a'; g.font = `800 32px ${FONT}`; g.fillText(t('{grade} 級', { grade: score.grade }), 0, 62)
  g.restore()

  const stats = [[t('淨資產'), wan(netWorth)], [t('人生任務'), `${questsDone}/3`], ...(rank ? [[t('最終排名'), `${rank} / ${players}`]] : [[t('健康'), String(Math.round(s.health))]])]
  stats.forEach(([k, v], n) => {
    const x = 430, y = 950 + n * 74
    g.textAlign = 'left'; g.fillStyle = '#6b7280'; g.font = `700 28px ${FONT}`; fitFont(g, k, 700, 28, 175, FONT, 18); g.fillText(k, x, y)
    g.fillStyle = '#1f2a37'; fitFont(g, v, 900, 42, 1026 - (x + 190), FONT, 24); g.fillText(v, x + 190, y + 2)
  })

  // 標籤
  const tags = (s.tags || []).slice(0, 4).map((id) => `${TAGS[id].icon} ${t(TAGS[id].title)}`)
  g.textAlign = 'left'; let tx = 120
  g.font = `700 26px ${FONT}`
  for (const tg of tags) {
    const w = g.measureText(tg).width + 36
    if (tx + w > W - 130) break
    g.fillStyle = '#f3ecff'; rr(g, tx, 1170, w, 48, 24); g.fill()
    g.fillStyle = '#5b34a8'; g.fillText(tg, tx + 18, 1203)
    tx += w + 12
  }
  g.textAlign = 'center'; g.fillStyle = '#9ca3af'; g.font = `600 22px ${FONT}`
  { const txt = t('金額與保險給付由規則引擎計算 · 劇情與回饋由 AI 生成'); fitFont(g, txt, 600, 22, MAXW, FONT, 14); g.fillText(txt, W / 2 - 8, 1262) }
  return c
}

// 分享成績卡:在瀏覽器裡畫成一張圖,可下載或直接分享
export default function ShareCard({ s, score, ending, headline, rank, players, questsDone, netWorth, artUrl }) {
  const [url, setUrl] = useState(null)
  const [busy, setBusy] = useState(false)
  const [blob, setBlob] = useState(null)
  const lang = useLang()
  const firstLang = useRef(lang)

  async function make() {
    setBusy(true)
    try {
      const c = await drawCard({ s, score, ending, headline, rank, players, questsDone, netWorth, artUrl })
      const b = await new Promise((r) => c.toBlob(r, 'image/png'))
      setBlob(b)
      setUrl(URL.createObjectURL(b))
    } finally { setBusy(false) }
  }
  // 語言切換後,已產生的成績卡用新語言重畫
  useEffect(() => {
    if (firstLang.current === lang) return
    firstLang.current = lang
    if (url) make()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang])
  const fileName = t('保險大富翁-{name}.png', { name: s.player.name })
  const file = () => new File([blob], fileName, { type: 'image/png' })
  const canShare = typeof navigator !== 'undefined' && navigator.canShare && blob && navigator.canShare({ files: [file()] })

  return (
    <section className="card sharecard">
      <h3><ImageIcon size={18} aria-hidden /> {t('我的人生成績卡')}</h3>
      <p className="muted small">{t('產生一張可以分享、也可以放進簡報的成績卡(圖片在你的瀏覽器裡生成,不會上傳)。')}</p>
      {!url && <button className="btn primary" onClick={make} disabled={busy}>{busy ? t('產生中…') : t('產生成績卡')}</button>}
      {url && (
        <div className="share-out">
          <img src={url} alt={t('人生成績卡預覽')} />
          <div className="share-btns">
            <a className="btn primary" href={url} download={fileName}><Download size={16} aria-hidden /> {t('下載圖片')}</a>
            {canShare && <button className="btn" onClick={() => navigator.share({ files: [file()], title: t('我的保險大富翁人生') }).catch(() => {})}><Share2 size={16} aria-hidden /> {t('分享')}</button>}
            <button className="btn ghost" onClick={make}>{t('重新產生')}</button>
          </div>
        </div>
      )}
    </section>
  )
}
