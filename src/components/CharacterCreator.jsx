import { START_AGES } from '../game/starts.js'
import { useState } from 'react'
import Avatar from './Avatar.jsx'
import { STYLES, LOOKS, defaultLook, ASPIRATIONS, BACKGROUNDS, randomName } from '../game/careers.js'
import { wan } from '../game/format.js'
import { t } from '../i18n.js'

const pick = (a) => a[Math.floor(Math.random() * a.length)]

export default function CharacterCreator({ onStart, onBack }) {
  const go = (skip) => onStart({ name: name.trim() || randomName(), look, style: STYLES.find((x) => x.id === style).title, aspiration, bgId: birth === 'pick' ? bgId : null, startAge }, skip || startAge > 22)
  const [name, setName] = useState('')
  const [look, setLook] = useState(defaultLook())
  const [style, setStyle] = useState('steady')
  const [aspiration, setAspiration] = useState('wealth')
  const [birth, setBirth] = useState('random')
  const [bgId, setBgId] = useState('normal')
  const [startAge, setStartAge] = useState(22)
  const set = (k, v) => setLook((l) => ({ ...l, [k]: v }))

  function randomize() {
    setLook({ ...defaultLook(), skin: pick(LOOKS.skins), hair: pick(LOOKS.hairs), style: pick(LOOKS.styles)[0], top: pick(LOOKS.tops), extra: pick(LOOKS.extras)[0] })
  }

  return (
    <div className="screen creator">
      <header className="screen-h">
        <button className="btn ghost" onClick={onBack}>{t('← 返回')}</button>
        <h1>{t('創造你的角色')}</h1>
        <p className="muted">{t('先取個名字、選個外型與個性。你可以從出生開始體驗成長篇,也可以直接進入大富翁棋盤。')}</p>
        <button type="button" className="btn ghost small pretest-link" onClick={() => window.dispatchEvent(new CustomEvent('pp-test', { detail: { phase: 'pre' } }))}>📝 {t('教育訓練用:先做 1 分鐘觀念前測')}</button>
      </header>

      <div className="creator-grid">
        <section className="card who">
          <div className="who-preview">
            <Avatar look={look} size={150} title={t('你的角色')} />
            <button className="btn" onClick={randomize}>🎲 {t('隨機外型')}</button>
          </div>
          <label className="field">
            <span>{t('你的名字')}</span>
            <div className="name-row">
              <input id="player-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={8} placeholder={t('例如:小明')} />
              <button type="button" className="btn" onClick={() => setName(randomName())} aria-label={t('隨機產生名字')}>🎲 {t('隨機')}</button>
            </div>
          </label>
          <div className="look">
            <div className="look-row"><span>{t('膚色')}</span><div className="sw">{LOOKS.skins.map((v) => <button key={v} type="button" aria-label={t('膚色 {v}', { v })} aria-pressed={look.skin === v} className={look.skin === v ? 'on' : ''} style={{ background: v }} onClick={() => set('skin', v)} />)}</div></div>
            <div className="look-row"><span>{t('髮色')}</span><div className="sw">{LOOKS.hairs.map((v) => <button key={v} type="button" aria-label={t('髮色 {v}', { v })} aria-pressed={look.hair === v} className={look.hair === v ? 'on' : ''} style={{ background: v }} onClick={() => set('hair', v)} />)}</div></div>
            <div className="look-row"><span>{t('衣服')}</span><div className="sw">{LOOKS.tops.map((v) => <button key={v} type="button" aria-label={t('衣服 {v}', { v })} aria-pressed={look.top === v} className={look.top === v ? 'on' : ''} style={{ background: v }} onClick={() => set('top', v)} />)}</div></div>
            <div className="look-row"><span>{t('髮型')}</span><div className="pills">{LOOKS.styles.map(([v, n]) => <button key={v} type="button" aria-pressed={look.style === v} className={look.style === v ? 'on' : ''} onClick={() => set('style', v)}>{t(n)}</button>)}</div></div>
            <div className="look-row"><span>{t('配件')}</span><div className="pills">{LOOKS.extras.map(([v, n]) => <button key={v} type="button" aria-pressed={look.extra === v} className={look.extra === v ? 'on' : ''} onClick={() => set('extra', v)}>{t(n)}</button>)}</div></div>
          </div>
        </section>

        <div className="creator-main">
          <section className="card">
            <h3>{t('你的個性')}</h3>
            <p className="muted small">{t('個性會影響你在成長路上的選擇傾向,也會寫進人生回顧。')}</p>
            <div className="opts three">
              {STYLES.map((x) => (
                <button key={x.id} type="button" className={`opt ${style === x.id ? 'on' : ''}`} onClick={() => setStyle(x.id)} aria-pressed={style === x.id}>
                  <span className="opt-ico" aria-hidden>{x.icon}</span><span className="opt-t">{t(x.title)}</span><span className="opt-b">{t(x.blurb)}</span>
                </button>
              ))}
            </div>
          </section>
          <section className="card">
            <h3>{t('你的人生志向')}</h3>
            <p className="muted small">{t('志向會決定你這一局的人生任務方向,也會影響最後的結局。')}</p>
            <div className="opts three">
              {ASPIRATIONS.map((x) => (
                <button key={x.id} type="button" className={`opt ${aspiration === x.id ? 'on' : ''}`} onClick={() => setAspiration(x.id)} aria-pressed={aspiration === x.id}>
                  <span className="opt-ico" aria-hidden>{x.icon}</span><span className="opt-t">{t(x.title)}</span><span className="opt-b">{t(x.blurb)}</span>
                </button>
              ))}
            </div>
          </section>
          <section className="card">
            <h3>{t('從幾歲開始玩?')}</h3>
            <p className="muted small">{t('不同的起點,面對的風險完全不同。30、40 歲會直接進入棋盤,並依你的家境與職業模擬出「前面的人生」。')}</p>
            <div className="opts three">
              {START_AGES.map((x) => (
                <button key={x.age} type="button" className={`opt ${startAge === x.age ? 'on' : ''}`} onClick={() => setStartAge(x.age)} aria-pressed={startAge === x.age}>
                  <span className="opt-ico" aria-hidden>{x.icon}</span><span className="opt-t">{t(x.title)}</span><span className="opt-b">{t(x.blurb)}</span>
                </button>
              ))}
            </div>
          </section>
          <section className="card">
            <h3>{t('出生的家庭')}</h3>
            <div className="pills big">
              <button type="button" className={birth === 'random' ? 'on' : ''} aria-pressed={birth === 'random'} onClick={() => setBirth('random')}>🎲 {t('命運抽籤(8 種家境)')}</button>
              <button type="button" className={birth === 'pick' ? 'on' : ''} aria-pressed={birth === 'pick'} onClick={() => setBirth('pick')}>✋ {t('自己選')}</button>
            </div>
            {birth === 'pick' && (
              <div className="opts three bgpick">
                {BACKGROUNDS.map((b) => (
                  <button key={b.id} type="button" className={`opt ${bgId === b.id ? 'on' : ''}`} onClick={() => setBgId(b.id)} aria-pressed={bgId === b.id}>
                    <span className="opt-ico" aria-hidden>{b.icon}</span><span className="opt-t">{t(b.title)}</span><span className="opt-b">{t(b.blurb)}</span>
                    <span className="opt-x">{t('現金 {amt}', { amt: wan(b.cash, 0) })}{b.loan ? ` · ${t('貸款 {amt}', { amt: wan(b.loan, 0) })}` : ''}{b.assets ? ` · ${t('有投資')}` : ''}{b.house ? ` · ${t('有房')}` : ''}</span>
                  </button>
                ))}
              </div>
            )}
          </section>
          <section className="card grad">
            <h3>{t('兩種開始方式')}</h3>
            <ol className="how big">
              <li><b>{t('從出生開始(約 3 分鐘)')}</b>{t('出生抽籤決定家境與家人有沒有保險,再走過童年、升學與意外,22 歲才進入棋盤。')}</li>
              <li><b>{t('直接進入棋盤')}</b>{t('仍然會抽出生的家境,但略過成長篇,馬上開始大富翁:擲骰子、抽卡片、玩小遊戲、和電腦對手比拚。')}</li>
            </ol>
            <div className="start-bar">
              <div className="start-sum"><b>{name || t('你')}</b>{t(',準備好出生了嗎?')}</div>
              <div className="start-btns">
                {startAge === 22 && <button className="btn primary huge" onClick={() => go(false)}>{t('從出生開始 →')}</button>}
                <button className={`btn ${startAge === 22 ? 'huge2' : 'primary huge'}`} onClick={() => go(true)}>🎲 {startAge === 22 ? t('直接進入大富翁棋盤') : t('從 {age} 歲進入棋盤 →', { age: startAge })}</button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
