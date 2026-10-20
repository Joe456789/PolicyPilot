// 開局年齡:22(社會新鮮人)、30(職場中堅)、40(家庭責任期)。
// 22 歲由成長篇決定起點;30 與 40 歲由這裡依家境與職業「模擬前面的人生」,產生伴侶、孩子、房貸、既有保障與資產。
import { Rng } from './rng.js'
import { BACKGROUNDS, CAREERS } from './careers.js'
import { clamp, round1k } from './core.js'
import { t, getLang } from '../i18n.js'

export const START_AGES = [
  { age: 22, icon: '🎓', title: '22 歲・社會新鮮人', blurb: '一切從零開始:學貸、第一份工作,結婚買房育兒都還沒發生。最完整的人生。' }, // i18n-ignore
  { age: 30, icon: '💼', title: '30 歲・職場中堅', blurb: '已經工作 8 年:可能有伴侶、孩子與房貸,保障開始不夠用。' }, // i18n-ignore
  { age: 40, icon: '🏡', title: '40 歲・家庭責任期', blurb: '上有老、下有小:房貸、教養費、父母健康一起來,最考驗保障與現金流。' }, // i18n-ignore
]

const wanOf = (n) => `${Math.round(n / 10000)} 萬` // i18n-ignore:數字 + 萬,t() 會在英文模式換成 NT$

export function adultStart({ age, bgId, careerId, seed }) {
  const bg = BACKGROUNDS.find((b) => b.id === bgId) || BACKGROUNDS[2]
  const career = CAREERS.find((c) => c.id === careerId) || CAREERS[0]
  const rng = new Rng((seed || 1) ^ 0x3a7c11, age)
  const yrs = age - 22
  const wealthy = ['rich', 'pro', 'comfy'].includes(bg.id) ? 1 : 0
  const poor = ['tight', 'single'].includes(bg.id) ? 1 : 0
  const older = age >= 40

  // 收入:依職業成長率累積,再加上個人起伏
  const growthMult = clamp(Math.pow(1 + career.growth, yrs) * rng.range(0.92, 1.12), 1, 2.2)
  const income = round1k(career.income * growthMult)

  // 家庭
  const partner = rng.next() < (older ? 0.78 : 0.45) + wealthy * 0.08 - poor * 0.1
  const dependents = partner ? (rng.next() < (older ? 0.8 : 0.4) ? (older && rng.next() < 0.45 ? 2 : 1) : 0) : rng.next() < (older ? 0.12 : 0.04) ? 1 : 0
  const partnerIncome = partner ? round1k(income * rng.range(0.55, 1.0)) : 0
  const hhIncome = income + partnerIncome

  // 房子:有房貸的自住房(不是富二代送的那間)
  const hasGiftHouse = !!bg.house
  const buys = !hasGiftHouse && rng.next() < (older ? 0.62 : 0.3) + wealthy * 0.15 - poor * 0.12
  let house = null
  if (hasGiftHouse) house = { price: bg.house, value: Math.round(bg.house * Math.pow(1.03, yrs)), balance: 0, rate: 0.022, payment: 0, yearsLeft: 0 }
  else if (buys) {
    const price = clamp(round1k(hhIncome * rng.range(5.5, 7.5)), 5000000, 18000000)
    const boughtAgo = older ? rng.int(5, 12) : rng.int(1, 4)
    const n = 30
    const rate = 0.022
    const principal = price * 0.8
    const payment = Math.round((principal * rate) / (1 - Math.pow(1 + rate, -n)))
    // 已還了 boughtAgo 年之後的餘額
    const balance = Math.round(principal * (Math.pow(1 + rate, n) - Math.pow(1 + rate, boughtAgo)) / (Math.pow(1 + rate, n) - 1))
    house = { price, value: Math.round(price * Math.pow(1.03, boughtAgo)), balance, rate, payment, yearsLeft: n - boughtAgo }
  }

  // 資產與負債:越有錢的家境、越多年的工作,累積越多;清寒家庭的負債殘留較多
  const saveRate = clamp(0.1 + wealthy * 0.08 - poor * 0.05 + rng.range(-0.04, 0.06), 0.03, 0.26)
  const saved = Math.round(income * saveRate * yrs * (partner ? 1.3 : 1))
  const cash = round1k(clamp(saved * rng.range(0.25, 0.45) + (bg.cash || 0) * 0.3, 60000, 4000000))
  const stock = round1k(saved * rng.range(0.1, 0.3) + (bg.assets?.stock || 0) * 0.6)
  const bond = round1k(saved * rng.range(0, 0.12))
  const deposit = round1k(saved * rng.range(0.1, 0.2) + (bg.assets?.deposit || 0) * 0.5)
  const loan = round1k(Math.max(0, (bg.loan || 0) * (poor ? 0.55 : 0.2) + (rng.next() < 0.25 ? 100000 : 0)))

  // 既有保障:多半只有零星幾張,正是遊戲要幫你檢視的
  const coverage = {}
  if (rng.next() < 0.65 + wealthy * 0.2) coverage.medical = 1
  if (rng.next() < 0.45 + wealthy * 0.2) coverage.accident = 1
  if ((partner || dependents) && rng.next() < 0.55) coverage.life = 1
  if (dependents && rng.next() < 0.25) coverage.disability = 1
  if (older && rng.next() < 0.25) coverage.critical = 1
  if (house && rng.next() < 0.55) coverage.home = 1
  const car = rng.next() < (older ? 0.72 : 0.42) + (partner ? 0.1 : 0)
  if (car && rng.next() < 0.6) coverage.auto = 1

  const health = Math.round(clamp((older ? 84 : 91) + rng.range(-6, 6), 60, 100))
  const parentsSupport = poor ? true : older ? rng.next() < 0.3 : rng.next() < 0.1

  const parts = [
    t('{age} 歲,{title}', { age, title: career.title }),
    partner ? t('已婚') : t('單身'),
    dependents ? t('扶養 {n} 個孩子', { n: dependents }) : t('沒有孩子'),
    house ? (house.balance > 0 ? t('有房貸(餘額約 {amt})', { amt: wanOf(house.balance) }) : t('有一間自己的房子')) : t('還租房子'),
    car ? t('有車') : null,
    Object.keys(coverage).length ? t('已投保 {n} 張保單', { n: Object.keys(coverage).length }) : t('幾乎沒有商業保險'),
  ].filter(Boolean)
  const intro = t('{parts}。這些年的累積:現金約 {cash}、投資約 {invest}{loan}。接下來,看你怎麼把保障補齊。', {
    parts: parts.join(getLang() === 'en' ? ', ' : '、'), cash: wanOf(cash), invest: wanOf(stock + bond + deposit), loan: loan ? t('、貸款約 {amt}', { amt: wanOf(loan) }) : '',
  })

  const tags = []
  if (poor) tags.push('survivor')
  if (saveRate > 0.16) tags.push('saver')
  if (health >= 93) tags.push('strong')
  if (growthMult > 1.3) tags.push('scholar')
  if (bg.id === 'biz') tags.push('entrepreneur')
  if (bg.id === 'rich' || bg.id === 'pro') tags.push('insured_home')

  return {
    tags: tags.slice(0, 3), age, growthMult, income, partnerIncome, partner, dependents, houseObj: house, car, coverage, health, parentsSupport, intro,
    cash, loan, assets: { deposit, bond, stock }, expenseRatio: clamp(bg.expenseRatio - 0.04 + rng.range(-0.02, 0.03), 0.55, 0.8),
  }
}

