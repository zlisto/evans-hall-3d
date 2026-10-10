import { useMemo } from 'react'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { H, TOWER_R } from './layout.js'
import { COLUMN_R, DOOR_HALF, DOOR_TH, ELEV4, LANDING, STEP_IN, STEP_OUT, TOWERS, TURNS, stairY } from './levels.js'
import { Arc, BOX, Instanced } from './World.jsx'
import * as T from './textures.js'

// Stairs A and B: wide, open spiral stairs against the west glass (no enclosing walls). Granite wedge
// treads ~3.6 m wide wind twice around a white center column from floor 2 to floor 4. Glass
// balustrades run along both edges; the outward side is the building's curved glass curtain.

const TAU = Math.PI * 2
const SPAN = TURNS * TAU
const STEPS = Math.round(ELEV4 / 0.17) // ~17 cm risers
const TOP = ELEV4 + H
const RAIL_H = 1.0

const helixPoint = (c, r, s, lift) => {
  const th = DOOR_TH + s
  return new THREE.Vector3(c[0] + r * Math.sin(th), stairY(s) + lift, c[1] + r * Math.cos(th))
}

// flat annulus sector (angles in the x = sin, z = cos convention), top at y, `depth` thick
function sectorGeo(c, r0, r1, a0, a1, y, depth, n = 24) {
  const pts = []
  for (let i = 0; i <= n; i++) {
    const a = a0 + ((a1 - a0) * i) / n
    pts.push(new THREE.Vector2(c[0] + r1 * Math.sin(a), -(c[1] + r1 * Math.cos(a))))
  }
  for (let i = n; i >= 0; i--) {
    const a = a0 + ((a1 - a0) * i) / n
    pts.push(new THREE.Vector2(c[0] + r0 * Math.sin(a), -(c[1] + r0 * Math.cos(a))))
  }
  const g = new THREE.ExtrudeGeometry(new THREE.Shape(pts), { depth, bevelEnabled: false })
  g.rotateX(-Math.PI / 2)
  g.translate(0, y - depth, 0)
  return g
}

// a vertical glass ribbon following the stair edge at radius r, from s0 to s1
function balustrade(c, r, s0, s1, n = 200) {
  const pos = []
  const idx = []
  for (let i = 0; i <= n; i++) {
    const s = s0 + ((s1 - s0) * i) / n
    const lo = helixPoint(c, r, s, 0.02)
    const hi = helixPoint(c, r, s, RAIL_H)
    pos.push(lo.x, lo.y, lo.z, hi.x, hi.y, hi.z)
    if (i > 0) idx.push((i - 1) * 2, i * 2, (i - 1) * 2 + 1, (i - 1) * 2 + 1, i * 2, i * 2 + 1)
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setIndex(idx)
  g.computeVertexNormals()
  return g
}

const handrail = (c, r, s0, s1) => {
  const pts = []
  for (let i = 0; i <= 200; i++) pts.push(helixPoint(c, r, s0 + ((s1 - s0) * i) / 200, RAIL_H))
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 400, 0.025, 8, false)
}

function Tower({ t, M }) {
  const { c } = t
  const geos = useMemo(() => {
    // wedge treads, merged into one mesh
    const ds = (SPAN - 2 * LANDING) / STEPS
    const treads = Array.from({ length: STEPS }, (_, i) => {
      const s0 = LANDING + i * ds
      const y = stairY(s0 + ds)
      return sectorGeo(c, STEP_IN, STEP_OUT, DOOR_TH + s0, DOOR_TH + s0 + ds + 0.004, y, 0.3, 4)
    })
    const s0 = LANDING
    const s1 = SPAN - LANDING
    return {
      treads: mergeGeometries(treads),
      innerGlass: balustrade(c, STEP_IN + 0.04, s0, s1),
      outerGlass: balustrade(c, STEP_OUT - 0.04, s0, s1),
      innerRail: handrail(c, STEP_IN + 0.04, s0, s1),
      outerRail: handrail(c, STEP_OUT - 0.04, s0, s1),
      top: sectorGeo(c, COLUMN_R, TOWER_R, DOOR_TH - LANDING, DOOR_TH + LANDING, ELEV4, 0.3),
      floor: sectorGeo(c, 0, TOWER_R, 0, TAU, 0.006, 0.006, 48),
    }
  }, [c])
  // the building's curved glass curtain on the west side: mullions + white columns just inside
  const mullions = useMemo(() => {
    const out = []
    for (let a = Math.PI + 0.15; a < TAU - 0.05; a += 0.26) out.push({ p: [c[0] + (TOWER_R + 0.02) * Math.sin(a), TOP / 2, c[1] + (TOWER_R + 0.02) * Math.cos(a)], s: [0.06, TOP, 0.06] })
    return out
  }, [c])
  const columns = useMemo(
    () => [Math.PI + 0.5, Math.PI * 1.5, TAU - 0.5].map((a) => ({ p: [c[0] + (TOWER_R - 0.25) * Math.sin(a), TOP / 2, c[1] + (TOWER_R - 0.25) * Math.cos(a)], s: [0.32, TOP, 0.32] })),
    [c],
  )
  const label = useMemo(() => new THREE.MeshBasicMaterial({ map: T.signTex(`Stair ${t.id}`, 'Floors 2 – 4') }), [t.id])
  const d0 = DOOR_TH - DOOR_HALF
  const d1 = DOOR_TH + DOOR_HALF
  const signAt = (a) => [c[0] + (TOWER_R + 0.35) * Math.sin(a), c[1] + (TOWER_R + 0.35) * Math.cos(a)]
  const sign = signAt(d1 + 0.12)
  return (
    <group>
      {/* curved glass on the outward (west) side only; the inward side is open */}
      <Arc c={c} rx={TOWER_R} a0={Math.PI} a1={TAU} h={TOP} material={M.glass} />
      <Instanced items={mullions} material={M.mullion} geometry={BOX} />
      <Instanced items={columns} material={M.column} geometry={CYL} />
      {[H, ELEV4].map((y) => (
        <Arc key={y} c={c} rx={TOWER_R - 0.03} a0={Math.PI} a1={TAU} y0={y - 0.35} h={0.5} material={M.mullion} />
      ))}
      {/* floor 3 isn't walkable: its slab edge closes the inward side between floors 2 and 4 */}
      <Arc c={c} rx={TOWER_R} a0={0} a1={Math.PI} y0={H} h={ELEV4 - H - 0.3} material={M.white} />
      {/* glass guards around the open stairwell at floors 2 and 4, open where you step on/off */}
      {[0, ELEV4].map((y) => (
        <group key={y}>
          <Arc c={c} rx={TOWER_R} a0={0} a1={d0} y0={y} h={RAIL_H} material={M.rail} />
          <Arc c={c} rx={TOWER_R} a0={d1} a1={Math.PI} y0={y} h={RAIL_H} material={M.rail} />
          <Arc c={c} rx={TOWER_R} a0={0} a1={d0} y0={y + RAIL_H - 0.03} h={0.05} material={M.steel} />
          <Arc c={c} rx={TOWER_R} a0={d1} a1={Math.PI} y0={y + RAIL_H - 0.03} h={0.05} material={M.steel} />
        </group>
      ))}
      {/* center column, treads, landings, balustrades */}
      <mesh position={[c[0], TOP / 2, c[1]]} material={M.column}>
        <cylinderGeometry args={[COLUMN_R, COLUMN_R, TOP, 32]} />
      </mesh>
      <mesh geometry={geos.treads} material={M.granite} />
      <mesh geometry={geos.floor} material={M.granite} />
      <mesh geometry={geos.top} material={M.granite} />
      <mesh geometry={geos.innerGlass} material={M.rail} />
      <mesh geometry={geos.outerGlass} material={M.rail} />
      <mesh geometry={geos.innerRail} material={M.steel} />
      <mesh geometry={geos.outerRail} material={M.steel} />
      {/* stair label on a post beside the entry, at both floors */}
      {[0, ELEV4].map((y) => (
        <group key={y}>
          <mesh position={[sign[0], y + 0.75, sign[1]]} material={M.steel}>
            <cylinderGeometry args={[0.025, 0.025, 1.5, 8]} />
          </mesh>
          <mesh position={[sign[0], y + 1.55, sign[1]]} rotation={[0, DOOR_TH, 0]} material={label}>
            <planeGeometry args={[0.4, 0.5]} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

const CYL = new THREE.CylinderGeometry(0.5, 0.5, 1, 16)

export default function SpiralTowers({ M }) {
  return TOWERS.map((t) => <Tower key={t.id} t={t} M={M} />)
}
