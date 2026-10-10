// Floors 1, 2 and 4 plus the two spiral stairs (A and B) that join them.
// The player's feet height picks the floor; inside a stairwell, the stair height comes from the angle
// around it, and the feet height picks which turn you're on.

import { COLLIDERS, STAIRS, TOWER_R, boxed, collide as collideList, floorAt as floorLocal, locate as locate2, arc } from './layout.js'
import { COLLIDERS4, ELEV4, locate4 } from './floor4.js'
import { COLLIDERS1, ELEV1, locate1 } from './floor1.js'

const TAU = Math.PI * 2
export const TOWERS = STAIRS.filter((s) => s.spiral)
export const COLUMN_R = 0.45 // solid center post
export const STEP_IN = 0.5 // treads run from the post...
export const STEP_OUT = TOWER_R - 0.12 // ...to just inside the outer edge
export const DOOR_TH = Math.PI / 2 // you step on/off facing east, into the building (x = sin, z = cos)
export const DOOR_HALF = 0.6 // radians each side of the entry (~5 m open edge at every floor)
export const LANDING = 0.95 // radians of flat landing each side of an entry

// landings, by angle climbed from the floor-1 entry: one turn up to floor 2, two more up to floor 4
export const STOPS = [
  { s: 0, y: ELEV1 },
  { s: TAU, y: 0 },
  { s: 3 * TAU, y: ELEV4 },
]
export const SPAN = STOPS[STOPS.length - 1].s
const DOOR_H = 2.6

export function levelOf(y) {
  if (y < ELEV1 / 2) return 1
  return y > ELEV4 / 2 ? 4 : 2
}

// stair height after travelling s radians from the floor-1 entry: flat around each landing, steady
// climb in between
export function stairY(s) {
  if (s <= STOPS[0].s + LANDING) return STOPS[0].y
  for (let i = 1; i < STOPS.length; i++) {
    const a = STOPS[i - 1]
    const b = STOPS[i]
    if (s >= b.s - LANDING && s <= b.s + LANDING) return b.y
    if (s < b.s - LANDING) return a.y + ((s - a.s - LANDING) / (b.s - a.s - 2 * LANDING)) * (b.y - a.y)
  }
  return STOPS[STOPS.length - 1].y
}

// which stairwell (if any) contains (x, z), and the angle past the entry there
function inTower(x, z) {
  for (const t of TOWERS) {
    const dx = x - t.c[0]
    const dz = z - t.c[1]
    if (dx * dx + dz * dz < TOWER_R * TOWER_R) {
      const rel = (((Math.atan2(dx, dz) - DOOR_TH) % TAU) + TAU) % TAU
      return { t, rel }
    }
  }
  return null
}

// height of the stair at (x, z) closest to the current feet height y; the end landings reach a little
// back past the entries so you can stand in the opening at the bottom and top floors
function towerY(rel, y) {
  let best = null
  for (let k = -1; k <= SPAN / TAU + 1; k++) {
    const s = rel + k * TAU
    if (s < -LANDING || s > SPAN + LANDING) continue
    const h = stairY(s)
    if (best === null || Math.abs(h - y) < Math.abs(best - y)) best = h
  }
  return best ?? 0
}

export function floorAt(x, z, y = 0) {
  const hit = inTower(x, z)
  if (hit) return towerY(hit.rel, y)
  const lvl = levelOf(y)
  if (lvl === 1) return ELEV1 // the ground floor and courtyard are flat
  return lvl === 4 ? ELEV4 + floorLocal(x, z) : floorLocal(x, z)
}

// stairwell edges (glass railings, plus the west glass): the outer ring with the entry gap, the center
// post, a rail at the end of the top landing (so you can't walk off into the stairwell), and the entry
// itself once you're between floors (so you can't step off the stairs onto floor 3)
const ringWalls = TOWERS.map((t) => {
  const ring = arc(t.c, TOWER_R, TOWER_R, DOOR_TH + DOOR_HALF, DOOR_TH + TAU - DOOR_HALF, 48)
  const walls = []
  for (let i = 0; i < ring.length - 1; i++) walls.push({ a: ring[i], b: ring[i + 1], t: 0.2 })
  walls.push({ a: t.c, b: [t.c[0] + 0.01, t.c[1]], t: COLUMN_R * 2 })
  const end = DOOR_TH + LANDING
  const railEnd = { a: arc(t.c, STEP_IN, STEP_IN, end, end, 1)[0], b: arc(t.c, TOWER_R, TOWER_R, end, end, 1)[0], t: 0.1 }
  const gap = arc(t.c, TOWER_R, TOWER_R, DOOR_TH - DOOR_HALF, DOOR_TH + DOOR_HALF, 8) // follows the curve
  const door = gap.slice(1).map((b, i) => ({ a: gap[i], b, t: 0.2 }))
  return { walls: boxed(walls), railEnd: boxed([railEnd]), door: boxed(door) }
})

const LISTS = { 1: COLLIDERS1, 2: COLLIDERS, 4: COLLIDERS4 }

export function collide(pos, y = 0) {
  const list = [...LISTS[levelOf(y)]]
  const atFloor = STOPS.some((st) => Math.abs(y - st.y) < 1.2)
  for (const r of ringWalls) {
    list.push(...r.walls)
    if (Math.abs(y - ELEV4) < 1.2) list.push(...r.railEnd)
    if (!atFloor) list.push(...r.door)
  }
  return collideList(pos, list)
}

export function locate(x, z, y = 0) {
  const hit = inTower(x, z)
  if (hit) return `Stair ${hit.t.id} · spiral stairs, floors 1–4`
  const lvl = levelOf(y)
  return lvl === 1 ? locate1(x, z) : lvl === 4 ? locate4(x, z) : locate2(x, z)
}

export { ELEV1, ELEV4, DOOR_H }
