import { X, BookOpen } from 'lucide-react'
import { BOARD } from '../game/engine.js'
import { tileHelp } from '../game/demoScript.js'
import { t } from '../i18n.js'

// 玩法說明:目標、一年的流程、每種格子、保險怎麼賠、怎麼計分、操作小技巧
export default function HelpModal({ onClose }) {
  const kinds = []
  for (const tile of BOARD) if (!kinds.some((k) => k.type === tile.type)) kinds.push(tile)
  return (
    <div className="overlay set-overlay" role="dialog" aria-modal="true" aria-label={t('玩法說明')} onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal help">
        <header className="set-h">
          <h2><BookOpen size={22} aria-hidden /> {t('玩法說明')}</h2>
          <button className="btn ghost set-x" onClick={onClose} aria-label={t('關閉')}><X size={20} aria-hidden /></button>
        </header>
        <section>
          <h3>{t('目標')}</h3>
          <p>{t('在 12~30 年的人生裡,遇到疾病、意外、市場起伏與人生大事時都撐得住,最後的人生積分越高越好。錢多不一定贏:保障是否完整、財務撐不撐得過意外,佔了一大半分數。')}</p>
        </section>
        <section>
          <h3>{t('一年的流程')}</h3>
          <ol>
            <li>{t('規劃:調整保險、投資與貸款(可略過,沿用去年的配置)。')}</li>
            <li>{t('擲兩顆骰子:走到哪一格,今年就發生那件事;擲出相同點數(雙骰)可以再擲一次。')}</li>
            <li>{t('年度結算:收入、生活費、保費、房貸、租金、投資報酬與理賠一起入帳。')}</li>
            <li>{t('電腦對手輪流行動,排名即時更新;每隔幾年有 AI 理專的階段回顧。')}</li>
          </ol>
        </section>
        <section>
          <h3>{t('棋盤上的格子')}</h3>
          <ul className="help-tiles">
            {kinds.map((k) => {
              const [title, body] = tileHelp(k.type)
              return <li key={k.type}><span aria-hidden>{k.type === 'property' ? '🏠' : k.icon}</span><div><b>{title}</b><small>{body}</small></div></li>
            })}
          </ul>
        </section>
        <section>
          <h3>{t('保險怎麼賠')}</h3>
          <p>{t('事件發生時,規則引擎依你當下的保單計算理賠:醫療險付醫藥費、重大傷病與癌症險一次給付、失能險補收入、壽險保障家人。沒保到的部分要自己付;現金不夠會依序賣投資、借錢、拍賣資產,全部用完就破產出局。')}</p>
        </section>
        <section>
          <h3>{t('人生積分')}</h3>
          <p>{t('財務韌性 35、保障完整度 25、資產成長 20、決策與知識 10、人生任務 10,總分 100。結算頁會用「平行人生」比較:同樣的遭遇,沒保險和建議配置會怎樣。')}</p>
        </section>
        <section>
          <h3>{t('操作小技巧')}</h3>
          <ul>
            <li>{t('拖曳棋盤可以旋轉視角,滾輪縮放;點任何一格可以看它的說明與地產資訊。')}</li>
            <li>{t('「電腦託管」可以讓電腦代打幾年;「快轉」讓對手回合變快。')}</li>
            <li>{t('每年開始時自動存檔,重新整理後從標題頁「繼續上次的人生」。')}</li>
            <li>{t('卡住了就「問理專」:AI 會依你現在的處境回答。')}</li>
          </ul>
        </section>
      </div>
    </div>
  )
}
