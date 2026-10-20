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
