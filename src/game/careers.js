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
  { id: 'rich', icon: '🏰', title: '富裕家庭', blurb: '家境優渥、沒有負債,但可能不太懂得節制。', cash: 800000, loan: 0, expenseRatio: 0.66, parentsSupport: false, insuredP: 0.9, weight: 5 },
  { id: 'tight', icon: '🌱', title: '清寒家庭', blurb: '背著學貸與家用,起步最辛苦,日後可能要扶養父母。', cash: 20000, loan: 450000, expenseRatio: 0.78, parentsSupport: true, insuredP: 0.25, weight: 25 },
  { id: 'normal', icon: '🏘️', title: '一般家庭', blurb: '有一點小積蓄,也有些學貸。', cash: 90000, loan: 200000, expenseRatio: 0.72, parentsSupport: false, insuredP: 0.55, weight: 45 },
  { id: 'comfy', icon: '🏡', title: '小康家庭', blurb: '家裡可以給點支持,沒有債務,但花費習慣較高。', cash: 300000, loan: 0, expenseRatio: 0.7, parentsSupport: false, insuredP: 0.8, weight: 25 },
]

export const STYLES = [
  { id: 'bold', icon: '🔥', title: '冒險型', blurb: '相信「富貴險中求」,愛追高風險。' },
  { id: 'steady', icon: '🧘', title: '穩健型', blurb: '重視安全感,凡事求穩。' },
  { id: 'social', icon: '🎉', title: '享樂型', blurb: '重視生活品質與人際,花錢大方。' },
]

export const LENGTHS = [
  { id: 'short', years: 12, title: '短局', blurb: '約 12 年(22 → 34 歲),適合快速體驗。' },
  { id: 'standard', years: 20, title: '標準', blurb: '約 20 年(22 → 42 歲),會經歷結婚、買房、育兒。' },
  { id: 'long', years: 30, title: '完整人生', blurb: '約 30 年(22 → 52 歲),連父母長照與退休規劃都會遇到。' },
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
