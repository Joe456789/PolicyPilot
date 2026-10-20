import test from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { allSubjects } from '../scripts/artSubjects.mjs'
import { SLOTS } from '../src/game/prologueCards.js'
import { PROPERTIES } from '../src/game/properties.js'
import { ENDINGS } from '../src/game/endings.js'
import { EVENT_DEFS } from '../src/game/content.js'
import { sceneArtIds } from '../src/art.js'

test('插圖題材:id 不重複、涵蓋事件/地產/結局/成長篇,核心與完整兩個層級', () => {
  const all = allSubjects()
  const ids = new Set(all.map((s) => s.id))
  assert.equal(ids.size, all.length)
  assert.ok(all.length >= 150, `題材 ${all.length}`)
  assert.ok(all.filter((s) => s.tier === 'core').length >= 50)
  for (const d of EVENT_DEFS) assert.ok(ids.has(d.id), d.id)
  for (const p of PROPERTIES) assert.ok(ids.has('prop_' + p.id))
  for (const e of ENDINGS) assert.ok(ids.has('ending_' + e.id))
  assert.ok(ids.has('title_hero'))
  for (const slot of SLOTS) for (const c of slot.pool) {
    assert.ok(ids.has('life_' + c.id), c.id)
    assert.equal(ids.has('life_' + c.id + '_hit'), c.roll != null, c.id)
  }
  for (const s of all) assert.ok(/no text/i.test(s.prompt) && s.prompt.length > 80, s.id)
})

test('遊戲查圖的 id 與生成的 id 一致(含成長篇出事版)', () => {
  assert.deepEqual(sceneArtIds({ defId: 'flu' }), ['flu', 'flu'])
  assert.deepEqual(sceneArtIds({ defId: 'life_kid_sick', _hit: true }), ['life_kid_sick_hit', 'life_kid_sick'])
})

test('gen-art 腳本:--dry 不需要金鑰,--only 只列出符合的題材', () => {
  const out = execFileSync('node', ['scripts/gen-art.mjs', '--dry', '--force', '--only', 'prop_'], { encoding: 'utf8', env: { ...process.env, GEMINI_API_KEY: '' } })
  assert.match(out, /需要生成 8 個/)
  assert.match(out, /prop_wanhua/)
  assert.throws(() => execFileSync('node', ['scripts/gen-art.mjs', '--only', 'prop_'], { encoding: 'utf8', stdio: 'pipe', env: { ...process.env, GEMINI_API_KEY: '' } }))
})
