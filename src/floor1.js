// Evans Hall, floor 1 (ground floor), from the 1st-floor wayfinding plan. That plan is drawn with WEST
// at the BOTTOM (upside down from the floor-2 plan): Stairs B (north) and A (south) on the west facade,
// Zhang Auditorium bulging east under the Beinecke Room, the courtyard (Poorvu Dining Terrace / Shen
// Courtyard) in the middle at ground level. Floor-local coordinates; World/levels add ELEV1.
//
//   NW  McNay Café 1200 (round glass room under drum 2200)    SW  Snyder Forum 1400 (round, under 2400)
//   W   main lobby 1100 between the spiral stairs              E   Zhang Auditorium 1300 doors (locked)
//   N   Charley's Place 1220 servery + Retail Kitchen 1260, dining area, offices 12xx, Stair D (NE)
//   S   Ligon-Lamsam Student Commons 1425, Welcome Center 1415, Student Lounge 1440, atrium, offices 15xx

import { BOUNDS, COLLIDERS, COURTYARD, EAST, H, K, M_X0, M_X1, STAIRS, TOWER_R, arc, boxed, sc, spread } from './layout.js'

export const ELEV1 = -H

export const WALLS1 = []
export const CHAIRS1 = []
const W = (a, b, mat, o = {}) =>
  WALLS1.push({ a, b, mat, part: 'f1', h: o.h ?? H, y0: o.y0 ?? 0, t: o.t ?? 0.2, collide: o.collide ?? true })
const P = (pts, mat, o = {}) => {
  for (let i = 0; i < pts.length - 1; i++) W(pts[i], pts[i + 1], mat, o)
}
const dot = (p, t = 0.7) => W(p, [p[0] + 0.01, p[1]], 'none', { t })
const TAU = Math.PI * 2
const { xMin, xMax, zMin, zMax } = BOUNDS
const towers = STAIRS.filter((s) => s.spiral)

// ---------- shell: glass on the west, north and south; solid on the east (the auditorium is behind it)
export const ENTRANCE = { x: xMin, z0: -2.4, z1: 2.4 } // main doors on Whitney Ave (closed)
{
  // west facade, split around the spiral stair towers
  const cuts = towers.map((t) => [t.c[1] - TOWER_R, t.c[1] + TOWER_R]).sort((a, b) => a[0] - b[0])
  let z = zMin
  for (const [z0, z1] of cuts) {
    W([xMin, z], [xMin, z0], 'exterior')
    z = z1
  }
  W([xMin, z], [xMin, zMax], 'exterior')
}
W([xMin, zMin], [xMax, zMin], 'exterior')
W([xMin, zMax], [xMax, zMax], 'exterior')
W([EAST, zMin], [EAST, zMax], 'white')

// ---------- courtyard glass with doors out to the terrace (north pair by Charley's, south pair by the Commons)
const DOOR_W = 1.8
const doorTargets = [[-6, -20], [7, -20], [-6, 20], [7, 20]].map(sc)
export const COURT_DOORS = doorTargets.map(([tx, tz]) => {
  let best = 0
  COURTYARD.forEach((p, i) => {
    if (Math.hypot(p[0] - tx, p[1] - tz) < Math.hypot(COURTYARD[best][0] - tx, COURTYARD[best][1] - tz)) best = i
  })
  const p = COURTYARD[best]
  const q = COURTYARD[(best + 1) % COURTYARD.length]
  const along = Math.atan2(q[1] - p[1], q[0] - p[0])
  return { x: p[0], z: p[1], along, north: tz < 0 }
})
// courtyard glass as open runs between the doors (rendered as ribbons; colliders here)
export const COURT_RUNS = []
{
  const n = COURTYARD.length
  const gapAt = (i) => COURT_DOORS.some((d) => Math.hypot(COURTYARD[i][0] - d.x, COURTYARD[i][1] - d.z) < DOOR_W / 2)
  let run = []
  for (let k = 0; k <= n; k++) {
    const i = k % n
    if (gapAt(i)) {
      if (run.length > 1) COURT_RUNS.push(run)
      run = []
    } else run.push(COURTYARD[i])
  }
  if (run.length > 1) COURT_RUNS.push(run)
  for (const r of COURT_RUNS) P(r, 'none', { t: 0.15 })
}

// ---------- round glass rooms in the west corners
const roomAt = (drumC, r, front, name, num, gapHalf) => {
  const dir = Math.hypot(...front)
  const phi = Math.atan2(front[0] / dir, front[1] / dir) // entrance faces the courtyard
  const ring = arc(drumC, r, r, phi + gapHalf, phi + TAU - gapHalf, 56)
  P(ring, 'none', { t: 0.12 })
  return { c: drumC, r, phi, gapHalf, name, num }
}
export const CAFE = roomAt(sc([-31, -28.4]), 7 * 1.2, [1, 1], 'McNay Café', '1200', 0.16)
export const FORUM = roomAt(sc([-31, 28.4]), 7.5 * 1.2, [1, -1], 'Snyder Forum', '1400', 0.15)

// café: curved wood counter with a glass pastry case, wire stools at high tables, an orange sofa
export const CAFE_COUNTER = { c: [CAFE.c[0] + 1.2, CAFE.c[1] + 0.6], r: 2.2, a0: CAFE.phi - 1.2, a1: CAFE.phi + 1.6 }
P(arc(CAFE_COUNTER.c, CAFE_COUNTER.r, CAFE_COUNTER.r, CAFE_COUNTER.a0, CAFE_COUNTER.a1, 20), 'none', { t: 0.7 })
export const CAFE_TABLES = [[-35.5, -27], [-34, -31.5], [-30, -33.5], [-36, -23.5]].map(sc).map(([x, z]) => ({ x, z }))
for (const t of CAFE_TABLES) {
  dot([t.x, t.z], 0.75)
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * TAU + 0.4
    CHAIRS1.push({ x: t.x + Math.sin(a) * 0.75, z: t.z + Math.cos(a) * 0.75, rot: a, kind: 'stool' })
  }
}
const [sofaA, sofaB] = spread([-33.6, -22.6], [-30.4, -21.9])
export const CAFE_SOFA = { a: sofaA, b: sofaB }
W(CAFE_SOFA.a, CAFE_SOFA.b, 'orange', { h: 0.55, t: 0.9 })

// Snyder Forum: long wood tables with black chairs, glass all round
export const FORUM_TABLES = []
for (const [x, z] of [[-34, 26], [-34, 31], [-29.5, 33], [-30, 24.5]].map(sc)) {
  FORUM_TABLES.push({ x, z })
  W([x - 1.2, z], [x + 1.2, z], 'none', { t: 0.9 })
  for (const dx of [-0.8, 0, 0.8]) for (const s of [-1, 1]) CHAIRS1.push({ x: x + dx, z: z + s * 0.75, rot: s > 0 ? 0 : Math.PI })
}

// ---------- west lobby 1100: closed glass entrance doors, "Edward P. Evans Hall" wall
W([ENTRANCE.x, ENTRANCE.z0], [ENTRANCE.x, ENTRANCE.z1], 'none', { t: 0.2 })
export const LOBBY_WALL = { x: -29 * K, z0: -4.5, z1: 4.5 } // dark name wall facing the entrance
W([LOBBY_WALL.x, LOBBY_WALL.z0], [LOBBY_WALL.x, LOBBY_WALL.z1], 'darkPanel', { t: 0.4 })

// ---------- north: offices 12xx along the wall, Retail Kitchen 1260 + Charley's Place 1220 servery
export const OFFICE_DOORS1 = []
const officeRow = (zFront, zBack, x0, x1, n, numAt, side) => {
  const w = (x1 - x0) / n
  for (let i = 0; i <= n; i++) W([x0 + i * w, zFront], [x0 + i * w, zBack], 'white', { t: 0.15 })
  for (let i = 0; i < n; i++) {
    const cx = x0 + (i + 0.5) * w
    W([x0 + i * w, zFront], [cx - 0.5, zFront], 'white', { t: 0.15 })
    W([cx + 0.5, zFront], [x0 + (i + 1) * w, zFront], 'white', { t: 0.15 })
    W([cx - 0.5, zFront], [cx + 0.5, zFront], 'white', { t: 0.15, y0: 2.25, h: H - 2.25, collide: false })
    W([cx - 0.5, zFront], [cx + 0.5, zFront], 'none', { t: 0.15 })
    OFFICE_DOORS1.push({ x: cx, z: zFront + side * 0.09, rot: side > 0 ? 0 : Math.PI, label: numAt(i) })
  }
}
officeRow(-45.3 * K, zMin, M_X0, M_X1, 16, (i) => (i === 9 ? 'Men' : i === 10 ? 'Women' : i === 11 ? 'Elevator' : String(1251 + i * 2)), 1)

export const KITCHEN = { x0: -22 * K, x1: -2 * K, z0: -45.3 * K, z1: -39.5 * K } // Retail Kitchen 1260 (staff only)
P([[KITCHEN.x0, KITCHEN.z0], [KITCHEN.x0, KITCHEN.z1], [KITCHEN.x1, KITCHEN.z1], [KITCHEN.x1, KITCHEN.z0]], 'white')
// the servery counter curves out in front of the kitchen
export const SERVERY = { c: sc([-10, -44]), r: 7.2 * K, a0: -0.75, a1: 0.75 } // bulges out toward the diners
P(arc(SERVERY.c, SERVERY.r, SERVERY.r, SERVERY.a0, SERVERY.a1, 24), 'none', { t: 0.75 })

// dining area between Charley's and the courtyard: white round tables, black chairs, cognac banquette,
// the rainbow-stripe painting, two wood notice-board kiosks, white columns
export const DINING_TABLES = []
for (const x0 of [-18, -13.5, -9, -4.5, 0, 4.5, 9]) {
  for (const z0 of [-30.5, -26.5]) {
    if (x0 < -15 && z0 < -29) continue // banquette corner
    const [x, z] = sc([x0, z0])
    DINING_TABLES.push({ x, z })
    dot([x, z], 0.9)
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * TAU + Math.PI / 4
      CHAIRS1.push({ x: x + Math.sin(a) * 0.85, z: z + Math.cos(a) * 0.85, rot: a })
    }
  }
}
export const BANQUETTE = { a: sc([-25, -36]), b: sc([-17.5, -36]) }
W(sc([-25.5, -36.6]), sc([-17, -36.6]), 'white', { t: 0.3 }) // short wall behind the banquette (painting hangs here)
W(BANQUETTE.a, BANQUETTE.b, 'leather', { h: 0.5, t: 0.7 })
export const KIOSKS = [[0, -35.5], [7, -35.5]].map(sc)
for (const k of KIOSKS) dot(k, 1.2)
export const COLUMNS1 = [[-20, -22.5], [-8, -22.5], [4, -22.5], [16, -22.5], [-20, 23], [-6, 23], [8, 23], [20, 23]].map(sc)
for (const c of COLUMNS1) dot(c, 0.6)

// ---------- south: Student Commons lounge, glass-front suites, atrium hallway, offices 15xx
export const SUITES = [
  { x0: -22, x1: -12, name: 'Welcome Center', num: '1415' },
  { x0: -12, x1: -2, name: 'Alumni Relations Suite', num: '1410' },
  { x0: -2, x1: 8, name: 'Student Lounge', num: '1440' },
  { x0: 8, x1: 18, name: 'Bass Study Suite', num: '1442' },
].map((st) => ({ ...st, x0: st.x0 * K, x1: st.x1 * K }))
export const SUITE_Z = [31 * K, 37.5 * K] // glass fronts face north onto the Commons
for (const s of SUITES) {
  W([s.x0, SUITE_Z[0]], [s.x1, SUITE_Z[0]], 'meetGlass', { t: 0.08 })
  W([s.x0, SUITE_Z[0]], [s.x0, SUITE_Z[1]], 'white', { t: 0.15 })
  W([s.x1, SUITE_Z[0]], [s.x1, SUITE_Z[1]], 'white', { t: 0.15 })
}
W([SUITES[0].x0, SUITE_Z[1]], [SUITES[3].x1, SUITE_Z[1]], 'white', { t: 0.2 }) // atrium wall (photos hang on its south face)
// Commons lounge: cognac leather armchairs + sofas around low tables, a row of black storage cabinets
export const LOUNGE = []
for (const [x, z] of [[-14, 25.5], [-6, 26.5], [2, 25.5], [10, 26.5]].map(sc)) {
  LOUNGE.push({ x, z })
  W([x - 1.1, z + 1.2], [x + 1.1, z + 1.2], 'leather', { h: 0.45, t: 0.8 }) // sofa
  dot([x, z], 1.0) // low table
  for (const s of [-1, 1]) W([x + s * 1.6, z - 0.2], [x + s * 1.6 + 0.01, z - 0.2], 'leather', { h: 0.45, t: 0.8 }) // armchairs
}
W(...spread([14, 29.5], [19, 29.5]), 'cabinet', { h: 1.5, t: 0.5 })
// atrium hallway (Bekenstein Atrium side): leather sofa and long tables
W(...spread([-8, 41.3], [-4, 41.3]), 'leather', { h: 0.45, t: 0.8 })
W(...spread([2, 41.3], [6, 41.3]), 'leather', { h: 0.45, t: 0.8 })
officeRow(44.3 * K, zMax, M_X0, M_X1, 16, (i) => (i === 8 ? 'Men' : i === 9 ? 'Women' : i === 10 ? 'Elevator' : String(1501 + i * 2)), -1)

// ---------- east: Zhang Auditorium doors (locked), plants
export const AUDITORIUM = { name: 'Zhang Auditorium', num: '1300', doors: [[EAST, -3.2], [EAST, 3.2]] }
export const PLANTS1 = [[-24.5, -14], [-24.5, 14], [24, -14], [24, 14], [-27, 6.5], [-27, -6.5]].map(sc)
for (const p of PLANTS1) dot(p)

// ---------- the courtyard terrace: round tables + mesh chairs on the pavers, trees, lawn in the middle
export const LAWN = COURTYARD.map(([x, z]) => [x * 0.5, z * 0.5])
export const TERRACE_TABLES = [[-14, -11], [-9, -13.5], [-4, -14.5], [9, -13.5], [14, -10], [-14, 10], [-9, 13.5], [4, 14.5], [10, 13], [15, 9.5]].map(sc)
for (const [x, z] of TERRACE_TABLES) {
  dot([x, z], 1.3)
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * TAU
    CHAIRS1.push({ x: x + Math.sin(a) * 1.05, z: z + Math.cos(a) * 1.05, rot: a, kind: 'mesh' })
  }
}
export const COURT_TREES = [[-10, -9], [0, -11.5], [10, -8.5], [-12, 3], [12, 4], [-5, 11], [7, 11.5], [-2, 1]].map(sc)
for (const t of COURT_TREES) dot(t, 0.45)

// floor 1 colliders: its own walls + the stair cores that run the full height
export const COLLIDERS1 = [...COLLIDERS.filter((w) => w.part === 'stairs'), ...boxed(WALLS1.filter((w) => w.collide))]

const inCircle = (x, z, room) => Math.hypot(x - room.c[0], z - room.c[1]) < room.r
const inPolyPts = (x, z, pts) => {
  let inside = false
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, zi] = pts[i]
    const [xj, zj] = pts[j]
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside
  }
  return inside
}
export function locate1(x0, z0) {
  const [x, z] = [x0 / K, z0 / K] // thresholds below are in unspread plan units
  if (inPolyPts(x0, z0, COURTYARD)) return 'Shen Courtyard · Poorvu Dining Terrace'
  if (inCircle(x0, z0, CAFE)) return `${CAFE.name} · ${CAFE.num}`
  if (inCircle(x0, z0, FORUM)) return `${FORUM.name} · ${FORUM.num}`
  if (z < -45.3) return 'Offices · 12xx'
  if (z > 44.3) return 'Offices · 15xx'
  if (z < -20 && x > -24 && x < 14) return "Charley's Place · 1220"
  if (z > 37.5) return 'Bekenstein Atrium · 1570'
  if (z > 20 && x > -24 && x < 20) return 'Ligon-Lamsam Student Commons · 1425'
  if (x < -24 && Math.abs(z) < 12) return 'Main lobby · 1100'
  if (x < -22) return z < 0 ? 'West hallway · by the McNay Café' : 'West hallway · by the Snyder Forum'
  if (x > 22) return 'East hallway · Zhang Auditorium 1300'
  return z < 0 ? 'North hallway · 1st floor' : 'South hallway · 1st floor'
}

