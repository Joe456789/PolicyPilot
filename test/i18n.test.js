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
