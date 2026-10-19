import test from 'node:test'
import assert from 'node:assert/strict'
import { createGame, propAction, receiveCash, buyPropertyAt, endYear, netWorth } from '../src/game/engine.js'
import { tollOf, rentOf, propById } from '../src/game/properties.js'

const base = { name: 't', career: 'office', background: 'rich', style: 'steady', length: 'standard' }

test('拍賣成交後擁有地產;升級與投保各花 1 行動點,點數用完不能再做', () => {
  let s = createGame(base, 11)
  s = { ...s, cash: 20000000 }
  s = buyPropertyAt(s, 'wanhua', 'cash')
  assert.ok(s.props.wanhua)
  const cash0 = s.cash
  s = propAction(s, 'wanhua', 'upgrade')
  assert.equal(s.props.wanhua.level, 2)
  assert.ok(s.cash < cash0)
  s = propAction(s, 'wanhua', 'insure')
  assert.ok(s.props.wanhua.insured)
  assert.equal(s.ap, 0)
  s = propAction(s, 'wanhua', 'upgrade')
  assert.equal(s.props.wanhua.level, 2)
})

test('過路費是租金的 40%,收到後進入現金與年度紀錄', () => {
  let s = createGame(base, 12)
  const before = s.cash
  s = receiveCash(s, 50000)
  assert.equal(s.cash, before + 50000)
  assert.equal(s.year.tolls, 50000)
  const p = propById('wanhua')
  assert.ok(Math.abs(tollOf(p, 1) - rentOf(p, 1) * 0.4) <= 1000)
})

test('持有地產過一年:租金入帳、地產計入淨資產、沒有例外', () => {
  let s = createGame(base, 13)
  s = { ...s, cash: 20000000 }
  s = buyPropertyAt(s, 'qiqi', 'cash')
  const nw = netWorth(s)
  assert.ok(nw > 10000000)
  s = propAction(s, 'qiqi', 'sell')
  assert.equal(s.props.qiqi, undefined)
})
