// 人生結局:依最後的資產、家庭、保障與一生中的遭遇決定。共 16 種,收集成圖鑑。
import { computeScore } from './scoring.js'
import { wan } from './format.js'

const alive = (s) => !(s.ended && s.ended.reason === 'death')
const nw = (s) => (s.history.length ? s.history[s.history.length - 1].netWorth : s.startNetWorth)
const prot = (s) => (s.history.length ? s.history.reduce((a, h) => a + h.protRatio, 0) / s.history.length : 0)
const cats = (s) => s.history.flatMap((h) => h.shocks.map((x) => x.cat))
const had = (s, ev) => s.history.some((h) => h.events.some((e) => e.title && e.cat === ev))

export const ENDINGS = [
  { id: 'death_covered', icon: '🕊️', title: '家人的靠山', rarity: '稀有', blurb: '你離開得太早,但你留下的保障,讓家人撐過了最難的日子。',
    check: (s) => !alive(s) && s.ended.ratio >= 1,
    epilogue: (s) => `${s.player.name}在 ${s.age} 歲離開了。雖然人生很短,但保單的給付讓家人沒有被生活壓垮,孩子們依然完成學業。你用另一種方式守護了他們。` },
  { id: 'death_short', icon: '🥀', title: '來不及的守護', rarity: '稀有', blurb: '事情發生得太突然,保障卻沒有準備好,家人必須獨自面對。',
    check: (s) => !alive(s) && s.ended.ratio < 1,
    epilogue: (s) => `${s.player.name}在 ${s.age} 歲過世。家人可動用的資金只有所需的 ${Math.round((s.ended?.ratio || 0) * 100)}%,不得不賣掉資產、重新規劃生活。這是一堂昂貴的課:保障要在需要之前準備。` },
  { id: 'rags', icon: '🌟', title: '白手起家', rarity: '稀有', blurb: '從清寒的家庭出發,你靠自己走到令人羨慕的位置。',
    check: (s) => ['tight', 'single'].includes(s.player.bgId) && nw(s) >= 10000000,
    epilogue: (s) => `出身${s.player.background}的${s.player.name},沒有任何靠山,卻靠著自律、保障與長期的資產配置,走到淨資產 ${wan(nw(s))}。你是許多人的榜樣。` },
  { id: 'fall', icon: '🍂', title: '富不過三代', rarity: '稀有', blurb: '手握一副好牌,卻沒有好好守住。',
    check: (s) => ['rich', 'pro', 'biz', 'heritage'].includes(s.player.bgId) && s.startNetWorth > 0 && nw(s) < s.startNetWorth * 0.4,
    epilogue: (s) => `${s.player.name}出生在${s.player.background},起點比大多數人都好。可惜在市場起伏與意外之下,家產縮水到 ${wan(nw(s))}。財富需要的是紀律與保護。` },
  { id: 'family_full', icon: '🏡', title: '美滿家庭', rarity: '稀有', blurb: '結婚、孩子、房子、保障,一個都沒少。',
    check: (s) => !!s.partner && s.dependents >= 2 && !!s.house && prot(s) >= 0.75,
    epilogue: (s) => `${s.age} 歲的${s.player.name},有伴侶、${s.dependents} 個孩子、一間自己的家,而且保障完整。你的家庭經得起風雨。` },
  { id: 'sandwich', icon: '🥪', title: '三明治世代', rarity: '常見', blurb: '上有高堂、下有稚子,責任一肩扛。',
    check: (s) => cats(s).includes('care') && s.dependents > 0,
    epilogue: (s) => `${s.player.name}同時照顧父母與孩子,每一個決定都得先想到家人。你很累,但你撐起了整個家。` },
  { id: 'fighter', icon: '💪', title: '與病痛共存的堅強', rarity: '稀有', blurb: '你經歷了重病或失能,卻靠著保障與意志撐了過來。',
    check: (s) => alive(s) && (cats(s).includes('critical') || cats(s).includes('disability')) && nw(s) > 0,
    epilogue: (s) => `${s.player.name}經歷過重大傷病的打擊,收入中斷了好幾年。靠著${s.history.some((h) => h.payout >= 500000) ? '保險的給付' : '自己的積蓄'}與家人的陪伴,你撐了過來,淨資產仍有 ${wan(nw(s))}。` },
  { id: 'traveler', icon: '🌍', title: '自由旅人', rarity: '常見', blurb: '你把錢花在經驗上,人生因此更寬廣。',
    check: (s) => s.trips >= 3 && alive(s),
    epilogue: (s) => `${s.player.name}一生去了 ${s.trips} 次以上的旅行。比起豪宅名車,你更珍惜看過的風景。只要旅平險和預備金都在,這樣的人生一樣踏實。` },
  { id: 'emotional', icon: '🎢', title: '情緒投資人', rarity: '常見', blurb: '漲的時候追、跌的時候賣。',
    check: (s) => s.panicSells >= 2,
    epilogue: (s) => `${s.player.name}在市場下跌時多次恐慌賣出,錯過了後來的反彈。情緒是投資最大的敵人,紀律勝過預測。` },
  { id: 'broke', icon: '⛓️', title: '債務纏身', rarity: '常見', blurb: '一連串的意外與選擇,讓你一直在補洞。',
    check: (s) => nw(s) < 0 || s.history.filter((h) => h.borrowed > 0).length >= 5,
    epilogue: (s) => `${s.player.name}的人生有一大半時間在還債。意外與缺口讓現金不斷見底,淨資產只剩 ${wan(nw(s))}。好消息是:一切都來得及重新規劃。` },
  { id: 'tycoon', icon: '💎', title: '財富自由者', rarity: '稀有', blurb: '你的資產已經足夠,錢開始替你工作。',
    check: (s) => nw(s) >= Math.max(20000000, s.career.income * s.years * 1.5),
    epilogue: (s) => `${s.age} 歲的${s.player.name},淨資產超過 ${wan(nw(s))}。你不必再為生活焦慮,而且懂得用保險守住這一切。` },
  { id: 'career', icon: '🏆', title: '事業巔峰', rarity: '常見', blurb: '你在職場一路往上,收入遠遠超過起薪。',
    check: (s) => s.income >= s.career.income * 2.8,
    epilogue: (s) => `${s.player.name}的年收入成長到起薪的 ${(s.income / s.career.income).toFixed(1)} 倍。事業的成功帶來自由,也記得替這份收入加上保障。` },
  { id: 'lone', icon: '🐺', title: '獨行的富翁', rarity: '常見', blurb: '單身、自在、資產豐厚。',
    check: (s) => !s.partner && nw(s) >= 8000000,
    epilogue: (s) => `${s.player.name}一路單身,把人生過得自在。淨資產 ${wan(nw(s))},只要記得規劃長照與退休,就是理想的獨居生活。` },
  { id: 'homeowner', icon: '🏠', title: '安穩的屋主', rarity: '常見', blurb: '有一間自己的家,日子過得安穩。',
    check: (s) => !!s.house && prot(s) >= 0.6,
    epilogue: (s) => `${s.player.name}擁有自己的房子,保障也大致到位。雖然不是最亮眼的人生,卻很安穩。` },
  { id: 'steady', icon: '🌿', title: '平凡而踏實', rarity: '常見', blurb: '沒有大起大落,穩穩地過日子。',
    check: (s, sc) => sc.total >= 60,
    epilogue: (s) => `${s.player.name}的人生沒有太多戲劇性,但一步一步走得穩。淨資產 ${wan(nw(s))},這樣就很好。` },
  { id: 'wandering', icon: '🧭', title: '還在摸索的人', rarity: '常見', blurb: '人生還沒有答案,但你已經學到不少。',
    check: () => true,
    epilogue: (s) => `${s.player.name}的人生有起有落。回頭看,很多缺口其實可以早一點補上。下一局,也許會有不一樣的故事。` },
]

export function computeEnding(s, score = computeScore(s)) {
  const e = ENDINGS.find((x) => x.check(s, score))
  return { id: e.id, icon: e.icon, title: e.title, rarity: e.rarity, blurb: e.blurb, epilogue: e.epilogue(s, score) }
}
