// 3D 棋盤場景(three.js)。全部由程式生成,沒有任何外部圖檔。
// 對外介面:setPlayers / moveToken / rollDice / focusPlayer / setActiveTile / dispose
import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'

const N = 28
const S = 2 // 一格的邊長

const TYPE_COLOR = {
  start: 0x00915a, event: 0xff6b57, chance: 0xf97316, market: 0x3b82f6, bonus: 0xf5b301,
  shop: 0x0ea5e9, milestone: 0x14b8a6, advisor: 0x8b5cf6, tax: 0x64748b, rest: 0x84cc16,
  hospital: 0xec4899, bank: 0x0d9488,
}

// 與 2D 棋盤相同的環形座標(8x8 外圈 28 格)
export function tileCoord(i) {
  if (i <= 7) return { r: 0, c: i }
  if (i <= 13) return { r: i - 7, c: 7 }
  if (i <= 21) return { r: 7, c: 21 - i }
  return { r: 28 - i, c: 0 }
}
const tileXZ = (i) => {
  const { r, c } = tileCoord(i)
  return new THREE.Vector3((c - 3.5) * S, 0.5, (r - 3.5) * S)
}

const ease = {
  inOut: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  out: (t) => 1 - Math.pow(1 - t, 3),
}

function mulberry(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function canvasTex(w, h, draw) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  draw(c.getContext('2d'), w, h)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  return tex
}

export class BoardScene {
  constructor(container, board) {
    this.container = container
    this.board = board
    this.tweens = []
    this.tokens = []
    this.disposed = false
    this.clock = new THREE.Clock()
    this.orbit = { az: 0.0, pol: 0.78, dist: 33, tAz: 0, tPol: 0.78, tDist: 33 }
    this.camTarget = new THREE.Vector3()
    this.camTargetGoal = new THREE.Vector3()
    this.focusBlend = 0.08

    const w = container.clientWidth || 800
    const h = container.clientHeight || 600
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    renderer.setSize(w, h)
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.05
    container.appendChild(renderer.domElement)
    renderer.domElement.style.display = 'block'
    renderer.domElement.style.touchAction = 'none'
    this.renderer = renderer

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0xdff3e8)
    scene.fog = new THREE.Fog(0xdff3e8, 55, 120)
    this.scene = scene

    this.camera = new THREE.PerspectiveCamera(38, w / h, 0.1, 200)
    this.buildLights()
    this.buildWorld()
    this.buildDice()
    this.bindInput()

    this.ro = new ResizeObserver(() => this.resize())
    this.ro.observe(container)
    this.resize()
    this.loop = this.loop.bind(this)
    this.raf = requestAnimationFrame(this.loop)
  }

  // ---------- 建構 ----------
  buildLights() {
    const { scene } = this
    scene.add(new THREE.HemisphereLight(0xffffff, 0xb7d9c4, 1.05))
    const sun = new THREE.DirectionalLight(0xfff3dc, 2.2)
    sun.position.set(14, 26, 10)
    sun.castShadow = true
    const small = window.innerWidth < 700
    sun.shadow.mapSize.set(small ? 1024 : 2048, small ? 1024 : 2048)
    const sc = sun.shadow.camera
    sc.left = -16; sc.right = 16; sc.top = 16; sc.bottom = -16; sc.near = 1; sc.far = 70
    sun.shadow.bias = -0.0004
    scene.add(sun)
  }

  buildWorld() {
    const { scene } = this
    // 地面
    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(90, 64),
      new THREE.MeshStandardMaterial({ color: 0xbfe6cf, roughness: 1 }),
    )
    ground.rotation.x = -Math.PI / 2
    ground.position.y = -0.6
    ground.receiveShadow = true
    scene.add(ground)

    // 棋盤底座
    const base = new THREE.Mesh(
      new RoundedBoxGeometry(8 * S + 1.4, 0.9, 8 * S + 1.4, 4, 0.35),
      new THREE.MeshStandardMaterial({ color: 0x0b7a4d, roughness: 0.6 }),
    )
    base.position.y = -0.1
    base.castShadow = true
    base.receiveShadow = true
    scene.add(base)

    // 中央城市底板
    const plate = new THREE.Mesh(
      new RoundedBoxGeometry(6 * S - 0.1, 0.16, 6 * S - 0.1, 3, 0.06),
      new THREE.MeshStandardMaterial({ color: 0xf3efe0, roughness: 0.9 }),
    )
    plate.position.y = 0.36
    plate.receiveShadow = true
    scene.add(plate)

    this.buildTiles()
    this.buildCity()

    // 目標格光圈
    this.ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.95, 0.07, 12, 40),
      new THREE.MeshBasicMaterial({ color: 0xffd166, transparent: true, opacity: 0.95 }),
    )
    this.ring.rotation.x = Math.PI / 2
    this.ring.visible = false
    scene.add(this.ring)
  }

  buildTiles() {
    this.tileMeshes = []
    const geo = new RoundedBoxGeometry(S - 0.14, 0.26, S - 0.14, 3, 0.07)
    const decalGeo = new THREE.PlaneGeometry(S - 0.34, S - 0.34)
    this.board.forEach((t, i) => {
      const p = tileXZ(i)
      const color = TYPE_COLOR[t.type] || 0x999999
      const mat = new THREE.MeshStandardMaterial({ color: 0xfffdf5, roughness: 0.55 })
      const m = new THREE.Mesh(geo, mat)
      m.position.set(p.x, 0.43, p.z)
      m.castShadow = true
      m.receiveShadow = true
      this.scene.add(m)
      // 色條(格子外側邊)
      const tex = canvasTex(160, 160, (g, w, h) => {
        g.fillStyle = '#' + color.toString(16).padStart(6, '0')
        g.fillRect(0, 0, w, 16)
        g.font = '78px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif'
        g.textAlign = 'center'
        g.textBaseline = 'middle'
        g.fillText(t.icon, w / 2, 70)
        g.fillStyle = '#374151'
        g.font = '800 26px "Noto Sans TC","PingFang TC","Microsoft JhengHei",sans-serif'
        g.fillText(t.label, w / 2, 132)
        g.fillStyle = '#9ca3af'
        g.font = '600 14px sans-serif'
        g.textAlign = 'left'
        g.fillText(i === 0 ? '' : String(i), 8, 34)
      })
      const decal = new THREE.Mesh(decalGeo, new THREE.MeshBasicMaterial({ map: tex, transparent: true }))
      decal.rotation.x = -Math.PI / 2
      decal.position.set(p.x, 0.565, p.z)
      this.scene.add(decal)
      this.tileMeshes.push(m)
    })
  }

  buildCity() {
    const rnd = mulberry(20260601)
    const pastel = [0xf9d5c7, 0xfde4a8, 0xc9e4f5, 0xd7ecd0, 0xe6d7f5, 0xffd9e6, 0xf5e6c8]
    const roofs = [0xd96a4b, 0x4f8cff, 0x2eb67d, 0x9b6bff, 0xf5a524]
    const group = new THREE.Group()
    // 中央 6x6 → 3x3 街區(每區 2x2 格),中間留道路
    for (let bx = 0; bx < 3; bx++) {
      for (let bz = 0; bz < 3; bz++) {
        const cx = (bx - 1) * 2 * S
        const cz = (bz - 1) * 2 * S
        const isCenter = bx === 1 && bz === 1
        if (isCenter) {
          // 中央廣場:高塔 + 噴水
          const tower = new THREE.Mesh(
            new RoundedBoxGeometry(1.5, 4.2, 1.5, 3, 0.2),
            new THREE.MeshStandardMaterial({ color: 0x0b9a62, roughness: 0.35, metalness: 0.2 }),
          )
          tower.position.set(cx, 2.55, cz)
          tower.castShadow = true
          group.add(tower)
          const cap = new THREE.Mesh(new THREE.ConeGeometry(1.1, 1.1, 4), new THREE.MeshStandardMaterial({ color: 0xffd166 }))
          cap.position.set(cx, 5.2, cz)
          cap.rotation.y = Math.PI / 4
          cap.castShadow = true
          group.add(cap)
          continue
        }
        const n = 2 + Math.floor(rnd() * 2)
        for (let k = 0; k < n; k++) {
          const w = 1.0 + rnd() * 0.9
          const d = 1.0 + rnd() * 0.9
          const h = 0.7 + rnd() * 1.7
          const ox = (rnd() - 0.5) * 2.0
          const oz = (rnd() - 0.5) * 2.0
          const b = new THREE.Mesh(
            new RoundedBoxGeometry(w, h, d, 2, 0.08),
            new THREE.MeshStandardMaterial({ color: pastel[Math.floor(rnd() * pastel.length)], roughness: 0.7 }),
          )
          b.position.set(cx + ox, 0.45 + h / 2, cz + oz)
          b.castShadow = true
          b.receiveShadow = true
          group.add(b)
          const roof = new THREE.Mesh(
            new RoundedBoxGeometry(w + 0.12, 0.14, d + 0.12, 2, 0.05),
            new THREE.MeshStandardMaterial({ color: roofs[Math.floor(rnd() * roofs.length)], roughness: 0.6 }),
          )
          roof.position.set(cx + ox, 0.45 + h + 0.07, cz + oz)
          roof.castShadow = true
          group.add(roof)
        }
        // 樹
        for (let k = 0; k < 2; k++) {
          const tx = cx + (rnd() - 0.5) * 3
          const tz = cz + (rnd() - 0.5) * 3
          const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.4, 8), new THREE.MeshStandardMaterial({ color: 0x8a5a3c }))
          trunk.position.set(tx, 0.65, tz)
          const crown = new THREE.Mesh(new THREE.ConeGeometry(0.38, 0.9, 8), new THREE.MeshStandardMaterial({ color: 0x2f9e6b, roughness: 0.8 }))
          crown.position.set(tx, 1.2, tz)
          crown.castShadow = true
          group.add(trunk, crown)
        }
      }
    }
    // 十字道路
    const road = new THREE.MeshStandardMaterial({ color: 0x8d9aa5, roughness: 1 })
    for (const [w, d, x, z] of [[0.7, 6 * S - 0.3, S, 0], [0.7, 6 * S - 0.3, -S, 0], [6 * S - 0.3, 0.7, 0, S], [6 * S - 0.3, 0.7, 0, -S]]) {
      const r = new THREE.Mesh(new THREE.BoxGeometry(w, 0.03, d), road)
      r.position.set(x, 0.46, z)
      r.receiveShadow = true
      group.add(r)
    }
    this.scene.add(group)
  }

  buildDice() {
    const pips = {
      1: [[0.5, 0.5]], 2: [[0.25, 0.25], [0.75, 0.75]], 3: [[0.25, 0.25], [0.5, 0.5], [0.75, 0.75]],
      4: [[0.25, 0.25], [0.75, 0.25], [0.25, 0.75], [0.75, 0.75]],
      5: [[0.25, 0.25], [0.75, 0.25], [0.5, 0.5], [0.25, 0.75], [0.75, 0.75]],
      6: [[0.25, 0.22], [0.75, 0.22], [0.25, 0.5], [0.75, 0.5], [0.25, 0.78], [0.75, 0.78]],
    }
    // BoxGeometry 材質順序:+x, -x, +y, -y, +z, -z
    this.faceValues = [3, 4, 1, 6, 2, 5]
    const mats = this.faceValues.map((v) => new THREE.MeshStandardMaterial({
      roughness: 0.35,
      map: canvasTex(128, 128, (g, w, h) => {
        g.fillStyle = '#fffefa'
        g.fillRect(0, 0, w, h)
        g.strokeStyle = '#e5e0cf'
        g.lineWidth = 6
        g.strokeRect(3, 3, w - 6, h - 6)
        g.fillStyle = v === 1 ? '#e5484d' : '#1f2a37'
        for (const [px, py] of pips[v]) {
          g.beginPath()
          g.arc(px * w, py * h, v === 1 ? 17 : 12, 0, Math.PI * 2)
          g.fill()
        }
      }),
    }))
    this.dice = new THREE.Mesh(new RoundedBoxGeometry(1.25, 1.25, 1.25, 4, 0.18), mats)
    this.dice.castShadow = true
    this.dice.visible = false
    this.scene.add(this.dice)
    this.faceNormals = {
      3: new THREE.Vector3(1, 0, 0), 4: new THREE.Vector3(-1, 0, 0), 1: new THREE.Vector3(0, 1, 0),
      6: new THREE.Vector3(0, -1, 0), 2: new THREE.Vector3(0, 0, 1), 5: new THREE.Vector3(0, 0, -1),
    }
  }

  // ---------- 角色 ----------
  makePawn(look, name, color, idx = 0) {
    const g = new THREE.Group()
    const skin = new THREE.MeshStandardMaterial({ color: look.skin, roughness: 0.6 })
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.3, 0.55, 6, 14), new THREE.MeshStandardMaterial({ color: look.top, roughness: 0.55 }))
    body.position.y = 0.62
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.3, 20, 16), skin)
    head.position.y = 1.35
    const hairMat = new THREE.MeshStandardMaterial({ color: look.hair, roughness: 0.7 })
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.325, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.55), hairMat)
    cap.position.y = 1.38
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x2d2420 })
    const e1 = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 8), eyeMat)
    const e2 = e1.clone()
    e1.position.set(-0.1, 1.34, 0.28)
    e2.position.set(0.1, 1.34, 0.28)
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.46, 0.1, 24), new THREE.MeshStandardMaterial({ color, roughness: 0.4 }))
    base.position.y = 0.05
    g.add(base, body, head, cap, e1, e2)
    if (['long', 'bob'].includes(look.style)) {
      const back = new THREE.Mesh(new THREE.SphereGeometry(0.33, 16, 12), hairMat)
      back.scale.set(1, 1.15, 0.8)
      back.position.set(0, 1.25, -0.1)
      g.add(back)
    }
    if (look.style === 'bun') {
      const bun = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 10), hairMat)
      bun.position.set(0, 1.74, 0)
      g.add(bun)
    }
    if (look.style === 'ponytail') {
      const tail = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.3, 4, 8), hairMat)
      tail.position.set(0, 1.3, -0.34)
      tail.rotation.x = 0.5
      g.add(tail)
    }
    if (look.extra === 'glasses') {
      const gm = new THREE.MeshBasicMaterial({ color: 0x222222 })
      for (const x of [-0.11, 0.11]) {
        const r = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.012, 6, 16), gm)
        r.position.set(x, 1.34, 0.29)
        g.add(r)
      }
    }
    if (look.extra === 'beanie') {
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.34, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.5), new THREE.MeshStandardMaterial({ color: 0xe8590c }))
      b.position.y = 1.42
      g.add(b)
    }
    if (look.extra === 'headphones') {
      const hp = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.035, 8, 24, Math.PI), new THREE.MeshStandardMaterial({ color: 0x333333 }))
      hp.position.y = 1.4
      g.add(hp)
    }
    g.traverse((o) => { if (o.isMesh) o.castShadow = true })

    // 名牌
    const label = canvasTex(256, 64, (c, w, h) => {
      c.fillStyle = 'rgba(255,255,255,0.92)'
      c.beginPath()
      c.roundRect(4, 6, w - 8, h - 12, 22)
      c.fill()
      c.fillStyle = '#' + color.toString(16).padStart(6, '0')
      c.beginPath()
      c.arc(30, h / 2, 12, 0, Math.PI * 2)
      c.fill()
      c.fillStyle = '#1f2a37'
      c.font = '700 28px "Noto Sans TC","PingFang TC","Microsoft JhengHei",sans-serif'
      c.textAlign = 'left'
      c.textBaseline = 'middle'
      c.fillText(name.slice(0, 6), 52, h / 2 + 1)
    })
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: label, transparent: true, depthTest: false }))
    sprite.scale.set(2.6, 0.65, 1)
    sprite.position.set(0, 2.3 + (idx % 2) * 0.62, 0)
    sprite.renderOrder = 10
    g.add(sprite)
    return g
  }

  setPlayers(players) {
    for (const t of this.tokens) this.scene.remove(t.group)
    const colors = [0xffc107, 0xe5484d, 0x3b82f6, 0xa855f7]
    this.tokens = players.map((p, i) => {
      const group = this.makePawn(p.look, p.name, colors[i % colors.length], i)
      this.scene.add(group)
      const t = { group, pos: p.pos || 0, busy: false, phase: i * 1.3 }
      this.placeToken(t, true)
      return t
    })
    this.layoutTokens(true)
  }

  // 同一格有多個棋子時,錯開位置
  layoutTokens(instant) {
    const byPos = {}
    this.tokens.forEach((t, i) => { (byPos[t.pos] = byPos[t.pos] || []).push(i) })
    for (const list of Object.values(byPos)) {
      list.forEach((ti, k) => {
        const t = this.tokens[ti]
        const spread = list.length > 1
        const off = spread ? [[-0.42, -0.42], [0.42, -0.42], [-0.42, 0.42], [0.42, 0.42]][k] : [0, 0]
        t.offset = new THREE.Vector3(off[0], 0, off[1])
        if (instant && !t.busy) this.placeToken(t, true)
      })
    }
  }

  placeToken(t) {
    const p = tileXZ(t.pos)
    t.group.position.set(p.x + (t.offset?.x || 0), p.y, p.z + (t.offset?.z || 0))
  }

  moveToken(i, toPos) {
    const t = this.tokens[i]
    const steps = (toPos - t.pos + N) % N
    if (!steps) return Promise.resolve()
    t.busy = true
    return new Promise((resolve) => {
      let k = 0
      const next = () => {
        if (this.disposed) return resolve()
        if (k >= steps) {
          t.busy = false
          this.layoutTokens(false)
          this.placeToken(t)
          return resolve()
        }
        const from = tileXZ(t.pos)
        t.pos = (t.pos + 1) % N
        const to = tileXZ(t.pos)
        k++
        this.tween(0.21, (e) => {
          t.group.position.x = from.x + (to.x - from.x) * e
          t.group.position.z = from.z + (to.z - from.z) * e
          t.group.position.y = from.y + Math.sin(e * Math.PI) * 0.85
          const sq = 1 - Math.sin(e * Math.PI) * 0.08
          t.group.scale.set(1 / sq, sq, 1 / sq)
        }).then(() => {
          t.group.scale.set(1, 1, 1)
          if (this.onStep) this.onStep(t.pos, i)
          next()
        })
      }
      next()
    })
  }

  teleport(i, pos) {
    const t = this.tokens[i]
    t.pos = pos
    this.layoutTokens(true)
    this.placeToken(t)
  }

  focusPlayer(i) {
    this.focusIdx = i
  }

  setActiveTile(pos) {
    if (pos == null) { this.ring.visible = false; return }
    const p = tileXZ(pos)
    this.ring.position.set(p.x, 0.62, p.z)
    this.ring.visible = true
  }

  // ---------- 骰子 ----------
  rollDice(value) {
    const d = this.dice
    d.visible = true
    const target = new THREE.Quaternion().setFromUnitVectors(this.faceNormals[value], new THREE.Vector3(0, 1, 0))
    target.premultiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.random() * Math.PI * 2))
    const axis = new THREE.Vector3(Math.random() - 0.5, Math.random() * 0.4, Math.random() - 0.5).normalize()
    const start = new THREE.Vector3((Math.random() - 0.5) * 3 - 6, 9, 5 + Math.random() * 2)
    const end = new THREE.Vector3((Math.random() - 0.5) * 2, 1.35, (Math.random() - 0.5) * 2)
    const spin = new THREE.Quaternion()
    return this.tween(1.35, (t) => {
      const e = ease.out(t)
      d.position.lerpVectors(start, end, e)
      // 彈跳:落地前反覆彈起
      const bounce = Math.abs(Math.sin(t * Math.PI * 3.2)) * (1 - t) * 3.2
      d.position.y = end.y + bounce + (1 - e) * (start.y - end.y)
      spin.setFromAxisAngle(axis, (1 - e) * Math.PI * 7)
      d.quaternion.copy(target).multiply(spin)
    }).then(() => { d.quaternion.copy(target); d.position.copy(end) })
  }

  hideDice(delay = 0.9) {
    return this.tween(0.35, (t) => {
      this.dice.scale.setScalar(1 - ease.inOut(t))
    }, delay).then(() => {
      this.dice.visible = false
      this.dice.scale.setScalar(1)
    })
  }

  // ---------- 動畫工具 ----------
  tween(duration, fn, delay = 0) {
    return new Promise((resolve) => {
      this.tweens.push({ t: -delay, duration, fn, resolve })
    })
  }

  // ---------- 輸入:拖曳旋轉、滾輪縮放 ----------
  bindInput() {
    const el = this.renderer.domElement
    let dragging = false
    let lx = 0, ly = 0
    const down = (e) => { dragging = true; lx = e.clientX; ly = e.clientY; el.setPointerCapture?.(e.pointerId) }
    const move = (e) => {
      if (!dragging) return
      this.orbit.tAz -= (e.clientX - lx) * 0.006
      this.orbit.tPol = Math.min(1.25, Math.max(0.55, this.orbit.tPol - (e.clientY - ly) * 0.005))
      lx = e.clientX; ly = e.clientY
    }
    const up = () => { dragging = false }
    const wheel = (e) => {
      e.preventDefault()
      this.orbit.tDist = Math.min(46, Math.max(18, this.orbit.tDist + e.deltaY * 0.02))
    }
    el.addEventListener('pointerdown', down)
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerup', up)
    el.addEventListener('pointercancel', up)
    el.addEventListener('wheel', wheel, { passive: false })
    this.unbind = () => {
      el.removeEventListener('pointerdown', down)
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerup', up)
      el.removeEventListener('pointercancel', up)
      el.removeEventListener('wheel', wheel)
    }
  }

  resize() {
    const w = this.container.clientWidth
    const h = this.container.clientHeight
    if (!w || !h) return
    this.renderer.setSize(w, h)
    this.camera.aspect = w / h
    // 依畫面比例調整距離,讓整個棋盤都在畫面內
    const aspect = w / h
    this.baseDist = aspect < 1.4 ? Math.max(30, 31 / aspect + 1) : 31
    this.orbit.tDist = this.baseDist
    this.orbit.dist = this.baseDist
    this.camera.updateProjectionMatrix()
  }

  // ---------- 主迴圈 ----------
  loop() {
    if (this.disposed) return
    this.raf = requestAnimationFrame(this.loop)
    const dt = Math.min(this.clock.getDelta(), 0.05)
    const time = this.clock.elapsedTime

    for (const tw of this.tweens) {
      tw.t += dt
      if (tw.t >= 0) {
        const k = Math.min(1, tw.t / tw.duration)
        tw.fn(k)
        if (k >= 1) { tw.done = true; tw.resolve() }
      }
    }
    this.tweens = this.tweens.filter((t) => !t.done)

    // 待機動畫:棋子輕微上下浮動
    this.tokens.forEach((t, i) => {
      if (!t.busy) {
        const target = tileXZ(t.pos)
        const tx = target.x + (t.offset?.x || 0)
        const tz = target.z + (t.offset?.z || 0)
        t.group.position.x += (tx - t.group.position.x) * 0.15
        t.group.position.z += (tz - t.group.position.z) * 0.15
        t.group.position.y = target.y + Math.sin(time * 2 + t.phase) * 0.05
      }
    })
    if (this.ring.visible) {
      this.ring.scale.setScalar(1 + Math.sin(time * 5) * 0.06)
      this.ring.material.opacity = 0.75 + Math.sin(time * 5) * 0.2
    }

    // 相機:緩動跟隨焦點棋子
    const o = this.orbit
    o.az += (o.tAz - o.az) * 0.08
    o.pol += (o.tPol - o.pol) * 0.08
    o.dist += (o.tDist - o.dist) * 0.08
    const f = this.tokens[this.focusIdx]
    if (f) this.camTargetGoal.set(f.group.position.x * this.focusBlend, 0, f.group.position.z * this.focusBlend)
    else this.camTargetGoal.set(0, 0, 0)
    this.camTarget.lerp(this.camTargetGoal, 0.06)
    const sp = Math.sin(o.pol), cp = Math.cos(o.pol)
    this.camera.position.set(
      this.camTarget.x + Math.sin(o.az) * sp * o.dist,
      cp * o.dist,
      this.camTarget.z + Math.cos(o.az) * sp * o.dist,
    )
    this.camera.lookAt(this.camTarget.x, 0.2, this.camTarget.z)
    this.renderer.render(this.scene, this.camera)
  }

  dispose() {
    this.disposed = true
    cancelAnimationFrame(this.raf)
    this.ro.disconnect()
    this.unbind?.()
    this.scene.traverse((o) => {
      o.geometry?.dispose?.()
      const m = o.material
      if (m) (Array.isArray(m) ? m : [m]).forEach((x) => { x.map?.dispose?.(); x.dispose?.() })
    })
    this.renderer.dispose()
    this.renderer.domElement.remove()
  }
}
