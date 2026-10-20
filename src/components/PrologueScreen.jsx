import { useEffect, useRef, useState } from 'react'
import Avatar from './Avatar.jsx'
import SceneModal from './SceneModal.jsx'
import { MAJORS, PROLOGUE_LENGTH } from '../game/prologue.js'
import { TAGS } from '../game/tags.js'
import { wan } from '../game/format.js'
import { sfx } from '../sfx.js'
import { t } from '../i18n.js'
import AgeJourney from './AgeJourney.jsx'
import { useArt, sceneArtIds } from '../art.js'

const STAT = [['health', '健康', '💪'], ['study', '學業', '📚'], ['social', '人緣', '🤝'], ['finance', '財商', '💰']] // i18n-ignore 顯示時用 t(n)

// 成長篇:0 ~ 21 歲。每個階段一張事件卡,像「選擇人生」一樣一路做選擇。
export default function PrologueScreen({ life, phase, aiTag, loadingAi, onChoose, onContinue, careerOptions, onPickCareer, length, setLength, opponents, setOpponents }) {
  const [shown, setShown] = useState(false)
  const [journey, setJourney] = useState(null)
  const prevAge = useRef(0)
  const artOf = useArt()
  // 每換一個年齡,先播成長動畫(年齡跳上去、角色長大、帶出這一年的情境),再顯示事件卡
  useEffect(() => {
    setShown(false)
    if (life.done || !life.scene || life.scene.result) { setJourney(null); const timer = setTimeout(() => setShown(true), 300); return () => clearTimeout(timer) }
    setJourney({ from: prevAge.current, to: life.age })
    prevAge.current = life.age
    return undefined
  }, [life.step, life.done]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (life.scene && shown) sfx.card() }, [shown, life.step]) // eslint-disable-line react-hooks/exhaustive-deps

  const pct = Math.min(100, (life.age / 22) * 100)
  return (
    <div className="screen prologue">
      <header className="pro-h">
        <Avatar look={life.look} size={64} />
        <div>
          <div className="muted">{t('{name} 的成長篇', { name: life.name })}</div>
          <h1>{life.done ? (life.startAge > 22 ? t('{age} 歲:你的人生起點', { age: life.startAge }) : t('22 歲:踏入社會')) : t('{age} 歲', { age: life.age })}</h1>
        </div>
        <div className="pro-fam">{t(life.family)}</div>
      </header>

      <div className="age-track" role="progressbar" aria-valuenow={life.age} aria-valuemin={0} aria-valuemax={22}>
        <i style={{ width: `${pct}%` }} />
        {[0, 6, 12, 18, 22].map((a) => <b key={a} style={{ left: `${(a / 22) * 100}%` }}>{a}</b>)}
      </div>

      <div className="pro-stats">
        {STAT.map(([k, n, ic]) => (
          <div key={k} className="pstat"><span>{ic} {t(n)}</span><div className="pbar"><i style={{ width: `${life.stats[k]}%` }} /></div><b>{Math.round(life.stats[k])}</b></div>
        ))}
        <div className="pstat money"><span>{t('💵 存款 {amount}', { amount: wan(life.cash, 0) })}</span><span>{t('🧾 貸款 {amount}', { amount: wan(life.loan, 0) })}</span></div>
        <div className={`pstat ins ${life.parentsInsured ? 'yes' : 'no'}`}>{life.parentsInsured ? t('🛡️ 家裡有保險') : t('⚠️ 家裡沒有保險')}</div>
      </div>

      {life.tags.length > 0 && !life.done && (
        <div className="pro-tags" aria-label={t('人生標籤')}>
          {life.tags.map((id) => <span key={id} className="tag life" title={t(TAGS[id].desc)}>{TAGS[id].icon} {t(TAGS[id].title)}</span>)}
        </div>
      )}

      {life.log.length > 0 && (
        <ul className="pro-log">
          {life.log.map((l, i) => <li key={i}><i>{t('{age}歲', { age: l.age })}</i> {t(l.title)}</li>)}
        </ul>
      )}

      {life.done && (
        <div className="card grad">
          <h2>{life.startAge > 22 ? t('{age} 歲了,你現在做什麼工作?', { age: life.startAge }) : t('畢業了!選擇你的第一份工作')}</h2>
          <p className="muted">{life.startAge > 22 ? t('選好職業後,系統會依你的家境與職業,模擬你從 22 歲走到現在的人生:伴侶、孩子、房子、既有保障與資產。') : t('你念的是「{major}」。學業 {study},財商 {finance}。接下來的人生,才正要開始。', { major: t(MAJORS[life.major || 'work'].title), study: Math.round(life.stats.study), finance: Math.round(life.stats.finance) })}</p>
          {life.tags.length > 0 && (
            <div className="life-tag-list">
              <b>{t('🏷️ 你的人生標籤(會一起帶進棋盤)')}</b>
              <ul>{life.tags.map((id) => <li key={id}><span>{TAGS[id].icon} <b>{t(TAGS[id].title)}</b></span> {t(TAGS[id].desc)}</li>)}</ul>
            </div>
          )}
          <div className="opts">
            {careerOptions.map((c) => (
              <button key={c.id} type="button" className="opt" onClick={() => onPickCareer(c.id)}>
                <span className="opt-ico" aria-hidden>{c.icon}</span><span className="opt-t">{t(c.title)}</span><span className="opt-b">{t(c.blurb)}</span>
                <span className="opt-x">{t('起薪 {amount}/年', { amount: wan(c.income, 0) })}</span>
              </button>
            ))}
          </div>
          <div className="grad-opts">
            <label>{t('人生長度')}
              <select id="len" value={length} onChange={(e) => setLength(e.target.value)}>
                <option value="short">{t('短局(約 12 年)')}</option><option value="standard">{t('標準(約 20 年)')}</option><option value="long">{t('完整人生(約 30 年)')}</option>
              </select>
            </label>
            <label>{t('電腦對手')}
              <select id="opp" value={opponents} onChange={(e) => setOpponents(Number(e.target.value))}>
                <option value={0}>{t('不要(單人)')}</option><option value={1}>{t('1 位')}</option><option value={2}>{t('2 位')}</option><option value={3}>{t('3 位')}</option>
              </select>
            </label>
          </div>
        </div>
      )}

      {journey && life.scene && !life.done && (
        <AgeJourney key={life.step} from={journey.from} to={journey.to} look={life.look} art={artOf(sceneArtIds(life.scene))} icon={life.scene.icon} title={life.scene.title}
          onDone={() => { setJourney(null); setShown(true) }} />
      )}
      {life.scene && shown && (
        <SceneModal scene={life.scene} phase={life.scene.result ? 'result' : 'scene'} onChoose={onChoose} onContinue={onContinue} aiTag={aiTag} loadingAi={loadingAi} continueLabel={life.step === PROLOGUE_LENGTH - 1 ? t('畢業!') : t('繼續長大 →')} />
      )}
    </div>
  )
}
