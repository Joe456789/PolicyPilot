// 真實數據卡:在事件旁邊加一行「真實世界的台灣」,讓玩家知道這不只是遊戲設定。
// 每一條都是政府或公營機構公布的統計,標明年份與出處;數字更新時只要改這個檔案。
// 查證紀錄與連結見 docs/DATA_SOURCES.md。

export const FACTS = {
  cancer_clock: { icon: '⏱️', text: '台灣平均每 3 分 48 秒就有 1 人被診斷出癌症。', source: '國民健康署 2023 年癌症登記報告' },
  cancer_top: { icon: '📊', text: '癌症連續 43 年是國人十大死因第一名,2024 年有 54,032 人死於癌症。', source: '衛生福利部 2024 年死因統計' },
  pneumonia: { icon: '🫁', text: '肺炎是 2024 年國人十大死因的第三名。', source: '衛生福利部 2024 年死因統計' },
  lifespan: { icon: '🎂', text: '2025 年國人平均壽命 81.27 歲(男性 77.93 歲、女性 84.75 歲)。', source: '內政部 2025 年簡易生命表' },
  unhealthy: { icon: '🛏️', text: '國人一生中平均約有 7.78 年處於不健康、需要他人照顧的狀態。', source: '衛生福利部 2023 年健康平均餘命統計' },
  ltc_need: { icon: '🧓', text: '2024 年全台長期照顧需求人數約 89.2 萬人。', source: '衛生福利部' },
  traffic: { icon: '🚑', text: '2024 年道路交通事故有 2,950 人在 30 日內死亡,約 52.4 萬人受傷。', source: '交通部道路交通事故統計' },
  jobless: { icon: '📉', text: '2025 年平均失業率 3.35%,失業者平均要找 19.9 週才找到工作。', source: '行政院主計總處 2025 年人力資源調查' },
  aged: { icon: '👵', text: '2025 年底 65 歲以上人口占 20.06%,台灣正式進入超高齡社會。', source: '內政部人口統計' },
  pension: { icon: '🧮', text: '勞保老年年金約為「平均月投保薪資 × 年資 × 1.55%」:月投保 36,000 元、年資 30 年,每月約 16,740 元。', source: '勞動部勞工保險局' },
  quake: { icon: '🏚️', text: '住宅地震基本保險全損最高理賠 150 萬元,另有臨時住宿費 20 萬元;全國投保率約 39%。', source: '住宅地震保險基金(2025 年 11 月)' },
  fraud: { icon: '🚨', text: '2025 年全台詐騙財損 893.26 億元,受理 16.2 萬件。', source: '內政部警政署 165 打詐儀錶板' },
  tw_stock: { icon: '📉', text: '台股加權指數 2022 年全年下跌 22.4%。', source: '臺灣證券交易所(財經媒體整理)' },
}

// 事件 / 卡片 id → 要顯示的數據
const BY_ID = {
  // 人生事件
  cancer: 'cancer_clock', flu: 'pneumonia', fracture: 'traffic', car_accident: 'traffic', car_liability: 'traffic',
  chronic: 'unhealthy', disability: 'unhealthy', ltc_self: 'ltc_need', parent_care: 'ltc_need', death: 'lifespan',
  jobloss: 'jobless', house_damage: 'quake', retire_plan: 'pension',
  // 機會卡
  peer_story: 'cancer_clock', cancer_news: 'cancer_top', i_ci_vs_cancer: 'cancer_top', i_ltc: 'unhealthy',
  i_home_quake: 'quake', i_auto_excess: 'traffic', scam_call: 'fraud', card_seminar: 'fraud', r_mule: 'fraud',
  r_sequence: 'aged', mk_panic_sell: 'tw_stock',
  // 生活小事
  m_line: 'fraud', mr_fake_ticket: 'fraud', mr_line_hacked: 'fraud', mr_password: 'fraud',
  m_scrape: 'traffic', mr_typhoon: 'quake', mr_quake_shelf: 'quake', mi_ltc_1966: 'ltc_need',
  // 人生階段
  s_retire: 'pension', s_old: 'unhealthy', s_fifty: 'cancer_top',
}

// 這個場景要顯示哪一條真實數據(沒有就回傳 null)
export function factFor(scene) {
  if (!scene) return null
  const id = BY_ID[scene.defId]
  if (id) return FACTS[id]
  if (scene.kind === 'market' && (scene.base?.ret ?? 0) < 0) return FACTS.tw_stock
  return null
}
