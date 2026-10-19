// 人生標籤:成長篇的經歷會變成標籤,帶進棋盤階段,影響起點與之後事件出現的機率。
// w 的鍵是事件的 id 或 'cat:類別',值是出現權重的倍數。
export const TAGS = {
  sickly: { icon: '🤧', title: '體弱多病', desc: '小時候常生病:起始健康較低,醫療類事件比較常找上門。', health: -6, w: { 'cat:medical': 1.3, 'cat:critical': 1.15 } },
  strong: { icon: '💪', title: '健康寶寶', desc: '從小身體好:起始健康更高,帶著一張醫療補助卡出社會。', health: 4, cards: ['medaid'] },
  saver: { icon: '🐷', title: '小小儲蓄家', desc: '從小養成存錢習慣:出社會時多了一筆私房錢。', cash: 30000 },
  gambler: { icon: '🎲', title: '賭性堅強', desc: '從小就想一夜致富:「保證高報酬」的誘惑會更常出現,要小心。', w: { high_return: 1.8, hot_tip: 1.5, friend_loan: 1.4 } },
  scam_aware: { icon: '📵', title: '防詐小達人', desc: '小時候就識破過詐騙:帶著一張防詐提醒卡出社會。', cards: ['antiscam'] },
  scam_victim: { icon: '😵', title: '被騙過的人', desc: '小時候被騙過錢,記憶猶新:財商 +,但詐騙類事件仍會出現。', w: { scam_call: 1.4 } },
  caregiver: { icon: '🧓', title: '小小照顧者', desc: '從小幫忙照顧家人:長輩的照護事件會更早、更常出現。', w: { 'cat:care': 1.6, parent_care: 1.6 } },
  scholar: { icon: '🎓', title: '學霸', desc: '學業表現亮眼:起薪加成,升遷機會更多。', income: 1.03, w: { promotion: 1.4, mba: 1.4 } },
  social: { icon: '🤝', title: '人脈王', desc: '朋友遍天下:意外的機會與工作機會更多。', income: 1.02, w: { job_change: 1.3, startup_friend: 1.3, parents_gift: 1.2 } },
  entrepreneur: { icon: '🚀', title: '創業魂', desc: '從小看著家人或自己做生意:創業與合夥的機會更常出現,風險也一樣大。', w: { startup_friend: 1.8, family_business: 1.5, hot_tip: 1.2 } },
  adventurer: { icon: '🧗', title: '冒險家', desc: '愛玩愛闖:旅行機會多、健康好,但意外也比較常發生。', health: 2, w: { 'cat:medical': 1.15, travel: 1.5, travel_trouble: 1.3, car_accident: 1.3 } },
  survivor: { icon: '🛠️', title: '逆境長大', desc: '看過家裡的風雨:花錢更謹慎,生活支出少 3%。', expense: 0.97 },
  insured_home: { icon: '🛡️', title: '有保障長大', desc: '家人替你打好了底:帶著一張免災金牌出社會。', cards: ['shield'] },
  curious: { icon: '🧐', title: '愛問為什麼', desc: '從小就問大人「保險是什麼」:出社會就帶著理專的觀念,多一個行動點思考。', cards: ['premium_off'] },
}

export const TAG_IDS = Object.keys(TAGS)

// 事件權重的倍數(多個標籤相乘)
export function tagMult(s, def) {
  let m = 1
  for (const id of s.tags || []) {
    const w = TAGS[id]?.w
    if (!w) continue
    if (def.id && w[def.id]) m *= w[def.id]
    if (def.cat && w['cat:' + def.cat]) m *= w['cat:' + def.cat]
  }
  return m
}

// 開局時套用:現金、健康、起手牌
export function applyTagsAtStart(s, tags = []) {
  s.tags = [...new Set(tags)].filter((t) => TAGS[t])
  for (const id of s.tags) {
    const t = TAGS[id]
    if (t.cash) s.cash += t.cash
    if (t.health) s.health = Math.max(40, Math.min(100, s.health + t.health))
    if (t.expense) s.expense = Math.round((s.expense * t.expense) / 1000) * 1000
    for (const c of t.cards || []) if (s.cards.length < 3 && !s.cards.includes(c)) s.cards.push(c)
  }
}
