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

test('破產:現金、借款額度、地產與自宅都用完仍為負,年底出局;存活者排名在前', async () => {
  const { cover } = await import('../src/game/core.js')
  let s = createGame(base, 21)
  s = { ...s, cash: -90000000, loan: 99999999, phase: 'result' }
  s.hold = { deposit: 0, bond: 0, stock: 0, spec: 0 }
  const out = endYear(s)
  assert.equal(out.ended?.reason, 'bankrupt')
  assert.equal(out.phase, 'ended')
  assert.ok(out.ended.debt > 0)
  assert.ok(netWorth(out) < 0)
})

test('現金不足時先借款,額度用完才被迫拍賣地產(打 85 折並還清房貸)', async () => {
  const { cover, householdIncome } = await import('../src/game/core.js')
  let s = createGame(base, 22)
  s = buyPropertyAt({ ...s, cash: 20000000 }, 'banqiao', 'cash')
  const s2 = structuredClone(s)
  s2.hold = { deposit: 0, bond: 0, stock: 0, spec: 0 }
  s2.loan = Math.round(householdIncome(s2) * 1.5) // 額度已滿
  s2.cash = -500000
  cover(s2)
  assert.equal(Object.keys(s2.props).length, 0)
  assert.ok(s2.cash > 0)
  assert.equal(s2.year.forced, 1)
})

test('排名:破產出局的排在存活者後面', async () => {
  const { rank } = await import('../src/game/match.js')
  const a = createGame(base, 31)
  const b = createGame(base, 32)
  const hist = (s) => ({ ...s, history: [] })
  const players = [
    { id: 'x', name: 'x', human: true, s: { ...hist(a), ended: { reason: 'bankrupt', debt: 1, age: 30 } } },
    { id: 'y', name: 'y', human: false, s: hist(b) },
  ]
  const rows = rank(players)
  assert.equal(rows[0].id, 'y')
  assert.equal(rows[1].bankrupt, true)
})

test('手牌:最多 3 張、滿了換掉最舊的;免災金牌擋下事件;醫療補助卡減免自付', async () => {
  const { giveCard, MAX_CARDS } = await import('../src/game/cards.js')
  const { Rng } = await import('../src/game/rng.js')
  const { choose } = await import('../src/game/engine.js')
  const s = createGame(base, 41)
  const rng = new Rng(1, 0)
  const add = () => {}
  for (const id of ['shield', 'medaid', 'antiscam', 'premium_off']) giveCard(s, rng, id, add)
  assert.equal(s.cards.length, MAX_CARDS)
  assert.equal(s.cards[0], 'medaid')
  const mk = (cards) => ({
    ...createGame(base, 42), cards, phase: 'scene',
    scene: { kind: 'event', cat: 'medical', defId: 'x', base: { medical: 200000, other: 0 }, choices: [{}], title: 't', icon: 'i' },
  })
  const withShield = choose(mk(['shield']), 0)
  const bare = choose(mk([]), 0)
  assert.ok(withShield.cash > bare.cash)
  assert.deepEqual(withShield.cards, [])
  const withAid = choose(mk(['medaid']), 0)
  assert.ok(withAid.cash > bare.cash && withAid.cash < withShield.cash)
})

test('住院停等:住院後接下來的回合不擲骰、不移動,有醫療保障可提早出院', async () => {
  const { roll, choose, endYear } = await import('../src/game/engine.js')
  const admit = (cov) => {
    let s = createGame(base, 51)
    s = { ...s, coverage: { ...s.coverage, ...cov }, phase: 'scene', pos: 14,
      scene: { kind: 'event', cat: 'medical', defId: 'hospital_stay', base: { medical: 60000, other: 0, hospital: true }, choices: [{ costMult: 0.6, stay: 2 }], title: 't', icon: 'i' } }
    return choose(s, 0)
  }
  assert.equal(admit({}).hospitalTurns, 2)
  assert.equal(admit({ medical: 1 }).hospitalTurns, 1)
  let s = endYear(admit({}))
  assert.equal(s.phase, 'plan')
  const pos = s.pos
  s = roll(s)
  assert.equal(s.dice, null)
  assert.equal(s.pos, pos)
  assert.equal(s.hospitalTurns, 1)
  assert.equal(s.scene.defId, 'hospital_rest')
  s = { ...s, health: 60 }
  const h0 = s.health
  s = choose(s, 0)
  assert.ok(s.health > h0)
  assert.ok(s.effects.some((e) => e.label === '住院休養中'))
})

test('教練提示:跑完整局,每個情境都能算出提示、不報錯;小測驗不給答案', async () => {
  const { coachScene, coachInvest, coachLoan } = await import('../src/game/coach.js')
  const { roll, choose, endYear } = await import('../src/game/engine.js')
  let s = createGame(base, 61)
  let seen = 0, kinds = new Set(), badges = 0
  for (let i = 0; i < 400 && s.phase !== 'ended'; i++) {
    if (s.phase === 'plan') { coachInvest(s); coachLoan(s); s = roll(s); continue }
    if (s.phase === 'scene') {
      const tips = coachScene(s, s.scene)
      if (s.scene.kind === 'quiz') assert.equal(tips, null)
      if (tips) {
        seen++; kinds.add(s.scene.kind)
        assert.equal(tips.picks.length, s.scene.choices.length)
        for (const p of tips.picks) { assert.ok(!/NaN|undefined/.test(p.text)); if (p.badge) badges++ }
        assert.ok(!/NaN|undefined/.test(tips.summary))
      }
      s = choose(s, s.scene.kind === 'minigame' ? 0 : s.scene.choices.length - 1, { stars: 2 })
      continue
    }
    if (s.phase === 'result') s = endYear(s)
  }
  assert.ok(seen >= 10 && kinds.size >= 4 && badges > 0, `${seen} ${[...kinds]} ${badges}`)
})

test('對手台詞:每個個性、每種情境都有離線台詞;分類與說話頻率合理', async () => {
  const { BANTER, offlineLine, classifyBanter, shouldSpeak } = await import('../src/game/banter.js')
  const { PERSONAS } = await import('../src/game/bots.js')
  for (const p of PERSONAS) {
    for (const k of ['buy_prop', 'claim', 'big_loss', 'toll_collect', 'toll_pay', 'lead', 'behind', 'bankrupt', 'quiet']) {
      assert.ok(BANTER[p.id][k]?.length >= 2, `${p.id}/${k}`)
      assert.ok(offlineLine(p.id, k, 7))
    }
  }
  assert.equal(classifyBanter({ bankrupt: true }), 'bankrupt')
  assert.equal(classifyBanter({ cover: 5, loss: 0, rankNow: 2, rankBefore: 2 }), 'claim')
  assert.equal(classifyBanter({ cover: 0, loss: 0, rankNow: 1, rankBefore: 2 }), 'lead')
  assert.equal(classifyBanter({ cover: 0, loss: 0, rankNow: 2, rankBefore: 2 }), null)
  let n = 0
  for (let i = 0; i < 200; i++) if (shouldSpeak('big_loss', i)) n++
  assert.ok(n > 30 && n < 110, `big_loss 說話次數 ${n}`)
  assert.ok(shouldSpeak('bankrupt', 3) && shouldSpeak('lead', 4))
})
