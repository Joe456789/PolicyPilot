import test from 'node:test'
import assert from 'node:assert/strict'
import { t, trDeep, setLang, getLang, moneyEn } from '../src/i18n.js'
import { wan } from '../src/game/format.js'

test('i18n:中文模式原樣輸出並代入變數;英文模式翻譯、代入、金額換成 NT$', () => {
  setLang('zh')
  assert.equal(t('你好 {name}', { name: '小明' }), '你好 小明')
  assert.equal(wan(2800000), '280 萬')
  setLang('en')
  assert.equal(getLang(), 'en')
  assert.equal(t('設定'), 'Settings')
  assert.equal(t('尚無翻譯的句子 {n}', { n: 3 }), '尚無翻譯的句子 3') // 找不到就退回中文
  assert.equal(wan(2800000), 'NT$2.8M')
  assert.equal(wan(-1200000), '-NT$1.2M')
  assert.equal(wan(50000), 'NT$50K')
  assert.equal(moneyEn(100000000), 'NT$100M')
  assert.deepEqual(trDeep({ a: '設定', b: ['關閉', 5], c: { d: 'x' } }), { a: 'Settings', b: ['Close', 5], c: { d: 'x' } })
  setLang('zh')
  assert.deepEqual(trDeep({ a: '設定' }), { a: '設定' })
})

import { execFileSync } from 'node:child_process'
import { createGame, roll, choose, endYear } from '../src/game/engine.js'

test('i18n:翻譯檢查腳本通過(所有 t() key 都有英文、佔位一致、資料字串齊全)', () => {
  const out = execFileSync('node', ['scripts/i18n-check.mjs'], { encoding: 'utf8' })
  assert.match(out, /通過/)
})

test('i18n:英文模式整局模擬,場景、選項、結果行與年度事件都沒有殘留中文', () => {
  const CJK = /[㐀-鿿]/
  setLang('en')
  try {
    const bad = new Set()
    const check = (where, x) => { if (typeof x === 'string' && CJK.test(x.replace(/玩家/g, ''))) bad.add(`${where}: ${x.slice(0, 40)}`) }
    for (const seed of [1, 2, 3, 4, 5, 6]) {
      let s = createGame({ name: 'Sam', career: ['office', 'sales', 'nurse', 'engineer', 'freelancer', 'teacher'][seed - 1], background: ['tight', 'normal', 'rich', 'biz', 'heritage', 'single'][seed - 1], style: '穩健型', length: 'short' }, seed)
      for (let i = 0; i < 150 && s.phase !== 'ended'; i++) {
        if (s.phase === 'plan') { s = roll(s); continue }
        if (s.phase === 'scene') {
          const sc = s.scene
          check('title', sc.title); check('story', sc.story); check('lesson', sc.lesson)
          sc.choices.forEach((c) => { check('label', c.label); check('hint', c.hint) })
          s = choose(s, seed % sc.choices.length, { stars: 2 })
          continue
        }
        if (s.phase === 'result') {
          s.scene.result.lines.forEach((l) => check('line', l.label))
          s = endYear(s)
          s.history.at(-1)?.events.forEach((e) => check('event', e.title))
        }
      }
    }
    assert.deepEqual([...bad].slice(0, 10), [])
  } finally { setLang('zh') }
})
