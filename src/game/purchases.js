// 擲骰之外,規劃時隨時可以做的消費決定:商店買卡、買賣車子、買賣自住房。
// 都只能在「規劃」階段做;結果寫進 s.flash(給介面提示)與 s.year.events(年度紀錄)。
import { run, clamp, round1k, householdIncome } from './core.js'
import { CARDS, MAX_CARDS, hasCard, giveCard } from './cards.js'
import { t } from '../i18n.js'
import { wan } from './format.js'
import { applySpecial } from './scenes.js'

// ---------- 商店 ----------
// 免災金牌不賣:真實世界買不到「壞事不發生」,只能買保險。
export const SHOP = [
  { id: 'medaid', price: 60000 },
  { id: 'antiscam', price: 15000 },
  { id: 'premium_off', price: 25000 },
  { id: 'rent_boost', price: 35000, need: (s) => Object.keys(s.props || {}).length > 0, needText: '要先擁有地產' },
  { id: 'crash_guard', price: 50000 },
]
export const SHOP_PER_YEAR = 2
export const shopLeft = (s) => SHOP_PER_YEAR - (s.shopYear === s.turn ? s.shopCount || 0 : 0)

export function shopBlock(s, item) {
  if (s.phase !== 'plan') return t('只能在擲骰前購買')
  if (hasCard(s, item.id)) return t('已經持有')
  if (shopLeft(s) <= 0) return t('今年已經買了 {n} 張', { n: SHOP_PER_YEAR })
  if (item.need && !item.need(s)) return t(item.needText)
  if (s.cash < item.price) return t('現金不足')
  return null
}

export function buyCard(state, id) {
  return run(state, (s) => {
    const item = SHOP.find((x) => x.id === id)
    if (!item) return
    const why = shopBlock(s, item)
    if (why) { s.flash = why; return }
    const full = (s.cards || []).length >= MAX_CARDS
    s.cash -= item.price
    s.shopCount = s.shopYear === s.turn ? (s.shopCount || 0) + 1 : 1
    s.shopYear = s.turn
    giveCard(s, null, id, () => {})
    s.flash = t('買到「{name}」{note}', { name: CARDS[id].name, note: full ? t('(手牌已滿,換掉了最舊的一張)') : '' })
    s.year.events.push({ title: t('在商店買了「{name}」', { name: CARDS[id].name }), kind: 'shop', icon: CARDS[id].icon })
  })
}

// ---------- 車子 ----------
export const CARS = {
  used: { name: '二手代步車', icon: '🚗', price: 80000, yearly: 35000, resale: 25000 },
  new: { name: '新車(貸款買)', icon: '🚙', price: 250000, yearly: 80000, resale: 100000 },
}

export function buyCar(state, kind) {
  return run(state, (s) => {
    const c = CARS[kind]
    if (!c || s.phase !== 'plan') return
    if (s.car) { s.flash = t('你已經有車了,要換車請先賣掉。'); return }
    if (s.cash < c.price) { s.flash = t('現金不足,需要 {amt}。', { amt: wan(c.price) }); return }
    s.cash -= c.price
    s.expense += c.yearly
    s.car = true
    s.carKind = kind
    s.flash = t('買了{name}:每年油錢、保養、停車與車貸約多 {amt}。記得考慮汽車險。', { name: t(c.name), amt: wan(c.yearly) })
    s.year.events.push({ title: t('買了{name}', { name: t(c.name) }), kind: 'shop', icon: c.icon })
  })
}

export function sellCar(state) {
  return run(state, (s) => {
    if (!s.car || s.phase !== 'plan') return
    const c = CARS[s.carKind] || CARS.used
    s.cash += c.resale
    s.expense = Math.max(Math.round(s.expense * 0.5), s.expense - c.yearly)
    s.car = false
    s.carKind = null
    s.coverage.auto = 0
    s.flash = t('賣掉車子,拿回 {amt},每年支出減少;汽車險也一併解約。', { amt: wan(c.resale) })
    s.year.events.push({ title: t('賣掉車子'), kind: 'shop', icon: '🔑' })
  })
}

// ---------- 自住房 ----------
const RATE = 0.022, YEARS = 30
export function homeOffer(s, size) {
  const hi = householdIncome(s)
  const price = size === 'family' ? clamp(round1k(hi * 9), 7000000, 22000000) : clamp(round1k(hi * 5.5), 4500000, 13000000)
  const down = Math.round(price * 0.2)
  const balance = price - down
  const payment = Math.round((balance * RATE) / (1 - Math.pow(1 + RATE, -YEARS)))
  return { size, price, down, balance, payment, rentSaved: round1k(price * 0.02), burden: payment / hi }
}

export function homeBlock(s, offer) {
  if (s.phase !== 'plan') return t('只能在擲骰前購買')
  if (s.house) return t('你已經有自住房了')
  if (s.cash < offer.down) return t('頭期款需要 {amt},現金不夠(可以先賣掉一些投資)', { amt: wan(offer.down) })
  if (offer.burden > 0.45) return t('房貸會超過家庭年收入的 45%,銀行不核貸')
  return null
}

export function buyHome(state, size) {
  return run(state, (s) => {
    const o = homeOffer(s, size)
    const why = homeBlock(s, o)
    if (why) { s.flash = why; return }
    s.cash -= o.down
    s.house = { price: o.price, value: o.price, balance: o.balance, rate: RATE, payment: o.payment, yearsLeft: YEARS, rentSaved: o.rentSaved }
    s.expense = Math.max(Math.round(s.expense * 0.5), s.expense - o.rentSaved)
    s.seen.house_buy = (s.seen.house_buy || 0) + 1
    s.flash = t('買下自住房!不用再付房租,但每年房貸約 {amt}。記得投保住宅火險,也可以考慮房貸壽險:萬一身故,保險金直接清償房貸。', { amt: wan(o.payment) })
    s.year.events.push({ title: t('買下自住房(房價 {amt})', { amt: wan(o.price) }), kind: 'milestone', icon: '🏠' })
  })
}

export function sellHome(state) {
  return run(state, (s) => {
    if (!s.house || s.phase !== 'plan') return
    const h = s.house
    const net = Math.round(h.value * 0.96) - h.balance // 仲介費與稅費約 4%
    s.cash += net
    s.expense += h.rentSaved || round1k(h.price * 0.02)
    s.house = null
    s.coverage.home = 0
    s.coverage.mortgage = 0
    s.flash = t('賣掉房子,扣掉房貸與費用拿回 {amt};之後要重新租屋,住宅火險也一併解約。', { amt: wan(net) })
    s.year.events.push({ title: t('賣掉自住房'), kind: 'milestone', icon: '🔑' })
  })
}

// ---------- 家庭計畫 ----------
// 結婚、生小孩也可以在規劃時主動決定(不必等走到人生里程碑格)
export function familyBlock(s, what) {
  if (s.phase !== 'plan') return t('只能在擲骰前決定')
  if (what === 'marry') {
    if (s.partner) return t('你已經結婚了')
    if (s.age > 60) return t('這個年紀的人生里程碑,交給緣分吧')
    if (s.cash < 300000) return t('婚禮與新家約需 30 萬現金')
  } else {
    if (!s.partner) return t('先結婚(或有伴侶)才能規劃生小孩')
    if (s.age > 45) return t('45 歲以後就不在遊戲的生育規劃範圍了')
    if ((s.kids || []).filter((k) => !k.independent).length >= 3) return t('已經有 3 個孩子了')
    if (s.babyYear === s.turn) return t('今年已經迎接過新生命了')
    if (s.cash < 100000) return t('新生兒一次性花費約需 10 萬現金')
  }
  return null
}

export function family(state, what) {
  return run(state, (s, rng) => {
    const why = familyBlock(s, what)
    if (why) { s.flash = why; return }
    const lines = []
    applySpecial(s, rng, what === 'marry' ? 'marry' : 'baby', (label) => lines.push(label))
    if (what === 'baby') s.babyYear = s.turn
    s.flash = lines.filter(Boolean).join(' ')
    s.year.events.push({ title: what === 'marry' ? t('結婚了') : t('迎接新生命'), kind: 'milestone', icon: what === 'marry' ? '💍' : '👶' })
  })
}
