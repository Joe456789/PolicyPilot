// 資產格:棋盤上 8 個固定地點。可以買下來收租、升級、投保;別人走到要付過路費。
// 價格與租金為教學用的簡化數字,不代表真實行情。
export const PROPERTIES = [
  { id: 'wanhua', tile: 1, region: '台北', name: '萬華老公寓', kind: '公寓', icon: '🏚️', price: 2800000, yield: 0.055, vol: 0.08,
    risk: { fire: 0.018, quake: 0.015, flood: 0.012 }, blurb: '價格親民的老公寓,租客穩定,但屋齡高,火災與地震風險偏高。' },
  { id: 'banqiao', tile: 4, region: '新北', name: '板橋停車位', kind: '車位', icon: '🅿️', price: 800000, yield: 0.06, vol: 0.05,
    risk: { fire: 0.006, quake: 0.006, flood: 0.018 }, blurb: '門檻最低的資產,租金穩定,地下停車場要留意淹水。' },
  { id: 'qingpu', tile: 8, region: '桃園', name: '青埔店面', kind: '店面', icon: '🏪', price: 4500000, yield: 0.05, vol: 0.12,
    risk: { fire: 0.018, quake: 0.012, flood: 0.009 }, blurb: '商圈新興、租金成長快,景氣差時店家可能退租。' },
  { id: 'zhubei', tile: 12, region: '新竹', name: '竹北新大樓', kind: '大樓', icon: '🏢', price: 6500000, yield: 0.04, vol: 0.06,
    risk: { fire: 0.006, quake: 0.015, flood: 0.006 }, blurb: '新建大樓,管理良好、風險低,但租金報酬率偏低。' },
  { id: 'qiqi', tile: 15, region: '台中', name: '七期豪宅', kind: '豪宅', icon: '🏙️', price: 15000000, yield: 0.035, vol: 0.1,
    risk: { fire: 0.006, quake: 0.012, flood: 0.006 }, blurb: '高總價、高門檻的豪宅,增值潛力大,但租金報酬率最低。' },
  { id: 'tainan', tile: 19, region: '台南', name: '古都民宿', kind: '民宿', icon: '🏡', price: 3800000, yield: 0.07, vol: 0.25,
    risk: { fire: 0.015, quake: 0.018, flood: 0.018 }, blurb: '旅遊旺季租金很高,淡季客人少,收入起伏大。' },
  { id: 'kaohsiung', tile: 22, region: '高雄', name: '港邊倉庫', kind: '倉庫', icon: '🏭', price: 5200000, yield: 0.055, vol: 0.1,
    risk: { fire: 0.018, quake: 0.012, flood: 0.024 }, blurb: '物流需求穩定,但靠近港口,淹水與颱風的影響大。' },
  { id: 'hualien', tile: 24, region: '花蓮', name: '花蓮海景民宿', kind: '民宿', icon: '🌊', price: 4200000, yield: 0.065, vol: 0.2,
    risk: { fire: 0.009, quake: 0.03, flood: 0.012 }, blurb: '風景很美、租金不錯,但位在地震與颱風都頻繁的地區。' },
]

export const LEVELS = [
  null,
  { name: '基本', rentX: 1, valueX: 1, upgrade: 0 },
  { name: '整修翻新', rentX: 1.5, valueX: 1.25, upgrade: 0.25 },
  { name: '頂級經營', rentX: 2.2, valueX: 1.6, upgrade: 0.45 },
]

export const propById = (id) => PROPERTIES.find((p) => p.id === id)
export const propByTile = (tile) => PROPERTIES.find((p) => p.tile === tile)

export const baseRent = (p) => Math.round((p.price * p.yield) / 1000) * 1000
export const rentOf = (p, level) => Math.round((baseRent(p) * LEVELS[level].rentX) / 1000) * 1000
export const tollOf = (p, level) => Math.round((rentOf(p, level) * 0.4) / 1000) * 1000
export const upgradeCost = (p, level) => (level >= 3 ? 0 : Math.round((p.price * LEVELS[level + 1].upgrade) / 1000) * 1000)
export const hazardTotal = (p) => p.risk.fire + p.risk.quake + p.risk.flood
export const propPremium = (value) => Math.round((value * 0.004) / 100) * 100
export const mortgagePayment = (balance, rate = 0.03, years = 15) => Math.round((balance * rate) / (1 - Math.pow(1 + rate, -years)))

export const RISK_NAME = { fire: '火災', quake: '地震', flood: '淹水' }
const NEWS = {
  fire: ['附近的老舊電線頻傳走火,消防局加強宣導。', '社區剛發生一起小型火警,所幸沒有擴大。'],
  quake: ['這一帶位於活動斷層附近,最近地震頻繁。', '地質專家提醒,這個區域的土壤較容易液化。'],
  flood: ['氣象局預報雨量偏多,這裡是淹水潛勢區。', '去年豪雨時,附近街道積水不退。'],
  good: ['附近新捷運站動工,租客需求看漲。', '這一區新設了大型商場,人潮增加。', '政府公布都更計畫,地段受到關注。'],
  calm: ['這個區域近來平靜,租金與行情都沒有太大變化。', '附近住戶反映生活機能良好。'],
}
export function localNews(p, rnd) {
  const hz = Object.entries(p.risk).sort((a, b) => b[1] - a[1])[0][0]
  const pool = rnd < 0.4 ? NEWS[hz] : rnd < 0.7 ? NEWS.good : NEWS.calm
  return pool[Math.floor((rnd * 997) % pool.length)]
}
