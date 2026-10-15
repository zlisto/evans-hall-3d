// Evans Hall, floor 4 (from the 4th-floor wayfinding plan; like floor 2's plan it's drawn west-up).
// Same footprint as floor 2: the classroom drums stack straight up (4400s over 2400s, 4200s over
// 2200s) and so do the stair cores. What changes: the Kenney Reading Room replaces Ross Library,
// glass meeting rooms line the north and south walls (same as floor 2), and there's no Beinecke (floor 4 looks out over
// its roof). Everything here is in floor-local coordinates; World/levels add ELEV4.

import { BOUNDS, COLLIDERS, DRUMS, EAST, H, K, LIBRARY, MEET_DOOR, MEET_FRONT, M_X0, M_X1, STAIRS, TOWER_R, boxed, sc, spread } from './layout.js'
import { ROOM_ASSIGN } from './rooms.js'

export const ELEV4 = 2 * H // floor 4 sits two floor-to-floor heights above floor 2

// drum names from the plan (keyed by the floor-2 drum below); unreadable names stay generic
const NAMES4 = {
  2400: ['4400', 'Technology Classroom'],
  2410: ['4410', 'Classroom'],
  2420: ['4420', 'Farr Classroom'],
  2430: ['4430', 'Sweeney Classroom'],
  2200: ['4200', 'Classroom'],
  2210: ['4210', 'Classroom'],
  2220: ['4220', 'Gould Classroom'],
  2230: ['4230', 'Attwood Classroom'],
}
export const DRUMS4 = DRUMS.map((d) => ({
  ...d,
  id: NAMES4[d.id][0],
  name: NAMES4[d.id][1],
  course: ROOM_ASSIGN[NAMES4[d.id][0]]?.deck ?? 'open', // real course from room_assignments.json
}))

export const WALLS4 = []
export const CHAIRS4 = []
const W = (a, b, mat, o = {}) =>
  WALLS4.push({ a, b, mat, part: 'f4', h: o.h ?? H, y0: o.y0 ?? 0, t: o.t ?? 0.2, collide: o.collide ?? true })

const { xMin, xMax, zMin, zMax } = BOUNDS

// ---------- shell: glass all the way around (east looks over the Beinecke roof)
W([xMin, zMin], [xMin, zMax], 'exterior')
W([xMin, zMin], [xMax, zMin], 'exterior')
W([xMin, zMax], [xMax, zMax], 'exterior')
W([EAST, zMin], [EAST, zMax], 'exterior')
// floor 3 isn't walkable: an opaque band of windows fills the facade between floor 2 and floor 4,
// except where the glass stair towers meet the west facade (they look straight out)
const towerZ = STAIRS.filter((st) => st.spiral).map((t) => [t.c[1] - TOWER_R, t.c[1] + TOWER_R]).sort((a, b) => a[0] - b[0])
let zFrom = zMin
const westBand = []
for (const [z0, z1] of towerZ) {
  westBand.push([[xMin, zFrom], [xMin, z0]])
  zFrom = z1
}
westBand.push([[xMin, zFrom], [xMin, zMax]])
for (const [a, b] of [
  ...westBand,
  [[xMin, zMin], [xMax, zMin]],
  [[xMin, zMax], [xMax, zMax]],
  [[EAST, zMin], [EAST, zMax]],
])
  W(a, b, 'band', { y0: H - ELEV4, h: ELEV4 - H, t: 0.3, collide: false })

// ---------- Kenney Reading Room 4100 (where Ross Library is downstairs)
export const READING = { ...LIBRARY, num: '4100', name: 'Kenney Reading Room' }
export const READ_TABLES = []
export const READ_DESK = { x: LIBRARY.x1 - 2.6, z: -4.2 * K, r: 0.95 } // round wood-slat service desk
{
  const { x0, x1, z0, z1, door } = READING
  W([x1, z0], [x1, -door], 'readGlass', { t: 0.1 })
  W([x1, door], [x1, z1], 'readGlass', { t: 0.1 })
  W([x0, z0], [x1, z0], 'white')
  W([x0, z1], [x1, z1], 'white')
  // long white study tables with mesh chairs down both sides
  for (const tx of [x0 + 3.2, x0 + 6.6, x0 + 10]) {
    for (const [za, zb] of [[-9.5 * K, -2.5 * K], [2.5 * K, 9.5 * K]]) {
      READ_TABLES.push({ x: tx, z0: za, z1: zb })
      W([tx, za], [tx, zb], 'none', { t: 1.1 })
      for (let z = za + 0.6; z < zb; z += 1.1)
        for (const s of [-1, 1]) CHAIRS4.push({ x: tx + s * 0.85, z, rot: s > 0 ? Math.PI / 2 : -Math.PI / 2 }) // backrest away from the table
    }
  }
  W([READ_DESK.x, READ_DESK.z], [READ_DESK.x + 0.01, READ_DESK.z], 'none', { t: READ_DESK.r * 2 })
}

// ---------- glass meeting rooms along each long wall (stacked over floor 2's), Labubus meeting inside
export const MEETING4 = []
for (const side of [1, -1]) {
  const zf = MEET_FRONT * side
  const zb = side > 0 ? zMax : zMin
  const n = 11
  const w = (M_X1 - M_X0) / n
  for (let i = 0; i <= n; i++) W([M_X0 + i * w, zf], [M_X0 + i * w, zb], 'white', { t: 0.15 })
  for (let i = 0; i < n; i++) {
    const cx = M_X0 + (i + 0.5) * w
    const cz = (zf + zb) / 2
    const seats = []
    for (const dx of [-0.8, 0, 0.8]) for (const dz of [-0.95, 0.95]) seats.push({ x: cx + dx, z: cz + dz, rot: dz > 0 ? 0 : Math.PI })
    seats.push({ x: cx - 1.75, z: cz, rot: -Math.PI / 2 })
    for (const c of seats) CHAIRS4.push(c)
    W([cx - 1.3, cz], [cx + 1.3, cz], 'none', { t: 1.2 }) // glass table
    const d0 = cx - w / 2 + 0.3
    const d1 = d0 + MEET_DOOR
    W([cx - w / 2, zf], [d0, zf], 'meetGlass', { t: 0.08 })
    W([d1, zf], [cx + w / 2, zf], 'meetGlass', { t: 0.08 })
    W([d0, zf], [d1, zf], 'meetGlass', { t: 0.08, y0: 2.35, h: H - 2.35, collide: false })
    MEETING4.push({
      x: cx,
      z: cz,
      w,
      seats,
      num: side > 0 ? 4461 + i * 2 : 4246 + i * 3,
      monitor: { x: cx + w / 2 - 0.1, z: cz, rot: -Math.PI / 2 },
      door: { hinge: [d0, zf], swing: side > 0 ? -1 : 1 },
    })
  }
}

// ---------- hallway furniture: benches, sofas, plants, high tables by the east glass
export const PLANTS4 = [[-24.4, -9], [-24.4, 9], [24.4, -12], [24.4, 12], [-8, 40.5], [8, -40.5]].map(sc)
W(...spread([-24.4, -3], [-24.4, 0]), 'leather', { h: 0.45, t: 0.7 })
W(...spread([24.4, -2], [24.4, 2]), 'orange', { h: 0.55, t: 0.9 })
W(...spread([-2, -21], [1, -21]), 'leather', { h: 0.45, t: 0.7 })
W(...spread([-1, 21], [2, 21]), 'leather', { h: 0.45, t: 0.7 })
for (const [x, z] of PLANTS4) W([x, z], [x + 0.01, z], 'none', { t: 0.7 })
export const HIGH_TABLES = [[EAST - 1.4, -6], [EAST - 1.4, 6]]
for (const [x, z] of HIGH_TABLES) {
  W([x, z], [x + 0.01, z], 'none', { t: 1.2 })
  for (const dz of [-0.9, 0.9]) CHAIRS4.push({ x, z: z + dz, rot: dz > 0 ? 0 : Math.PI, high: true })
}

// floor 4 colliders: its own walls + the drums, courtyard glass and stair cores that repeat upstairs
const SHARED = new Set(['courtyard', 'drums', 'stairs'])
export const COLLIDERS4 = [...COLLIDERS.filter((w) => SHARED.has(w.part)), ...boxed(WALLS4.filter((w) => w.collide))]

export function locate4(x, z) {
  for (const d of DRUMS4) if (((x - d.c[0]) / d.rx) ** 2 + ((z - d.c[1]) / d.rz) ** 2 < 1) return `${d.name} · ${d.id}`
  if (x < READING.x1 && z > READING.z0 && z < READING.z1) return `${READING.name} · ${READING.num}`
  for (const m of MEETING4) if (Math.abs(x - m.x) < m.w / 2 && Math.abs(z) > MEET_FRONT) return `Meeting room · ${m.num}`
  if (z > 38 * K) return 'South hallway · 4th floor'
  if (z < -38 * K) return 'North hallway · 4th floor'
  if (x < -20 * K) return 'West cloister · 4th floor'
  if (x > 20 * K) return 'East cloister · 4th floor'
  return z < 0 ? 'North cloister · 4th floor' : 'South cloister · 4th floor'
}

