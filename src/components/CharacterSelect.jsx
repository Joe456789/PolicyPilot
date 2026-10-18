import { useState } from 'react'
import Avatar from './Avatar.jsx'
import { CHARACTERS, sanitizeCustomCharacter } from '../game/characters.js'
import { wan } from '../game/format.js'
import { ai } from '../ai.js'

export default function CharacterSelect({ onPick, aiOn, onBack }) {
  const [desc, setDesc] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  async function make() {
    if (desc.trim().length < 4) return setMsg('請多描述一點,例如:32 歲產品經理,有一個小孩,房貸壓力大。')
    setBusy(true)
    setMsg('')
    const raw = await ai.persona(desc.trim())
    setBusy(false)
    if (!raw) return setMsg('AI 目前無法連線,請改用上方內建角色,或稍後再試。')
    onPick(sanitizeCustomCharacter(raw))
  }

  return (
    <div className="screen select">
      <header className="screen-h">
        <button className="btn ghost" onClick={onBack}>← 返回</button>
        <h1>選擇你的主角</h1>
        <p className="muted">每個角色有不同的收入、家庭責任與風險。同一個遊戲,每個人的重點完全不一樣。</p>
      </header>
      <div className="char-grid">
        {CHARACTERS.map((c) => (
          <button key={c.id} className="char-card" onClick={() => onPick(c)} aria-label={`選擇 ${c.name}`}>
            <Avatar look={c.avatar} size={84} title={c.name} />
            <div className="char-name">{c.name}</div>
            <div className="char-title">{c.title} · {c.age} 歲</div>
            <p className="char-tag">{c.tagline}</p>
            <div className="char-facts">
              <span>年收 {wan(c.income, 0)}</span>
              <span>現金 {wan(c.cash, 0)}</span>
              {c.dependents > 0 && <span>扶養 {c.dependents}</span>}
              {c.mortgage > 0 && <span>房貸 {wan(c.mortgage, 0)}</span>}
            </div>
            <div className="char-focus">🎯 {c.focus}</div>
          </button>
        ))}
        <div className="char-card custom">
          <div className="custom-ico" aria-hidden>✨</div>
          <div className="char-name">自訂角色</div>
          <p className="char-tag">用一句話描述你想模擬的客戶,由 AI 建立角色(數值會經過規則引擎夾限)。</p>
          <textarea
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            rows={3}
            placeholder="例:40 歲餐廳老闆,收入不穩,兩個小孩,有一點房貸"
            aria-label="角色描述"
            disabled={!aiOn}
          />
          <button className="btn primary" onClick={make} disabled={busy || !aiOn}>
            {busy ? 'AI 建立中…' : aiOn ? 'AI 生成角色' : 'AI 未連線'}
          </button>
          {msg && <div className="flash">{msg}</div>}
        </div>
      </div>
    </div>
  )
}
