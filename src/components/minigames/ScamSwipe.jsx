import { useMemo, useState } from 'react'

const POOL = [
  { t: '【檢察署】您的帳戶涉及洗錢,請立即將存款轉入「監管帳戶」配合調查,並保密。', scam: true, why: '司法單位不會要你轉帳,更不會要求保密。' },
  { t: '【信用卡通知】您剛在海外消費 3 萬元,若非本人請撥打卡片背面的客服電話確認。', scam: false, why: '沒有連結、沒有要你轉帳,而是請你撥打卡片背面的官方電話,這是正常的通知。' },
  { t: '加入我們的投資群組,保證每月報酬 10%,名額有限,今天加入送紅包!', scam: true, why: '「保證高報酬」加「限時名額」是典型的詐騙話術。' },
  { t: '【保險公司】您的保單權益通知已寄出,請至官網登入會員中心查看,系統不會要求提供密碼。', scam: false, why: '請你自行到官網登入查看,且不要求密碼,是正常的服務通知。' },
  { t: '我是你同學,手機掉了在用朋友的 LINE,急需 3 萬,先轉到這個帳號,下週還你!', scam: true, why: '帳號被盜用借錢很常見,務必打電話或視訊本人確認。' },
  { t: '【人資通知】本月薪資與年終獎金將於 25 日入帳,詳情請見公司內部系統公告。', scam: false, why: '沒有連結也不要求提供個資,是公司內部的一般通知。' },
  { t: '您有一筆理賠金待領取,點擊連結填寫銀行帳號與驗證碼即可入帳:http://x.cc/claim', scam: true, why: '理賠流程不會要你點陌生連結、填驗證碼。' },
  { t: '【銀行】您申請的信用卡已核發,將以掛號寄出,可於官網查詢寄送進度。', scam: false, why: '沒有索取個資,也沒有可疑連結。' },
  { t: '恭喜中獎!支付 2,000 元手續費即可領取 iPhone,今天內有效。', scam: true, why: '要先付手續費才能領獎,一定有問題。' },
  { t: '【健保署】您的健保卡需要升級,請提供身分證字號與卡號完成認證。', scam: true, why: '官方不會用簡訊要求提供證號與卡號,有疑問請直接查詢官網。' },
]

export default function ScamSwipe({ onDone }) {
  const list = useMemo(() => [...POOL].sort(() => Math.random() - 0.5).slice(0, 6), [])
  const [i, setI] = useState(0)
  const [right, setRight] = useState(0)
  const [fb, setFb] = useState(null)

  function answer(isScam) {
    if (fb) return
    const q = list[i]
    const ok = isScam === q.scam
    setFb({ ok, why: q.why })
    if (ok) setRight((r) => r + 1)
  }
  function next() {
    const nr = right
    if (i + 1 >= list.length) {
      const stars = nr >= 6 ? 3 : nr >= 5 ? 2 : nr >= 4 ? 1 : 0
      onDone({ stars, note: `你判斷對了 ${nr} / ${list.length} 則訊息。` })
      return
    }
    setI(i + 1)
    setFb(null)
  }

  return (
    <div className="mg">
      <div className="mg-bar"><span>第 {i + 1} / {list.length} 則</span><span>答對 {right}</span></div>
      <div className="phone-msg" key={i}>
        <div className="bubble">{list[i].t}</div>
      </div>
      {!fb ? (
        <div className="swipe-btns">
          <button className="btn danger big" onClick={() => answer(true)}>🚨 詐騙</button>
          <button className="btn primary big" onClick={() => answer(false)}>✅ 安全</button>
        </div>
      ) : (
        <div className={`fb ${fb.ok ? 'ok' : 'no'}`}>
          <b>{fb.ok ? '答對了!' : '答錯了'}</b>
          <p>{fb.why}</p>
          <button className="btn primary wide" onClick={next}>{i + 1 >= list.length ? '看結果' : '下一則'}</button>
        </div>
      )}
    </div>
  )
}
