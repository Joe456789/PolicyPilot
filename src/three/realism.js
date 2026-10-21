// 寫實畫風的工具箱:天空、環境光、水面、程式產生的材質貼圖、後製(光暈、移軸景深、調色)。
// 全部由程式生成,不讀任何外部圖檔;卡通畫風不會載入這些東西的效果。
import * as THREE from 'three'
import { Sky } from 'three/examples/jsm/objects/Sky.js'
import { Water } from 'three/examples/jsm/objects/Water.js'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'

// ---------- 可無縫重複的雜訊 ----------
function rand2(x, y, seed) {
  let h = (x * 374761393 + y * 668265263 + seed * 2147483647) | 0
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}
// period:幾格後重複(讓貼圖可以無縫拼接)
function valueNoise(x, y, period, seed) {
  const xi = Math.floor(x), yi = Math.floor(y)
  const xf = x - xi, yf = y - yi
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf)
  const w = (a) => ((a % period) + period) % period
  const a = rand2(w(xi), w(yi), seed), b = rand2(w(xi + 1), w(yi), seed)
  const c = rand2(w(xi), w(yi + 1), seed), d = rand2(w(xi + 1), w(yi + 1), seed)
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v
}
export function fbm(x, y, base = 4, oct = 4, seed = 1) {
  let s = 0, amp = 0.5, f = base
  for (let o = 0; o < oct; o++) { s += valueNoise(x * f, y * f, f, seed + o * 17) * amp; amp *= 0.5; f *= 2 }
  return s
}

// 用每個像素的函式畫一張貼圖。fn(u, v) 回傳 [r, g, b](0~255)
function pixelTex(size, fn, { srgb = true, repeat = 1 } = {}) {
  const c = document.createElement('canvas')
  c.width = c.height = size
  const g = c.getContext('2d')
  const img = g.createImageData(size, size)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const [r, gg, b] = fn(x / size, y / size, x, y)
      const k = (y * size + x) * 4
      img.data[k] = r; img.data[k + 1] = gg; img.data[k + 2] = b; img.data[k + 3] = 255
    }
  }
  g.putImageData(img, 0, 0)
  const tex = new THREE.CanvasTexture(c)
  if (srgb) tex.colorSpace = THREE.SRGBColorSpace
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.repeat.set(repeat, repeat)
  tex.anisotropy = 8
  return tex
}
const mix = (a, b, t) => a + (b - a) * t
const mixRGB = (a, b, t) => [mix(a[0], b[0], t), mix(a[1], b[1], t), mix(a[2], b[2], t)]
const clamp01 = (x) => Math.max(0, Math.min(1, x))

// ---------- 材質貼圖 ----------
export function grassTex(repeat) {
  return pixelTex(256, (u, v) => {
    const n = fbm(u, v, 6, 5, 3)
    const fine = rand2(Math.floor(u * 256), Math.floor(v * 256), 9)
    const c = mixRGB([62, 98, 44], [118, 148, 70], clamp01(n * 1.4 - 0.2))
    const d = 0.85 + fine * 0.25
    return [c[0] * d, c[1] * d, c[2] * d]
  }, { repeat })
}
export function sandTex(repeat) {
  return pixelTex(256, (u, v) => {
    const n = fbm(u, v, 8, 4, 5)
    const fine = rand2(Math.floor(u * 256), Math.floor(v * 256), 4)
    const c = mixRGB([196, 176, 140], [228, 212, 178], n)
    const d = 0.9 + fine * 0.16
    return [c[0] * d, c[1] * d, c[2] * d]
  }, { repeat })
}
// 石板:格子本體與廣場
export function stoneTex(tint = [214, 206, 190], repeat = 1) {
  return pixelTex(256, (u, v) => {
    const n = fbm(u, v, 4, 5, 11)
    const vein = Math.abs(Math.sin((u * 3 + n * 4) * Math.PI)) ** 18
    const fine = rand2(Math.floor(u * 256), Math.floor(v * 256), 21)
    const d = 0.86 + n * 0.22 + fine * 0.06 - vein * 0.1
    return [tint[0] * d, tint[1] * d, tint[2] * d]
  }, { repeat })
}
// 鋪面:方形地磚
export function pavingTex(repeat = 1) {
  return pixelTex(256, (u, v) => {
    const gu = (u * 4) % 1, gv = (v * 4) % 1
    const joint = gu < 0.04 || gv < 0.04
    const id = Math.floor(u * 4) * 7 + Math.floor(v * 4) * 13
    const n = fbm(u, v, 8, 3, 31)
    const base = 0.86 + rand2(id, 1, 5) * 0.12 + n * 0.08
    const c = joint ? [120, 112, 100] : [200 * base, 190 * base, 172 * base]
    return c
  }, { repeat })
}
// 深色木紋(棋盤底座)
export function woodTex(repeat = 1) {
  return pixelTex(256, (u, v) => {
    const n = fbm(u, v * 0.25, 4, 4, 41)
    const ring = (Math.sin((v * 22 + n * 9) * Math.PI) + 1) / 2
    const fine = rand2(Math.floor(u * 256), Math.floor(v * 256), 8)
    const c = mixRGB([58, 34, 20], [104, 64, 36], ring * 0.7 + n * 0.3)
    const d = 0.92 + fine * 0.1
    return [c[0] * d, c[1] * d, c[2] * d]
  }, { repeat })
}
// 屋瓦
export function roofTex(color = [150, 60, 40]) {
  return pixelTex(128, (u, v) => {
    const row = Math.floor(v * 10)
    const off = row % 2 ? 0.5 : 0
    const cu = ((u * 8 + off) % 1)
    const edge = (v * 10) % 1
    const shade = 0.75 + 0.25 * Math.sin(cu * Math.PI) - (edge > 0.85 ? 0.25 : 0)
    const n = 0.9 + rand2(Math.floor(u * 8 + off), row, 3) * 0.2
    return [color[0] * shade * n, color[1] * shade * n, color[2] * shade * n]
  })
}
// 大樓立面:牆面 + 窗格;另外回傳一張「亮著的窗」自發光貼圖(黃昏時窗戶透出暖光)
export function facadeTex(wall, seed = 1) {
  const cols = 4, rows = 6
  const lit = (c, r) => rand2(c, r, seed) > 0.55
  const map = pixelTex(128, (u, v) => {
    const cu = (u * cols) % 1, rv = (v * rows) % 1
    const win = cu > 0.22 && cu < 0.78 && rv > 0.25 && rv < 0.8
    const n = 0.9 + fbm(u, v, 4, 3, seed) * 0.2
    if (!win) return [wall[0] * n, wall[1] * n, wall[2] * n]
    const L = lit(Math.floor(u * cols), Math.floor(v * rows))
    return L ? [255, 214, 150] : [52, 66, 82]
  })
  const emissive = pixelTex(128, (u, v) => {
    const cu = (u * cols) % 1, rv = (v * rows) % 1
    const win = cu > 0.22 && cu < 0.78 && rv > 0.25 && rv < 0.8
    return win && lit(Math.floor(u * cols), Math.floor(v * rows)) ? [255, 190, 110] : [0, 0, 0]
  })
  return { map, emissive }
}
// 水面法線貼圖(由雜訊高度場換算)
export function waterNormals() {
  const size = 256
  const h = (x, y) => fbm(x / size, y / size, 8, 4, 77)
  return pixelTex(size, (u, v, x, y) => {
    const dx = (h(x + 1, y) - h(x - 1, y)) * 6
    const dy = (h(x, y + 1) - h(x, y - 1)) * 6
    const n = new THREE.Vector3(-dx, -dy, 1).normalize()
    return [(n.x * 0.5 + 0.5) * 255, (n.y * 0.5 + 0.5) * 255, (n.z * 0.5 + 0.5) * 255]
  }, { srgb: false })
}

// ---------- 天空與環境光 ----------
// 傍晚的低角度太陽:影子拉長、天空偏暖,跟參考影片一樣的「黃金時刻」
export function makeSky(renderer, { elevation = 9, azimuth = 125 } = {}) {
  const sky = new Sky()
  sky.scale.setScalar(1500)
  const u = sky.material.uniforms
  u.turbidity.value = 9
  u.rayleigh.value = 2.4
  u.mieCoefficient.value = 0.008
  u.mieDirectionalG.value = 0.86
  const sun = new THREE.Vector3().setFromSphericalCoords(1, THREE.MathUtils.degToRad(90 - elevation), THREE.MathUtils.degToRad(azimuth))
  u.sunPosition.value.copy(sun)
  // 用天空算一張環境貼圖,讓金屬、玻璃、水面有反光
  const pmrem = new THREE.PMREMGenerator(renderer)
  const envScene = new THREE.Scene()
  const envSky = new Sky()
  envSky.scale.setScalar(1500)
  for (const k of Object.keys(u)) envSky.material.uniforms[k].value = u[k].value
  envScene.add(envSky)
  const env = pmrem.fromScene(envScene, 0.02).texture
  pmrem.dispose()
  envSky.geometry.dispose(); envSky.material.dispose()
  return { sky, sun, env }
}

export function makeWater(radius, sun, fog) {
  const water = new Water(new THREE.CircleGeometry(radius, 64), {
    textureWidth: 512,
    textureHeight: 512,
    waterNormals: waterNormals(),
    sunDirection: sun.clone().normalize(),
    sunColor: 0xffe2b8,
    waterColor: 0x0f3b4a,
    distortionScale: 2.2,
    fog: !!fog,
  })
  water.material.uniforms.size.value = 3.5
  water.rotation.x = -Math.PI / 2
  return water
}

// ---------- 後製 ----------
// 調色 + 暗角 + 移軸景深(畫面上下輕微模糊,像拍微縮模型)
const GradeShader = {
  uniforms: {
    tDiffuse: { value: null },
    vignette: { value: 0.42 },
    tilt: { value: 0.0 }, // 0 = 關閉移軸
    focusY: { value: 0.48 },
    res: { value: new THREE.Vector2(1, 1) },
  },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform float vignette; uniform float tilt; uniform float focusY; uniform vec2 res;
    varying vec2 vUv;
    void main(){
      vec4 col = texture2D(tDiffuse, vUv);
      if (tilt > 0.0) {
        float d = smoothstep(0.12, 0.55, abs(vUv.y - focusY)) * tilt;
        vec2 px = vec2(0.0, 1.0 / res.y) * d * 6.0;
        vec2 pxh = vec2(1.0 / res.x, 0.0) * d * 6.0;
        vec4 acc = col * 0.2;
        acc += texture2D(tDiffuse, vUv + px) * 0.15 + texture2D(tDiffuse, vUv - px) * 0.15;
        acc += texture2D(tDiffuse, vUv + pxh) * 0.1 + texture2D(tDiffuse, vUv - pxh) * 0.1;
        acc += texture2D(tDiffuse, vUv + px * 2.0) * 0.08 + texture2D(tDiffuse, vUv - px * 2.0) * 0.08;
        acc += texture2D(tDiffuse, vUv + (px + pxh) * 1.4) * 0.07 + texture2D(tDiffuse, vUv - (px + pxh) * 1.4) * 0.07;
        col = acc;
      }
      // 暖色調、微提對比
      col.rgb = (col.rgb - 0.5) * 1.1 + 0.5;
      float lum = dot(col.rgb, vec3(0.299, 0.587, 0.114));
      col.rgb = mix(vec3(lum), col.rgb, 1.12);
      col.rgb *= vec3(1.06, 1.0, 0.9);
      vec2 q = vUv - 0.5;
      col.rgb *= 1.0 - dot(q, q) * vignette * 1.6;
      gl_FragColor = col;
    }`,
}

export function makeComposer(renderer, scene, camera, { bloom = true } = {}) {
  const size = renderer.getSize(new THREE.Vector2())
  const pr = renderer.getPixelRatio()
  const target = new THREE.WebGLRenderTarget(size.x * pr, size.y * pr, { type: THREE.HalfFloatType, samples: 4 })
  const composer = new EffectComposer(renderer, target)
  composer.addPass(new RenderPass(scene, camera))
  const bloomPass = new UnrealBloomPass(new THREE.Vector2(size.x / 2, size.y / 2), 0.38, 0.6, 0.86)
  bloomPass.enabled = bloom
  composer.addPass(bloomPass)
  composer.addPass(new OutputPass())
  const grade = new ShaderPass(GradeShader)
  composer.addPass(grade)
  const setSize = (w, h) => {
    composer.setSize(w, h)
    bloomPass.resolution.set(w / 2, h / 2)
    grade.uniforms.res.value.set(w * pr, h * pr)
  }
  setSize(size.x, size.y)
  return { composer, bloomPass, grade, setSize }
}
