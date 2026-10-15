import { useMemo } from 'react'
import * as THREE from 'three'
import { BOUNDS, CHAIRS, COURTYARD, DRUMS, H, STAIRS, TOWER_R, WALLS, inPoly } from './layout.js'
import { CHAIRS4, DRUMS4, ELEV4, HIGH_TABLES, MEETING4, PLANTS4, READING, READ_DESK, READ_TABLES, WALLS4 } from './floor4.js'
import { BOX, ClassroomStuff, Drums, Instanced, MeetingRooms, Plane, Stairs, Tiers, Walls, ribbon } from './World.jsx'
import * as T from './textures.js'

const TAU = Math.PI * 2
const SHARED = new Set(['drums', 'stairs']) // floor-2 pieces that repeat upstairs (courtyard glass is a ribbon)
const SPIRALS = STAIRS.filter((s) => s.spiral)

// floor-4 course for each floor-2 course (each drum has its own course)
const COURSE4 = Object.fromEntries(DRUMS.map((d, i) => [d.course, DRUMS4[i].course]))

function Slab({ M }) {
  const [floor, ceil] = useMemo(() => {
    const { xMin, xMax, zMin, zMax } = BOUNDS
    const make = (flip, towerHoles) => {
      const f = (x, z) => new THREE.Vector2(x, flip ? -z : z)
      const s = new THREE.Shape([f(xMin, zMin), f(xMax, zMin), f(xMax, zMax), f(xMin, zMax)])
      s.holes.push(new THREE.Path(COURTYARD.map(([x, z]) => f(x, z))))
      if (towerHoles) for (const t of SPIRALS) s.holes.push(new THREE.Path().absarc(t.c[0], flip ? -t.c[1] : t.c[1], TOWER_R, 0, TAU, true))
      const g = new THREE.ShapeGeometry(s)
      g.rotateX(flip ? -Math.PI / 2 : Math.PI / 2)
      return g
    }
    return [make(true, true), make(false, false)]
  }, [])
  return (
    <>
      <mesh geometry={floor} material={M.carpet} />
      <mesh geometry={ceil} material={M.ceiling} position={[0, H, 0]} />
    </>
  )
}

function CourtyardGlass({ M }) {
  const glass = useMemo(() => ribbon(COURTYARD, 0, H), [])
  const mullions = useMemo(() => COURTYARD.filter((_, i) => i % 6 === 0).map(([x, z]) => ({ p: [x, H / 2, z], s: [0.07, H, 0.07] })), [])
  return (
    <>
      <mesh geometry={glass} material={M.glass} />
      <Instanced items={mullions} material={M.mullion} geometry={BOX} />
    </>
  )
}

// Kenney Reading Room: long white tables, mesh chairs (in CHAIRS4), round wood-slat service desk
function ReadingRoom({ M }) {
  const tops = useMemo(() => READ_TABLES.map((t) => ({ p: [t.x, 0.74, (t.z0 + t.z1) / 2], s: [1.1, 0.04, t.z1 - t.z0] })), [])
  const legs = useMemo(
    () => READ_TABLES.flatMap((t) => [t.z0 + 0.2, t.z1 - 0.2].flatMap((z) => [-0.45, 0.45].map((dx) => ({ p: [t.x + dx, 0.37, z], s: [0.05, 0.74, 0.05] })))),
    [],
  )
  const sign = useMemo(() => new THREE.MeshBasicMaterial({ map: T.signTex(READING.name, READING.num) }), [])
  const slats = useMemo(() => {
    const m = new THREE.MeshStandardMaterial({ map: T.slatsTex(), roughness: 0.6 })
    m.map = m.map.clone()
    m.map.rotation = Math.PI / 2 // horizontal wood bands, like the real desk
    m.map.needsUpdate = true
    return m
  }, [])
  return (
    <>
      <Instanced items={tops} material={M.tableWhite} geometry={BOX} />
      <Instanced items={legs} material={M.steel} geometry={BOX} />
      <mesh position={[READ_DESK.x, 0.53, READ_DESK.z]} material={slats}>
        <cylinderGeometry args={[READ_DESK.r, READ_DESK.r, 1.06, 40]} />
      </mesh>
      <mesh position={[READ_DESK.x, 1.075, READ_DESK.z]} material={M.tableWhite}>
        <cylinderGeometry args={[READ_DESK.r + 0.05, READ_DESK.r + 0.05, 0.03, 40]} />
      </mesh>
      <Plane p={[READING.x1 + 0.08, 1.55, 2.0]} rot={Math.PI / 2} w={0.5} h={0.62} material={sign} />
    </>
  )
}

// closed wood office doors with small number plates
export function OfficeDoors({ M, doors }) {
  const panels = useMemo(() => doors.map((d) => ({ p: [d.x, 1.1, d.z], r: d.rot, s: [1.0, 2.2, 0.05] })), [doors])
  const plates = useMemo(
    () =>
      doors.map((d) => {
        const c = document.createElement('canvas')
        c.width = 128
        c.height = 64
        const g = c.getContext('2d')
        g.fillStyle = '#2a2a2e'
        g.fillRect(0, 0, 128, 64)
        g.fillStyle = '#f1f1f1'
        g.font = (d.label.length > 5 ? '24px' : '30px') + ' Georgia, serif'
        g.textAlign = 'center'
        g.textBaseline = 'middle'
        g.fillText(d.label, 64, 34)
        const t = new THREE.CanvasTexture(c)
        t.colorSpace = THREE.SRGBColorSpace
        return new THREE.MeshBasicMaterial({ map: t })
      }),
    [doors],
  )
  return (
    <>
      <Instanced items={panels} material={M.woodDoor} geometry={BOX} />
      {doors.map((d, i) => {
        const off = d.rot === 0 ? 0.03 : -0.03 // plate sits on the hallway side of the door
        return <Plane key={i} p={[d.x + 0.7, 1.55, d.z + off]} rot={d.rot} w={0.36} h={0.18} material={plates[i]} />
      })}
    </>
  )
}

function Details({ M }) {
  const lights = useMemo(() => {
    const out = []
    const { xMin, xMax, zMin, zMax } = BOUNDS
    const inTower = (x, z) => SPIRALS.some((t) => Math.hypot(x - t.c[0], z - t.c[1]) < TOWER_R + 0.3)
    for (let x = xMin + 1.2; x < xMax; x += 2.4)
      for (let z = zMin + 1.2; z < zMax; z += 2.4) if (!inPoly(x, z, COURTYARD) && !inTower(x, z)) out.push({ p: [x, H - 0.01, z] })
    return out
  }, [])
  const lampGeo = useMemo(() => {
    const g = new THREE.CircleGeometry(0.09, 12)
    g.rotateX(Math.PI / 2)
    return g
  }, [])
  const sphere = useMemo(() => new THREE.SphereGeometry(1, 14, 10), [])
  return (
    <>
      <Instanced items={lights} material={M.lamp} geometry={lampGeo} />
      <Instanced items={PLANTS4.map(([x, z]) => ({ p: [x, 0.3, z], s: [0.3, 0.6, 0.3] }))} material={M.pot} geometry={BOX} />
      <Instanced items={PLANTS4.map(([x, z]) => ({ p: [x, 1.1, z], s: [0.5, 0.65, 0.5] }))} material={M.leaf} geometry={sphere} />
      {HIGH_TABLES.map(([x, z], i) => (
        <group key={i}>
          <mesh position={[x, 1.05, z]} material={M.tableWhite}>
            <cylinderGeometry args={[0.55, 0.55, 0.04, 28]} />
          </mesh>
          <mesh position={[x, 0.52, z]} material={M.steel}>
            <cylinderGeometry args={[0.04, 0.04, 1.04, 10]} />
          </mesh>
        </group>
      ))}
    </>
  )
}

export default function Floor4({ M }) {
  const walls = useMemo(() => [...WALLS.filter((w) => SHARED.has(w.part)), ...WALLS4], [])
  const chairs = useMemo(() => [...CHAIRS.filter((c) => c.room), ...CHAIRS4.map((c) => (c.high ? { ...c, y: 0.3 } : c))], [])
  return (
    <group position={[0, ELEV4, 0]}>
      <Slab M={M} />
      <CourtyardGlass M={M} />
      <Walls M={M} list={walls} />
      <Drums M={M} drums={DRUMS4} />
      <Tiers M={M} />
      <ClassroomStuff M={M} chairs={chairs} courseOf={(c) => COURSE4[c]} />
      <Stairs M={M} />
      <ReadingRoom M={M} />
      <MeetingRooms M={M} rooms={MEETING4} seed={4000} />
      <Details M={M} />
    </group>
  )
}
