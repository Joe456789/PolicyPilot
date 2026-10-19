// 可重現的亂數:同一個 seed 會產生同一局,方便錄影與除錯。
export function mulberry32(seed) {
  let a = seed >>> 0
  return function () {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// 連續的種子(1, 2, 3…)直接丟進 mulberry32 前幾個輸出會很像,先做一次位元混合。
function mix(x) {
  x = (x ^ 61) ^ (x >>> 16)
  x = (x + (x << 3)) >>> 0
  x ^= x >>> 4
  x = Math.imul(x, 0x27d4eb2d)
  x ^= x >>> 15
  return x >>> 0
}

// 把亂數器的狀態放進 game state,讓 state 可以被複製且仍保持可重現。
export class Rng {
  constructor(seed, n = 0) {
    this.seed = mix(seed >>> 0)
    this.n = n
    this._f = mulberry32(this.seed)
    for (let i = 0; i < n; i++) this._f()
  }
  next() {
    this.n++
    return this._f()
  }
  int(a, b) {
    return a + Math.floor(this.next() * (b - a + 1))
  }
  range(a, b) {
    return a + this.next() * (b - a)
  }
  pick(arr) {
    return arr[Math.floor(this.next() * arr.length)]
  }
  weighted(items, wf = (x) => x.w) {
    const ws = items.map(wf)
    const total = ws.reduce((s, x) => s + x, 0)
    let r = this.next() * total
    for (let i = 0; i < items.length; i++) {
      r -= ws[i]
      if (r <= 0) return items[i]
    }
    return items[items.length - 1]
  }
  normal(mean = 0, sd = 1) {
    const u = Math.max(this.next(), 1e-9)
    const v = this.next()
    return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
  }
}
