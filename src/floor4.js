// Evans Hall, floor 4 (from the 4th-floor wayfinding plan; like floor 2's plan it's drawn west-up).
// Same footprint as floor 2: the classroom drums stack straight up (4400s over 2400s, 4200s over
// 2200s) and so do the stair cores. What changes: the Kenney Reading Room replaces Ross Library,
// faculty offices line the north and south walls, and there's no Beinecke (floor 4 looks out over
// its roof). Everything here is in floor-local coordinates; World/levels add ELEV4.

import { BOUNDS, COLLIDERS, DRUMS, EAST, H, LIBRARY, STAIRS, TOWER_R, boxed } from './layout.js'
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
export const READ_DESK = { x: LIBRARY.x1 - 2.6, z: -4.2, r: 0.95 } // round wood-slat service desk
{
  const { x0, x1, z0, z1, door } = READING
  W([x1, z0], [x1, -door], 'readGlass', { t: 0.1 })
  W([x1, door], [x1, z1], 'readGlass', { t: 0.1 })
  W([x0, z0], [x1, z0], 'white')
  W([x0, z1], [x1, z1], 'white')
  // long white study tables with mesh chairs down both sides
  for (const tx of [x0 + 3.2, x0 + 6.6]) {
    for (const [za, zb] of [[-9.5, -2.5], [2.5, 9.5]]) {
      READ_TABLES.push({ x: tx, z0: za, z1: zb })
      W([tx, za], [tx, zb], 'none', { t: 1.1 })
      for (let z = za + 0.6; z < zb; z += 1.1)
        for (const s of [-1, 1]) CHAIRS4.push({ x: tx + s * 0.85, z, rot: s > 0 ? -Math.PI / 2 : Math.PI / 2 })
    }
  }
  W([READ_DESK.x, READ_DESK.z], [READ_DESK.x + 0.01, READ_DESK.z], 'none', { t: READ_DESK.r * 2 })
}

// ---------- faculty offices: a row along each long wall, closed wood doors with number plates
export const OFFICE_DOORS = []
const officeRow = (zFront, zBack, x0, x1, n, numAt, side) => {
  const w = (x1 - x0) / n
  for (let i = 0; i <= n; i++) W([x0 + i * w, zFront], [x0 + i * w, zBack], 'white', { t: 0.15 })
  for (let i = 0; i < n; i++) {
    const cx = x0 + (i + 0.5) * w
    const d0 = cx - 0.5
    const d1 = cx + 0.5
    W([x0 + i * w, zFront], [d0, zFront], 'white', { t: 0.15 })
    W([d1, zFront], [x0 + (i + 1) * w, zFront], 'white', { t: 0.15 })
    W([d0, zFront], [d1, zFront], 'white', { t: 0.15, y0: 2.25, h: H - 2.25, collide: false })
    W([d0, zFront], [d1, zFront], 'none', { t: 0.15 }) // the closed door
    const label = numAt(i)
    OFFICE_DOORS.push({ x: cx, z: zFront + side * 0.09, rot: side > 0 ? 0 : Math.PI, label })
  }
}
const OX0 = -35
const OX1 = 22.6
// south (map left): deeper offices, numbered 45xx
officeRow(44.3, zMax, OX0, OX1, 16, (i) => {
  if (i === 5) return 'Elevator'
  if (i === 6) return 'Men'
  if (i === 7) return 'Women'
  return String(4501 + i * 2)
}, -1)
// north (map right): a narrower row, numbered 42xx
officeRow(-45.3, zMin, OX0, OX1, 16, (i) => {
  if (i === 9) return 'Elevator'
  if (i === 10) return 'Men'
  if (i === 11) return 'Women'
  return String(4246 + i * 2)
}, 1)

// ---------- hallway furniture: benches, sofas, plants, high tables by the east glass
export const PLANTS4 = [[-24.4, -9], [-24.4, 9], [24.4, -12], [24.4, 12], [-8, 40.5], [8, -40.5]]
W([-24.4, -3], [-24.4, 0], 'leather', { h: 0.45, t: 0.7 })
W([24.4, -2], [24.4, 2], 'orange', { h: 0.55, t: 0.9 })
W([-2, -21], [1, -21], 'leather', { h: 0.45, t: 0.7 })
W([-1, 21], [2, 21], 'leather', { h: 0.45, t: 0.7 })
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
  if (z > 44.3) return 'Faculty offices · 45xx'
  if (z < -45.3) return 'Faculty offices · 42xx'
  if (z > 38) return 'South hallway · 4th floor'
  if (z < -38) return 'North hallway · 4th floor'
  if (x < -20) return 'West cloister · 4th floor'
  if (x > 20) return 'East cloister · 4th floor'
  return z < 0 ? 'North cloister · 4th floor' : 'South cloister · 4th floor'
}

