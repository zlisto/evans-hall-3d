// Floors 2 and 4 plus the two spiral stair towers (A and B) that join them.
// The player's feet height picks the floor; inside a tower, the stair height comes from the angle
// around the tower, and the feet height picks which of the two turns you're on.

import { COLLIDERS, STAIRS, TOWER_R, boxed, collide as collideList, floorAt as floorLocal, locate as locate2, arc } from './layout.js'
import { COLLIDERS4, ELEV4, locate4 } from './floor4.js'

const TAU = Math.PI * 2
export const TOWERS = STAIRS.filter((s) => s.spiral)
export const COLUMN_R = 0.45 // solid center post
export const STEP_IN = 0.5 // treads run from the post...
export const STEP_OUT = TOWER_R - 0.12 // ...to just inside the outer wall
export const DOOR_TH = Math.PI / 2 // doors face east, into the building (x = sin, z = cos)
export const DOOR_HALF = 0.6 // radians each side of the entry (~5 m open edge at floors 2 and 4)
export const LANDING = 0.95 // radians of flat landing past each door
export const TURNS = 2
const SPAN = TURNS * TAU // total angle climbed
const DOOR_H = 2.6

export const levelOf = (y) => (y > ELEV4 / 2 ? 4 : 2)

// stair height after travelling s radians from the floor-2 door; flat landings at both ends
export function stairY(s) {
  if (s <= LANDING) return 0
  if (s >= SPAN - LANDING) return ELEV4
  return ((s - LANDING) / (SPAN - 2 * LANDING)) * ELEV4
}

// which tower (if any) contains (x, z), and the angle past the door there
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

// height of the stair at (x, z) closest to the current feet height y; the landings reach a little
// back past the doors so you can stand in the doorway at either floor
function towerY(rel, y) {
  let best = null
  for (let k = -1; k <= TURNS; k++) {
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
  return levelOf(y) === 4 ? ELEV4 + floorLocal(x, z) : floorLocal(x, z)
}

// stairwell edges (glass railings, plus the west glass): the outer ring with the entry gap, the center
// post, a rail at the end of the top landing (so you can't walk off into the stairwell), and the entry
// itself once you're between floors (so you can't step off the stairs onto floor 3)
const ringWalls = TOWERS.map((t) => {
  const ring = arc(t.c, TOWER_R, TOWER_R, DOOR_TH + DOOR_HALF, DOOR_TH + TAU - DOOR_HALF, 40)
  const walls = []
  for (let i = 0; i < ring.length - 1; i++) walls.push({ a: ring[i], b: ring[i + 1], t: 0.2 })
  walls.push({ a: t.c, b: [t.c[0] + 0.01, t.c[1]], t: COLUMN_R * 2 })
  const end = DOOR_TH + LANDING
  const railEnd = { a: arc(t.c, STEP_IN, STEP_IN, end, end, 1)[0], b: arc(t.c, TOWER_R, TOWER_R, end, end, 1)[0], t: 0.1 }
  const gap = arc(t.c, TOWER_R, TOWER_R, DOOR_TH - DOOR_HALF, DOOR_TH + DOOR_HALF, 8) // follows the curve
  const door = gap.slice(1).map((b, i) => ({ a: gap[i], b, t: 0.2 }))
  return { walls: boxed(walls), railEnd: boxed([railEnd]), door: boxed(door) }
})

export function collide(pos, y = 0) {
  const lvl = levelOf(y)
  const list = [...(lvl === 4 ? COLLIDERS4 : COLLIDERS)]
  const atFloor = Math.abs(y) < 1.2 || Math.abs(y - ELEV4) < 1.2
  for (const r of ringWalls) {
    list.push(...r.walls)
    if (Math.abs(y - ELEV4) < 1.2) list.push(...r.railEnd)
    if (!atFloor) list.push(...r.door)
  }
  return collideList(pos, list)
}

export function locate(x, z, y = 0) {
  const hit = inTower(x, z)
  if (hit) return `Stair ${hit.t.id} · spiral between floors 2 and 4`
  return levelOf(y) === 4 ? locate4(x, z) : locate2(x, z)
}

export { ELEV4, DOOR_H }
