// 手牌:最多持有 3 張,條件成立時自動生效(用完即消失)。
// 保障卡替你擋下壞事,機會卡讓好事放大;抽到的時候要想一想:留著等對的時機。
export const MAX_CARDS = 3

export const CARDS = {
  shield: {
    icon: '🛡️', name: '免災金牌', kind: '保障卡',
    desc: '下一次負面事件(醫療、災損、賠償、收入中斷…)直接不發生。',
    tip: '真實世界沒有免死金牌,所以才需要保險來當你的免災金牌。',
  },
  medaid: {
    icon: '🩹', name: '醫療補助卡', kind: '保障卡',
    desc: '下一次醫療或重大傷病事件,自付醫療費減半(最多省 30 萬)。',
    tip: '醫療費用不是只有保險給付,社會福利與補助也能分擔一部分。',
  },
  antiscam: {
    icon: '📵', name: '防詐提醒卡', kind: '保障卡',
    desc: '下一次詐騙或「保證高報酬」陷阱,你會自動識破。',
    tip: '急迫、保密、轉帳,是詐騙最常見的三個特徵。',
  },
  premium_off: {
    icon: '🏷️', name: '保費回饋卡', kind: '機會卡',
    desc: '下一次年度結算,依保費的 30% 回饋現金。',
    tip: '保戶回饋、紅利與折扣是真實存在的,但別為了折扣買不需要的保單。',
  },
  rent_boost: {
    icon: '🏘️', name: '旺季租金卡', kind: '機會卡',
    desc: '下一次年度結算,地產租金額外 +50%(要有地產才有用)。',
    tip: '租金會隨景氣與地段波動,不是固定的。',
  },
  crash_guard: {
    icon: '🪂', name: '行情避險卡', kind: '機會卡',
    desc: '下一次股市下跌的行情,你的股票類跌幅減半。',
    tip: '分散投資與停損機制,就是現實中的避險卡。',
  },
}

export const CARD_IDS = Object.keys(CARDS)
export const hasCard = (s, id) => (s.cards || []).includes(id)

export function useCard(s, id) {
  const i = (s.cards || []).indexOf(id)
  if (i < 0) return false
  s.cards.splice(i, 1)
  s.cardsUsed = (s.cardsUsed || 0) + 1
  return true
}

// 發一張牌:id 為 'random' 時從還沒持有的牌裡抽(依狀態排除用不到的牌)。手牌滿了就換掉最舊的。
export function giveCard(s, rng, id, add) {
  let pick = id
  if (id === 'random' || id === 'protect') {
    const pool = CARD_IDS.filter((c) => !hasCard(s, c) && (id !== 'protect' || CARDS[c].kind === '保障卡') && (c !== 'rent_boost' || Object.keys(s.props || {}).length > 0))
    if (!pool.length) { add('你的手牌已經很齊全,這次沒有新的卡', 0, 'note'); return null }
    pick = rng.pick(pool)
  }
  if (hasCard(s, pick)) { add(`你已經有「${CARDS[pick].name}」了`, 0, 'note'); return null }
  if (s.cards.length >= MAX_CARDS) {
    const old = s.cards.shift()
    add(`手牌已滿,換掉最舊的「${CARDS[old].name}」`, 0, 'note')
  }
  s.cards.push(pick)
  s.cardsGot = (s.cardsGot || 0) + 1
  add(`獲得卡片:${CARDS[pick].icon} ${CARDS[pick].name}`, 0, 'cover')
  return pick
}
