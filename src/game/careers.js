import { t } from '../i18n.js'

// 創角選項。所有人物與數字皆為教學用的虛構假設(NT$,年度)。
export const CAREERS = [
  { id: 'office', icon: '💼', title: '上班族', blurb: '企劃行政,穩定加薪,勞保健保齊全。', income: 560000, growth: 0.03, vol: 0.03, laborIns: true, risk: 'low' },
  { id: 'engineer', icon: '💻', title: '工程師', blurb: '起薪高、成長快,但工時長、壓力大。', income: 680000, growth: 0.045, vol: 0.04, laborIns: true, risk: 'low' },
  { id: 'nurse', icon: '🩺', title: '護理師', blurb: '輪班辛苦、有一定職災風險,職場穩定。', income: 620000, growth: 0.03, vol: 0.03, laborIns: true, risk: 'mid' },
  { id: 'sales', icon: '🤝', title: '業務員', blurb: '底薪加獎金,收入起伏大,常在外奔波。', income: 520000, growth: 0.04, vol: 0.18, laborIns: true, risk: 'mid' },
  { id: 'freelancer', icon: '🎨', title: '自由工作者', blurb: '接案設計,自由但收入不穩,沒有雇主保障。', income: 520000, growth: 0.035, vol: 0.22, laborIns: false, risk: 'mid' },
  { id: 'teacher', icon: '🏫', title: '公教人員', blurb: '收入穩定、加薪緩慢,職涯安全感高。', income: 540000, growth: 0.025, vol: 0.01, laborIns: true, risk: 'low' },
]

export const BACKGROUNDS = [
  { id: 'tight', icon: '🌱', title: '清寒家庭', blurb: '背著學貸與家用,起步最辛苦,日後可能要扶養父母。', cash: 20000, loan: 250000, expenseRatio: 0.78, parentsSupport: true, insuredP: 0.25, weight: 18, tuition: 1 },
  { id: 'single', icon: '🕊️', title: '單親家庭', blurb: '媽媽(或爸爸)一個人撐起家,你很早就懂事,也很懂得省。', cash: 40000, loan: 200000, expenseRatio: 0.76, parentsSupport: true, insuredP: 0.3, weight: 12, tuition: 1 },
  { id: 'normal', icon: '🏘️', title: '一般家庭', blurb: '有一點小積蓄,也有些學貸。', cash: 90000, loan: 80000, expenseRatio: 0.72, parentsSupport: false, insuredP: 0.55, weight: 30, tuition: 0.8 },
  { id: 'comfy', icon: '🏡', title: '小康家庭', blurb: '家裡可以給點支持,沒有債務,但花費習慣較高。', cash: 300000, loan: 0, expenseRatio: 0.7, parentsSupport: false, insuredP: 0.8, weight: 16, tuition: 0.3 },
  { id: 'pro', icon: '🩺', title: '專業世家', blurb: '父母是醫師或律師,教育資源豐富,對保險也很有概念。', cash: 600000, loan: 0, expenseRatio: 0.68, parentsSupport: false, insuredP: 0.95, weight: 6, tuition: 0, assets: { stock: 300000 } },
  { id: 'biz', icon: '🏭', title: '創業家庭', blurb: '家裡做生意,景氣好時很風光,不好時週轉很吃緊。', cash: 400000, loan: 300000, expenseRatio: 0.72, parentsSupport: false, insuredP: 0.45, weight: 8, tuition: 0.6, assets: { stock: 200000 } },
  { id: 'rich', icon: '🏰', title: '富二代', blurb: '家境優渥,有現金、股票,家裡還送了一間沒有房貸的房子,但可能不太懂得節制。', cash: 800000, loan: 0, expenseRatio: 0.66, parentsSupport: false, insuredP: 0.9, weight: 5, tuition: 0, assets: { deposit: 400000, stock: 800000 }, house: 8000000 },
  { id: 'heritage', icon: '🏚️', title: '祖產家庭', blurb: '家裡有一棟老房子,值不少錢,但現金很少。', cash: 100000, loan: 0, expenseRatio: 0.72, parentsSupport: false, insuredP: 0.5, weight: 5, tuition: 0.7, house: 6000000 },
]

export const ASPIRATIONS = [
  { id: 'wealth', icon: '💎', title: '財富自由', blurb: '我要靠聰明的資產配置,讓錢替我工作。' },
  { id: 'family', icon: '🏡', title: '幸福家庭', blurb: '結婚、生子、有一個溫暖的家。' },
  { id: 'career', icon: '🏆', title: '事業巔峰', blurb: '在職場一路往上爬,成為領域裡的佼佼者。' },
  { id: 'travel', icon: '🌍', title: '自由旅行', blurb: '用經驗而不是物質,豐富我的人生。' },
  { id: 'guardian', icon: '🛡️', title: '平安守護', blurb: '我要保護好自己與所愛的人,不被意外打倒。' },
]

const NAME_POOL = ['小明', '小美', '阿凱', '小薇', '阿傑', '雅婷', '志豪', '佳穎', '宗翰', '怡君', '冠宇', '品妍', '承恩', '子晴', '柏翰', '思穎', '建宏', '郁婷', '彥廷', '心怡', '家豪', '詩涵', '俊傑', '依婷', '宥辰', '語彤', '昱廷', '芷瑄', '浩然', '欣怡']
// 英文模式:名字經字典翻成英文名(同一個隨機索引,中文模式結果不變)
export const randomName = () => t(NAME_POOL[Math.floor(Math.random() * NAME_POOL.length)])

export const STYLES = [
  { id: 'bold', icon: '🔥', title: '冒險型', blurb: '相信「富貴險中求」,愛追高風險。' },
  { id: 'steady', icon: '🧘', title: '穩健型', blurb: '重視安全感,凡事求穩。' },
  { id: 'social', icon: '🎉', title: '享樂型', blurb: '重視生活品質與人際,花錢大方。' },
]

export const LENGTHS = [
  { id: 'short', years: 12, title: '短局', blurb: '約 12 年,適合快速體驗。' },
  { id: 'standard', years: 20, title: '標準', blurb: '約 20 年,會經歷結婚、買房、育兒等人生大事。' },
  { id: 'long', years: 30, title: '完整人生', blurb: '約 30 年,連父母長照與退休規劃都會遇到。' },
  { id: 'life40', years: 40, title: '四十年', blurb: '約 40 年,會看到孩子長大、上大學、獨立。' },
  { id: 'life60', years: 60, title: '一輩子', blurb: '約 60 年,從工作、育兒、退休一路到晚年照顧。' },
]

export const LOOKS = {
  skins: ['#f6d2b0', '#f3c9a5', '#e9b98f', '#d19b72'],
  hairs: ['#2b2118', '#5a3b2e', '#7a4b2a', '#c9c9c9', '#8b3a3a'],
  styles: [
    ['short', '短髮'],
    ['side', '旁分'],
    ['messy', '凌亂'],
    ['long', '長髮'],
    ['bob', '鮑伯'],
    ['ponytail', '馬尾'],
    ['bun', '包頭'],
  ],
  tops: ['#4f8cff', '#2eb67d', '#ff7aa2', '#9b6bff', '#ff9f43', '#37474f', '#e5484d'],
  extras: [
    ['none', '無'],
    ['glasses', '眼鏡'],
    ['headphones', '耳機'],
    ['beanie', '毛帽'],
  ],
}

export function defaultLook() {
  return { skin: LOOKS.skins[0], hair: LOOKS.hairs[0], style: 'short', top: LOOKS.tops[0], accent: '#d9f2e5', extra: 'none' }
}
