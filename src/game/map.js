// 棋盤地圖:一條彎彎繞繞的封閉路徑,每一格都是座標格子上的一個點。
// 2D、3D 兩種棋盤共用這份座標;要換地圖只要改 WAYPOINTS(轉角點,相鄰兩點必須同一列或同一行)。
// 座標是 { c: 欄(向右), r: 列(向下) }。路徑第 0 格是起點,順著走一圈會回到起點。
const WAYPOINTS = [
  [0, 0], [2, 0], [2, 3], [4, 3], [4, 0], [10, 0], [10, 5], [8, 5], [8, 2], [6, 2], [6, 5], [0, 5],
]

function walk(points) {
  const out = []
  for (let k = 0; k < points.length; k++) {
    const [c0, r0] = points[k]
    const [c1, r1] = points[(k + 1) % points.length]
    const n = Math.abs(c1 - c0) + Math.abs(r1 - r0)
    const dc = Math.sign(c1 - c0), dr = Math.sign(r1 - r0)
    for (let i = 0; i < n; i++) out.push({ c: c0 + dc * i, r: r0 + dr * i })
  }
  return out
}

export const MAP_PATH = walk(WAYPOINTS)
export const MAP_SIZE = MAP_PATH.length
export const MAP_COLS = Math.max(...MAP_PATH.map((p) => p.c)) + 1
export const MAP_ROWS = Math.max(...MAP_PATH.map((p) => p.r)) + 1
export const tileCoord = (i) => MAP_PATH[((i % MAP_SIZE) + MAP_SIZE) % MAP_SIZE]

const onPath = new Set(MAP_PATH.map((p) => `${p.c},${p.r}`))

// 點在多邊形內?(射線法;格子中心偏移半格,避開剛好落在邊上的情況)
function inside(c, r) {
  let hit = false
  for (let k = 0; k < WAYPOINTS.length; k++) {
    const [x0, y0] = WAYPOINTS[k]
    const [x1, y1] = WAYPOINTS[(k + 1) % WAYPOINTS.length]
    if (x0 !== x1) continue // 只看垂直邊
    const lo = Math.min(y0, y1), hi = Math.max(y0, y1)
    if (r + 0.5 > lo && r + 0.5 < hi && x0 > c) hit = !hit
  }
  return hit
}

// 把非路徑的格子分成:路徑圍起來的「街區」(inner)與缺口、外圍的「庭園」(bay)
export function groundCells(margin = 0) {
  const inner = [], bay = []
  for (let r = -margin; r < MAP_ROWS + margin; r++) {
    for (let c = -margin; c < MAP_COLS + margin; c++) {
      if (onPath.has(`${c},${r}`)) continue
      if (inside(c, r)) inner.push({ c, r })
      else if (c >= 0 && c < MAP_COLS && r >= 0 && r < MAP_ROWS) bay.push({ c, r })
    }
  }
  return { inner, bay }
}
