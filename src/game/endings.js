// 人生結局:依最後的資產、家庭、保障與一生中的遭遇決定。共 16 種,收集成圖鑑。
import { computeScore } from './scoring.js'
import { wan } from './format.js'
import { t } from '../i18n.js'

const alive = (s) => !(s.ended && s.ended.reason === 'death')
const nw = (s) => (s.history.length ? s.history[s.history.length - 1].netWorth : s.startNetWorth)
const prot = (s) => (s.history.length ? s.history.reduce((a, h) => a + h.protRatio, 0) / s.history.length : 0)
const cats = (s) => s.history.flatMap((h) => h.shocks.map((x) => x.cat))
const had = (s, ev) => s.history.some((h) => h.events.some((e) => e.title && e.cat === ev))

export const ENDINGS = [
  { id: 'bankrupt', icon: '💥', title: '破產出局', rarity: '稀有', blurb: '現金、投資、地產都撐不住了,這一局被迫離場。',
    check: (s) => s.ended?.reason === 'bankrupt',
    epilogue: (s) => t('{name}在 {age} 歲資金斷裂:現金見底、借款額度用盡、地產與房子也被低價拍賣,仍然缺 {debt}。意外加上高槓桿,沒有保障與預備金就是這個下場。好消息是:這只是遊戲,下一局可以換個策略。', { name: s.player.name, age: s.ended.age, debt: wan(s.ended.debt) }) },
  { id: 'death_covered', icon: '🕊️', title: '家人的靠山', rarity: '稀有', blurb: '你離開得太早,但你留下的保障,讓家人撐過了最難的日子。',
    check: (s) => !alive(s) && s.ended.ratio >= 1,
    epilogue: (s) => t('{name}在 {age} 歲離開了。雖然人生很短,但保單的給付讓家人沒有被生活壓垮,孩子們依然完成學業。你用另一種方式守護了他們。', { name: s.player.name, age: s.age }) },
  { id: 'death_short', icon: '🥀', title: '來不及的守護', rarity: '稀有', blurb: '事情發生得太突然,保障卻沒有準備好,家人必須獨自面對。',
    check: (s) => !alive(s) && s.ended.ratio < 1,
    epilogue: (s) => t('{name}在 {age} 歲過世。家人可動用的資金只有所需的 {pct}%,不得不賣掉資產、重新規劃生活。這是一堂昂貴的課:保障要在需要之前準備。', { name: s.player.name, age: s.age, pct: Math.round((s.ended?.ratio || 0) * 100) }) },
  { id: 'rags', icon: '🌟', title: '白手起家', rarity: '稀有', blurb: '從清寒的家庭出發,你靠自己走到令人羨慕的位置。',
    check: (s) => ['tight', 'single'].includes(s.player.bgId) && nw(s) >= 10000000,
    epilogue: (s) => t('出身{bg}的{name},沒有任何靠山,卻靠著自律、保障與長期的資產配置,走到淨資產 {nw}。你是許多人的榜樣。', { bg: s.player.background, name: s.player.name, nw: wan(nw(s)) }) },
  { id: 'fall', icon: '🍂', title: '富不過三代', rarity: '稀有', blurb: '手握一副好牌,卻沒有好好守住。',
    check: (s) => ['rich', 'pro', 'biz', 'heritage'].includes(s.player.bgId) && s.startNetWorth > 0 && nw(s) < s.startNetWorth * 0.4,
    epilogue: (s) => t('{name}出生在{bg},起點比大多數人都好。可惜在市場起伏與意外之下,家產縮水到 {nw}。財富需要的是紀律與保護。', { name: s.player.name, bg: s.player.background, nw: wan(nw(s)) }) },
  { id: 'family_full', icon: '🏡', title: '美滿家庭', rarity: '稀有', blurb: '結婚、孩子、房子、保障,一個都沒少。',
    check: (s) => !!s.partner && s.dependents >= 2 && !!s.house && prot(s) >= 0.75,
    epilogue: (s) => t('{age} 歲的{name},有伴侶、{kids} 個孩子、一間自己的家,而且保障完整。你的家庭經得起風雨。', { age: s.age, name: s.player.name, kids: s.dependents }) },
  { id: 'sandwich', icon: '🥪', title: '三明治世代', rarity: '常見', blurb: '上有高堂、下有稚子,責任一肩扛。',
    check: (s) => cats(s).includes('care') && s.dependents > 0,
    epilogue: (s) => t('{name}同時照顧父母與孩子,每一個決定都得先想到家人。你很累,但你撐起了整個家。', { name: s.player.name }) },
  { id: 'fighter', icon: '💪', title: '與病痛共存的堅強', rarity: '稀有', blurb: '你經歷了重病或失能,卻靠著保障與意志撐了過來。',
    check: (s) => alive(s) && (cats(s).includes('critical') || cats(s).includes('disability')) && nw(s) > 0,
    epilogue: (s) => t('{name}經歷過重大傷病的打擊,收入中斷了好幾年。靠著{source}與家人的陪伴,你撐了過來,淨資產仍有 {nw}。', { name: s.player.name, source: s.history.some((h) => h.payout >= 500000) ? '保險的給付' : '自己的積蓄', nw: wan(nw(s)) }) },
  { id: 'traveler', icon: '🌍', title: '自由旅人', rarity: '常見', blurb: '你把錢花在經驗上,人生因此更寬廣。',
    check: (s) => s.trips >= 3 && alive(s),
    epilogue: (s) => t('{name}一生去了 {trips} 次以上的旅行。比起豪宅名車,你更珍惜看過的風景。只要旅平險和預備金都在,這樣的人生一樣踏實。', { name: s.player.name, trips: s.trips }) },
  { id: 'emotional', icon: '🎢', title: '情緒投資人', rarity: '常見', blurb: '漲的時候追、跌的時候賣。',
    check: (s) => s.panicSells >= 2,
    epilogue: (s) => t('{name}在市場下跌時多次恐慌賣出,錯過了後來的反彈。情緒是投資最大的敵人,紀律勝過預測。', { name: s.player.name }) },
  { id: 'broke', icon: '⛓️', title: '債務纏身', rarity: '常見', blurb: '一連串的意外與選擇,讓你一直在補洞。',
    check: (s) => nw(s) < 0 || s.history.filter((h) => h.borrowed > 0).length >= 5,
    epilogue: (s) => t('{name}的人生有一大半時間在還債。意外與缺口讓現金不斷見底,淨資產只剩 {nw}。好消息是:一切都來得及重新規劃。', { name: s.player.name, nw: wan(nw(s)) }) },
  { id: 'tycoon', icon: '💎', title: '財富自由者', rarity: '稀有', blurb: '你的資產已經足夠,錢開始替你工作。',
    check: (s) => nw(s) >= Math.max(20000000, (s.startIncome || s.career.income) * s.years * 1.5),
    epilogue: (s) => t('{age} 歲的{name},淨資產超過 {nw}。你不必再為生活焦慮,而且懂得用保險守住這一切。', { age: s.age, name: s.player.name, nw: wan(nw(s)) }) },
  { id: 'career', icon: '🏆', title: '事業巔峰', rarity: '常見', blurb: '你在職場一路往上,收入遠遠超過起薪。',
    check: (s) => s.income >= (s.startIncome || s.career.income) * 2.8,
    epilogue: (s) => t('{name}的年收入成長到起薪的 {ratio} 倍。事業的成功帶來自由,也記得替這份收入加上保障。', { name: s.player.name, ratio: (s.income / (s.startIncome || s.career.income)).toFixed(1) }) },
  { id: 'lone', icon: '🐺', title: '獨行的富翁', rarity: '常見', blurb: '單身、自在、資產豐厚。',
    check: (s) => !s.partner && nw(s) >= 8000000,
    epilogue: (s) => t('{name}一路單身,把人生過得自在。淨資產 {nw},只要記得規劃長照與退休,就是理想的獨居生活。', { name: s.player.name, nw: wan(nw(s)) }) },
  { id: 'homeowner', icon: '🏠', title: '安穩的屋主', rarity: '常見', blurb: '有一間自己的家,日子過得安穩。',
    check: (s) => !!s.house && prot(s) >= 0.6,
    epilogue: (s) => t('{name}擁有自己的房子,保障也大致到位。雖然不是最亮眼的人生,卻很安穩。', { name: s.player.name }) },
  { id: 'steady', icon: '🌿', title: '平凡而踏實', rarity: '常見', blurb: '沒有大起大落,穩穩地過日子。',
    check: (s, sc) => sc.total >= 60,
    epilogue: (s) => t('{name}的人生沒有太多戲劇性,但一步一步走得穩。淨資產 {nw},這樣就很好。', { name: s.player.name, nw: wan(nw(s)) }) },
  { id: 'wandering', icon: '🧭', title: '還在摸索的人', rarity: '常見', blurb: '人生還沒有答案,但你已經學到不少。',
    check: () => true,
    epilogue: (s) => t('{name}的人生有起有落。回頭看,很多缺口其實可以早一點補上。下一局,也許會有不一樣的故事。', { name: s.player.name }) },
]

export function computeEnding(s, score = computeScore(s)) {
  const e = ENDINGS.find((x) => x.check(s, score))
  // 回傳已翻譯(目前語言)的文字;id 不變
  return { id: e.id, icon: e.icon, title: t(e.title), rarity: t(e.rarity), blurb: t(e.blurb), epilogue: e.epilogue(s, score) }
}
