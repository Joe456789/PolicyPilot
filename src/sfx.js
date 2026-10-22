// 音效:全部用 WebAudio 即時合成,不需要任何音檔。第一次使用者操作後才會發聲。
let ctx = null
let muted = false
let vol = 0.8
try { muted = localStorage.getItem('policypilot.muted') === '1' } catch { /* 忽略 */ }

function ac() {
  if (muted) return null
  if (!ctx) {
    try { ctx = new (window.AudioContext || window.webkitAudioContext)() } catch { return null }
  }
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}

function tone(freq, dur, { type = 'sine', gain = 0.12, delay = 0, slide = 0 } = {}) {
  const c = ac()
  if (!c) return
  const t0 = c.currentTime + delay
  const o = c.createOscillator()
  const g = c.createGain()
  o.type = type
  o.frequency.setValueAtTime(freq, t0)
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t0 + dur)
  g.gain.setValueAtTime(0.0001, t0)
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain * vol * 1.25), t0 + 0.01)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  o.connect(g).connect(c.destination)
  o.start(t0)
  o.stop(t0 + dur + 0.02)
}

function noise(dur, { gain = 0.1, delay = 0, hp = 800 } = {}) {
  const c = ac()
  if (!c) return
  const t0 = c.currentTime + delay
  const buf = c.createBuffer(1, Math.floor(c.sampleRate * dur), c.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length)
  const src = c.createBufferSource()
  src.buffer = buf
  const f = c.createBiquadFilter()
  f.type = 'highpass'
  f.frequency.value = hp
  const g = c.createGain()
  g.gain.value = gain * vol * 1.25
  src.connect(f).connect(g).connect(c.destination)
  src.start(t0)
}

export const sfx = {
  isMuted: () => muted,
  setVolume(v) { vol = Math.min(1, Math.max(0, Number(v) || 0)) },
  setMuted(v) {
    muted = v
    try { localStorage.setItem('policypilot.muted', v ? '1' : '0') } catch { /* 忽略 */ }
  },
  unlock() { ac() },
  dice() { for (let i = 0; i < 9; i++) noise(0.05, { gain: 0.12, delay: i * 0.13 + Math.random() * 0.03, hp: 1200 + Math.random() * 1500 }) },
  step() { tone(520 + Math.random() * 60, 0.06, { type: 'triangle', gain: 0.07 }) },
  card() { noise(0.18, { gain: 0.08, hp: 2500 }); tone(330, 0.12, { type: 'sine', gain: 0.05, delay: 0.05 }) },
  coin() { tone(988, 0.08, { type: 'square', gain: 0.05 }); tone(1319, 0.18, { type: 'square', gain: 0.05, delay: 0.07 }) },
  good() { [523, 659, 784].forEach((f, i) => tone(f, 0.16, { type: 'triangle', gain: 0.09, delay: i * 0.09 })) },
  bad() { tone(196, 0.35, { type: 'sawtooth', gain: 0.07, slide: -60 }); tone(147, 0.4, { type: 'sawtooth', gain: 0.06, delay: 0.14, slide: -40 }) },
  claim() { [659, 784, 988, 1319].forEach((f, i) => tone(f, 0.22, { type: 'triangle', gain: 0.1, delay: i * 0.1 })); noise(0.3, { gain: 0.05, delay: 0.35, hp: 4000 }) },
  quest() { [784, 988, 1175, 1568].forEach((f, i) => tone(f, 0.2, { type: 'sine', gain: 0.1, delay: i * 0.08 })) },
  fanfare() { [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => tone(f, 0.22, { type: 'triangle', gain: 0.1, delay: i * 0.12 })) },
  doubles() { [784, 988, 1175, 1568, 1976].forEach((f, i) => tone(f, 0.12, { type: 'square', gain: 0.045, delay: i * 0.06 })) },
  crash() { noise(0.5, { gain: 0.09, hp: 200 }); tone(220, 0.5, { type: 'sawtooth', gain: 0.06, slide: -120 }) },
  rally() { [392, 494, 587, 784].forEach((f, i) => tone(f, 0.14, { type: 'triangle', gain: 0.08, delay: i * 0.07 })) },
  stamp() { noise(0.08, { gain: 0.16, hp: 300 }); tone(110, 0.12, { type: 'sine', gain: 0.12 }) },
  click() { tone(660, 0.04, { type: 'sine', gain: 0.05 }) },
}
