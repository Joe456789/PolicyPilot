// 成長篇:0 ~ 21 歲。出生抽籤決定家境,一路的選擇與意外,決定 22 歲踏入社會時的起點。
// 設計重點:你小時候「還不能決定」的事(家人有沒有保險),也會在你人生的起點留下痕跡。
import { Rng } from './rng.js'
import { BACKGROUNDS, CAREERS } from './careers.js'
import { clamp, round1k } from './core.js'

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
    scene: null,
    log: [],
    done: false,
  }
}

const inj = (l) => (l.parentsInsured ? '家裡有保險,醫療費由保單負擔,影響不大' : '家裡沒有任何保障,醫療費全靠存款')

// 每個階段:建立事件卡(可能有隨機成分)
const STEPS = [
  {
    age: 0,
    build: (l) => ({
      icon: '👶', title: '出生抽籤', tone: 'neutral',
      story: `你出生在「${l.family}」。${l.familyBlurb}${l.parentsInsured ? '爸媽很有保險觀念,替全家做了基本的醫療與壽險規劃。' : '爸媽沒有買過任何商業保險,覺得「有健保就夠了」。'}`,
      choices: [{ label: '展開我的人生', hint: '', tag: 'ok' }],
    }),
  },
  {
    age: 3,
    build: (l, rng) => {
      const sick = rng.next() < 0.5
      return {
        icon: sick ? '🤒' : '🧸', title: sick ? '幼兒腸病毒住院' : '快樂的幼兒時光', tone: sick ? 'bad' : 'good',
        story: sick
          ? `你才三歲就因腸病毒併發症住院一週。爸媽請假照顧,醫療與看護花了不少。${inj(l)}。`
          : '你的幼兒時光健康又快樂,爸媽說你是家裡最開心的小孩。',
        choices: [{ label: '往下走', hint: '', tag: 'ok' }],
        _sick: sick,
      }
    },
    after: (l, sc) => {
      if (sc._sick) {
        if (l.parentsInsured) return [{ label: '保單理賠,家裡幾乎沒有損失', amount: 0, kind: 'cover' }]
        l.cash = Math.max(0, l.cash - 80000)
        return [{ label: '醫療與看護費用,動用家裡存款', amount: -80000, kind: 'out' }]
      }
      l.stats.health = Math.min(100, l.stats.health + 3)
      return []
    },
  },
  {
    age: 6,
    build: () => ({
      icon: '🎒', title: '上小學:培養興趣', tone: 'neutral',
      story: '爸媽問你想把課餘時間花在哪裡?這會塑造你的個性與能力。',
      choices: [
        { label: '運動與戶外', hint: '健康 +10、人緣 +5', fx: { health: 10, social: 5 } },
        { label: '補習與閱讀', hint: '學業 +10', fx: { study: 10 } },
        { label: '音樂與才藝', hint: '人緣 +10、學業 +3', fx: { social: 10, study: 3 } },
      ],
    }),
  },
  {
    age: 9,
    build: (l, rng) => {
      const ev = rng.pick(['illness', 'jobloss', 'accident'])
      const text = {
        illness: ['爸爸確診重大疾病', '爸爸突然確診重大疾病,需要長期治療,家裡經濟立刻吃緊。'],
        jobloss: ['爸媽公司倒閉', '爸媽任職的公司結束營業,家裡的收入一下子少了一半。'],
        accident: ['媽媽發生車禍', '媽媽騎車被撞,需要開刀與復健,一段時間無法工作。'],
      }[ev]
      return {
        icon: ev === 'illness' ? '🎗️' : ev === 'jobloss' ? '📉' : '🚑', title: text[0], tone: 'bad',
        story: `${text[1]}${l.parentsInsured ? '還好家裡有保險,給付撐住了生活。' : '家裡沒有任何保障,只能動用存款甚至借錢。'}`,
        choices: [
          { label: '安靜體貼,幫忙分擔家務', hint: '學業 +3、財商 +5', fx: { finance: 5, study: 3 } },
          { label: '偷偷難過,成績下滑', hint: '學業 -5、健康 -3', fx: { study: -5, health: -3 } },
        ],
        _ev: ev,
      }
    },
    after: (l) => {
      if (l.parentsInsured) return [{ label: '保險給付,家裡生活維持正常', amount: 0, kind: 'cover' }]
      const loss = 200000
      l.cash = Math.max(0, l.cash - loss)
      l.loan += 100000
      l.parentsSupport = true
      l.stats.finance += 3
      return [
        { label: '動用家裡存款', amount: -loss, kind: 'out' },
        { label: '家裡背上債務,你長大後要多負責扶養父母', amount: 0, kind: 'warn' },
      ]
    },
  },
  {
    age: 12,
    build: (l) => ({
      icon: '🐷', title: '第一筆零用錢', tone: 'neutral',
      story: `過年你收到一筆壓歲錢。你${l.style === '冒險型' ? '很想拿去玩點大的' : '想了想要怎麼用'}。`,
      choices: [
        { label: '存進撲滿與銀行', hint: '財商 +8、存款 +1 萬', fx: { finance: 8 }, cash: 10000 },
        { label: '買想要的玩具與遊戲', hint: '人緣 +5', fx: { social: 5 } },
        { label: '跟同學一起合資投資(小額)', hint: '財商 +5,結果看運氣', fx: { finance: 5 }, gamble: true },
      ],
    }),
  },
  {
    age: 15,
    build: () => ({
      icon: '🏫', title: '升學:高中還是高職?', tone: 'neutral',
      story: '國中畢業了。你想往學術路線走,還是學一技之長?',
      choices: [
        { label: '普通高中,準備考大學', hint: '學業 +8', fx: { study: 8 }, track: 'academic' },
        { label: '高職,學專業技能', hint: '可直接就業,財商 +5', fx: { finance: 5, social: 3 }, track: 'vocational' },
      ],
    }),
  },
  {
    age: 18,
    build: (l) => ({
      icon: '🎓', title: '大學志願:選哪條路?', tone: 'neutral',
      story: `指考放榜了(學業指數 ${l.stats.study})。學費與學貸會影響你出社會時的起跑點。`,
      choices: [
        { label: '公立大學(理工)', hint: '學貸約 10 萬', major: 'stem', loan: 100000, need: 55 },
        { label: '公立大學(商管)', hint: '學貸約 10 萬', major: 'biz', loan: 100000, need: 55 },
        { label: '私立大學(醫護)', hint: '學貸約 35 萬', major: 'med', loan: 350000, need: 0 },
        { label: '私立大學(設計人文)', hint: '學貸約 30 萬', major: 'art', loan: 300000, need: 0 },
        { label: '不升學,直接工作', hint: '沒有學貸,起薪略低', major: 'work', loan: 0, need: 0 },
      ],
    }),
  },
  {
    age: 20,
    build: () => ({
      icon: '💼', title: '暑假:實習還是打工?', tone: 'neutral',
      story: '大學生活過了一半,這個暑假你想怎麼過?',
      choices: [
        { label: '企業實習', hint: '履歷加分,畢業起薪 +5%', fx: { study: 3 }, boost: 1.05 },
        { label: '打工賺錢', hint: '存款 +8 萬', fx: {}, cash: 80000 },
        { label: '海外交換 / 旅行', hint: '人緣 +10、花費 6 萬', fx: { social: 10 }, cash: -60000 },
      ],
    }),
  },
  {
    age: 21,
    build: (l, rng) => {
      const hit = rng.next() < 0.55
      return {
        icon: hit ? '🏍️' : '🍀', title: hit ? '騎車摔傷' : '平安的一年', tone: hit ? 'bad' : 'good',
        story: hit
          ? `趕著上課時機車打滑,你的腳骨折了,住院開刀。${l.parentsInsured ? '爸媽先前幫你加保了學生意外險與醫療險。' : '你從沒想過要保險,學生身分覺得離風險很遠。'}`
          : '這一年平平安安,沒有任何大事。',
        choices: [{ label: '往下走', hint: '', tag: 'ok' }],
        _hit: hit,
      }
    },
    after: (l, sc) => {
      if (!sc._hit) return []
      if (l.parentsInsured) return [{ label: '醫療與意外險給付,幾乎不用自己花錢', amount: 0, kind: 'cover' }]
      l.cash = Math.max(0, l.cash - 120000)
      l.stats.health -= 8
      return [{ label: '醫療費用,動用存款', amount: -120000, kind: 'out' }, { label: '你體會到:風險不會因為年輕就跳過你', amount: 0, kind: 'lesson' }]
    },
  },
]

export const PROLOGUE_LENGTH = STEPS.length

// 建立下一個階段的事件卡
export function nextLifeScene(life) {
  if (life.done) return null
  const st = STEPS[life.step]
  if (!st) return null
  const rng = new Rng(life.seed, life.rngN)
  const sc = st.build(life, rng)
  life.rngN = rng.n
  life.age = st.age
  return { kind: 'life', defId: 'life' + life.step, aiable: true, base: {}, ai: false, ...sc }
}

// 選擇後結算,回傳結果行並推進到下一階段。
export function chooseLife(state, idx) {
  const life = structuredClone(state)
  const st = STEPS[life.step]
  const sc = life.scene
  const choice = sc.choices[idx] || sc.choices[0]
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
  life.rngN = rng.n
  if (st.after) lines.push(...st.after(life, sc))
  life.log.push({ age: st.age, title: sc.title })
  life.scene = { ...sc, result: { lines } }
  return life
}

export function advanceLife(state) {
  const life = structuredClone(state)
  life.step += 1
  if (life.step >= STEPS.length) {
    life.done = true
    life.age = 22
    life.scene = null
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

// 22 歲:把成長篇結果轉成成人階段的起點。
export function lifeToSetup(life, careerId, length, opponents) {
  const bg = BACKGROUNDS.find((b) => b.id === life.bgId)
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
      incomeBoost: clamp(life.incomeBoost * (1 + (life.stats.study - 50) / 400), 0.85, 1.2),
      assets: life.assets,
      house: life.house || 0,
      education: life.edu || '高中職',
      majorTitle: MAJORS[life.major || 'work'].title,
    },
  }
}

// 直接進入棋盤:略過 0~21 歲的成長篇,只保留出生抽籤的結果(家境與家人保障)。
export function skipLife(state) {
  const life = structuredClone(state)
  life.age = 22
  life.step = STEPS.length
  life.done = true
  life.scene = null
  life.major = 'biz'
  life.edu = '大學'
  life.stats = { health: 92, study: 55, social: 50, finance: 45 }
  return life
}
