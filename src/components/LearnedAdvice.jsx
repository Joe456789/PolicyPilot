import { learnedAdvice, POLICY_INFO } from '../game/ml/index.js'
import { PRODUCTS } from '../game/products.js'
import { t, getLang } from '../i18n.js'

// 規劃面板:AI 學習型玩家(強化學習)在你的處境會怎麼做
export default function LearnedAdvice({ s }) {
  const a = learnedAdvice(s)
  const sep = getLang() === 'en' ? ', ' : '、'
  const pct = (v) => Math.round(v * 100)
  return (
    <div className="learned-box">
      <b>🧠 {t('AI 學習型玩家會怎麼做?')}</b>
      <ul>
        <li>{a.buy.length ? t('補上:{list}', { list: a.buy.map((id) => t(PRODUCTS[id].name)).join(sep) }) : t('你的保障已經和它的做法一致')}</li>
        <li>{t('保留約 {n} 個月生活費當預備金,其餘的 {f}% 拿去投資', { n: a.buffer, f: pct(a.investFrac) })}</li>
        <li>{t('投資比例:定存 {d}%、債券 {b}%、股票 ETF {st}%、個股 {sp}%', { d: pct(a.invest.deposit), b: pct(a.invest.bond), st: pct(a.invest.stock), sp: pct(a.invest.spec) })}</li>
      </ul>
      <p className="risk-foot">{t('這個策略是用演化策略(一種強化學習)讓電腦自己玩了 {n} 局學出來的,不是人寫的規則;測試時平均人生積分 {sc} 分。', { n: POLICY_INFO.training.totalGames.toLocaleString(), sc: POLICY_INFO.compare.learned })}</p>
    </div>
  )
}
