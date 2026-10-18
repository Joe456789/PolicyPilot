import { useState } from 'react'
import Avatar from './Avatar.jsx'
import { CAREERS, BACKGROUNDS, STYLES, LENGTHS, LOOKS, defaultLook } from '../game/careers.js'
import { wan } from '../game/format.js'

const pick = (a) => a[Math.floor(Math.random() * a.length)]

function Choice({ on, onClick, icon, title, blurb, extra }) {
  return (
    <button type="button" className={`opt ${on ? 'on' : ''}`} onClick={onClick} aria-pressed={on}>
      <span className="opt-ico" aria-hidden>{icon}</span>
      <span className="opt-t">{title}</span>
      <span className="opt-b">{blurb}</span>
      {extra && <span className="opt-x">{extra}</span>}
    </button>
  )
}

export default function CharacterCreator({ onStart, onBack }) {
  const [name, setName] = useState('')
  const [look, setLook] = useState(defaultLook())
  const [career, setCareer] = useState('office')
  const [background, setBackground] = useState('normal')
  const [style, setStyle] = useState('steady')
  const [length, setLength] = useState('standard')
  const c = CAREERS.find((x) => x.id === career)
  const b = BACKGROUNDS.find((x) => x.id === background)
  const set = (k, v) => setLook((l) => ({ ...l, [k]: v }))

  function randomize() {
    setLook({ ...defaultLook(), skin: pick(LOOKS.skins), hair: pick(LOOKS.hairs), style: pick(LOOKS.styles)[0], top: pick(LOOKS.tops), extra: pick(LOOKS.extras)[0] })
  }

  return (
    <div className="screen creator">
      <header className="screen-h">
        <button className="btn ghost" onClick={onBack}>← 返回</button>
        <h1>從 0 開始你的人生</h1>
        <p className="muted">22 歲,剛畢業。你的每個選擇,都會決定接下來的人生。先替自己創角吧。</p>
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
            <h3>1. 你的職業</h3>
            <div className="opts">
              {CAREERS.map((x) => (
                <Choice key={x.id} on={career === x.id} onClick={() => setCareer(x.id)} icon={x.icon} title={x.title} blurb={x.blurb} extra={`起薪 ${wan(x.income, 0)}/年`} />
              ))}
            </div>
          </section>
          <section className="card">
            <h3>2. 你的家境</h3>
            <div className="opts three">
              {BACKGROUNDS.map((x) => (
                <Choice key={x.id} on={background === x.id} onClick={() => setBackground(x.id)} icon={x.icon} title={x.title} blurb={x.blurb} extra={`現金 ${wan(x.cash, 0)} · 貸款 ${wan(x.loan, 0)}`} />
              ))}
            </div>
          </section>
          <section className="card">
            <h3>3. 你的個性</h3>
            <div className="opts three">
              {STYLES.map((x) => <Choice key={x.id} on={style === x.id} onClick={() => setStyle(x.id)} icon={x.icon} title={x.title} blurb={x.blurb} />)}
            </div>
          </section>
          <section className="card">
            <h3>4. 想玩多久?</h3>
            <div className="opts three">
              {LENGTHS.map((x) => <Choice key={x.id} on={length === x.id} onClick={() => setLength(x.id)} icon="⏳" title={x.title} blurb={x.blurb} />)}
            </div>
          </section>
          <div className="start-bar">
            <div className="start-sum">
              <b>{name || '你'}</b>,22 歲 {c.title},{b.title}出身。<br />
              起始現金 {wan(b.cash, 0)}、貸款 {wan(b.loan, 0)}、年收入 {wan(c.income, 0)}。除此之外,一無所有。
            </div>
            <button className="btn primary huge" onClick={() => onStart({ name: name.trim() || '小明', look, career, background, style, length })}>開始人生 →</button>
          </div>
        </div>
      </div>
    </div>
  )
}
