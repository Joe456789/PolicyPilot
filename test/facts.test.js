import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { FACTS, factFor } from '../src/game/facts.js'
import { EVENT_DEFS, CHANCE_DEFS, MILESTONE_DEFS } from '../src/game/content.js'
import { MINOR_DEFS } from '../src/game/minor.js'
import { SELF_STAGES } from '../src/game/lifestages.js'

test('真實數據卡:每一條都有內容與出處,並且寫進資料來源文件', () => {
  const doc = fs.readFileSync(new URL('../docs/DATA_SOURCES.md', import.meta.url), 'utf8')
  for (const [id, f] of Object.entries(FACTS)) {
    assert.ok(f.text && f.source && f.icon, id)
    assert.match(f.text, /\d/, `${id} 要有具體數字`)
  }
  assert.ok(doc.includes('893.26') && doc.includes('81.27') && doc.includes('7.78'))
})

test('真實數據卡:對應的事件都存在,關鍵事件都有數據', () => {
  const src = fs.readFileSync(new URL('../src/game/facts.js', import.meta.url), 'utf8')
  const map = src.slice(src.indexOf('const BY_ID'), src.indexOf('export function factFor'))
  const ids = [...map.matchAll(/(\w+): '(\w+)'/g)]
  const known = new Set([...EVENT_DEFS, ...CHANCE_DEFS, ...MILESTONE_DEFS, ...MINOR_DEFS, ...SELF_STAGES].map((d) => d.id))
  for (const [, defId, factId] of ids) {
    assert.ok(known.has(defId), `找不到事件 ${defId}`)
    assert.ok(FACTS[factId], `找不到數據 ${factId}`)
  }
  for (const defId of ['cancer', 'flu', 'car_accident', 'ltc_self', 'death', 'jobloss', 'retire_plan']) {
    assert.ok(factFor({ defId }), defId)
  }
  assert.equal(factFor({ kind: 'market', defId: 'x', base: { ret: -0.3 } }), FACTS.tw_stock)
  assert.equal(factFor({ kind: 'market', defId: 'x', base: { ret: 0.2 } }), null)
  assert.equal(factFor({ defId: 'm_invoice' }), null)
})
