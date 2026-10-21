import test from 'node:test'
import assert from 'node:assert/strict'
import { BOARD } from '../src/game/engine.js'
import { PROPERTIES } from '../src/game/properties.js'
import { MAP_PATH, MAP_SIZE, groundCells } from '../src/game/map.js'

test('地圖:路徑是封閉的一筆畫,每一步都只走一格,沒有重複的格子', () => {
  assert.equal(MAP_SIZE, BOARD.length)
  const seen = new Set()
  MAP_PATH.forEach((p, i) => {
    const q = MAP_PATH[(i + 1) % MAP_SIZE]
    assert.equal(Math.abs(p.c - q.c) + Math.abs(p.r - q.r), 1, `第 ${i} 格到下一格不相鄰`)
    assert.ok(!seen.has(`${p.c},${p.r}`), `第 ${i} 格座標重複`)
    seen.add(`${p.c},${p.r}`)
  })
})

test('地圖:不同路段至少隔一格(中間放得下街區與庭園)', () => {
  for (let i = 0; i < MAP_SIZE; i++) {
    for (let j = i + 1; j < MAP_SIZE; j++) {
      const gap = Math.min(j - i, MAP_SIZE - (j - i))
      if (gap <= 1) continue
      const d = Math.abs(MAP_PATH[i].c - MAP_PATH[j].c) + Math.abs(MAP_PATH[i].r - MAP_PATH[j].r)
      if (d === 1) assert.ok(gap <= 1, `第 ${i} 格與第 ${j} 格貼在一起`)
    }
  }
  const g = groundCells()
  assert.ok(g.inner.length > 10 && g.bay.length > 3)
})

test('棋盤:每個資產格的 tile 編號對得上,起點在第 0 格', () => {
  assert.equal(BOARD[0].type, 'start')
  for (const p of PROPERTIES) assert.equal(BOARD[p.tile].prop, p.id, p.id)
  assert.equal(BOARD.filter((b) => b.type === 'property').length, PROPERTIES.length)
})

import { createGame, roll, choose, canRollAgain, rollAgain, endYear } from '../src/game/engine.js'
import { AREAS, ownsArea, areaProps } from '../src/game/properties.js'
import { worldOf } from '../src/game/match.js'

test('100 格:北中南東 4 區依序排列,每區都有地產', () => {
  assert.equal(BOARD.length, 100)
  const order = [...new Set(BOARD.map((b) => b.area))]
  assert.deepEqual(order, AREAS.map((a) => a.id))
  for (const a of AREAS) assert.ok(areaProps(a.id).length >= 3, a.id)
})

test('兩顆骰子:點數 2~12;雙骰可以再擲一次且不連鎖', () => {
  let doubles = 0
  for (let seed = 1; seed < 200; seed++) {
    let s = roll(createGame({ name: 't', career: 'office', background: 'normal', style: 'steady', length: 'short' }, seed), {})
    if (s.dice == null) continue
    assert.ok(s.dice >= 2 && s.dice <= 12)
    assert.equal(s.dice, s.diceFaces[0] + s.diceFaces[1])
    assert.equal(s.extraRoll, s.diceFaces[0] === s.diceFaces[1])
    if (!s.extraRoll) continue
    doubles++
    s = choose(s, s.scene.choices.length - 1)
    assert.ok(canRollAgain(s))
    const pos = s.pos
    s = rollAgain(s, {})
    assert.equal(s.phase, 'scene')
    assert.ok(s.scene.bonusRoll)
    assert.equal(s.pos, (pos + s.dice) % BOARD.length)
    s = choose(s, s.scene.choices.length - 1)
    assert.ok(!canRollAgain(s))
    endYear(s)
  }
  assert.ok(doubles > 10, `雙骰次數 ${doubles}`)
})

test('區域加成:同區 3 處以上,過路費資訊標記 full', () => {
  const s = createGame({ name: 't', career: 'office', background: 'normal', style: 'steady', length: 'short' }, 1)
  const props = Object.fromEntries(areaProps('east').slice(0, 3).map((p) => [p.id, { level: 1, insured: false }]))
  assert.ok(ownsArea(props, 'east'), '同區 3 處就有加成')
  assert.ok(!ownsArea(Object.fromEntries(areaProps('east').slice(0, 2).map((p) => [p.id, { level: 1 }])), 'east'))
  const w = worldOf([{ name: 'a', s: { ...s, props } }])
  assert.ok(Object.values(w.owners).every((o) => o.full))
})
