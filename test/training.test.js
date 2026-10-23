import test from 'node:test'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { readSignals, newSession, clientTurn, scoreSession, offlineFeedback, clientFromGame, CLIENT_LIST, ROLEPLAY_TEXTS, MAX_TURNS } from '../src/game/roleplay.js'
import { FORMS, CONCEPTS, gradeTest, compareTests } from '../src/game/assess.js'
import { CASES, bestPlan, evaluatePlan, monthly } from '../src/game/cases.js'
import { demoTeam, summarize, learnerFromLocal, toCsv, MISTAKES } from '../src/game/team.js'
import { createGame, roll, choose, endYear } from '../src/game/engine.js'
import EN from '../src/locales/en/index.js'

const talk = (id, lines) => {
  let s = newSession(CLIENT_LIST.find((c) => c.id === id))
  for (const l of lines) s = clientTurn(s, l).session
  return s
}
const GOOD = [
  '恭喜您買房!方便先了解一下您的家庭狀況嗎?',
  '了解,那您目前的收入跟每個月可以放在保險的預算大概多少?',
  '您現在有哪些保險呢?房貸的年限跟條件是?',
  '我會建議先考慮房貸壽險,保額跟著房貸餘額遞減,萬一不幸可以直接清償房貸,家人不會被留下房貸。',
  '不是的,銀行不能把保險當成核貸條件,要不要買由您決定。另外公司團保離職就沒了,建議準備自己的實支實付醫療險,再加失能險補收入中斷。',
  '失能險是補「因為生病或意外不能工作」時中斷的收入,意外險只保意外。總結一下:房貸壽險、醫療險、失能險,您可以回去跟太太討論。',
]

test('對練訊號:分得出房貸壽險與壽險、否定句不算推銷、抓得到違規話術', () => {
  assert.deepEqual(readSignals('建議您考慮房貸壽險').products, ['mortgage'])
  assert.deepEqual(readSignals('房貸壽險和定期壽險都可以').products.sort(), ['life', 'mortgage'])
  assert.ok(readSignals('投資型保單不適合您').negated)
  assert.deepEqual(readSignals('這張保證獲利、穩賺不賠').flags, ['guarantee'])
  assert.ok(readSignals('今天簽才有優惠').flags.includes('pressure'))
  assert.ok(readSignals('一定要先買房貸壽險才能核貸喔').flags.includes('tiein'))
  assert.ok(readSignals('這個跟定存一樣啦').flags.includes('deposit'))
  assert.ok(readSignals('這張投資型保單保本').flags.includes('principal'))
  assert.deepEqual(readSignals('定存是保本的').flags, [], '談定存時說保本不算違規')
  // 如實揭露風險的說法不能被誤判成違規
  for (const ok of ['投資型保單不保證收益', '帳戶價值沒有保證報酬', '投資不是零風險', '不是沒有風險喔', 'Returns are not guaranteed']) assert.deepEqual(readSignals(ok).flags, [], ok)
  assert.ok(readSignals('Could you tell me about your family?').question)
  assert.deepEqual(readSignals('I guarantee a return, sign today').flags.sort(), ['guarantee', 'pressure'])
})

test('對練:好的對話拿高分、沒有警示;誤導施壓的對話分數很低並列出原因;同樣的對話分數一樣', () => {
  const good = scoreSession(talk('newhome', GOOD))
  assert.ok(good.total >= 85, `好的對話 ${good.total}`)
  assert.equal(good.flags.length, 0)
  assert.equal(good.revealed, 4)
  assert.deepEqual(good.unmet, [])
  assert.deepEqual(scoreSession(talk('newhome', GOOD)), good)

  const bad = talk('retiree', ['這個保單保證每個月撥回 6%,穩賺不賠,今天簽還有優惠喔!', '跟定存一樣保本啦,您放心。'])
  const sc = scoreSession(bad)
  assert.ok(sc.total <= 20, `誤導的對話 ${sc.total}`)
  assert.ok(sc.flags.includes('guarantee') && sc.flags.includes('pressure') && sc.flags.includes('deposit'))
  assert.equal(sc.parts.find((p) => p.id === 'compliance').score, 0)
  assert.ok(bad.trust < 30, '客戶的信任度會下降')
  const fb = offlineFeedback(bad, sc)
  assert.ok(fb.improve.length >= 1 && fb.betterLine.length > 10)
})

test('對練:客戶只有被問到才說、一次提一個疑慮,沒回答會追問;最多 6 句', () => {
  let s = newSession(CLIENT_LIST.find((c) => c.id === 'young'))
  let r = clientTurn(s, '你好')
  assert.equal(r.session.revealed.length, 0)
  r = clientTurn(r.session, '您平常怎麼通勤?')
  assert.deepEqual(r.session.revealed, ['commute'])
  r = clientTurn(r.session, '建議您先買醫療險和意外險')
  assert.equal(r.signals.objection, 'medical')
  r = clientTurn(r.session, '好喔')
  assert.match(r.reply, /還沒回答/)
  s = r.session
  for (let i = s.turn; i < MAX_TURNS; i++) s = clientTurn(s, '嗯').session
  assert.ok(s.done)
})

test('對練:用剛玩完的這一局當客戶;英文關鍵字也能探詢', () => {
  let g = createGame({ career: 'engineer', background: 'normal', style: '穩健型', length: 'short' }, 7)
  for (let i = 0; i < 60 && g.phase !== 'ended'; i++) {
    if (g.phase === 'plan') g = roll(g)
    else if (g.phase === 'scene') g = choose(g, 0, { stars: 2 })
    else if (g.phase === 'result') g = endYear(g)
  }
  const c = clientFromGame(g)
  assert.ok(c.facts.length >= 3 && c.needs.length >= 1)
  assert.equal(c.avoid[0], 'invlinked', '穩健型的客戶不適合推投資型保單')
  const en = talk('newhome', ['Could you tell me about your family?', 'What is your monthly budget and income?'])
  assert.deepEqual(en.revealed.sort(), ['family', 'income'])
})

test('對練:客戶設定與動態句子都有英文翻譯', () => {
  for (const c of CLIENT_LIST) {
    for (const s of [c.name, c.title, c.brief, c.goal, c.opening, c.risk, ...c.facts.flatMap((f) => [f.label, f.text]), ...c.needs.map((n) => n.label), ...Object.values(c.objections)]) {
      assert.ok(EN[s] !== undefined, `缺英文:${s}`)
    }
  }
  for (const s of ROLEPLAY_TEXTS) assert.ok(EN[s] !== undefined, `缺英文:${s}`)
})

test('前後測:兩份考卷考同樣的觀念;答對數與前後比較正確', () => {
  assert.deepEqual(FORMS.pre.map((q) => q.c), CONCEPTS.map((c) => c.id))
  assert.deepEqual(FORMS.post.map((q) => q.c), CONCEPTS.map((c) => c.id))
  for (const q of [...FORMS.pre, ...FORMS.post]) assert.ok(q.answer >= 0 && q.answer < q.options.length && q.why)
  const pre = gradeTest('pre', FORMS.pre.map(() => 0))
  const post = gradeTest('post', FORMS.post.map((q) => q.answer))
  assert.equal(post.correct, post.total)
  const cmp = compareTests(pre, post)
  assert.equal(cmp.gain, post.correct - pre.correct)
  assert.equal(cmp.concepts.length, CONCEPTS.length)
  assert.equal(compareTests(null, post), null)
})

test('情境挑戰:最佳配置在預算內、不含不適合的商品,而且比不買好;新手爸爸的最佳配置有房貸壽險', () => {
  for (const cs of CASES) {
    const best = bestPlan(cs)
    assert.ok(best.ev.premium <= cs.budget, cs.id)
    for (const id of cs.avoid) assert.ok(!(best.plan[id] > 0), `${cs.id} 不該買 ${id}`)
    assert.ok(best.ev.total > evaluatePlan(cs, {}).total)
    // 只買不適合的商品:扣適合度、通常也超出預算
    const bad = evaluatePlan(cs, { [cs.avoid[0]]: 2 })
    assert.ok(bad.total < best.ev.total && bad.avoided.length === 1)
    assert.equal(monthly(cs, {}), 0)
  }
  assert.equal(bestPlan(CASES.find((c) => c.id === 'newhome')).plan.mortgage, 1)
})

test('主管後台:示範資料固定、彙總一致、後測平均高於前測;本機紀錄與 CSV', () => {
  const team = demoTeam()
  assert.equal(team.length, 24)
  assert.deepEqual(demoTeam(), team)
  const all = summarize(team)
  assert.equal(all.n, 24)
  assert.ok(all.postAvg > all.preAvg)
  const a = summarize(team.filter((l) => l.branch === 'A 分行'))
  assert.equal(a.n, 8)
  assert.ok(a.games <= all.games)
  for (const m of all.mistakes) assert.ok(MISTAKES[m.id] && EN[m.label] !== undefined)
  assert.ok(all.mistakes.every((m, i, arr) => i === 0 || arr[i - 1].count >= m.count), '常見錯誤依次數排序')

  const train = {
    learner: '', cases: [{ total: 60 }],
    tests: [{ phase: 'post', correct: 6, total: 7, byConcept: { emergency: 1 } }, { phase: 'pre', correct: 3, total: 7, byConcept: { emergency: 0 } }],
    roleplay: [{ total: 70, parts: { discovery: 20, clarity: 15, compliance: 25, suitability: 10 }, flags: ['guarantee'] }],
  }
  const me = learnerFromLocal(train, { games: [{ mistakes: ['panic', 'gap:mortgage'] }] }, '小美')
  assert.equal(me.pre, 3 / 7)
  assert.equal(me.post, 6 / 7)
  assert.equal(me.rpBest, 70)
  assert.deepEqual(me.mistakes, { panic: 1, 'gap:mortgage': 1, 'flag:guarantee': 1 })
  const csv = toCsv(['名字', '分數'], [['小美, 林', 80], ['"阿明"', null]])
  assert.ok(csv.startsWith('﻿'))
  assert.ok(csv.includes('"小美, 林"') && csv.includes('"""阿明"""'))
})

test('對練 API:模擬模式回傳規則決定的那一句;缺資料回 400', async () => {
  const port = 18000 + Math.floor(Math.random() * 1000)
  const srv = spawn(process.execPath, ['server/index.js'], { env: { ...process.env, GEMINI_MOCK: '1', PORT: String(port) }, stdio: 'pipe' })
  try {
    for (let i = 0; i < 50; i++) {
      try { const h = await fetch(`http://127.0.0.1:${port}/api/health`); if (h.ok) break } catch { /* 還沒啟動 */ }
      await new Promise((r) => setTimeout(r, 100))
    }
    const post = (body) => fetch(`http://127.0.0.1:${port}/api/roleplay`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
    const ok = await (await post({ mode: 'reply', client: { name: '林先生', facts: ['x'] }, history: [], advisor: '你好', plan: '嗯…可以再說得具體一點嗎?', trust: 50 })).json()
    assert.equal(ok.ok, true)
    assert.match(ok.data.reply, /可以再說得具體一點/)
    const review = await (await post({ mode: 'review', client: { name: '林先生' }, history: [], score: { total: 80, parts: [], notes: [] } })).json()
    assert.ok(review.data.betterLine)
    assert.equal((await post({ mode: 'reply', advisor: '', plan: '' })).status, 400)
  } finally {
    srv.kill()
  }
})
