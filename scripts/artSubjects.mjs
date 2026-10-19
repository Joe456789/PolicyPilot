// 列出所有「需要插圖」的題材。每個題材 = { id, tier, prompt }。
// id 同時是檔名(public/art/<id>.webp)與遊戲裡查圖的鍵:
//   事件/機會/行情…用 defId(例:flu、crash、prop_wanhua)
//   成長篇卡片用 life_<卡片id>,有「出事版」的另有 life_<卡片id>_hit
//   結局用 ending_<id>,標題主視覺用 title_hero
import { EVENT_DEFS, CHANCE_DEFS, MARKET_DEFS, MILESTONE_DEFS, BONUS_DEFS } from '../src/game/content.js'
import { PROPERTIES } from '../src/game/properties.js'
import { ENDINGS } from '../src/game/endings.js'
import { SLOTS } from '../src/game/prologueCards.js'

export const STYLE = [
  'Flat vector illustration, soft pastel palette (mint green, warm cream, coral, sky blue, butter yellow), rounded friendly shapes,',
  'gentle lighting, clean uncluttered composition, 4:3 landscape, everyday Taiwan setting, diverse young characters with simple faces.',
  'Absolutely no text, no letters, no numbers, no logos, no watermark. Non-graphic and family friendly even for sad or risky themes.',
].join(' ')

const strip = (s) => String(s || '').replace(/[()（）【】「」『』]/g, ' ').replace(/\s+/g, ' ').trim()
const subject = (id, tier, what) => ({ id, tier, prompt: `${STYLE}\nScene: ${what}` })

// 成長篇的卡片:標題與內文可能是函式,用一個假的人生去呼叫
const fakeLife = { family: '一般家庭', familyBlurb: '', parentsInsured: false, style: '穩健型', bgId: 'normal', stats: { health: 90, study: 55, social: 50, finance: 50 }, flags: {}, cash: 100000, loan: 0 }
const call = (v, hit) => { try { return typeof v === 'function' ? v(fakeLife, hit) : v } catch { return '' } }

export function allSubjects() {
  const out = []
  for (const d of EVENT_DEFS) out.push(subject(d.id, 'core', `${strip(d.title)}. ${strip(d.story)}`))
  for (const d of MARKET_DEFS) out.push(subject(d.id, 'core', `A financial market moment in Taiwan: ${strip(d.title)}. ${strip(d.headline)}. Show mood with charts-free symbols such as arrows, buildings, crowds, weather.`))
  for (const d of MILESTONE_DEFS) out.push(subject(d.id, 'core', `${strip(d.title)}. ${strip(d.story)}`))
  for (const p of PROPERTIES) out.push(subject('prop_' + p.id, 'core', `A property in ${p.region}, Taiwan: ${p.name} (${p.kind}). ${strip(p.blurb)} Show the building and its neighbourhood.`))
  for (const e of ENDINGS) out.push(subject('ending_' + e.id, 'core', `Life ending portrait: ${e.title}. ${strip(e.blurb)}`))
  out.push(subject('title_hero', 'core', 'A cheerful 3D-board-game-inspired scene: a colourful city board with little buildings, dice, a shield-shaped umbrella protecting a small family, coins and tiny pawns. Warm and inviting key art.'))
  for (const d of CHANCE_DEFS) out.push(subject(d.id, 'all', `${strip(d.title)}. ${strip(d.story)}`))
  for (const d of BONUS_DEFS) out.push(subject(d.id, 'all', `${strip(d.title)}. ${strip(d.story)}`))
  for (const slot of SLOTS) {
    for (const c of slot.pool) {
      const hit = c.roll != null
      out.push(subject('life_' + c.id, 'all', `Childhood and youth story at age ${slot.age}: ${strip(call(c.title, false))}. ${strip(call(c.story, false))}`))
      if (hit) out.push(subject('life_' + c.id + '_hit', 'all', `Childhood and youth story at age ${slot.age}: ${strip(call(c.title, true))}. ${strip(call(c.story, true))}`))
    }
  }
  const seen = new Set()
  return out.filter((s) => s.id && !seen.has(s.id) && seen.add(s.id))
}
