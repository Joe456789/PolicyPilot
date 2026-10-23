// 題庫(內容資料庫):依金融主題分檔,遊戲啟動時合併進各個題庫。
//   市場波動 market.js、資產配置 allocation.js、風險管理 risk.js、保險保障 insurance.js、銀行通路 bank.js
// 每一筆都帶 theme,結算時可以統計玩家接觸到哪些主題。
import market from './market.js'
import allocation from './allocation.js'
import risk from './risk.js'
import insurance from './insurance.js'
import bank from './bank.js'

// 新主題加在最後,舊題目的編號(圖鑑 id)才不會變
export const THEMES = [market, allocation, risk, insurance, bank]
const tag = (key) => THEMES.flatMap((th) => (th[key] || []).map((d) => ({ ...d, theme: th.theme })))
export const DB = {
  markets: tag('markets'),
  chances: tag('chances'),
  minors: tag('minors'),
  quizzes: tag('quizzes'),
  tips: tag('tips'),
}
export const THEME_NAME = { market: '市場波動', allocation: '資產配置', risk: '風險管理', insurance: '保險保障', bank: '銀行通路' } // i18n-ignore:由呼叫端 t()
