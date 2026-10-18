import { useEffect, useState } from 'react'
import Avatar from './Avatar.jsx'
import SceneModal from './SceneModal.jsx'
import { MAJORS, PROLOGUE_LENGTH } from '../game/prologue.js'
import { wan } from '../game/format.js'
import { sfx } from '../sfx.js'

const STAT = [['health', '健康', '💪'], ['study', '學業', '📚'], ['social', '人緣', '🤝'], ['finance', '財商', '💰']]

// 成長篇:0 ~ 21 歲。每個階段一張事件卡,像「選擇人生」一樣一路做選擇。
export default function PrologueScreen({ life, phase, aiTag, loadingAi, onChoose, onContinue, careerOptions, onPickCareer, length, setLength, opponents, setOpponents }) {
  const [shown, setShown] = useState(false)
  useEffect(() => { setShown(false); const t = setTimeout(() => setShown(true), 500); return () => clearTimeout(t) }, [life.step, life.done])
  useEffect(() => { if (life.scene && shown) sfx.card() }, [shown, life.step]) // eslint-disable-line react-hooks/exhaustive-deps

  const pct = Math.min(100, (life.age / 22) * 100)
  return (
    <div className="screen prologue">
      <header className="pro-h">
        <Avatar look={life.look} size={64} />
        <div>
          <div className="muted">{life.name} 的成長篇</div>
          <h1>{life.done ? '22 歲:踏入社會' : `${life.age} 歲`}</h1>
        </div>
        <div className="pro-fam">{life.family}</div>
      </header>

      <div className="age-track" role="progressbar" aria-valuenow={life.age} aria-valuemin={0} aria-valuemax={22}>
        <i style={{ width: `${pct}%` }} />
        {[0, 6, 12, 18, 22].map((a) => <b key={a} style={{ left: `${(a / 22) * 100}%` }}>{a}</b>)}
      </div>

      <div className="pro-stats">
        {STAT.map(([k, n, ic]) => (
          <div key={k} className="pstat"><span>{ic} {n}</span><div className="pbar"><i style={{ width: `${life.stats[k]}%` }} /></div><b>{Math.round(life.stats[k])}</b></div>
        ))}
        <div className="pstat money"><span>💵 存款 {wan(life.cash, 0)}</span><span>🧾 貸款 {wan(life.loan, 0)}</span></div>
        <div className={`pstat ins ${life.parentsInsured ? 'yes' : 'no'}`}>{life.parentsInsured ? '🛡️ 家裡有保險' : '⚠️ 家裡沒有保險'}</div>
      </div>

      {life.log.length > 0 && (
        <ul className="pro-log">
          {life.log.map((l, i) => <li key={i}><i>{l.age}歲</i> {l.title}</li>)}
        </ul>
      )}

      {life.done && (
        <div className="card grad">
          <h2>畢業了!選擇你的第一份工作</h2>
          <p className="muted">你念的是「{MAJORS[life.major || 'work'].title}」。學業 {Math.round(life.stats.study)},財商 {Math.round(life.stats.finance)}。接下來的人生,才正要開始。</p>
          <div className="opts">
            {careerOptions.map((c) => (
              <button key={c.id} type="button" className="opt" onClick={() => onPickCareer(c.id)}>
                <span className="opt-ico" aria-hidden>{c.icon}</span><span className="opt-t">{c.title}</span><span className="opt-b">{c.blurb}</span>
                <span className="opt-x">起薪 {wan(c.income, 0)}/年</span>
              </button>
            ))}
          </div>
          <div className="grad-opts">
            <label>人生長度
              <select id="len" value={length} onChange={(e) => setLength(e.target.value)}>
                <option value="short">短局(約 12 年)</option><option value="standard">標準(約 20 年)</option><option value="long">完整人生(約 30 年)</option>
              </select>
            </label>
            <label>電腦對手
              <select id="opp" value={opponents} onChange={(e) => setOpponents(Number(e.target.value))}>
                <option value={0}>不要(單人)</option><option value={1}>1 位</option><option value={2}>2 位</option><option value={3}>3 位</option>
              </select>
            </label>
          </div>
        </div>
      )}

      {life.scene && shown && (
        <SceneModal scene={life.scene} phase={life.scene.result ? 'result' : 'scene'} onChoose={onChoose} onContinue={onContinue} aiTag={aiTag} loadingAi={loadingAi} continueLabel={life.step === PROLOGUE_LENGTH - 1 ? '畢業!' : '繼續長大 →'} />
      )}
    </div>
  )
}
