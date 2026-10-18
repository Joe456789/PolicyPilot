import { useState } from 'react'
import Avatar from './Avatar.jsx'
import { STYLES, LOOKS, defaultLook } from '../game/careers.js'

const pick = (a) => a[Math.floor(Math.random() * a.length)]

export default function CharacterCreator({ onStart, onBack }) {
  const [name, setName] = useState('')
  const [look, setLook] = useState(defaultLook())
  const [style, setStyle] = useState('steady')
  const set = (k, v) => setLook((l) => ({ ...l, [k]: v }))

  function randomize() {
    setLook({ ...defaultLook(), skin: pick(LOOKS.skins), hair: pick(LOOKS.hairs), style: pick(LOOKS.styles)[0], top: pick(LOOKS.tops), extra: pick(LOOKS.extras)[0] })
  }

  return (
    <div className="screen creator">
      <header className="screen-h">
        <button className="btn ghost" onClick={onBack}>← 返回</button>
        <h1>你的人生,從出生開始</h1>
        <p className="muted">先替自己取個名字、選個外型與個性。出生在哪個家庭、會經歷什麼,就交給命運抽籤。</p>
      </header>

      <div className="creator-grid">
        <section className="card who">
          <div className="who-preview">
            <Avatar look={look} size={150} title="你的角色" />
            <button className="btn" onClick={randomize}>🎲 隨機外型</button>
          </div>
          <label className="field">
            <span>你的名字</span>
            <input id="player-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={8} placeholder="例如:小明" />
          </label>
          <div className="look">
            <div className="look-row"><span>膚色</span><div className="sw">{LOOKS.skins.map((v) => <button key={v} type="button" aria-label={`膚色 ${v}`} aria-pressed={look.skin === v} className={look.skin === v ? 'on' : ''} style={{ background: v }} onClick={() => set('skin', v)} />)}</div></div>
            <div className="look-row"><span>髮色</span><div className="sw">{LOOKS.hairs.map((v) => <button key={v} type="button" aria-label={`髮色 ${v}`} aria-pressed={look.hair === v} className={look.hair === v ? 'on' : ''} style={{ background: v }} onClick={() => set('hair', v)} />)}</div></div>
            <div className="look-row"><span>衣服</span><div className="sw">{LOOKS.tops.map((v) => <button key={v} type="button" aria-label={`衣服 ${v}`} aria-pressed={look.top === v} className={look.top === v ? 'on' : ''} style={{ background: v }} onClick={() => set('top', v)} />)}</div></div>
            <div className="look-row"><span>髮型</span><div className="pills">{LOOKS.styles.map(([v, n]) => <button key={v} type="button" aria-pressed={look.style === v} className={look.style === v ? 'on' : ''} onClick={() => set('style', v)}>{n}</button>)}</div></div>
            <div className="look-row"><span>配件</span><div className="pills">{LOOKS.extras.map(([v, n]) => <button key={v} type="button" aria-pressed={look.extra === v} className={look.extra === v ? 'on' : ''} onClick={() => set('extra', v)}>{n}</button>)}</div></div>
          </div>
        </section>

        <div className="creator-main">
          <section className="card">
            <h3>你的個性</h3>
            <p className="muted small">個性會影響你在成長路上的選擇傾向,也會寫進人生回顧。</p>
            <div className="opts three">
              {STYLES.map((x) => (
                <button key={x.id} type="button" className={`opt ${style === x.id ? 'on' : ''}`} onClick={() => setStyle(x.id)} aria-pressed={style === x.id}>
                  <span className="opt-ico" aria-hidden>{x.icon}</span><span className="opt-t">{x.title}</span><span className="opt-b">{x.blurb}</span>
                </button>
              ))}
            </div>
          </section>
          <section className="card grad">
            <h3>接下來會發生什麼?</h3>
            <ol className="how big">
              <li><b>0 歲 · 出生抽籤</b>你會出生在富裕、小康、一般或清寒的家庭,家裡有沒有保險也是抽籤決定。</li>
              <li><b>0 ~ 21 歲 · 成長</b>童年、升學、打工、意外……每個選擇都在塑造你,家人的遭遇也會影響你的起點。</li>
              <li><b>22 歲 · 踏入社會</b>選擇第一份工作,進入大富翁棋盤,面對結婚、買房、投資與市場起伏,還要和電腦對手比拚。</li>
            </ol>
            <div className="start-bar">
              <div className="start-sum"><b>{name || '你'}</b>,準備好出生了嗎?</div>
              <button className="btn primary huge" onClick={() => onStart({ name: name.trim() || '小明', look, style: STYLES.find((x) => x.id === style).title })}>出生! →</button>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
