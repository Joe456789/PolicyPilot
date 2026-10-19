import { useState } from 'react'
import Avatar from './Avatar.jsx'
import { STYLES, LOOKS, defaultLook, ASPIRATIONS, BACKGROUNDS, randomName } from '../game/careers.js'
import { wan } from '../game/format.js'

const pick = (a) => a[Math.floor(Math.random() * a.length)]

export default function CharacterCreator({ onStart, onBack }) {
  const go = (skip) => onStart({ name: name.trim() || randomName(), look, style: STYLES.find((x) => x.id === style).title, aspiration, bgId: birth === 'pick' ? bgId : null }, skip)
  const [name, setName] = useState('')
  const [look, setLook] = useState(defaultLook())
  const [style, setStyle] = useState('steady')
  const [aspiration, setAspiration] = useState('wealth')
  const [birth, setBirth] = useState('random')
  const [bgId, setBgId] = useState('normal')
  const set = (k, v) => setLook((l) => ({ ...l, [k]: v }))

  function randomize() {
    setLook({ ...defaultLook(), skin: pick(LOOKS.skins), hair: pick(LOOKS.hairs), style: pick(LOOKS.styles)[0], top: pick(LOOKS.tops), extra: pick(LOOKS.extras)[0] })
  }

  return (
    <div className="screen creator">
      <header className="screen-h">
        <button className="btn ghost" onClick={onBack}>← 返回</button>
        <h1>創造你的角色</h1>
        <p className="muted">先取個名字、選個外型與個性。你可以從出生開始體驗成長篇,也可以直接進入大富翁棋盤。</p>
      </header>

      <div className="creator-grid">
        <section className="card who">
          <div className="who-preview">
            <Avatar look={look} size={150} title="你的角色" />
            <button className="btn" onClick={randomize}>🎲 隨機外型</button>
          </div>
          <label className="field">
            <span>你的名字</span>
            <div className="name-row">
              <input id="player-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={8} placeholder="例如:小明" />
              <button type="button" className="btn" onClick={() => setName(randomName())} aria-label="隨機產生名字">🎲 隨機</button>
            </div>
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
          <section className="card">
            <h3>你的人生志向</h3>
            <p className="muted small">志向會決定你這一局的人生任務方向,也會影響最後的結局。</p>
            <div className="opts three">
              {ASPIRATIONS.map((x) => (
                <button key={x.id} type="button" className={`opt ${aspiration === x.id ? 'on' : ''}`} onClick={() => setAspiration(x.id)} aria-pressed={aspiration === x.id}>
                  <span className="opt-ico" aria-hidden>{x.icon}</span><span className="opt-t">{x.title}</span><span className="opt-b">{x.blurb}</span>
                </button>
              ))}
            </div>
          </section>
          <section className="card">
            <h3>出生的家庭</h3>
            <div className="pills big">
              <button type="button" className={birth === 'random' ? 'on' : ''} aria-pressed={birth === 'random'} onClick={() => setBirth('random')}>🎲 命運抽籤(8 種家境)</button>
              <button type="button" className={birth === 'pick' ? 'on' : ''} aria-pressed={birth === 'pick'} onClick={() => setBirth('pick')}>✋ 自己選</button>
            </div>
            {birth === 'pick' && (
              <div className="opts three bgpick">
                {BACKGROUNDS.map((b) => (
                  <button key={b.id} type="button" className={`opt ${bgId === b.id ? 'on' : ''}`} onClick={() => setBgId(b.id)} aria-pressed={bgId === b.id}>
                    <span className="opt-ico" aria-hidden>{b.icon}</span><span className="opt-t">{b.title}</span><span className="opt-b">{b.blurb}</span>
                    <span className="opt-x">現金 {wan(b.cash, 0)}{b.loan ? ` · 貸款 ${wan(b.loan, 0)}` : ''}{b.assets ? ' · 有投資' : ''}{b.house ? ' · 有房' : ''}</span>
                  </button>
                ))}
              </div>
            )}
          </section>
          <section className="card grad">
            <h3>兩種開始方式</h3>
            <ol className="how big">
              <li><b>從出生開始(約 3 分鐘)</b>出生抽籤決定家境與家人有沒有保險,再走過童年、升學與意外,22 歲才進入棋盤。</li>
              <li><b>直接進入棋盤</b>仍然會抽出生的家境,但略過成長篇,馬上開始大富翁:擲骰子、抽卡片、玩小遊戲、和電腦對手比拚。</li>
            </ol>
            <div className="start-bar">
              <div className="start-sum"><b>{name || '你'}</b>,準備好出生了嗎?</div>
              <div className="start-btns">
                <button className="btn primary huge" onClick={() => go(false)}>從出生開始 →</button>
                <button className="btn huge2" onClick={() => go(true)}>🎲 直接進入大富翁棋盤</button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
