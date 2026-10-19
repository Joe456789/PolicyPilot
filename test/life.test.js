import test from 'node:test'
import assert from 'node:assert/strict'
import { createLife, beginLife, chooseLife, advanceLife, careerOptions, lifeToSetup, PROLOGUE_LENGTH } from '../src/game/prologue.js'
import { createGame, computeScore, evalQuests, QUEST_POOL, netWorth, roll, choose, endYear, BOARD } from '../src/game/engine.js'
import { PERSONAS, createBotGame, botFastForward } from '../src/game/bots.js'
import { createMatch, rank, finishMatch } from '../src/game/match.js'
import { BACKGROUNDS } from '../src/game/careers.js'

function runLife(seed, pick = () => 0) {
  let l = beginLife(createLife({ name: '測試', look: {}, style: '穩健型' }, seed))
  let guard = 0
  while (!l.done && guard++ < 50) {
    l = chooseLife(l, pick(l.scene))
    l = advanceLife(l)
  }
  return l
}

test('成長篇:每個種子都能走完 0~21 歲,並產出合法的成人起點', () => {
  for (let seed = 1; seed <= 60; seed++) {
    for (const pick of [() => 0, (sc) => sc.choices.length - 1]) {
      const l = runLife(seed, pick)
      assert.ok(l.done)
      assert.equal(l.log.length, PROLOGUE_LENGTH)
      assert.ok(l.cash >= 0 && l.loan >= 0)
      const opts = careerOptions(l)
      assert.ok(opts.length >= 1)
      const setup = lifeToSetup(l, opts[0].id, 'standard', 2)
      const s = createGame(setup, seed)
      assert.ok(Number.isFinite(s.income) && s.income > 300000)
      assert.ok(s.health >= 50 && s.health <= 100)
      assert.equal(s.player.parentsInsured, l.parentsInsured)
    }
  }
})

test('成長篇:家裡有沒有保險,會留下可觀察的差異', () => {
  let insuredLoan = 0, insuredN = 0, bareLoan = 0, bareN = 0
  for (let seed = 1; seed <= 200; seed++) {
    const l = runLife(seed)
    if (l.bgId === 'normal') {
      if (l.parentsInsured) { insuredLoan += l.loan; insuredN++ } else { bareLoan += l.loan; bareN++ }
    }
  }
  assert.ok(insuredN > 10 && bareN > 10)
  assert.ok(bareLoan / bareN > insuredLoan / insuredN)
})

test('出生抽籤會出現各種家境', () => {
  const seen = new Set()
  for (let seed = 1; seed <= 200; seed++) seen.add(createLife({ name: 'x', look: {} }, seed).bgId)
  assert.equal(seen.size, BACKGROUNDS.length)
})

test('任務:每局抽 3 個不同任務且至少 1 個與保險相關', () => {
  for (let seed = 1; seed <= 80; seed++) {
    const s = createGame({ name: 't', career: 'office', background: 'normal', style: 'steady', length: 'standard' }, seed)
    assert.equal(s.quests.length, 3)
    assert.equal(new Set(s.quests.map((q) => q.id)).size, 3)
    assert.ok(s.quests.some((q) => QUEST_POOL.find((d) => d.id === q.id).tag === 'ins'))
    for (const q of evalQuests(s)) assert.ok(q.value >= 0 && q.value <= q.target)
  }
})

test('電腦對手:每個個性都能完整走完,且個性確實造成不同結果', () => {
  const avg = {}
  for (const p of PERSONAS) {
    let tot = 0, prot = 0
    for (let seed = 1; seed <= 20; seed++) {
      const s = botFastForward(createBotGame(p, seed * 7 + 13, 'standard'), p)
      assert.equal(s.phase, 'ended')
      const sc = computeScore(s)
      assert.ok(sc.total >= 0 && sc.total <= 100)
      assert.ok(Number.isFinite(netWorth(s)))
      tot += sc.total
      prot += sc.parts.protection
    }
    avg[p.id] = { total: tot / 20, prot: prot / 20 }
  }
  assert.ok(avg.steady.prot > avg.allin.prot + 10, '穩健派的保障分數應明顯高於梭哈派')
})

test('對局:排名一致且可快轉到最後', () => {
  const human = createGame({ name: '我', career: 'engineer', background: 'normal', style: 'steady', length: 'short' }, 9)
  const m = createMatch(human, 3, 9)
  assert.equal(m.players.length, 4)
  assert.ok(m.players[0].human)
  const r0 = rank(m.players)
  assert.equal(r0.length, 4)
  const done = finishMatch(m.players)
  assert.ok(done.every((p) => p.human || p.s.phase === 'ended'))
  const r = rank(done.map((p) => (p.human ? { ...p, s: botFastForward(p.s, PERSONAS[0]) } : p)))
  assert.deepEqual(r.map((x) => x.rank), [1, 2, 3, 4])
})

test('棋盤上有小遊戲格,玩小遊戲會依星數給獎金並累積星數', () => {
  assert.ok(BOARD.filter((b) => b.type === 'minigame').length >= 3)
  let found = 0
  for (let seed = 1; seed <= 400 && found < 5; seed++) {
    let s = createGame({ name: 't', career: 'office', background: 'normal', style: 'steady', length: 'long' }, seed)
    for (let k = 0; k < 40 && s.phase !== 'ended'; k++) {
      s = roll(s)
      if (s.scene.kind === 'minigame') {
        const cash = s.cash
        const after = choose(s, 0, { stars: 3, note: 'x' })
        assert.equal(after.cash - cash, 90000)
        assert.equal(after.miniStars, s.miniStars + 3)
        assert.equal(after.miniPerfect, s.miniPerfect + 1)
        found++
        s = endYear(after)
      } else {
        s = endYear(choose(s, 0))
      }
    }
  }
  assert.ok(found >= 5, '應該常常遇到小遊戲格')
})

test('成長篇卡池:各年齡都有足夠多樣的卡,連鎖事件會依先前遭遇出現,人生標籤會帶進棋盤', async () => {
  const { SLOTS } = await import('../src/game/prologueCards.js')
  const { createGame } = await import('../src/game/engine.js')
  assert.ok(SLOTS.reduce((a, s) => a + s.pool.length, 0) >= 60)
  // 不同種子的路徑很不一樣
  const paths = new Set()
  const chain = { dad_rehab: 0, biz_result: 0, grandpa: 0, debt_talk: 0 }
  const tagsSeen = new Set()
  for (let seed = 1; seed <= 150; seed++) {
    let l = beginLife(createLife({ name: 't', look: {}, style: '穩健型' }, seed))
    let g = 0
    while (!l.done && g++ < 30) { l = chooseLife(l, seed % 2); l = advanceLife(l) }
    paths.add(l.used.join(','))
    for (const id of l.used) if (id in chain) chain[id]++
    l.tags.forEach((t) => tagsSeen.add(t))
    const game = createGame(lifeToSetup(l, careerOptions(l)[0].id, 'short', 0), seed)
    assert.deepEqual(game.tags, l.tags)
    assert.ok(Number.isFinite(game.cash) && Number.isFinite(game.income))
  }
  assert.ok(paths.size > 120, `路徑種類 ${paths.size}`)
  assert.ok(chain.dad_rehab > 0 && chain.biz_result > 0 && chain.grandpa > 0, JSON.stringify(chain))
  assert.ok(tagsSeen.size >= 8, [...tagsSeen].join())
  // 連鎖:沒有先前的遭遇,就不會出現後續事件
  for (let seed = 1; seed <= 60; seed++) {
    let l = beginLife(createLife({ name: 't', look: {}, style: 's' }, seed))
    let g = 0
    while (!l.done && g++ < 30) {
      if (l.used.includes('dad_rehab')) assert.ok(l.flags.parent_ill)
      if (l.used.includes('biz_result')) assert.ok(l.flags.parents_biz)
      l = chooseLife(l, 0); l = advanceLife(l)
    }
  }
})

test('開局年齡 30 / 40:起點合理、各家境各職業都能玩完整局,電腦對手同齡開局', async () => {
  const { adultStart } = await import('../src/game/starts.js')
  const { createGame, netWorth } = await import('../src/game/engine.js')
  const { PERSONAS, botFastForward, createBotGame } = await import('../src/game/bots.js')
  const { BACKGROUNDS, CAREERS } = await import('../src/game/careers.js')
  let partners = { 30: 0, 40: 0 }, houses = { 30: 0, 40: 0 }, n = 0
  for (const age of [30, 40]) {
    for (const bg of BACKGROUNDS) {
      for (const c of CAREERS) {
        for (const seed of [1, 2, 3]) {
          const st = adultStart({ age, bgId: bg.id, careerId: c.id, seed })
          const g = createGame({ name: 't', career: c.id, background: bg.id, style: '穩健型', length: 'short', start: { ...st, parentsInsured: null } }, seed)
          assert.equal(g.age, age)
          assert.ok(Number.isFinite(g.cash) && g.cash > 0 && Number.isFinite(g.income) && g.income >= c.income)
          assert.ok(Number.isFinite(netWorth(g)) && Number.isFinite(g.expense) && g.expense > 0)
          assert.equal(!!g.partner, st.partner)
          if (g.house) assert.ok(g.house.balance >= 0 && g.house.value > 0)
          n++
        }
      }
    }
  }
  for (const age of [30, 40]) {
    for (let seed = 1; seed <= 80; seed++) {
      const st = adultStart({ age, bgId: 'normal', careerId: 'office', seed })
      if (st.partner) partners[age]++
      if (st.houseObj) houses[age]++
    }
  }
  assert.ok(partners[40] > partners[30], `伴侶 ${JSON.stringify(partners)}`)
  assert.ok(houses[40] > houses[30], `房子 ${JSON.stringify(houses)}`)
  // 電腦對手同齡開局,而且能跑完整局
  for (const p of PERSONAS) {
    const s = botFastForward(createBotGameAt(p, 40), p, { owners: {} })
    assert.ok(s.phase === 'ended' && Number.isFinite(netWorth(s)))
    assert.equal(s.history[0].age, 40)
  }
  function createBotGameAt(p, age) { return createBotGame(p, 9, 'short', age) }
})
