// 成長篇:0 ~ 21 歲。出生抽籤決定家境,一路的選擇與意外,決定 22 歲踏入社會時的起點。
// 設計重點:你小時候「還不能決定」的事(家人有沒有保險),也會在你人生的起點留下痕跡。
import { Rng } from './rng.js'
import { BACKGROUNDS, CAREERS } from './careers.js'
import { clamp, round1k } from './core.js'
import { TAGS, TAG_IDS } from './tags.js'
import { SLOTS } from './prologueCards.js'
import { adultStart } from './starts.js'

const MAJORS = {
  stem: { id: 'stem', icon: '🔬', title: '理工', careers: ['engineer', 'office'] },
  biz: { id: 'biz', icon: '📊', title: '商管', careers: ['office', 'sales', 'teacher'] },
  med: { id: 'med', icon: '🩺', title: '醫護', careers: ['nurse', 'office'] },
  art: { id: 'art', icon: '🎨', title: '設計人文', careers: ['freelancer', 'office', 'teacher'] },
  work: { id: 'work', icon: '🔧', title: '直接就業', careers: ['office', 'sales', 'freelancer'] },
}
export { MAJORS }

export function createLife(setup, seed = Math.floor(Math.random() * 100000)) {
  const rng = new Rng(seed, 0)
  const forced = setup.bgId ? BACKGROUNDS.find((b) => b.id === setup.bgId) : null
  const bg = forced || rng.weighted(BACKGROUNDS, (b) => b.weight)
  const insured = rng.next() < bg.insuredP
  return {
    seed,
    rngN: rng.n,
    name: setup.name,
    look: setup.look,
    style: setup.style,
    age: 0,
    step: 0,
    bgId: bg.id,
    family: bg.title,
    familyBlurb: bg.blurb,
    parentsInsured: insured,
    parentsSupport: bg.parentsSupport,
    assets: { ...(bg.assets || {}) },
    house: bg.house || 0,
    tuition: bg.tuition ?? 1,
    aspiration: setup.aspiration || null,
    cash: bg.cash,
    loan: bg.loan,
    expenseRatio: bg.expenseRatio,
    stats: { health: 85 + Math.round(rng.next() * 15), study: 50, social: 50, finance: 40 },
    edu: null,
    major: null,
    incomeBoost: 1,
    flags: {},
    tags: [],
    used: [],
    scene: null,
    log: [],
    done: false,
  }
}

export const PROLOGUE_LENGTH = SLOTS.length

const fnOr = (v, ...a) => (typeof v === 'function' ? v(...a) : v)
const CARD_BY_ID = Object.fromEntries(SLOTS.flatMap((s) => s.pool).map((c) => [c.id, c]))

// 依家境、先前的遭遇與運氣,從這個年齡的卡池抽一張
function pickCard(life, rng, slot) {
  let pool = slot.pool.filter((c) => !life.used.includes(c.id) && (!c.req || c.req(life)))
  if (!pool.length) pool = slot.pool.filter((c) => !c.req || c.req(life))
  return rng.weighted(pool, (c) => Math.max(0.01, fnOr(c.w ?? 1, life)))
}

// 建立下一個階段的事件卡
export function nextLifeScene(life) {
  if (life.done) return null
  const slot = SLOTS[life.step]
  if (!slot) return null
  const rng = new Rng(life.seed, life.rngN)
  const card = pickCard(life, rng, slot)
  const hit = card.roll != null ? rng.next() < fnOr(card.roll, life) : false
  life.rngN = rng.n
  life.age = slot.age
  life.used.push(card.id)
  return {
    kind: 'life', defId: 'life_' + card.id, aiable: true, base: {}, ai: false, _cid: card.id, _hit: hit,
    icon: fnOr(card.icon, life, hit), title: fnOr(card.title, life, hit), story: fnOr(card.story, life, hit),
    tone: card.tone || (hit ? 'bad' : 'neutral'),
    choices: fnOr(card.choices, life, hit).map(({ res, ...c }) => c), // 函式不能存進狀態,結算時再從卡池取回
  }
}

const addTag = (life, id) => { if (TAGS[id] && !life.tags.includes(id)) life.tags.push(id) }

// 選擇後結算,回傳結果行並推進到下一階段。
export function chooseLife(state, idx) {
  const life = structuredClone(state)
  const sc = life.scene
  const card = CARD_BY_ID[sc._cid]
  const at = sc.choices[idx] ? idx : 0
  const choice = { ...sc.choices[at], res: fnOr(card?.choices, life, sc._hit)?.[at]?.res }
  const lines = []
  const rng = new Rng(life.seed, life.rngN)
  if (choice.fx) for (const [k, v] of Object.entries(choice.fx)) life.stats[k] = clamp((life.stats[k] || 0) + v, 5, 100)
  if (choice.cash) { life.cash = Math.max(0, life.cash + choice.cash); lines.push({ label: choice.cash > 0 ? '存款增加' : '花費', amount: choice.cash, kind: choice.cash > 0 ? 'in' : 'out' }) }
  if (choice.gamble) {
    const win = rng.next() < 0.5
    const amt = win ? 20000 : -10000
    life.cash = Math.max(0, life.cash + amt)
    lines.push({ label: win ? '小額投資賺到了' : '小額投資賠了一點', amount: amt, kind: win ? 'in' : 'out' })
  }
  if (choice.boost) life.incomeBoost *= choice.boost
  if (choice.track === 'vocational') life.track = 'vocational'
  if (choice.flag) life.flags[choice.flag] = true
  if (choice.tag) { addTag(life, choice.tag); lines.push({ label: `獲得人生標籤:${TAGS[choice.tag].icon} ${TAGS[choice.tag].title}`, amount: 0, kind: 'cover' }) }
  if (choice.major) {
    const share = life.tuition ?? 1
    const base = Math.round(((choice.loan || 0) * share) / 10000) * 10000
    if (life.stats.study < (choice.need || 0)) {
      lines.push({ label: '成績差一點,沒考上第一志願,改念較低的選擇(學貸增加)', amount: 0, kind: 'warn' })
      life.loan += base + 50000
    } else life.loan += base
    if (share < 1 && choice.loan) lines.push({ label: share === 0 ? '家裡全額負擔學費' : '家裡負擔了部分學費', amount: 0, kind: 'cover' })
    if (life.stats.study >= 75 && choice.loan) {
      life.loan = Math.max(0, life.loan - 50000)
      lines.push({ label: '成績優異拿到獎學金', amount: 50000, kind: 'in' })
    }
    life.major = choice.major
    life.edu = choice.major === 'work' ? '高中職' : '大學'
    if (base) lines.push({ label: `學貸 ${Math.round(base / 10000)} 萬`, amount: -base, kind: 'out' })
    if (choice.major === 'work') life.incomeBoost *= 0.95
  }
  if (choice.fx) {
    const t = Object.entries(choice.fx).map(([k, v]) => `${{ health: '健康', study: '學業', social: '人緣', finance: '財商' }[k]} ${v > 0 ? '+' : ''}${v}`).join('、')
    if (t) lines.push({ label: t, amount: 0, kind: 'note' })
  }
  if (choice.res) lines.push(...choice.res(life, rng))
  life.rngN = rng.n
  if (card?.after) lines.push(...card.after(life, sc, choice, rng))
  if (card?.lesson) lines.push({ label: card.lesson, amount: 0, kind: 'lesson' })
  life.log.push({ age: SLOTS[life.step].age, title: sc.title })
  life.scene = { ...sc, result: { lines } }
  return life
}

// 一路上的經歷,變成帶進棋盤階段的人生標籤
export function deriveTags(life) {
  const f = life.flags
  const st = life.stats
  const t = [...life.tags]
  const add = (id) => { if (!t.includes(id)) t.push(id) }
  if (f.early_illness && (f.chronic || st.health < 85)) add('sickly')
  if (st.health >= 95 && !f.early_illness) add('strong')
  if (f.saver || st.finance >= 70) add('saver')
  if (f.gamble_kid) add('gambler')
  if (f.caregiver) add('caregiver')
  if (st.study >= 78 || f.scholar) add('scholar')
  if (st.social >= 72 || f.social) add('social')
  if (f.biz_spirit) add('entrepreneur')
  if (f.adventurer) add('adventurer')
  if (f.parent_ill || f.parent_jobloss || f.parent_acc || f.debt) add('survivor')
  if (life.parentsInsured && !f.debt) add('insured_home')
  return t.slice(0, 5)
}

export function advanceLife(state) {
  const life = structuredClone(state)
  life.step += 1
  if (life.step >= SLOTS.length) {
    life.done = true
    life.age = 22
    life.scene = null
    life.tags = deriveTags(life)
  } else {
    life.scene = nextLifeScene(life)
  }
  return life
}

export function beginLife(state) {
  const life = structuredClone(state)
  life.scene = nextLifeScene(life)
  return life
}

// 畢業時可選的職業(受科系與學業影響)
export function careerOptions(life) {
  const major = MAJORS[life.major || 'work']
  const ids = [...major.careers]
  if (life.stats.study >= 70 && !ids.includes('teacher')) ids.push('teacher')
  if (life.track === 'vocational' && !ids.includes('engineer') && life.major === 'work') ids.push('engineer')
  return ids.map((id) => CAREERS.find((c) => c.id === id)).filter(Boolean)
}

const tagIncome = (tags) => tags.reduce((a, id) => a * (TAGS[id]?.income || 1), 1)

// 22 歲:把成長篇結果轉成成人階段的起點。
export function lifeToSetup(life, careerId, length, opponents) {
  const bg = BACKGROUNDS.find((b) => b.id === life.bgId)
  if ((life.startAge || 22) > 22) {
    const a = adultStart({ age: life.startAge, bgId: life.bgId, careerId, seed: life.seed })
    return {
      name: life.name, look: life.look, career: careerId, background: bg.id, style: life.style, aspiration: life.aspiration, length, opponents,
      start: {
        ...a,
        parentsInsured: life.parentsInsured, stats: { ...life.stats }, incomeBoost: 1,
        education: '大學', majorTitle: MAJORS[life.major || 'biz'].title,
        house: 0,
      },
    }
  }
  return {
    name: life.name,
    look: life.look,
    career: careerId,
    background: bg.id,
    style: life.style,
    aspiration: life.aspiration,
    length,
    opponents,
    start: {
      cash: round1k(life.cash),
      loan: round1k(life.loan),
      expenseRatio: life.expenseRatio,
      parentsSupport: life.parentsSupport,
      parentsInsured: life.parentsInsured,
      health: clamp(life.stats.health, 50, 100),
      stats: { ...life.stats },
      incomeBoost: clamp(life.incomeBoost * (1 + (life.stats.study - 50) / 400) * tagIncome(life.tags), 0.85, 1.25),
      tags: life.tags,
      assets: life.assets,
      house: life.house || 0,
      education: life.edu || '高中職',
      majorTitle: MAJORS[life.major || 'work'].title,
    },
  }
}

// 直接進入棋盤:略過 0~21 歲的成長篇,只保留出生抽籤的結果(家境與家人保障)。
export function skipLife(state, startAge = 22) {
  const life = structuredClone(state)
  life.age = startAge
  life.startAge = startAge
  life.step = SLOTS.length
  life.done = true
  life.scene = null
  life.major = 'biz'
  life.edu = '大學'
  life.stats = { health: startAge >= 40 ? 84 : startAge >= 30 ? 90 : 92, study: 55, social: 50, finance: startAge >= 40 ? 65 : startAge >= 30 ? 55 : 45 }
  return life
}
