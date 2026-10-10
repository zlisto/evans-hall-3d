import { useMemo } from 'react'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { H, TOWER_R } from './layout.js'
import { COLUMN_R, DOOR_HALF, DOOR_TH, ELEV1, ELEV4, LANDING, STEP_IN, STEP_OUT, STOPS, TOWERS, stairY } from './levels.js'
import { Arc, BOX, Instanced } from './World.jsx'
import * as T from './textures.js'

// Stairs A and B: wide, open spiral stairs against the west glass (no enclosing walls). Granite wedge
// treads ~3.6 m wide wind around a white center column: one turn from floor 1 up to floor 2, then two
// turns straight up to floor 4. Glass balustrades run along both edges; the outward side is the
// building's curved glass curtain.

const TAU = Math.PI * 2
const BOTTOM = ELEV1
const TOP = ELEV4 + H
const RAIL_H = 1.0
// flights between landings: [start angle, end angle] past each landing
const FLIGHTS = STOPS.slice(1).map((b, i) => [STOPS[i].s + LANDING, b.s - LANDING, b.y - STOPS[i].y])

const helixPoint = (c, r, s, lift) => {
  const th = DOOR_TH + s
  return new THREE.Vector3(c[0] + r * Math.sin(th), stairY(s) + lift, c[1] + r * Math.cos(th))
}

// flat annulus sector (angles in the x = sin, z = cos convention), top at y, `depth` thick
export function sectorGeo(c, r0, r1, a0, a1, y, depth, n = 24) {
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
    // wedge treads (~17 cm risers), merged into one mesh; glass + handrails along each flight
    const treads = []
    const parts = { innerGlass: [], outerGlass: [], innerRail: [], outerRail: [] }
    for (const [s0, s1, rise] of FLIGHTS) {
      const steps = Math.round(rise / 0.17)
      const ds = (s1 - s0) / steps
      for (let i = 0; i < steps; i++) {
        const a = s0 + i * ds
        treads.push(sectorGeo(c, STEP_IN, STEP_OUT, DOOR_TH + a, DOOR_TH + a + ds + 0.004, stairY(a + ds), 0.3, 4))
      }
      parts.innerGlass.push(balustrade(c, STEP_IN + 0.04, s0, s1))
      parts.outerGlass.push(balustrade(c, STEP_OUT - 0.04, s0, s1))
      parts.innerRail.push(handrail(c, STEP_IN + 0.04, s0, s1))
      parts.outerRail.push(handrail(c, STEP_OUT - 0.04, s0, s1))
    }
    const merged = Object.fromEntries(Object.entries(parts).map(([k, list]) => [k, mergeGeometries(list)]))
    return {
      treads: mergeGeometries(treads),
      ...merged,
      // landing slabs at the floors above the bottom one (the bottom landing is the floor itself)
      landings: mergeGeometries(STOPS.slice(1).map((st) => sectorGeo(c, COLUMN_R, TOWER_R, DOOR_TH - LANDING, DOOR_TH + LANDING, st.y, 0.3))),
      floor: sectorGeo(c, 0, TOWER_R, 0, TAU, BOTTOM + 0.006, 0.006, 48),
    }
  }, [c])
  // the building's curved glass curtain on the west side: mullions + white columns just inside
  const mullions = useMemo(() => {
    const out = []
    for (let a = Math.PI + 0.15; a < TAU - 0.05; a += 0.26) out.push({ p: [c[0] + (TOWER_R + 0.02) * Math.sin(a), (TOP + BOTTOM) / 2, c[1] + (TOWER_R + 0.02) * Math.cos(a)], s: [0.06, TOP - BOTTOM, 0.06] })
    return out
  }, [c])
  const columns = useMemo(
    () => [Math.PI + 0.5, Math.PI * 1.5, TAU - 0.5].map((a) => ({ p: [c[0] + (TOWER_R - 0.25) * Math.sin(a), (TOP + BOTTOM) / 2, c[1] + (TOWER_R - 0.25) * Math.cos(a)], s: [0.32, TOP - BOTTOM, 0.32] })),
    [c],
  )
  const label = useMemo(() => new THREE.MeshBasicMaterial({ map: T.signTex(`Stair ${t.id}`, 'Floors 1 – 4') }), [t.id])
  const d0 = DOOR_TH - DOOR_HALF
  const d1 = DOOR_TH + DOOR_HALF
  const signAt = (a) => [c[0] + (TOWER_R + 0.35) * Math.sin(a), c[1] + (TOWER_R + 0.35) * Math.cos(a)]
  const sign = signAt(d1 + 0.12)
  return (
    <group>
      {/* curved glass on the outward (west) side only; the inward side is open */}
      <Arc c={c} rx={TOWER_R} a0={Math.PI} a1={TAU} y0={BOTTOM} h={TOP - BOTTOM} material={M.glass} />
      <Instanced items={mullions} material={M.mullion} geometry={BOX} />
      <Instanced items={columns} material={M.column} geometry={CYL} />
      {[0, H, ELEV4].map((y) => (
        <Arc key={y} c={c} rx={TOWER_R - 0.03} a0={Math.PI} a1={TAU} y0={y - 0.35} h={0.5} material={M.mullion} />
      ))}
      {/* floor 3 isn't walkable: its slab edge closes the inward side between floors 2 and 4 */}
      <Arc c={c} rx={TOWER_R} a0={0} a1={Math.PI} y0={H} h={ELEV4 - H - 0.3} material={M.white} />
      {/* glass guards around the open stairwell at each floor, open where you step on/off */}
      {STOPS.map(({ y }) => (
        <group key={y}>
          <Arc c={c} rx={TOWER_R} a0={0} a1={d0} y0={y} h={RAIL_H} material={M.rail} />
          <Arc c={c} rx={TOWER_R} a0={d1} a1={Math.PI} y0={y} h={RAIL_H} material={M.rail} />
          <Arc c={c} rx={TOWER_R} a0={0} a1={d0} y0={y + RAIL_H - 0.03} h={0.05} material={M.steel} />
          <Arc c={c} rx={TOWER_R} a0={d1} a1={Math.PI} y0={y + RAIL_H - 0.03} h={0.05} material={M.steel} />
        </group>
      ))}
      {/* center column, treads, landings, balustrades */}
      <mesh position={[c[0], (TOP + BOTTOM) / 2, c[1]]} material={M.column}>
        <cylinderGeometry args={[COLUMN_R, COLUMN_R, TOP - BOTTOM, 32]} />
      </mesh>
      <mesh geometry={geos.treads} material={M.granite} />
      <mesh geometry={geos.floor} material={M.granite} />
      <mesh geometry={geos.landings} material={M.granite} />
      <mesh geometry={geos.innerGlass} material={M.rail} />
      <mesh geometry={geos.outerGlass} material={M.rail} />
      <mesh geometry={geos.innerRail} material={M.steel} />
      <mesh geometry={geos.outerRail} material={M.steel} />
      {/* stair label on a post beside the entry, at every floor */}
      {STOPS.map(({ y }) => (
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
