// 所有給 Gemini 的提示詞集中在這裡,方便調整與寫進企劃書「應用技術說明」。
// 中文原版在 ./zh/prompts.js(逐字不變),英文版在 ./en/prompts.js;本檔依 lang('zh' | 'en')挑選。
// AI 的角色:劇情改寫、人生階段分析、學習回饋。不產生角色、不決定任何數字。
import * as zh from './zh/prompts.js'
import * as en from './en/prompts.js'

const pick = (lang) => (lang === 'en' ? en : zh)

export const SYSTEM = zh.SYSTEM
export const systemFor = (lang) => pick(lang).SYSTEM

// 每個建構函式都接受 { lang }(預設 'zh'),其餘參數與原本相同
export const narratePrompt = ({ lang, ...a }) => pick(lang).narratePrompt(a)
export const directorPrompt = ({ lang, ...a }) => pick(lang).directorPrompt(a)
export const askPrompt = ({ lang, ...a }) => pick(lang).askPrompt(a)
export const advisorPrompt = ({ lang, ...a }) => pick(lang).advisorPrompt(a)
export const stagePrompt = ({ lang, ...a }) => pick(lang).stagePrompt(a)
export const coachPrompt = ({ lang, ...a }) => pick(lang).coachPrompt(a)
export const banterPrompt = ({ lang, ...a }) => pick(lang).banterPrompt(a)
