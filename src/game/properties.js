// 資產格:棋盤上 28 個固定地點,分屬北、中、南、東 4 區;同一區擁有 3 處以上,租金與過路費 ×1.5。可以買下來收租、升級、投保;別人走到要付過路費。
// 價格與租金為教學用的簡化數字,不代表真實行情。
export const PROPERTIES = [
  { id: 'wanhua', area: 'north', region: '台北', name: '萬華老公寓', kind: '公寓', icon: '🏚️', price: 2800000, yield: 0.055, vol: 0.08,
    risk: { fire: 0.018, quake: 0.015, flood: 0.012 }, blurb: '價格親民的老公寓,租客穩定,但屋齡高,火災與地震風險偏高。' },
  { id: 'banqiao', area: 'north', region: '新北', name: '板橋停車位', kind: '車位', icon: '🅿️', price: 800000, yield: 0.06, vol: 0.05,
    risk: { fire: 0.006, quake: 0.006, flood: 0.018 }, blurb: '門檻最低的資產,租金穩定,地下停車場要留意淹水。' },
  { id: 'qingpu', area: 'north', region: '桃園', name: '青埔店面', kind: '店面', icon: '🏪', price: 4500000, yield: 0.05, vol: 0.12,
    risk: { fire: 0.018, quake: 0.012, flood: 0.009 }, blurb: '商圈新興、租金成長快,景氣差時店家可能退租。' },
  { id: 'zhubei', area: 'north', region: '新竹', name: '竹北新大樓', kind: '大樓', icon: '🏢', price: 6500000, yield: 0.04, vol: 0.06,
    risk: { fire: 0.006, quake: 0.015, flood: 0.006 }, blurb: '新建大樓,管理良好、風險低,但租金報酬率偏低。' },
  { id: 'qiqi', area: 'central', region: '台中', name: '七期豪宅', kind: '豪宅', icon: '🏙️', price: 15000000, yield: 0.035, vol: 0.1,
    risk: { fire: 0.006, quake: 0.012, flood: 0.006 }, blurb: '高總價、高門檻的豪宅,增值潛力大,但租金報酬率最低。' },
  { id: 'tainan', area: 'south', region: '台南', name: '古都民宿', kind: '民宿', icon: '🏡', price: 3800000, yield: 0.07, vol: 0.25,
    risk: { fire: 0.015, quake: 0.018, flood: 0.018 }, blurb: '旅遊旺季租金很高,淡季客人少,收入起伏大。' },
  { id: 'kaohsiung', area: 'south', region: '高雄', name: '港邊倉庫', kind: '倉庫', icon: '🏭', price: 5200000, yield: 0.055, vol: 0.1,
    risk: { fire: 0.018, quake: 0.012, flood: 0.024 }, blurb: '物流需求穩定,但靠近港口,淹水與颱風的影響大。' },
  { id: 'hualien', area: 'east', region: '花蓮', name: '花蓮海景民宿', kind: '民宿', icon: '🌊', price: 4200000, yield: 0.065, vol: 0.2,
    risk: { fire: 0.009, quake: 0.03, flood: 0.012 }, blurb: '風景很美、租金不錯,但位在地震與颱風都頻繁的地區。' },
  { id: 'tamsui', area: 'north', region: '新北', name: '淡水河岸套房', kind: '套房', icon: '🌇', price: 3200000, yield: 0.05, vol: 0.07,
    risk: { fire: 0.009, quake: 0.012, flood: 0.018 }, blurb: '夕陽河景的小套房,租客以上班族為主,但河岸低窪處颱風天要小心淹水。' },
  { id: 'yilan', area: 'east', region: '宜蘭', name: '田園農舍', kind: '農舍', icon: '🌾', price: 2400000, yield: 0.045, vol: 0.1,
    risk: { fire: 0.012, quake: 0.018, flood: 0.018 }, blurb: '空氣好、價格親民的農舍,適合長期持有,但離市區遠,租客不好找。' },
  { id: 'chiayi', area: 'south', region: '嘉義', name: '檜意老街店面', kind: '店面', icon: '🏮', price: 3600000, yield: 0.058, vol: 0.14,
    risk: { fire: 0.021, quake: 0.018, flood: 0.006 }, blurb: '觀光老街上的木造店面,人潮帶來租金,但木造建築的火災風險高。' },
  { id: 'kenting', area: 'south', region: '屏東', name: '墾丁度假公寓', kind: '度假屋', icon: '🏖️', price: 5800000, yield: 0.068, vol: 0.25,
    risk: { fire: 0.009, quake: 0.015, flood: 0.024 }, blurb: '旺季一房難求、淡季門可羅雀,颱風來時損失也大。' },
  { id: 'xinyi', area: 'north', region: '台北', name: '信義區小辦公室', kind: '辦公室', icon: '🏙️', price: 9800000, yield: 0.038, vol: 0.06,
    risk: { fire: 0.006, quake: 0.015, flood: 0.003 }, blurb: '台北最貴的商業區,租客是新創與外商,租金穩定但報酬率低。' },
  { id: 'keelung', area: 'north', region: '基隆', name: '基隆港邊公寓', kind: '公寓', icon: '⚓', price: 2200000, yield: 0.06, vol: 0.08,
    risk: { fire: 0.015, quake: 0.012, flood: 0.021 }, blurb: '房價親民、靠近港口與夜市,但多雨潮濕,淹水與颱風要多注意。' },
  { id: 'hsinchu', area: 'north', region: '新竹', name: '竹科工程師套房', kind: '套房', icon: '🔬', price: 3600000, yield: 0.052, vol: 0.08,
    risk: { fire: 0.009, quake: 0.015, flood: 0.006 }, blurb: '租給科學園區的工程師,需求穩定,但房價已經不便宜。' },
  { id: 'miaoli', area: 'central', region: '苗栗', name: '三義木雕街店面', kind: '店面', icon: '🪵', price: 2600000, yield: 0.06, vol: 0.16,
    risk: { fire: 0.021, quake: 0.018, flood: 0.006 }, blurb: '觀光客假日湧入,平日冷清;木雕店面要特別小心火災。' },
  { id: 'fengjia', area: 'central', region: '台中', name: '逢甲夜市攤位', kind: '店面', icon: '🍢', price: 3400000, yield: 0.07, vol: 0.18,
    risk: { fire: 0.021, quake: 0.012, flood: 0.009 }, blurb: '人潮最旺的夜市之一,租金高,但景氣與疫情一來就大受影響。' },
  { id: 'changhua', area: 'central', region: '彰化', name: '鹿港老街民宿', kind: '民宿', icon: '🏮', price: 2900000, yield: 0.058, vol: 0.2,
    risk: { fire: 0.018, quake: 0.015, flood: 0.009 }, blurb: '古色古香的老街民宿,節慶時一房難求,老房子要留意火災。' },
  { id: 'nantou', area: 'central', region: '南投', name: '日月潭景觀民宿', kind: '民宿', icon: '⛰️', price: 4600000, yield: 0.065, vol: 0.22,
    risk: { fire: 0.009, quake: 0.03, flood: 0.012 }, blurb: '湖光山色吸引遊客,但位在山區,地震與土石流風險高。' },
  { id: 'yunlin', area: 'central', region: '雲林', name: '斗六透天厝', kind: '透天', icon: '🏘️', price: 1900000, yield: 0.05, vol: 0.06,
    risk: { fire: 0.012, quake: 0.015, flood: 0.015 }, blurb: '價格最親民的透天厝之一,租客穩定但租金不高。' },
  { id: 'anping', area: 'south', region: '台南', name: '安平海景公寓', kind: '公寓', icon: '🌅', price: 4000000, yield: 0.055, vol: 0.12,
    risk: { fire: 0.009, quake: 0.015, flood: 0.018 }, blurb: '看得到夕陽的海景公寓,觀光客愛,颱風季要小心。' },
  { id: 'yaxin', area: 'south', region: '高雄', name: '亞洲新灣區大樓', kind: '大樓', icon: '🌉', price: 7200000, yield: 0.04, vol: 0.08,
    risk: { fire: 0.006, quake: 0.012, flood: 0.012 }, blurb: '高雄新地標旁的高樓,增值潛力好,租金報酬率普通。' },
  { id: 'pingtung', area: 'south', region: '屏東', name: '屏東農場', kind: '農地', icon: '🍍', price: 1600000, yield: 0.045, vol: 0.15,
    risk: { fire: 0.006, quake: 0.009, flood: 0.03 }, blurb: '出租給農友種鳳梨,門檻低,但颱風豪雨一來收成就泡湯。' },
  { id: 'penghu', area: 'east', region: '澎湖', name: '澎湖海景民宿', kind: '民宿', icon: '🏝️', price: 3600000, yield: 0.075, vol: 0.28,
    risk: { fire: 0.009, quake: 0.006, flood: 0.024 }, blurb: '夏天旺季收入很好,冬天東北季風一吹就沒客人。' },
  { id: 'kinmen', area: 'east', region: '金門', name: '金門老洋樓', kind: '老屋', icon: '🏛️', price: 3000000, yield: 0.055, vol: 0.14,
    risk: { fire: 0.018, quake: 0.006, flood: 0.009 }, blurb: '修復後的閩式洋樓,適合經營文化旅宿,維護成本不低。' },
  { id: 'liuqiu', area: 'south', region: '屏東', name: '小琉球潛水店', kind: '店面', icon: '🐢', price: 2400000, yield: 0.08, vol: 0.3,
    risk: { fire: 0.009, quake: 0.006, flood: 0.021 }, blurb: '看海龜的潛水客絡繹不絕,報酬率高,但天候不好就停業。' },
  { id: 'luodong', area: 'east', region: '宜蘭', name: '羅東夜市店面', kind: '店面', icon: '🥟', price: 3100000, yield: 0.062, vol: 0.14,
    risk: { fire: 0.018, quake: 0.018, flood: 0.012 }, blurb: '宜蘭最熱鬧的夜市,週末人潮多,颱風與地震都要小心。' },
  { id: 'taitung', area: 'east', region: '台東', name: '池上稻田民宿', kind: '民宿', icon: '🌾', price: 2700000, yield: 0.06, vol: 0.2,
    risk: { fire: 0.009, quake: 0.027, flood: 0.012 }, blurb: '金色稻浪的度假民宿,節慶時滿房,但位在地震帶上。' },
]

export const LEVELS = [
  null,
  { name: '基本', rentX: 1, valueX: 1, upgrade: 0 },
  { name: '整修翻新', rentX: 1.5, valueX: 1.25, upgrade: 0.25 },
  { name: '頂級經營', rentX: 2.2, valueX: 1.6, upgrade: 0.45 },
]

export const propById = (id) => PROPERTIES.find((p) => p.id === id)
export const propByTile = (tile) => PROPERTIES.find((p) => p.tile === tile)

// ---------- 區域 ----------
// 北、中、南、東(含離島)四區,棋盤依這個順序環島。
export const AREAS = [
  { id: 'north', name: '北部', color: '#d9534f' },
  { id: 'central', name: '中部', color: '#d4a72c' },
  { id: 'south', name: '南部', color: '#2aa198' },
  { id: 'east', name: '東部與離島', color: '#7b61d1' },
]
export const AREA_BONUS = 1.5
export const AREA_NEED = 3 // 同一區擁有 3 處以上,這一區的租金與過路費 ×1.5
export const areaById = (id) => AREAS.find((a) => a.id === id)
export const areaProps = (area) => PROPERTIES.filter((p) => p.area === area)
export const areaCount = (props, area) => areaProps(area).filter((p) => props && props[p.id]).length
// 這位玩家在該區是否已擁有 3 處以上(props:玩家的 s.props)
export const ownsArea = (props, area) => areaCount(props, area) >= AREA_NEED
export const areaMult = (props, p) => (ownsArea(props, p.area) ? AREA_BONUS : 1)

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
