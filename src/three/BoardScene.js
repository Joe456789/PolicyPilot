// 3D 棋盤場景(three.js)。全部由程式生成,沒有任何外部圖檔。
// 對外介面:setPlayers / moveToken / rollDice / focusPlayer / setActiveTile / dispose
import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { PROPERTIES } from '../game/properties.js'
import { t, getLang } from '../i18n.js'
import { wan } from '../game/format.js'

import { MAP_PATH, MAP_COLS, MAP_ROWS, groundCells } from '../game/map.js'
import * as R from './realism.js'

const N = MAP_PATH.length
const S = 2 // 一格的邊長
const HW = (MAP_COLS * S) / 2 // 棋盤範圍的一半(世界座標)
const HH = (MAP_ROWS * S) / 2

const TYPE_COLOR = {
  start: 0x00915a, event: 0xff6b57, chance: 0xf97316, market: 0x3b82f6, bonus: 0xf5b301,
  shop: 0x0ea5e9, milestone: 0x14b8a6, advisor: 0x8b5cf6, tax: 0x64748b, rest: 0x84cc16,
  hospital: 0xec4899, bank: 0x0d9488, minigame: 0x6366f1, property: 0xb7791f,
}

// 與 2D 棋盤共用 map.js 的彎曲路徑座標;世界原點放在整個棋盤的中心
const tileXZ = (i) => {
  const { r, c } = MAP_PATH[((i % N) + N) % N]
  return new THREE.Vector3((c - (MAP_COLS - 1) / 2) * S, 0.5, (r - (MAP_ROWS - 1) / 2) * S)
}
const cellXZ = (c, r) => new THREE.Vector3((c - (MAP_COLS - 1) / 2) * S, 0, (r - (MAP_ROWS - 1) / 2) * S)

const ease = {
  inOut: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  out: (t) => 1 - Math.pow(1 - t, 3),
}

function windowTex(base) {
  return canvasTex(128, 192, (g, w, h) => {
    g.fillStyle = '#' + base.toString(16).padStart(6, '0')
    g.fillRect(0, 0, w, h)
    for (let r = 0; r < 6; r++) {
      for (let c = 0; c < 4; c++) {
        const lit = (r * 7 + c * 3) % 5 !== 0
        g.fillStyle = lit ? '#fff3b0' : '#7aa6c7'
        g.fillRect(12 + c * 28, 14 + r * 30, 18, 18)
      }
    }
  })
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

const FONT_CJK = '"Noto Sans TC","PingFang TC","Microsoft JhengHei",sans-serif'
const FONT_EN = '"Inter","Segoe UI","Helvetica Neue",Arial,sans-serif'
// 英文模式用較窄的字體;中文維持原樣
const labelFont = (weight, px, zhFam = FONT_CJK) => `${weight} ${px}px ${getLang() === 'en' ? FONT_EN : zhFam}`

// 畫文字;英文模式下太長就縮小字體(shrink-to-fit),必要時拆成兩行。中文維持原本的單行畫法。
function fillFit(g, text, x, y, maxW, weight, px, minPx = 12, zhFam = FONT_CJK) {
  g.font = labelFont(weight, px, zhFam)
  if (getLang() !== 'en') { g.fillText(text, x, y); return }
  let size = px
  while (size > minPx && g.measureText(text).width > maxW) { size -= 1; g.font = labelFont(weight, size, zhFam) }
  if (g.measureText(text).width <= maxW || !text.includes(' ')) { g.fillText(text, x, y); return }
  // 還是太長:拆兩行
  const words = text.split(' ')
  let best = 1, bestDiff = Infinity
  for (let k = 1; k < words.length; k++) {
    const d = Math.abs(g.measureText(words.slice(0, k).join(' ')).width - g.measureText(words.slice(k).join(' ')).width)
    if (d < bestDiff) { bestDiff = d; best = k }
  }
  const two = [words.slice(0, best).join(' '), words.slice(best).join(' ')]
  let sz = size
  while (sz > minPx && Math.max(...two.map((l) => g.measureText(l).width)) > maxW) { sz -= 1; g.font = labelFont(weight, sz, zhFam) }
  g.fillText(two[0], x, y - sz * 0.55)
  g.fillText(two[1], x, y + sz * 0.5)
}

// 寫實畫風的樹:很多棵樹合併成兩個 InstancedMesh(樹幹、樹冠),效能比一棵一棵加好很多
class TreeBatch {
  constructor() { this.items = [] }
  add(x, y, z, s = 1, rnd = Math.random, kind = 'round') { this.items.push({ x, y, z, s, r: rnd(), r2: rnd(), r3: rnd(), kind }) }
  build(scene) {
    if (!this.items.length) return
    const bark = new THREE.MeshStandardMaterial({ color: 0x5a4030, roughness: 1 })
    const leaf = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85 })
    const trunkGeo = new THREE.CylinderGeometry(0.07, 0.12, 1, 7)
    const blobGeo = new THREE.IcosahedronGeometry(0.5, 1)
    const trunks = new THREE.InstancedMesh(trunkGeo, bark, this.items.length)
    const blobsPer = 5
    const blobs = new THREE.InstancedMesh(blobGeo, leaf, this.items.length * blobsPer)
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), pos = new THREE.Vector3()
    const greens = [0x2f5d2a, 0x3b6e2f, 0x4a7d36, 0x2b5231, 0x56803a, 0x6b7d2e]
    const col = new THREE.Color()
    let b = 0
    this.items.forEach((it, i) => {
      const h = (0.42 + it.r * 0.3) * it.s * (it.kind === 'tall' ? 1.3 : 1)
      m.compose(pos.set(it.x, it.y + h / 2, it.z), q.identity(), sc.set(it.s, h, it.s))
      trunks.setMatrixAt(i, m)
      for (let k = 0; k < blobsPer; k++) {
        const a = (k / blobsPer) * Math.PI * 2 + it.r2 * 3
        const rr = k === 0 ? 0 : (0.22 + ((it.r * 5 + k) % 1) * 0.14) * it.s
        const bs = (k === 0 ? 0.8 : 0.5 + ((it.r3 * 7 + k) % 1) * 0.25) * it.s * (it.kind === 'tall' ? 0.7 : 1)
        const yy = it.y + h + (k === 0 ? 0.32 : 0.12 + k * 0.07) * it.s * (it.kind === 'tall' ? 1.8 : 1)
        q.setFromEuler(new THREE.Euler(it.r * 3, it.r2 * 3, it.r3 * 3))
        m.compose(pos.set(it.x + Math.cos(a) * rr, yy, it.z + Math.sin(a) * rr), q, sc.set(bs, bs * (it.kind === 'tall' ? 1.5 : 0.85), bs))
        blobs.setMatrixAt(b, m)
        col.setHex(greens[Math.floor(((it.r + k * 0.37) % 1) * greens.length)])
        col.offsetHSL(0, 0, (it.r3 - 0.5) * 0.06)
        blobs.setColorAt(b, col)
        b++
      }
    })
    for (const im of [trunks, blobs]) { im.castShadow = true; im.receiveShadow = true; scene.add(im) }
  }
}

const priceText = (price) => (getLang() === 'en' ? wan(price) : `${Math.round(price / 10000)} 萬`) // i18n-ignore

export class BoardScene {
  constructor(container, board, opts = {}) {
    this.container = container
    this.board = board
    // 畫風:real 寫實(天空、水面反光、後製)| toon 卡通(原本的樣子)
    this.real = opts.style !== 'toon'
    // 手機或核心數少的裝置:寫實畫風但關掉最吃效能的水面反射與光暈
    this.lite = this.real && (window.innerWidth < 700 || (navigator.hardwareConcurrency || 8) <= 4)
    this.tweens = []
    this.tokens = []
    this.disposed = false
    this.clock = new THREE.Clock()
    this.orbit = { az: 0.0, pol: 0.78, dist: 40, tAz: 0, tPol: 0.78, tDist: 40 }
    this.camTarget = new THREE.Vector3()
    this.camTargetGoal = new THREE.Vector3()
    this.mode = 'board' // board 全景 | dice 對著骰子 | token 跟著棋子
    this.focusIdx = 0

    const w = container.clientWidth || 800
    const h = container.clientHeight || 600
    const renderer = new THREE.WebGLRenderer({ antialias: !this.real, alpha: false, powerPreference: 'high-performance' })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    renderer.setSize(w, h)
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = this.real ? 0.95 : 1.05
    container.appendChild(renderer.domElement)
    renderer.domElement.style.display = 'block'
    renderer.domElement.style.touchAction = 'none'
    this.renderer = renderer

    const scene = new THREE.Scene()
    const sky = canvasTex(16, 256, (g, w, h) => {
      const gr = g.createLinearGradient(0, 0, 0, h)
      gr.addColorStop(0, '#7cc4f2')
      gr.addColorStop(0.55, '#cfeaf7')
      gr.addColorStop(1, '#fdf1d6')
      g.fillStyle = gr
      g.fillRect(0, 0, w, h)
    })
    scene.background = sky
    scene.fog = new THREE.Fog(0xcfeaf7, 60, 135)
    this.scene = scene

    this.camera = new THREE.PerspectiveCamera(38, w / h, 0.1, this.real ? 4000 : 200)
    if (this.real) {
      const { sky: skyMesh, sun, env } = R.makeSky(renderer)
      this.sunDir = sun
      this.env = env
      scene.add(skyMesh)
      scene.background = null
      scene.environment = env
      scene.environmentIntensity = 0.75
      scene.fog = new THREE.FogExp2(0xdcb48c, 0.0095)
    }
    this.buildLights()
    this.buildWorld()
    this.buildDice()
    this.bindInput()
    if (this.real) this.fx = R.makeComposer(renderer, scene, this.camera, { bloom: !this.lite })
    this.frameTimes = []

    this.ro = new ResizeObserver(() => this.resize())
    this.ro.observe(container)
    this.resize()
    this.loop = this.loop.bind(this)
    this.raf = requestAnimationFrame(this.loop)
  }

  // ---------- 建構 ----------
  buildLights() {
    const { scene } = this
    if (this.real) {
      scene.add(new THREE.HemisphereLight(0xd6c8ff, 0x5a4a30, 0.6))
      const sun = new THREE.DirectionalLight(0xffa04f, 7.5)
      sun.position.copy(this.sunDir).multiplyScalar(70)
      sun.castShadow = true
      const ms = this.lite ? 2048 : 4096
      sun.shadow.mapSize.set(ms, ms)
      const sc = sun.shadow.camera
      sc.left = -30; sc.right = 30; sc.top = 30; sc.bottom = -30; sc.near = 1; sc.far = 160
      sun.shadow.bias = -0.0003
      sun.shadow.normalBias = 0.03
      scene.add(sun)
      return
    }
    scene.add(new THREE.HemisphereLight(0xffffff, 0xb7d9c4, 1.05))
    const sun = new THREE.DirectionalLight(0xfff3dc, 2.2)
    sun.position.set(12, 28, 12)
    sun.castShadow = true
    const small = window.innerWidth < 700
    sun.shadow.mapSize.set(small ? 1024 : 2048, small ? 1024 : 2048)
    const sc = sun.shadow.camera
    sc.left = -20; sc.right = 20; sc.top = 15; sc.bottom = -15; sc.near = 1; sc.far = 80
    sun.shadow.bias = -0.0004
    scene.add(sun)
  }

  buildWorld() {
    if (this.real) return this.buildWorldReal()
    const { scene } = this
    // 水面與草地島嶼(橢圓形,比棋盤大一圈)
    const water = new THREE.Mesh(
      new THREE.CircleGeometry(160, 64),
      new THREE.MeshStandardMaterial({ color: 0x7cc7e8, roughness: 0.25, metalness: 0.1 }),
    )
    water.rotation.x = -Math.PI / 2
    water.position.y = -0.75
    scene.add(water)
    this.islandR = { x: HW + 9, z: HH + 9 }
    const island = new THREE.Mesh(
      new THREE.CylinderGeometry(1, 1.06, 1.1, 64),
      new THREE.MeshStandardMaterial({ color: 0x9bd8a9, roughness: 1 }),
    )
    island.scale.set(this.islandR.x, 1, this.islandR.z)
    island.position.y = -1.3
    island.receiveShadow = true
    scene.add(island)
    const top = new THREE.Mesh(new THREE.CircleGeometry(1, 64), new THREE.MeshStandardMaterial({ color: 0xa8e0b3, roughness: 1 }))
    top.scale.set(this.islandR.x, this.islandR.z, 1)
    top.rotation.x = -Math.PI / 2
    top.position.y = -0.74
    top.receiveShadow = true
    scene.add(top)
    this.buildScenery()
    this.buildClouds()

    // 棋盤底座:每一格墊一塊略大的綠色底板,連起來就是一條彎曲的賽道
    const baseGeo = new RoundedBoxGeometry(S + 0.55, 0.9, S + 0.55, 3, 0.3)
    const baseMat = new THREE.MeshStandardMaterial({ color: 0x0b7a4d, roughness: 0.6 })
    for (let i = 0; i < N; i++) {
      const p = tileXZ(i)
      const base = new THREE.Mesh(baseGeo, baseMat)
      base.position.set(p.x, -0.1, p.z)
      base.castShadow = true
      base.receiveShadow = true
      scene.add(base)
    }

    this.buildTiles()
    this.buildCity()
    this.buildCars()

    // 目標格光圈
    this.ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.95, 0.07, 12, 40),
      new THREE.MeshBasicMaterial({ color: 0xffd166, transparent: true, opacity: 0.95 }),
    )
    this.ring.rotation.x = Math.PI / 2
    this.ring.visible = false
    scene.add(this.ring)
  }

  // ---------- 寫實畫風的世界 ----------
  buildWorldReal() {
    const { scene } = this
    this.islandR = { x: HW + 9, z: HH + 9 }
    // 海面:有天空倒影的水(手機版用簡單的反光材質)
    const simpleWater = () => {
      const water = new THREE.Mesh(new THREE.CircleGeometry(400, 48), new THREE.MeshStandardMaterial({ color: 0x1d4b5c, roughness: 0.12, metalness: 0.4 }))
      water.rotation.x = -Math.PI / 2
      water.position.y = -0.8
      scene.add(water)
    }
    this.lowWater = simpleWater
    if (this.lite) simpleWater()
    else {
      this.water = R.makeWater(400, this.sunDir, scene.fog)
      this.water.position.y = -0.8
      scene.add(this.water)
    }
    // 沙灘 + 草地島
    const beach = new THREE.Mesh(new THREE.CylinderGeometry(1.07, 1.16, 1.0, 72), new THREE.MeshStandardMaterial({ map: R.sandTex(10), roughness: 0.95 }))
    beach.scale.set(this.islandR.x, 1, this.islandR.z)
    beach.position.y = -1.27
    beach.receiveShadow = true
    scene.add(beach)
    const grass = new THREE.Mesh(new THREE.CircleGeometry(1, 72), new THREE.MeshStandardMaterial({ map: R.grassTex(14), roughness: 1 }))
    grass.scale.set(this.islandR.x, this.islandR.z, 1)
    grass.rotation.x = -Math.PI / 2
    grass.position.y = -0.74
    grass.receiveShadow = true
    scene.add(grass)
    this.trees = new TreeBatch()
    this.buildScenery()
    this.clouds = []

    // 棋盤底座:深色木頭
    const wood = new THREE.MeshStandardMaterial({ map: R.woodTex(1), roughness: 0.55, metalness: 0 })
    const baseGeo = new RoundedBoxGeometry(S + 0.55, 0.9, S + 0.55, 3, 0.18)
    for (let i = 0; i < N; i++) {
      const p = tileXZ(i)
      const base = new THREE.Mesh(baseGeo, wood)
      base.position.set(p.x, -0.1, p.z)
      base.castShadow = true
      base.receiveShadow = true
      scene.add(base)
    }
    this.buildTiles()
    this.buildCityReal()
    this.trees.build(scene)
    this.cars = []

    this.ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.95, 0.06, 12, 48),
      new THREE.MeshBasicMaterial({ color: 0xffd38a, transparent: true, opacity: 0.95, toneMapped: false }),
    )
    this.ring.rotation.x = Math.PI / 2
    this.ring.visible = false
    scene.add(this.ring)
  }

  // 中央是一座「台北 101」風格的高塔;街區是有窗戶燈光的樓房;缺口是有蓮花的池塘
  buildCityReal() {
    const rnd = mulberry(20260601)
    const group = new THREE.Group()
    const { inner, bay } = groundCells()
    const paving = new THREE.MeshStandardMaterial({ map: R.pavingTex(1), roughness: 0.85 })
    const lawn = new THREE.MeshStandardMaterial({ map: R.grassTex(2), roughness: 1 })
    const plateGeo = new RoundedBoxGeometry(S - 0.05, 0.16, S - 0.05, 3, 0.04)
    const walls = [[196, 190, 180], [222, 210, 186], [168, 92, 70], [235, 232, 224], [150, 158, 166], [205, 178, 150]]
    const facades = walls.map((w, i) => {
      const f = R.facadeTex(w, i + 3)
      return new THREE.MeshStandardMaterial({ map: f.map, emissiveMap: f.emissive, emissive: 0xffffff, emissiveIntensity: 1.6, roughness: 0.75 })
    })
    const roofFlat = new THREE.MeshStandardMaterial({ color: 0x6f6a62, roughness: 0.9 })
    const roofTile = new THREE.MeshStandardMaterial({ map: R.roofTex([150, 62, 42]), roughness: 0.7 })

    let plaza = inner[0]
    const mid = (c) => Math.hypot(c.c - (MAP_COLS - 1) / 2, c.r - (MAP_ROWS - 1) / 2)
    for (const c of inner) if (mid(c) < mid(plaza)) plaza = c
    const tp = cellXZ(plaza.c, plaza.r)
    this.towerPos = tp
    const isPlaza = (c) => Math.abs(c.c - plaza.c) <= 1 && Math.abs(c.r - plaza.r) <= 1

    for (const cell of inner) {
      const p = cellXZ(cell.c, cell.r)
      const plate = new THREE.Mesh(plateGeo, paving)
      plate.position.set(p.x, 0.36, p.z)
      plate.receiveShadow = true
      group.add(plate)
      if (cell === plaza) { this.buildTower(group, p); continue }
      if (isPlaza(cell)) { this.trees.add(p.x + (rnd() - 0.5) * 0.8, 0.44, p.z + (rnd() - 0.5) * 0.8, 0.75, rnd); continue }
      const n = 1 + Math.floor(rnd() * 2)
      for (let k = 0; k < n; k++) {
        const w = 0.7 + rnd() * 0.45, d = 0.7 + rnd() * 0.45, h = 0.6 + rnd() * 1.0
        const ox = n === 1 ? (rnd() - 0.5) * 0.3 : (k ? 0.42 : -0.42), oz = (rnd() - 0.5) * 0.5
        const fac = facades[Math.floor(rnd() * facades.length)]
        const pitched = rnd() < 0.3
        const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), [fac, fac, roofFlat, roofFlat, fac, fac])
        b.position.set(p.x + ox, 0.44 + h / 2, p.z + oz)
        b.castShadow = true
        b.receiveShadow = true
        group.add(b)
        if (pitched) {
          const roof = new THREE.Mesh(new THREE.ConeGeometry(Math.max(w, d) * 0.78, 0.45, 4), roofTile)
          roof.position.set(p.x + ox, 0.44 + h + 0.22, p.z + oz)
          roof.rotation.y = Math.PI / 4
          roof.scale.set(w / Math.max(w, d), 1, d / Math.max(w, d))
          roof.castShadow = true
          group.add(roof)
        } else {
          // 屋頂女兒牆 + 水塔:台灣街景常見的樣子
          const lip = new THREE.Mesh(new THREE.BoxGeometry(w + 0.04, 0.08, d + 0.04), roofFlat)
          lip.position.set(p.x + ox, 0.44 + h + 0.04, p.z + oz)
          group.add(lip)
          if (rnd() < 0.5) {
            const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.18, 12), new THREE.MeshStandardMaterial({ color: 0xd8d8d0, metalness: 0.6, roughness: 0.35 }))
            tank.position.set(p.x + ox + 0.15, 0.44 + h + 0.17, p.z + oz - 0.1)
            tank.castShadow = true
            group.add(tank)
          }
        }
      }
      if (rnd() < 0.6) this.trees.add(p.x + (rnd() - 0.5) * 1.3, 0.44, p.z + (rnd() > 0.5 ? 0.8 : -0.8), 0.55, rnd)
    }

    // 缺口:草地與蓮花池
    const pondMat = new THREE.MeshStandardMaterial({ color: 0x173f4a, roughness: 0.05, metalness: 0.6 })
    const padMat = new THREE.MeshStandardMaterial({ color: 0x3f7a35, roughness: 0.7, side: THREE.DoubleSide })
    const lotusMat = new THREE.MeshStandardMaterial({ color: 0xf2a3b8, roughness: 0.6, emissive: 0x3a0f18, emissiveIntensity: 0.4 })
    bay.forEach((cell, i) => {
      const p = cellXZ(cell.c, cell.r)
      const plate = new THREE.Mesh(plateGeo, lawn)
      plate.position.set(p.x, 0.36, p.z)
      plate.receiveShadow = true
      group.add(plate)
      if ((cell.c + cell.r) % 3 === 1 && i % 2 === 0) {
        const pond = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 0.05, 36), pondMat)
        this.pondPos = this.pondPos || new THREE.Vector3(p.x, 0.5, p.z)
        pond.position.set(p.x, 0.455, p.z)
        group.add(pond)
        for (let k = 0; k < 6; k++) {
          const a = rnd() * Math.PI * 2, r = rnd() * 0.55
          const pad = new THREE.Mesh(new THREE.CircleGeometry(0.1 + rnd() * 0.06, 14, 0.3, Math.PI * 1.8), padMat)
          pad.rotation.x = -Math.PI / 2
          pad.position.set(p.x + Math.cos(a) * r, 0.485, p.z + Math.sin(a) * r)
          group.add(pad)
          if (k % 2 === 0) {
            const lotus = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), lotusMat)
            lotus.scale.y = 1.3
            lotus.position.set(pad.position.x, 0.53, pad.position.z)
            group.add(lotus)
          }
        }
      } else {
        this.trees.add(p.x + (rnd() - 0.5) * 0.9, 0.44, p.z + (rnd() - 0.5) * 0.9, 0.8 + rnd() * 0.3, rnd)
        if (rnd() < 0.5) this.trees.add(p.x + (rnd() - 0.5) * 1.2, 0.44, p.z + (rnd() - 0.5) * 1.2, 0.55, rnd, 'tall')
      }
    })

    // 路燈:沿著路徑每隔幾格一盞,燈泡會發光(後製光暈),其中幾盞真的會照亮周圍
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x2b2b2e, metalness: 0.7, roughness: 0.4 })
    const bulbMat = new THREE.MeshStandardMaterial({ color: 0xffe2a8, emissive: 0xffc56b, emissiveIntensity: 6 })
    let lit = 0
    for (let i = 3; i < N; i += 5) {
      const a = tileXZ(i), b = tileXZ((i + 1) % N)
      // 放在格子的外側邊緣
      const dir = new THREE.Vector3().subVectors(b, a).normalize()
      const side = new THREE.Vector3(-dir.z, 0, dir.x).multiplyScalar(1.12)
      const x = a.x + side.x + dir.x * 0.9, z = a.z + side.z + dir.z * 0.9
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.035, 1.1, 8), poleMat)
      pole.position.set(x, 0.9, z)
      pole.castShadow = true
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 10), bulbMat)
      bulb.position.set(x, 1.48, z)
      this.lampPos = this.lampPos || new THREE.Vector3(x, 1.4, z)
      const cap = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.1, 8), poleMat)
      cap.position.set(x, 1.58, z)
      group.add(pole, bulb, cap)
      if (lit++ < 4 && !this.lite) {
        const L = new THREE.PointLight(0xffc27a, 3.5, 5, 2)
        L.position.set(x, 1.4, z)
        group.add(L)
      }
    }
    this.scene.add(group)
  }

  // 台北 101 風格的高塔:八節往外張的塔身 + 尖頂,節與節之間有暖光燈帶
  buildTower(group, p) {
    const glass = new THREE.MeshStandardMaterial({ color: 0x86b8ad, metalness: 0.7, roughness: 0.16 })
    const band = new THREE.MeshStandardMaterial({ color: 0x6d7d78, emissive: 0xffb75e, emissiveIntensity: 1.4 })
    const podium = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.5, 1.5), new THREE.MeshStandardMaterial({ color: 0x8f9a98, metalness: 0.4, roughness: 0.5 }))
    podium.position.set(p.x, 0.69, p.z)
    group.add(podium)
    const mats = [glass, band, podium.material]
    let y = 0.94
    const trunk = new THREE.Mesh(new THREE.BoxGeometry(0.62, 1.1, 0.62), glass)
    trunk.position.set(p.x, y + 0.55, p.z)
    group.add(trunk)
    y += 1.1
    for (let k = 0; k < 8; k++) {
      const seg = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.36, 0.4, 4, 1), glass)
      seg.rotation.y = Math.PI / 4
      seg.position.set(p.x, y + 0.2, p.z)
      group.add(seg)
      const ring = new THREE.Mesh(new THREE.BoxGeometry(0.71, 0.014, 0.71), band)
      ring.position.set(p.x, y + 0.41, p.z)
      group.add(ring)
      y += 0.42
    }
    const top = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.5, 0.42), glass)
    top.position.set(p.x, y + 0.25, p.z)
    const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.06, 1.0, 8), new THREE.MeshStandardMaterial({ color: 0xcfd6d6, metalness: 0.9, roughness: 0.2 }))
    spire.position.set(p.x, y + 1.0, p.z)
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), band)
    tip.position.set(p.x, y + 1.52, p.z)
    mats.push(spire.material)
    group.add(top, spire, tip)
    group.traverse((o) => { if (o.isMesh) { o.castShadow = true } })
    this.fadeMats = mats
  }

  buildScenery() {
    const rnd = mulberry(777)
    const trunkM = new THREE.MeshStandardMaterial({ color: 0x8a5a3c })
    const leaf = [0x2f9e6b, 0x3fb37a, 0x5cc98a].map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.9 }))
    const { x: rx, z: rz } = this.islandR
    // 在島上、棋盤範圍之外隨機撒點
    const spot = (minOut, maxOut) => {
      for (let k = 0; k < 40; k++) {
        const a = rnd() * Math.PI * 2, f = 0.55 + rnd() * 0.42
        const x = Math.cos(a) * rx * f, z = Math.sin(a) * rz * f
        const out = Math.max(Math.abs(x) - HW, Math.abs(z) - HH)
        if (out >= minOut && out <= maxOut) return { x, z }
      }
      return null
    }
    for (let i = 0; i < (this.real ? 70 : 90); i++) {
      const pt = spot(1.8, 20)
      if (!pt) continue
      const { x, z } = pt
      const s = 0.8 + rnd() * 0.9
      if (this.real) { this.trees.add(x, -0.74, z, s * 0.95, rnd, rnd() < 0.4 ? 'tall' : 'round'); continue }
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12 * s, 0.16 * s, 0.9 * s, 8), trunkM)
      trunk.position.set(x, -0.3 + 0.45 * s, z)
      const crown = new THREE.Mesh(new THREE.ConeGeometry(0.65 * s, 1.7 * s, 8), leaf[Math.floor(rnd() * 3)])
      crown.position.set(x, 0.55 + 0.85 * s - 0.3, z)
      crown.castShadow = true
      this.scene.add(trunk, crown)
    }
    const wall = this.real ? [0xe8e0d0, 0xd9c8a8, 0xcfc9c0, 0xe2d6c2] : [0xf9d5c7, 0xfde4a8, 0xc9e4f5, 0xe6d7f5]
    const roofMat = this.real ? new THREE.MeshStandardMaterial({ map: R.roofTex([140, 58, 40]), roughness: 0.75 }) : null
    for (let i = 0; i < 10; i++) {
      const pt = spot(3, 9)
      if (!pt) continue
      const { x, z } = pt
      const h = new THREE.Mesh(new RoundedBoxGeometry(1.6, 1.1, 1.4, 2, 0.08), new THREE.MeshStandardMaterial({ color: wall[i % 4] }))
      h.position.set(x, -0.15, z)
      h.rotation.y = rnd() * Math.PI
      const roof = new THREE.Mesh(new THREE.ConeGeometry(1.3, 0.8, 4), roofMat || new THREE.MeshStandardMaterial({ color: 0xd96a4b }))
      roof.position.set(x, 0.8, z)
      roof.rotation.y = h.rotation.y + Math.PI / 4
      h.castShadow = true
      roof.castShadow = true
      this.scene.add(h, roof)
    }
  }

  buildClouds() {
    this.clouds = []
    const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, flatShading: true, transparent: true, opacity: 0.95 })
    for (let i = 0; i < 7; i++) {
      const g = new THREE.Group()
      for (let k = 0; k < 4; k++) {
        const s = new THREE.Mesh(new THREE.IcosahedronGeometry(1.2 + Math.random() * 0.8, 1), m)
        s.position.set(k * 1.6 - 2.4, Math.random() * 0.6, Math.random() * 1.2)
        g.add(s)
      }
      g.position.set(-45 + i * 15, 22 + Math.random() * 9, -34 + Math.random() * 26)
      g.scale.setScalar(1 + Math.random() * 0.8)
      this.scene.add(g)
      this.clouds.push({ g, v: 0.5 + Math.random() * 0.6 })
    }
  }

  buildCars() {
    this.cars = []
  }

  // 一般格子貼圖(表情符號 + 名稱 + 價格);img 有值時是地產插圖版
  drawTileTex(i, img) {
    const tile = this.board[i]
    const color = TYPE_COLOR[tile.type] || 0x999999
    if (img) {
      const pr = PROPERTIES.find((x) => x.id === tile.prop)
      return canvasTex(256, 256, (g, w, h) => {
        g.fillStyle = '#' + TYPE_COLOR.property.toString(16).padStart(6, '0')
        g.fillRect(0, 0, w, 16)
        // 圖片(置中裁成 228x140,圓角)
        const x = 14, y = 24, bw = 228, bh = 140
        g.save()
        g.beginPath()
        g.roundRect(x, y, bw, bh, 16)
        g.clip()
        const sc = Math.max(bw / img.width, bh / img.height)
        g.drawImage(img, x + (bw - img.width * sc) / 2, y + (bh - img.height * sc) / 2, img.width * sc, img.height * sc)
        g.restore()
        g.fillStyle = '#374151'
        g.textAlign = 'center'
        g.textBaseline = 'alphabetic'
        fillFit(g, t(tile.label), w / 2, 202, 236, 800, 31, 15)
        g.fillStyle = '#b45309'
        fillFit(g, priceText(pr.price), w / 2, 238, 236, 800, 27, 16, '"Noto Sans TC",sans-serif')
        g.fillStyle = '#9ca3af'
        g.font = '600 15px sans-serif'
        g.textAlign = 'left'
        g.fillText(String(i), 8, 40)
      })
    }
    return canvasTex(160, 160, (g, w, h) => {
      g.fillStyle = '#' + color.toString(16).padStart(6, '0')
      g.fillRect(0, 0, w, 16)
      g.font = '78px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif'
      g.textAlign = 'center'
      g.textBaseline = 'middle'
      g.fillText(tile.icon, w / 2, 70)
      g.fillStyle = '#374151'
      fillFit(g, t(tile.label), w / 2, tile.prop ? 124 : 132, 150, 800, 26, 12)
      if (tile.prop) {
        const pr = PROPERTIES.find((x) => x.id === tile.prop)
        g.fillStyle = '#b45309'
        fillFit(g, priceText(pr.price), w / 2, 150, 150, 800, 21, 12, '"Noto Sans TC",sans-serif')
      }
      g.fillStyle = '#9ca3af'
      g.font = '600 14px sans-serif'
      g.textAlign = 'left'
      g.fillText(i === 0 ? '' : String(i), 8, 34)
    })
  }

  buildTiles() {
    this.tileMeshes = []
    this.tileDecals = []
    this.artImgs = {}
    const geo = new RoundedBoxGeometry(S - 0.14, 0.26, S - 0.14, 3, 0.07)
    const decalGeo = new THREE.PlaneGeometry(S - 0.34, S - 0.34)
    // 寫實畫風:格子是石板,文字貼紙會受光照,但保留一點自發光讓字在黃昏也看得清楚
    const stone = this.real ? new THREE.MeshStandardMaterial({ map: R.stoneTex([222, 214, 198]), roughness: 0.62 }) : null
    this.board.forEach((tile, i) => {
      const p = tileXZ(i)
      const mat = stone || new THREE.MeshStandardMaterial({ color: 0xfffdf5, roughness: 0.55 })
      const m = new THREE.Mesh(geo, mat)
      m.position.set(p.x, 0.43, p.z)
      m.castShadow = true
      m.receiveShadow = true
      this.scene.add(m)
      // 色條(格子外側邊)
      const tex = this.drawTileTex(i, null)
      const decal = new THREE.Mesh(decalGeo, this.real
        ? new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: 0xffffff, emissiveIntensity: 0.22, transparent: true, roughness: 0.8 })
        : new THREE.MeshBasicMaterial({ map: tex, transparent: true }))
      decal.rotation.x = -Math.PI / 2
      decal.position.set(p.x, 0.565, p.z)
      this.scene.add(decal)
      this.tileMeshes.push(m)
      this.tileDecals.push(decal)
    })
  }

  buildCity() {
    const rnd = mulberry(20260601)
    const pastel = [0xf9d5c7, 0xfde4a8, 0xc9e4f5, 0xd7ecd0, 0xe6d7f5, 0xffd9e6, 0xf5e6c8]
    const roofs = [0xd96a4b, 0x4f8cff, 0x2eb67d, 0x9b6bff, 0xf5a524]
    const group = new THREE.Group()
    const { inner, bay } = groundCells()
    const plateGeo = new RoundedBoxGeometry(S - 0.05, 0.16, S - 0.05, 3, 0.06)
    const plateMat = new THREE.MeshStandardMaterial({ color: 0xf3efe0, roughness: 0.9 })
    const lawnMat = new THREE.MeshStandardMaterial({ color: 0xb9e6a6, roughness: 1 })
    const pondMat = new THREE.MeshStandardMaterial({ color: 0x7cc7e8, roughness: 0.2, metalness: 0.1 })
    const tree = (x, z, sc = 1) => {
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.07 * sc, 0.09 * sc, 0.4 * sc, 8), new THREE.MeshStandardMaterial({ color: 0x8a5a3c }))
      trunk.position.set(x, 0.65, z)
      const crown = new THREE.Mesh(new THREE.ConeGeometry(0.38 * sc, 0.9 * sc, 8), new THREE.MeshStandardMaterial({ color: 0x2f9e6b, roughness: 0.8 }))
      crown.position.set(x, 0.65 + 0.2 * sc + 0.45 * sc, z)
      crown.castShadow = true
      group.add(trunk, crown)
    }
    // 中央高塔:放在最靠近棋盤中心的街區格;它和相鄰的格子保留成廣場(骰子落在這裡)
    let plaza = inner[0]
    for (const c of inner) if (Math.hypot(c.c - (MAP_COLS - 1) / 2, c.r - (MAP_ROWS - 1) / 2) < Math.hypot(plaza.c - (MAP_COLS - 1) / 2, plaza.r - (MAP_ROWS - 1) / 2)) plaza = c
    const tp = cellXZ(plaza.c, plaza.r)
    this.towerPos = tp
    const isPlaza = (c) => Math.abs(c.c - plaza.c) <= 1 && Math.abs(c.r - plaza.r) <= 1

    for (const cell of inner) {
      const p = cellXZ(cell.c, cell.r)
      const plate = new THREE.Mesh(plateGeo, plateMat)
      plate.position.set(p.x, 0.36, p.z)
      plate.receiveShadow = true
      group.add(plate)
      if (cell === plaza) {
        const tower = new THREE.Mesh(
          new RoundedBoxGeometry(1.2, 4.2, 1.2, 3, 0.2),
          new THREE.MeshStandardMaterial({ color: 0x0b9a62, roughness: 0.35, metalness: 0.2 }),
        )
        tower.position.set(p.x, 2.55, p.z)
        tower.castShadow = true
        group.add(tower)
        this.fadeMats = [tower.material]
        const cap = new THREE.Mesh(new THREE.ConeGeometry(0.95, 1.1, 4), new THREE.MeshStandardMaterial({ color: 0xffd166 }))
        cap.position.set(p.x, 5.2, p.z)
        cap.rotation.y = Math.PI / 4
        cap.castShadow = true
        group.add(cap)
        this.fadeMats.push(cap.material)
        continue
      }
      if (isPlaza(cell)) { tree(p.x + (rnd() - 0.5) * 0.8, p.z + (rnd() - 0.5) * 0.8, 0.8); continue }
      // 街區:一到兩棟低矮的小樓(不要擋到後面的格子)
      const n = 1 + Math.floor(rnd() * 2)
      for (let k = 0; k < n; k++) {
        const w = 0.7 + rnd() * 0.45, d = 0.7 + rnd() * 0.45, h = 0.6 + rnd() * 0.9
        const ox = n === 1 ? (rnd() - 0.5) * 0.3 : (k ? 0.42 : -0.42), oz = (rnd() - 0.5) * 0.5
        const b = new THREE.Mesh(
          new RoundedBoxGeometry(w, h, d, 2, 0.08),
          new THREE.MeshStandardMaterial({ map: windowTex(pastel[Math.floor(rnd() * pastel.length)]), roughness: 0.7 }),
        )
        b.position.set(p.x + ox, 0.45 + h / 2, p.z + oz)
        b.castShadow = true
        b.receiveShadow = true
        group.add(b)
        const roof = new THREE.Mesh(
          new RoundedBoxGeometry(w + 0.12, 0.14, d + 0.12, 2, 0.05),
          new THREE.MeshStandardMaterial({ color: roofs[Math.floor(rnd() * roofs.length)], roughness: 0.6 }),
        )
        roof.position.set(p.x + ox, 0.45 + h + 0.07, p.z + oz)
        roof.castShadow = true
        group.add(roof)
      }
      if (rnd() < 0.6) tree(p.x + (rnd() - 0.5) * 1.3, p.z + (rnd() > 0.5 ? 0.8 : -0.8), 0.7)
    }
    // 缺口的庭園:草地、池塘與樹
    bay.forEach((cell, i) => {
      const p = cellXZ(cell.c, cell.r)
      const lawn = new THREE.Mesh(plateGeo, lawnMat)
      lawn.position.set(p.x, 0.36, p.z)
      lawn.receiveShadow = true
      group.add(lawn)
      if ((cell.c + cell.r) % 3 === 1 && i % 2 === 0) {
        const pond = new THREE.Mesh(new THREE.CylinderGeometry(0.78, 0.78, 0.05, 28), pondMat)
        this.pondPos = this.pondPos || new THREE.Vector3(p.x, 0.5, p.z)
        pond.position.set(p.x, 0.46, p.z)
        group.add(pond)
      } else {
        tree(p.x + (rnd() - 0.5) * 0.9, p.z + (rnd() - 0.5) * 0.9, 0.9 + rnd() * 0.3)
        if (rnd() < 0.5) tree(p.x + (rnd() - 0.5) * 1.2, p.z + (rnd() - 0.5) * 1.2, 0.65)
      }
    })
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

  // ---------- 資產格標記:誰擁有、等級、有沒有保險 ----------
  // 地產格貼上 Gemini 插圖:map = { 格子編號: 圖片網址 }。載入失敗就維持原本的表情符號貼圖。
  setArt(map) {
    for (const [k, url] of Object.entries(map || {})) {
      const i = Number(k)
      const tile = this.board[i]
      const decal = this.tileDecals[i]
      if (!tile?.prop || !decal) continue
      const img = new Image()
      img.onload = () => {
        if (this.disposed) return
        this.artImgs[i] = img
        const tex = this.drawTileTex(i, img)
        decal.material.map?.dispose?.()
        decal.material.map = tex
      if (decal.material.emissiveMap) decal.material.emissiveMap = tex
        if (decal.material.emissiveMap) decal.material.emissiveMap = tex
        decal.material.needsUpdate = true
      }
      img.src = url
    }
  }

  // 語言切換後,用目前語言重畫所有格子貼圖、出售牌(以及保留地產插圖)
  refreshLabels() {
    if (this.disposed) return
    this.tileDecals.forEach((decal, i) => {
      const tex = this.drawTileTex(i, this.artImgs[i] || null)
      decal.material.map?.dispose?.()
      decal.material.map = tex
      if (decal.material.emissiveMap) decal.material.emissiveMap = tex
      decal.material.needsUpdate = true
    })
    // 出售牌文字:讓 setOwners 重畫所有「無人持有」的標記
    for (const cur of Object.values(this.propMarkers || {})) if (cur.sig === 'free') cur.sig = 'stale'
    this.setOwners(this.lastOwners || {})
  }

  setOwners(map) {
    this.lastOwners = map
    this.propMarkers = this.propMarkers || {}
    const colors = [0xffc107, 0xe5484d, 0x3b82f6, 0xa855f7]
    this.board.forEach((tile, i) => {
      if (tile.type !== 'property') return
      const st = map[i] || null
      const sig = st ? `${st.ownerIdx}:${st.level}:${st.insured ? 1 : 0}` : 'free'
      const cur = this.propMarkers[i]
      if (cur && cur.sig === sig) return
      if (cur) { this.scene.remove(cur.g); cur.g.traverse((o) => { o.geometry?.dispose?.(); o.material?.map?.dispose?.(); o.material?.dispose?.() }) }
      const g = new THREE.Group()
      if (!st) {
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.1, 8), new THREE.MeshStandardMaterial({ color: 0x6b7280 }))
        pole.position.y = 0.55
        const sign = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.34, 0.05), new THREE.MeshStandardMaterial({
          map: canvasTex(128, 64, (c, w, h) => { c.fillStyle = '#e5484d'; c.fillRect(0, 0, w, h); c.fillStyle = '#fff'; c.textAlign = 'center'; c.textBaseline = 'middle'; fillFit(c, t('出售'), w / 2, h / 2 + 2, 116, 800, 38, 18, '"Noto Sans TC",sans-serif') }),
        }))
        sign.position.set(0.31, 1.0, 0)
        g.add(pole, sign)
      } else {
        const col = colors[st.ownerIdx % colors.length]
        const h = 0.55 + st.level * 0.42
        const body = new THREE.Mesh(new RoundedBoxGeometry(0.72, h, 0.72, 2, 0.06), new THREE.MeshStandardMaterial({ color: col, roughness: 0.5 }))
        body.position.y = h / 2
        body.castShadow = true
        const roof = new THREE.Mesh(new THREE.ConeGeometry(0.62, 0.34, 4), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 }))
        roof.position.y = h + 0.17
        roof.rotation.y = Math.PI / 4
        g.add(body, roof)
        if (st.level >= 3) {
          const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.5, 6), new THREE.MeshStandardMaterial({ color: 0xffd166 }))
          ant.position.y = h + 0.6
          g.add(ant)
        }
        if (st.insured) {
          const shield = new THREE.Sprite(new THREE.SpriteMaterial({ map: canvasTex(64, 64, (c, w, h2) => { c.font = '48px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('🛡️', w / 2, h2 / 2) }), transparent: true, depthTest: false }))
          shield.scale.set(0.55, 0.55, 1)
          shield.position.set(0, h + 0.85, 0)
          shield.renderOrder = 11
          g.add(shield)
        }
      }
      const p = tileXZ(i)
      g.position.set(p.x - 0.5, 0.56, p.z - 0.5)
      this.scene.add(g)
      this.propMarkers[i] = { g, sig }
    })
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
    const armM = new THREE.MeshStandardMaterial({ color: look.top, roughness: 0.55 })
    for (const x of [-0.36, 0.36]) {
      const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.32, 4, 8), armM)
      arm.position.set(x, 0.66, 0)
      arm.rotation.z = x < 0 ? 0.25 : -0.25
      g.add(arm)
    }
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
    this.focusIdx = i
    this.setMode('token')
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

  setMode(mode) {
    this.mode = mode
    const d = this.baseDist || 33
    this.orbit.tDist = mode === 'dice' ? d * 0.6 : mode === 'token' ? d * 0.68 : d
    // 寫實畫風的鏡頭壓低一點,看得到地平線與天空,比較有電影感
    this.orbit.tPol = this.real ? (mode === 'board' ? 0.86 : 0.98) : mode === 'board' ? 0.78 : 0.7
  }

  focusPlayer(i) {
    this.focusIdx = i
    this.setMode('token')
  }

  overview() {
    this.setMode('board')
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
    d.scale.setScalar(1)
    this.setMode('dice')
    const target = new THREE.Quaternion().setFromUnitVectors(this.faceNormals[value], new THREE.Vector3(0, 1, 0))
    target.premultiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.random() * Math.PI * 2))
    const axis = new THREE.Vector3(Math.random() - 0.5, Math.random() * 0.4, Math.random() - 0.5).normalize()
    const start = new THREE.Vector3((Math.random() - 0.5) * 3 - 6, 9, 5 + Math.random() * 2)
    // 落在高塔「靠鏡頭的這一側」,視角怎麼轉都不會被塔擋住
    const az = this.orbit.tAz
    const j = (Math.random() - 0.5) * 0.9
    const tp = this.towerPos || new THREE.Vector3()
    const end = new THREE.Vector3(tp.x + Math.sin(az) * 1.7 + Math.cos(az) * j, 1.35, tp.z + Math.cos(az) * 1.7 - Math.sin(az) * j)
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

  // ---------- 開場運鏡 ----------
  // 像參考影片那樣,從小東西的特寫慢慢拉遠:塔尖 → 路燈 → 天際線橫移 → 起點與棋子 → 全景。點一下畫面可以跳過。
  playIntro() {
    const V = (x, y, z) => new THREE.Vector3(x, y, z)
    const tp = this.towerPos || V(0, 0, 0)
    const st = tileXZ(0)
    const lamp = this.lampPos || tileXZ(3)
    const shots = [
      // 1 塔尖特寫,繞半圈
      { from: V(tp.x + 2.6, 5.4, tp.z + 2.6), to: V(tp.x - 2.4, 6.3, tp.z + 2.8), look: V(tp.x, 5.6, tp.z), lookTo: V(tp.x, 5.2, tp.z), d: 3.2 },
      // 2 路燈與街區
      { from: V(lamp.x + 2.4, 1.5, lamp.z + 2.2), to: V(lamp.x + 1.4, 1.9, lamp.z - 1.4), look: V(lamp.x, 1.3, lamp.z), d: 2.6 },
      // 3 低角度橫移:城市天際線與天空
      { from: V(-HW - 3, 3.0, HH + 6), to: V(HW + 3, 3.4, HH + 6), look: V(-2, 1.2, 0), lookTo: V(2, 1.2, 0), d: 4.2 },
      // 4 起點格與棋子
      { from: V(st.x + 3.2, 3.4, st.z + 3.6), to: V(st.x + 2.2, 2.4, st.z + 2.6), look: V(st.x, 0.8, st.z), d: 2.8 },
    ]
    const t1 = st
    // 最後一顆:從資產格拉到遊戲用的全景視角
    const o = this.orbit
    const sp = Math.sin(o.tPol), cp = Math.cos(o.tPol)
    const end = V(Math.sin(o.tAz) * sp * this.baseDist, cp * this.baseDist, Math.cos(o.tAz) * sp * this.baseDist)
    // 5 拉回遊戲用的全景
    shots.push({ from: V(t1.x + 2.2, 2.4, t1.z + 2.6), to: end, look: V(t1.x, 0.8, t1.z), lookTo: V(0, 0.2, 0), d: 3.6 })
    return new Promise((resolve) => {
      let i = 0
      const labels = []
      for (const tk of this.tokens) tk.group.traverse((o) => { if (o.isSprite) { labels.push(o); o.visible = false } })
      const finish = () => {
        for (const l of labels) l.visible = true
        this.cine = null
        this.renderer.domElement.removeEventListener('pointerdown', finish)
        o.az = o.tAz; o.pol = o.tPol; o.dist = o.tDist
        this.camTarget.set(0, 0, 0)
        resolve()
      }
      this.cine = {
        shot: shots[0], t: 0,
        next: () => {
          i++
          if (i >= shots.length || this.disposed) return finish()
          this.cine.shot = shots[i]
          this.cine.t = 0
        },
      }
      this.renderer.domElement.addEventListener('pointerdown', finish)
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
    let lx = 0, ly = 0, sx = 0, sy = 0
    const down = (e) => { dragging = true; lx = sx = e.clientX; ly = sy = e.clientY; el.setPointerCapture?.(e.pointerId) }
    const move = (e) => {
      if (!dragging) return
      this.userRotated = true
      this.orbit.tAz -= (e.clientX - lx) * 0.006
      this.orbit.tPol = Math.min(1.25, Math.max(0.55, this.orbit.tPol - (e.clientY - ly) * 0.005))
      lx = e.clientX; ly = e.clientY
    }
    const up = (e) => {
      dragging = false
      // 沒有拖曳的點擊:看點到哪一格,交給外面顯示格子說明
      if (e && Math.hypot(e.clientX - sx, e.clientY - sy) < 6 && this.onTileClick && !this.cine) {
        const r = el.getBoundingClientRect()
        const ray = new THREE.Raycaster()
        ray.setFromCamera(new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), this.camera)
        const hit = ray.intersectObjects([...this.tileMeshes, ...this.tileDecals], false)[0]
        if (hit) {
          const i = Math.max(this.tileMeshes.indexOf(hit.object), this.tileDecals.indexOf(hit.object))
          if (i >= 0) this.onTileClick(i)
        }
      }
    }
    const wheel = (e) => {
      e.preventDefault()
      this.orbit.tDist = Math.min((this.baseDist || 30) * 1.4, Math.max(14, this.orbit.tDist + e.deltaY * 0.02))
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
    this.fx?.setSize(w, h)
    this.camera.aspect = w / h
    // 依畫面比例擺鏡頭:寬螢幕沿著棋盤長邊看;直立或窄的畫面把棋盤轉 90 度,讓長邊對著螢幕的長邊
    const aspect = w / h
    const k = 2 * Math.tan((38 / 2) * Math.PI / 180) // 距離 1 時畫面高度
    const long = HW * 2 + 5, short = HH * 2 + 5
    const flat = 1.0 // 斜視會壓縮深度,但近處被透視放大,兩者大致抵消
    const dWide = Math.max(long / (k * aspect), (short * flat) / k)
    const dTall = Math.max(short / (k * aspect), (long * flat) / k)
    const tall = dTall < dWide
    this.baseDist = Math.max(20, Math.min((tall ? dTall : dWide) * (this.real ? 0.97 : 1.05), 80))
    this.orbit.dist = this.baseDist
    if (!this.userRotated) { this.orbit.tAz = tall ? Math.PI / 2 : 0; if (!this.fitted) this.orbit.az = this.orbit.tAz; this.fitted = true }
    this.setMode(this.mode || 'board')
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

    // 雲飄動、車輛繞行、有棋子的格子微微浮起
    for (const c of this.clouds || []) {
      c.g.position.x += c.v * dt
      if (c.g.position.x > 60) c.g.position.x = -60
      c.g.visible = c.g.position.distanceTo(this.camera.position) > 22 // 鏡頭穿過雲層時不要被擋住
    }
    for (const c of this.cars || []) {
      const L = 6 * S - 1.2
      c.t = (c.t + dt * 2.4) % L
      const p = -L / 2 + c.t
      const { axis, fixed, dir } = c.ln
      const q = dir > 0 ? p : -p
      if (axis === 'z') { c.car.position.set(fixed, 0.46, q); c.car.rotation.y = dir > 0 ? Math.PI / 2 : -Math.PI / 2 }
      else { c.car.position.set(q, 0.46, fixed); c.car.rotation.y = dir > 0 ? Math.PI : 0 }
    }
    this.tileMeshes.forEach((m, i) => {
      const here = this.tokens.some((tk) => tk.pos === i)
      const ty = (here ? 0.55 : 0.43)
      m.position.y += (ty - m.position.y) * 0.2
      this.tileDecals[i].position.y = m.position.y + 0.135
      if (this.propMarkers?.[i]) this.propMarkers[i].g.position.y = m.position.y + 0.13
    })

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

    // 擲骰時高塔變半透明,骰子永遠看得到
    const fadeGoal = this.mode === 'dice' && this.dice.visible ? 0.18 : 1
    for (const m of this.fadeMats || []) {
      m.transparent = true
      m.opacity += (fadeGoal - m.opacity) * 0.15
      m.depthWrite = m.opacity > 0.9
    }

    // 開場運鏡進行中:鏡頭位置由 cine 控制
    if (this.cine) {
      const c = this.cine
      c.t += dt
      const k = ease.inOut(Math.min(1, c.t / c.shot.d))
      this.camera.position.lerpVectors(c.shot.from, c.shot.to, k)
      const look = new THREE.Vector3().lerpVectors(c.shot.look, c.shot.lookTo || c.shot.look, k)
      this.camera.lookAt(look)
      if (c.t >= c.shot.d) c.next()
      this.present(dt, 0.7)
      return
    }

    // 相機:緩動跟隨焦點棋子
    const o = this.orbit
    o.az += (o.tAz - o.az) * 0.08
    o.pol += (o.tPol - o.pol) * 0.07
    o.dist += (o.tDist - o.dist) * 0.07
    if (this.mode === 'dice' && this.dice.visible) this.camTargetGoal.set(this.dice.position.x, 0, this.dice.position.z)
    else if (this.mode === 'token' && this.tokens[this.focusIdx]) {
      const g = this.tokens[this.focusIdx].group.position
      this.camTargetGoal.set(g.x, 0, g.z)
    } else this.camTargetGoal.set(0, 0, 0)
    this.camTarget.lerp(this.camTargetGoal, this.mode === 'board' ? 0.05 : 0.12)
    const sp = Math.sin(o.pol), cp = Math.cos(o.pol)
    this.camera.position.set(
      this.camTarget.x + Math.sin(o.az) * sp * o.dist,
      cp * o.dist,
      this.camTarget.z + Math.cos(o.az) * sp * o.dist,
    )
    this.camera.lookAt(this.camTarget.x, 0.2, this.camTarget.z)
    // 移軸景深:跟著棋子或骰子時比較明顯,全景時輕一點
    this.present(dt, this.mode === 'board' ? 0.45 : 0.85)
  }

  present(dt, tiltGoal) {
    if (this.fx) {
      if (this.water) this.water.material.uniforms.time.value += dt * 0.35
      const g = this.fx.grade.uniforms
      if (!this.degraded) g.tilt.value += (tiltGoal - g.tilt.value) * 0.05
      this.fx.composer.render(dt)
      this.watchFps(dt)
    } else this.renderer.render(this.scene, this.camera)
  }

  // 效能保護:寫實畫風連續太慢(平均每格超過 45ms)就關掉光暈、移軸與水面反射
  watchFps(dt) {
    if (this.degraded) return
    this.frameTimes.push(dt)
    if (this.frameTimes.length < 120) return
    const avg = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length
    this.frameTimes = []
    if (avg < 0.045) return
    this.degraded = true
    this.fx.bloomPass.enabled = false
    this.fx.grade.uniforms.tilt.value = 0
    this.fx.grade.enabled = false
    if (this.water) { this.water.visible = false; this.lowWater?.() }
    this.renderer.setPixelRatio(1)
    this.resize()
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
    if (this.fx) { this.fx.composer.renderTarget1.dispose(); this.fx.composer.renderTarget2.dispose(); this.fx.composer.dispose?.() }
    this.env?.dispose?.()
    this.renderer.dispose()
    this.renderer.domElement.remove()
  }
}
