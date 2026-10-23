import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { TAIEX, taiexYear, histYearOf, HIST_STARTS, FIRST_YEAR, LAST_YEAR } from '../src/game/history.js'
import { createGame, roll, choose, endYear } from '../src/game/engine.js'
import { createMatch } from '../src/game/match.js'
import { factFor } from '../src/game/facts.js'

test('歷史行情:台股年底收盤算出的年報酬,和證交所、央行公布的漲跌幅一致', () => {
  // 證交所年報 / Fact Book、央行年報、媒體封關報導公布的全年漲跌幅(%)
  const reported = {
    2000: -43.85, 2001: 17.02, 2002: -19.79, 2003: 32.30, 2005: 6.66, 2008: -46.03, 2009: 78.34, 2010: 9.58,
    2011: -21.18, 2013: 11.85, 2014: 8.08, 2015: -10.41, 2016: 10.98, 2018: -8.60, 2019: 23.33, 2020: 22.80,
    2021: 23.66, 2022: -22.40, 2023: 26.83, 2024: 28.47, 2025: 25.73,
  }
  for (const [y, pct] of Object.entries(reported)) {
    const d = taiexYear(Number(y))
    assert.ok(Math.abs(d.ret * 100 - pct) < 0.02, `${y}:算出 ${(d.ret * 100).toFixed(2)}%,公布 ${pct}%`)
  }
  // 年份連續、每一年都有新聞
  TAIEX.forEach(([y, close, news], i) => {
    assert.ok(close > 0)
    if (i > 0) { assert.equal(y, TAIEX[i - 1][0] + 1); assert.ok(news.length > 3, `${y} 缺新聞`) }
  })
  assert.equal(taiexYear(FIRST_YEAR - 1), null) // 1999 只當基期
  assert.equal(taiexYear(LAST_YEAR + 1), null)
  const doc = fs.readFileSync(new URL('../docs/DATA_SOURCES.md', import.meta.url), 'utf8')
  assert.ok(doc.includes('4,591.22') && doc.includes('28,963.6'), '資料來源文件要記錄台股收盤')
})

function play(setup, seed, pick = 0) {
  let s = createGame(setup, seed)
  for (let i = 0; i < 400 && s.phase !== 'ended'; i++) {
    if (s.phase === 'plan') s = roll(s)
    else if (s.phase === 'scene') s = choose(s, Math.min(pick, s.scene.choices.length - 1), { stars: 2 })
    else if (s.phase === 'result') s = endYear(s)
  }
  return s
}

test('歷史行情:每一年的股市報酬都照台股真實漲跌,資料用完後回到模擬行情', () => {
  for (const { year } of HIST_STARTS) {
    for (const seed of [3, 11, 27]) {
      const s = play({ career: 'office', background: 'normal', style: '穩健型', length: 'long', market: { mode: 'history', start: year } }, seed)
      assert.deepEqual(s.market, { mode: 'history', start: year })
      s.history.forEach((h, i) => {
        const cal = year + i
        if (cal > LAST_YEAR) { assert.equal(h.calYear, null); return }
        assert.equal(h.calYear, cal)
        const r = taiexYear(cal).ret
        // 「行情避險卡」會讓那一年的跌幅減半,其餘年份必須和真實漲跌完全相同
        assert.ok(Math.abs(h.ret - r) < 1e-9 || Math.abs(h.ret - r * 0.5) < 1e-9, `${cal}:遊戲 ${h.ret},真實 ${r}`)
      })
    }
  }
})

test('歷史行情:同一個種子結果相同;沒有選歷史模式時 market 是 null', () => {
  const setup = { career: 'engineer', background: 'normal', style: '穩健型', length: 'standard', market: { mode: 'history', start: 2008 } }
  assert.deepEqual(play(setup, 42, 1).history.map((h) => h.netWorth), play(setup, 42, 1).history.map((h) => h.netWorth))
  assert.equal(createGame({ career: 'office', length: 'short' }, 1).market, null)
  assert.equal(createGame({ career: 'office', length: 'short', market: { mode: 'history', start: 1990 } }, 1).market, null)
})

test('歷史行情:行情格顯示當年真實新聞與收盤數據、不給 AI 改寫,電腦對手也走同一段歷史', () => {
  let found = 0
  for (let seed = 1; seed <= 40 && !found; seed++) {
    let s = createGame({ career: 'office', background: 'normal', style: '穩健型', length: 'short', market: { mode: 'history', start: 2008 } }, seed)
    assert.equal(histYearOf(s).year, 2008)
    for (let i = 0; i < 300 && s.phase !== 'ended'; i++) {
      if (s.phase === 'scene' && s.scene.kind === 'market') break
      if (s.phase === 'plan') s = roll(s)
      else if (s.phase === 'scene') s = choose(s, 0, { stars: 2 })
      else if (s.phase === 'result') s = endYear(s)
    }
    if (s.phase !== 'scene' || s.scene.kind !== 'market') continue
    found = seed
    const cal = histYearOf(s).year
    assert.match(s.scene.title, new RegExp(String(cal)))
    assert.equal(s.scene.aiable, false)
    assert.equal(s.scene.base.ret, taiexYear(cal).ret)
    const f = factFor(s.scene)
    assert.match(f.text, /\{close\}/)
    assert.equal(f.vars.year, cal)
  }
  assert.ok(found, '應該要有一局走到行情格')
  const m = createMatch(createGame({ career: 'office', length: 'short', market: { mode: 'history', start: 2014 } }, 9), 2, 9)
  m.players.forEach((p) => assert.deepEqual(p.s.market, { mode: 'history', start: 2014 }))
})
