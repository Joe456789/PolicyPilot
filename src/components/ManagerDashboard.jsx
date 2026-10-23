import { useMemo, useRef, useState } from 'react'
import { loadTraining, setLearner } from '../training.js'
import { loadRecords } from '../game/records.js'
import { learnerFromLocal, demoTeam, summarize, toCsv, DEMO_BRANCHES } from '../game/team.js'
import { t } from '../i18n.js'

// 培訓主管後台:學員的完成度、前後測進步、對練能力、常見錯誤與合規警示。
// 「本機紀錄」是這台瀏覽器的真實資料;「示範團隊」是模擬資料,只用來展示正式導入後的樣子。
const pct = (x) => (x == null ? '—' : `${Math.round(x * 100)}%`)
const nameOf = (l) => (l.name ? t(l.name) : t('學員 {n}', { n: l.num }))

export default function ManagerDashboard({ onClose }) {
  const [source, setSource] = useState(() => (hasLocal() ? 'local' : 'demo'))
  const [branch, setBranch] = useState('all')
  const [name, setName] = useState(() => loadTraining().learner)
  const learners = useMemo(() => {
    if (source === 'local') return [learnerFromLocal(loadTraining(), loadRecords(), name.trim())]
    const team = demoTeam()
    return branch === 'all' ? team : team.filter((l) => l.branch === branch)
  }, [source, branch, name])
  const sum = useMemo(() => summarize(learners), [learners])
  const empty = source === 'local' && !learners[0].games && learners[0].pre == null && !learners[0].rpCount && learners[0].caseBest == null

  function exportCsv() {
    const header = [t('學員'), t('分行'), t('完成局數'), t('前測答對率'), t('後測答對率'), t('對練次數'), t('對練最佳分'), t('合規警示'), t('情境挑戰最佳分')]
    const rows = learners.map((l) => [nameOf(l), t(l.branch), l.games, pct(l.pre), pct(l.post), l.rpCount, l.rpBest ?? '', l.flags, l.caseBest ?? ''])
    const blob = new Blob([toCsv(header, rows)], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `${t('培訓紀錄')}.csv`
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 1000)
  }

  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label={t('培訓主管後台')}>
      <div className="modal mgr">
        <header className="modal-h">
          <div>
            <h2>📊 {t('培訓主管後台')}</h2>
            <p className="muted">{t('看整組學員的完成度、前後測進步、對練能力與常見錯誤,決定下一次的課程重點。')}</p>
          </div>
          <button className="btn" onClick={onClose}>{t('關閉')}</button>
        </header>

        <div className="mgr-filters" role="group" aria-label={t('篩選')}>
          <div className="seg mgr-seg" role="radiogroup" aria-label={t('資料來源')}>
            <button type="button" role="radio" aria-checked={source === 'local'} className={`seg-b ${source === 'local' ? 'on' : ''}`} onClick={() => setSource('local')}>{t('本機紀錄')}</button>
            <button type="button" role="radio" aria-checked={source === 'demo'} className={`seg-b ${source === 'demo' ? 'on' : ''}`} onClick={() => setSource('demo')}>{t('示範團隊(模擬資料)')}</button>
          </div>
          {source === 'demo' ? (
            <label className="mgr-field">{t('分行')}
              <select value={branch} onChange={(e) => setBranch(e.target.value)}>
                <option value="all">{t('全部')}</option>
                {DEMO_BRANCHES.map((b) => <option key={b} value={b}>{t(b)}</option>)}
              </select>
            </label>
          ) : (
            <label className="mgr-field">{t('學員姓名')}
              <input value={name} maxLength={16} placeholder={t('本機學員')} onChange={(e) => { setName(e.target.value); setLearner(e.target.value) }} />
            </label>
          )}
          <button className="btn" onClick={exportCsv}>⬇ {t('匯出 CSV')}</button>
        </div>
        {source === 'demo' && <p className="mgr-note">ⓘ {t('示範團隊是用固定種子產生的模擬資料,只用來展示正式導入後的後台。正式上線時改由公司的學習平台彙整學員紀錄。')}</p>}

        {empty ? (
          <p className="mgr-empty">{t('這台裝置還沒有紀錄。完成一局遊戲、做前後測、AI 客戶對練或情境挑戰之後,這裡就會出現資料;也可以先切到「示範團隊」看看。')}</p>
        ) : (
          <>
            <div className="mgr-kpis">
              <Kpi label={t('學員')} value={sum.n} />
              <Kpi label={t('完成局數')} value={sum.games} />
              <Kpi label={t('前測 → 後測(平均答對率)')} value={sum.paired ? `${pct(sum.preAvg)} → ${pct(sum.postAvg)}` : '—'}
                delta={sum.paired ? t('{d} 個百分點', { d: `${sum.postAvg >= sum.preAvg ? '+' : ''}${Math.round((sum.postAvg - sum.preAvg) * 100)}` }) : t('需要前測與後測')} good={sum.postAvg >= sum.preAvg} />
              <Kpi label={t('對練平均最佳分')} value={sum.rpAvg != null ? Math.round(sum.rpAvg) : '—'} delta={t('{n} 人練過', { n: sum.rpUsers })} />
              <Kpi label={t('合規警示')} value={sum.flags} delta={t('對練中的誤導或施壓話術')} warn={sum.flags > 0} />
            </div>
            <div className="mgr-grid">
              <section className="mgr-card wide">
                <h3>{t('前後測:各觀念的答對率')}</h3>
                <div className="mgr-legend" aria-hidden><span><i className="dot pre" />{t('前測')}</span><span><i className="dot post" />{t('後測')}</span></div>
                <Dumbbell rows={sum.concepts} />
              </section>
              <section className="mgr-card">
                <h3>{t('對練四項能力(平均,滿分 25)')}</h3>
                <Bars rows={sum.parts.map((p) => ({ id: p.id, label: t(p.label), value: p.avg, max: 25, text: p.avg == null ? '—' : p.avg.toFixed(1) }))} empty={t('還沒有對練紀錄')} />
              </section>
              <section className="mgr-card">
                <h3>{t('常見錯誤 Top 5(次數)')}</h3>
                <Bars rows={sum.mistakes.slice(0, 5).map((m) => ({ id: m.id, label: t(m.label), value: m.count, max: Math.max(...sum.mistakes.map((x) => x.count), 1), text: String(m.count) }))} empty={t('還沒有錯誤紀錄')} />
              </section>
            </div>
            <section className="mgr-card">
              <h3>{t('學員明細')}</h3>
              <div className="table-wrap">
                <table className="mgr-table">
                  <thead><tr><th>{t('學員')}</th><th>{t('分行')}</th><th>{t('完成局數')}</th><th>{t('前測')}</th><th>{t('後測')}</th><th>{t('對練最佳分')}</th><th>{t('合規警示')}</th><th>{t('情境挑戰')}</th></tr></thead>
                  <tbody>
                    {learners.map((l) => (
                      <tr key={l.id}>
                        <td>{nameOf(l)}</td><td>{t(l.branch)}</td><td className="num">{l.games}</td>
                        <td className="num">{pct(l.pre)}</td><td className="num">{pct(l.post)}</td>
                        <td className="num">{l.rpBest ?? '—'}</td><td className={`num ${l.flags ? 'neg' : ''}`}>{l.flags}</td><td className="num">{l.caseBest ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  )
}

function hasLocal() {
  const tr = loadTraining()
  return (loadRecords().games || []).length > 0 || tr.tests.length > 0 || tr.roleplay.length > 0 || tr.cases.length > 0
}

function Kpi({ label, value, delta, good, warn }) {
  return (
    <div className="mgr-kpi">
      <span className="mgr-kpi-l">{label}</span>
      <b className="mgr-kpi-v">{value}</b>
      {delta && <small className={good === true ? 'pos' : warn ? 'neg' : 'muted'}>{delta}</small>}
    </div>
  )
}

// 共用的提示框:滑鼠移上去或鍵盤 focus 都會顯示(數值同時也在表格與標籤裡,提示框只是加速閱讀)
function useTip() {
  const [tip, setTip] = useState(null)
  const box = useRef(null)
  const show = (e, lines) => {
    const r = box.current?.getBoundingClientRect()
    const src = e.currentTarget.getBoundingClientRect()
    const x = (e.clientX ?? src.left + src.width / 2) - (r?.left || 0)
    const y = (e.clientY ?? src.top) - (r?.top || 0)
    setTip({ x, y, lines })
  }
  const hide = () => setTip(null)
  const view = tip && (
    <div className="mgr-tip" style={{ left: tip.x, top: tip.y }} role="status">
      {tip.lines.map((l, i) => <div key={i}>{l.key && <i className={`key ${l.key}`} />}<b>{l.value}</b> <span>{l.label}</span></div>)}
    </div>
  )
  return { box, show, hide, view }
}

// 前測 → 後測:每個觀念一列,淺色點是前測、深色點是後測,中間的線是進步幅度
function Dumbbell({ rows }) {
  const tip = useTip()
  return (
    <div className="mgr-chart" ref={tip.box}>
      <div className="db-axis" aria-hidden><span /><span className="db-ticks"><span>0%</span><span>50%</span><span>100%</span></span><span /></div>
      <ul className="db-rows">
        {rows.map((r) => {
          const lines = [{ key: 'pre', value: pct(r.pre), label: t('前測') }, { key: 'post', value: pct(r.post), label: t('後測') }]
          const lo = Math.min(r.pre ?? 0, r.post ?? r.pre ?? 0), hi = Math.max(r.pre ?? 0, r.post ?? r.pre ?? 0)
          return (
            <li key={r.id} tabIndex={0} aria-label={t('{name}:前測 {a},後測 {b}', { name: t(r.name), a: pct(r.pre), b: pct(r.post) })}
              onPointerMove={(e) => tip.show(e, [{ value: t(r.name) }, ...lines])} onPointerLeave={tip.hide} onFocus={(e) => tip.show(e, [{ value: t(r.name) }, ...lines])} onBlur={tip.hide}>
              <span className="db-label">{t(r.name)}</span>
              <span className="db-track">
                <i className="db-grid" style={{ left: '50%' }} />
                {r.pre != null && r.post != null && <i className="db-link" style={{ left: `${lo * 100}%`, width: `${(hi - lo) * 100}%` }} />}
                {r.pre != null && <i className="dot pre" style={{ left: `${r.pre * 100}%` }} />}
                {r.post != null && <i className="dot post" style={{ left: `${r.post * 100}%` }} />}
              </span>
              <span className="db-val">{r.post != null ? pct(r.post) : pct(r.pre)}</span>
            </li>
          )
        })}
      </ul>
      {tip.view}
    </div>
  )
}

// 單一系列的橫條圖:一個顏色、數值標在條的尾端
function Bars({ rows, empty }) {
  const tip = useTip()
  const has = rows.some((r) => r.value != null && r.value > 0)
  if (!has) return <p className="muted small">{empty}</p>
  return (
    <div className="mgr-chart" ref={tip.box}>
      <ul className="bar-rows">
        {rows.map((r) => (
          <li key={r.id} tabIndex={0} aria-label={`${r.label}:${r.text}`}
            onPointerMove={(e) => tip.show(e, [{ value: r.text, label: r.label }])} onPointerLeave={tip.hide} onFocus={(e) => tip.show(e, [{ value: r.text, label: r.label }])} onBlur={tip.hide}>
            <span className="bar-label">{r.label}</span>
            <span className="bar-track"><i className="bar" style={{ width: `${Math.max(0, Math.min(1, (r.value || 0) / r.max)) * 100}%` }} /></span>
            <span className="bar-val">{r.text}</span>
          </li>
        ))}
      </ul>
      {tip.view}
    </div>
  )
}

