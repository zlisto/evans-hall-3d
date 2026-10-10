import { useMemo } from 'react'
import * as THREE from 'three'
import { BOUNDS, COURTYARD, EAST, H, STAIRS, TOWER_R, inPoly } from './layout.js'
import {
  AUDITORIUM, BANQUETTE, CAFE, CAFE_COUNTER, CAFE_TABLES, CHAIRS1, COLUMNS1, COURT_DOORS, COURT_RUNS, COURT_TREES,
  DINING_TABLES, ELEV1, ENTRANCE, FORUM, FORUM_TABLES, KIOSKS, KITCHEN, LAWN, LOBBY_WALL, LOUNGE, OFFICE_DOORS1,
  PLANTS1, SERVERY, SUITES, SUITE_Z, TERRACE_TABLES, WALLS1,
} from './floor1.js'
import { Arc, BOX, Instanced, Plane, Stairs, Walls } from './World.jsx'
import { OfficeDoors } from './Floor4.jsx'
import { sectorGeo } from './SpiralTowers.jsx'
import LabubuParty from './LabubuParty.jsx'
import * as T from './textures.js'

// Evans Hall ground floor + the courtyard terrace (see floor1.js for the plan). Everything here is in
// floor-local coordinates inside a group lifted to ELEV1.

const TAU = Math.PI * 2
const SPIRALS = STAIRS.filter((s) => s.spiral)
const CYL = new THREE.CylinderGeometry(1, 1, 1, 24)
const SPHERE = new THREE.SphereGeometry(1, 14, 10)

// ---------- canvas textures from the photos
const canvasTex = (w, h, draw, repeat) => {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  draw(c.getContext('2d'), w, h)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  if (repeat) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    t.repeat.set(...repeat)
  }
  return t
}
// big light porcelain tiles in a running bond, thin gray grout
const tileTex = () =>
  canvasTex(
    512,
    512,
    (g) => {
      g.fillStyle = '#e9e1d4'
      g.fillRect(0, 0, 512, 512)
      g.strokeStyle = '#b9b0a2'
      g.lineWidth = 2
      for (let row = 0; row < 4; row++) {
        const y = row * 128
        g.beginPath()
        g.moveTo(0, y)
        g.lineTo(512, y)
        g.stroke()
        for (let x = row % 2 ? 128 : 0; x < 512; x += 256) {
          g.beginPath()
          g.moveTo(x, y)
          g.lineTo(x, y + 128)
          g.stroke()
        }
      }
    },
    [0.17, 0.17],
  )
// dark slatted ceiling in the café and the Forum
const slatTex = () =>
  canvasTex(
    256,
    256,
    (g) => {
      g.fillStyle = '#1b1c20'
      g.fillRect(0, 0, 256, 256)
      g.fillStyle = '#34363c'
      for (let x = 0; x < 256; x += 16) g.fillRect(x, 0, 9, 256)
    },
    [6, 6],
  )
// the colorful collage mural along the Forum corridor
const collageTex = () =>
  canvasTex(1024, 512, (g, w, h) => {
    g.fillStyle = '#121216'
    g.fillRect(0, 0, w, h)
    const r = T.rng(7)
    for (let i = 0; i < 2600; i++) {
      const x = r() * w
      const fill = (x / w) * 0.85 + 0.1 // the collage thins out into dark sky toward one end
      const y = h - r() * h * fill * 1.2
      if (y < 0) continue
      const hue = Math.floor(r() * 360)
      g.fillStyle = `hsl(${hue},${55 + r() * 35}%,${45 + r() * 25}%)`
      const s = 5 + r() * 12
      g.fillRect(x, y, s, s * (0.6 + r() * 0.8))
    }
    for (let i = 0; i < 90; i++) {
      g.fillStyle = `hsl(${Math.floor(r() * 360)},80%,70%)`
      g.beginPath()
      g.arc(r() * w, r() * h * 0.5, 3 + r() * 5, 0, TAU)
      g.fill()
    }
  })
// the rainbow-stripe painting over the banquette by Charley's
const stripesTex = () =>
  canvasTex(512, 512, (g) => {
    const colors = ['#e6332a', '#f39200', '#ffde00', '#3aaa35', '#00a0e3', '#2d2e83', '#e5007d', '#8bc53f', '#ff6f91', '#13b5b1']
    g.fillStyle = '#111111'
    g.fillRect(0, 0, 512, 512)
    for (let i = 0; i < 10; i++) {
      g.fillStyle = colors[i]
      g.fillRect(16, 16 + i * 48, 240, 40)
      g.fillStyle = colors[(i + 4) % 10]
      g.fillRect(268 + i * 23, 16, 19, 480)
    }
  })
// black-and-white landscape photos in the atrium
const bwTex = (seed) =>
  canvasTex(256, 192, (g, w, h) => {
    const r = T.rng(seed)
    const grad = g.createLinearGradient(0, 0, 0, h)
    grad.addColorStop(0, '#d9d9d9')
    grad.addColorStop(1, '#3a3a3a')
    g.fillStyle = grad
    g.fillRect(0, 0, w, h)
    g.fillStyle = '#1a1a1a'
    g.beginPath()
    g.moveTo(0, h * 0.7)
    for (let x = 0; x <= w; x += 16) g.lineTo(x, h * (0.55 + r() * 0.2))
    g.lineTo(w, h)
    g.lineTo(0, h)
    g.fill()
    g.fillStyle = 'rgba(255,255,255,0.7)'
    for (let i = 0; i < 6; i++) {
      g.beginPath()
      g.ellipse(r() * w, r() * h * 0.35, 20 + r() * 30, 6 + r() * 8, 0, 0, TAU)
      g.fill()
    }
  })
// glowing purple script sign
const neonTex = (text) =>
  canvasTex(1024, 192, (g) => {
    g.clearRect(0, 0, 1024, 192)
    g.font = 'italic 110px Georgia, serif'
    g.textAlign = 'center'
    g.textBaseline = 'middle'
    g.shadowColor = '#c46cff'
    g.shadowBlur = 30
    g.fillStyle = '#e7b6ff'
    g.fillText(text, 512, 100)
    g.shadowBlur = 0
    g.fillStyle = '#f7e8ff'
    g.fillText(text, 512, 100)
  })
const wordsTex = (lines, { bg = '#1c1c1f', fg = '#d8d2c6', size = 54 } = {}) =>
  canvasTex(1024, 256, (g) => {
    g.fillStyle = bg
    g.fillRect(0, 0, 1024, 256)
    g.fillStyle = fg
    g.font = `${size}px Georgia, serif`
    g.textAlign = 'center'
    g.textBaseline = 'middle'
    lines.forEach((l, i) => g.fillText(l, 512, 128 + (i - (lines.length - 1) / 2) * size * 1.25))
  })

// open (non-closed) vertical strip along a polyline
function openRibbon(points, y0, y1) {
  const pos = []
  const idx = []
  points.forEach((p, i) => {
    pos.push(p[0], y0, p[1], p[0], y1, p[1])
    if (i > 0) {
      const a = (i - 1) * 2
      idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3)
    }
  })
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setIndex(idx)
  g.computeVertexNormals()
  return g
}

function useFloorMats() {
  return useMemo(
    () => ({
      tile: new THREE.MeshStandardMaterial({ map: tileTex(), roughness: 0.55 }),
      slats: new THREE.MeshStandardMaterial({ map: slatTex(), roughness: 0.8, side: THREE.DoubleSide }),
      pavers: new THREE.MeshStandardMaterial({ map: T.stoneTex([3, 3]), color: '#c9c6c0', roughness: 0.9 }),
      lawn: new THREE.MeshStandardMaterial({ map: T.lawnTex(), roughness: 1 }),
      collage: new THREE.MeshBasicMaterial({ map: collageTex() }),
      stripes: new THREE.MeshBasicMaterial({ map: stripesTex() }),
      neon: new THREE.MeshBasicMaterial({ map: neonTex("Charley's Place"), transparent: true, toneMapped: false }),
      evans: new THREE.MeshBasicMaterial({ map: wordsTex(['Edward P. Evans Hall'], { bg: '#18181b', fg: '#b88a5a', size: 70 }) }),
      shen: new THREE.MeshBasicMaterial({ map: wordsTex(['Shen Courtyard', 'Gift of Neil Shen ’92 M.A. and Jane Yong'], { bg: '#f1efe9', fg: '#2a2a2a', size: 46 }) }),
      steelBack: new THREE.MeshStandardMaterial({ color: '#5f646b', metalness: 0.85, roughness: 0.35 }),
      frosted: new THREE.MeshStandardMaterial({ color: '#e6ebee', transparent: true, opacity: 0.8, roughness: 0.4 }),
      caseGlass: new THREE.MeshStandardMaterial({ color: '#dff0f6', transparent: true, opacity: 0.35, roughness: 0.05, metalness: 0.2 }),
      chrome: new THREE.MeshStandardMaterial({ color: '#d8dce2', metalness: 0.95, roughness: 0.2 }),
      mesh: new THREE.MeshStandardMaterial({ color: '#5b5f66', roughness: 0.7, metalness: 0.4 }),
      bw: [1, 2, 3, 4, 5].map((s) => new THREE.MeshBasicMaterial({ map: bwTex(s) })),
    }),
    [],
  )
}

// ---------- floor (tile inside, pavers + lawn in the courtyard) and ceiling
function Ground({ M, F }) {
  const geos = useMemo(() => {
    const { xMin, xMax, zMin, zMax } = BOUNDS
    const v = (x, z, flip) => new THREE.Vector2(x, flip ? -z : z)
    const slab = (flip) => {
      const s = new THREE.Shape([v(xMin, zMin, flip), v(xMax, zMin, flip), v(xMax, zMax, flip), v(xMin, zMax, flip)])
      s.holes.push(new THREE.Path(COURTYARD.map(([x, z]) => v(x, z, flip))))
      for (const t of SPIRALS) s.holes.push(new THREE.Path().absarc(t.c[0], flip ? -t.c[1] : t.c[1], TOWER_R, 0, TAU, true))
      const g = new THREE.ShapeGeometry(s)
      g.rotateX(flip ? -Math.PI / 2 : Math.PI / 2)
      return g
    }
    const court = new THREE.Shape(COURTYARD.map(([x, z]) => v(x, z, true)))
    court.holes.push(new THREE.Path(LAWN.map(([x, z]) => v(x, z, true))))
    const pavers = new THREE.ShapeGeometry(court)
    pavers.rotateX(-Math.PI / 2)
    const lawn = new THREE.ShapeGeometry(new THREE.Shape(LAWN.map(([x, z]) => v(x, z, true))))
    lawn.rotateX(-Math.PI / 2)
    // UVs for the tile: world meters
    for (const g of [pavers, lawn]) {
      const p = g.attributes.position
      const uv = g.attributes.uv
      for (let i = 0; i < uv.count; i++) uv.setXY(i, p.getX(i) / 6, p.getZ(i) / 6)
    }
    const disc = (room) => {
      const g = new THREE.CircleGeometry(room.r, 48)
      g.rotateX(Math.PI / 2)
      return g
    }
    return { floor: slab(true), ceiling: slab(false), pavers, lawn, cafeCeil: disc(CAFE), forumCeil: disc(FORUM) }
  }, [])
  return (
    <>
      <mesh geometry={geos.floor} material={F.tile} />
      <mesh geometry={geos.pavers} material={F.pavers} position={[0, 0.003, 0]} />
      <mesh geometry={geos.lawn} material={F.lawn} position={[0, 0.006, 0]} />
      {/* floor 2's slab, seen from below (a hair under it so it never shows through the carpet) */}
      <mesh geometry={geos.ceiling} material={M.ceiling} position={[0, H - 0.03, 0]} />
      <mesh geometry={geos.cafeCeil} material={F.slats} position={[CAFE.c[0], H - 0.05, CAFE.c[1]]} />
      <mesh geometry={geos.forumCeil} material={F.slats} position={[FORUM.c[0], H - 0.05, FORUM.c[1]]} />
    </>
  )
}

// ---------- courtyard glass (with doors out to the terrace), terrace furniture, trees, Labubus
function Courtyard({ M, F }) {
  const glass = useMemo(() => COURT_RUNS.map((run) => openRibbon(run, 0, H)), [])
  const mullions = useMemo(() => COURTYARD.filter((_, i) => i % 6 === 0).map(([x, z]) => ({ p: [x, H / 2, z], s: [0.08, H, 0.08] })), [])
  const tables = useMemo(() => TERRACE_TABLES.map(([x, z]) => ({ p: [x, 0.74, z], s: [0.85, 0.03, 0.85] })), [])
  const posts = useMemo(() => TERRACE_TABLES.map(([x, z]) => ({ p: [x, 0.37, z], s: [0.05, 0.74, 0.05] })), [])
  return (
    <>
      {glass.map((g, i) => (
        <mesh key={i} geometry={g} material={M.glass} />
      ))}
      <Instanced items={mullions} material={M.mullion} geometry={BOX} />
      {COURT_DOORS.map((d, i) => (
        <group key={i} position={[d.x, 0, d.z]} rotation={[0, -d.along, 0]}>
          {/* black door frame + transom, a glass door slid open */}
          {[-0.95, 0.95].map((x) => (
            <mesh key={x} position={[x, H / 2, 0]} material={M.mullion} scale={[0.1, H, 0.12]} geometry={BOX} />
          ))}
          <mesh position={[0, 2.5, 0]} material={M.mullion} scale={[2, 0.12, 0.12]} geometry={BOX} />
          <mesh position={[0, (2.5 + H) / 2, 0]} material={M.glass} scale={[1.8, H - 2.5, 0.03]} geometry={BOX} />
          <mesh position={[0.6, 1.25, -0.25]} rotation={[0, 1.2, 0]} material={M.meetGlass} scale={[0.95, 2.4, 0.03]} geometry={BOX} />
          {d.north && <Plane p={[1.6, 1.6, -0.06]} rot={Math.PI} w={0.5} h={0.18} material={F.shen} />}
        </group>
      ))}
      <Instanced items={tables} material={M.tableWhite} geometry={CYL} />
      <Instanced items={posts} material={F.chrome} geometry={BOX} />
      <Instanced items={COURT_TREES.map(([x, z]) => ({ p: [x, 1.5, z], s: [0.35, 3, 0.35] }))} material={M.trunk} geometry={BOX} />
      <Instanced items={COURT_TREES.map(([x, z], i) => ({ p: [x, 4.2 + (i % 3) * 0.6, z], s: [3.2, 2.6, 3.2] }))} material={M.crown} geometry={SPHERE} />
      <LabubuParty y={0} />
    </>
  )
}

// ---------- chairs: black dining chairs, wire café stools, mesh terrace chairs
function Chairs({ M, F }) {
  const rows = useMemo(() => {
    const seat = []
    const back = []
    const legs = []
    for (const c of CHAIRS1) {
      const stool = c.kind === 'stool'
      const y = stool ? 0.72 : 0.46
      seat.push({ p: [c.x, y, c.z], r: c.rot, s: stool ? [0.42, 0.05, 0.42] : [0.48, 0.07, 0.48] })
      back.push({ p: [c.x + Math.sin(c.rot) * 0.21, y + (stool ? 0.2 : 0.33), c.z + Math.cos(c.rot) * 0.21], r: c.rot, s: [0.46, stool ? 0.3 : 0.55, 0.05] })
      legs.push({ p: [c.x, y / 2, c.z], s: [0.05, y, 0.05], kind: c.kind })
    }
    return { seat, back, legs }
  }, [])
  const byKind = (list, kind) => list.filter((_, i) => (CHAIRS1[i].kind ?? 'chair') === kind)
  return (
    <>
      {[
        ['chair', M.chair],
        ['stool', F.chrome],
        ['mesh', F.mesh],
      ].map(([kind, mat]) => (
        <group key={kind}>
          <Instanced items={byKind(rows.seat, kind)} material={mat} geometry={BOX} />
          <Instanced items={byKind(rows.back, kind)} material={mat} geometry={BOX} />
        </group>
      ))}
      <Instanced items={rows.legs} material={F.chrome} geometry={BOX} />
    </>
  )
}

// ---------- McNay Café (round glass room: curved wood counter with a glass case) + Snyder Forum
function GlassRooms({ M, F }) {
  const cafeSign = useMemo(() => new THREE.MeshBasicMaterial({ map: T.signTex('McNay Café', '1200') }), [])
  const forumSign = useMemo(() => new THREE.MeshBasicMaterial({ map: T.signTex('Snyder Forum', '1400') }), [])
  const counterTop = useMemo(() => sectorGeo(CAFE_COUNTER.c, CAFE_COUNTER.r - 0.35, CAFE_COUNTER.r + 0.35, CAFE_COUNTER.a0, CAFE_COUNTER.a1, 1.05, 0.04), [])
  const mullions = (room) => {
    const out = []
    for (let a = room.phi + room.gapHalf + 0.15; a < room.phi + TAU - room.gapHalf; a += 0.3)
      out.push({ p: [room.c[0] + room.r * Math.sin(a), H / 2, room.c[1] + room.r * Math.cos(a)], s: [0.06, H, 0.06] })
    return out
  }
  const signAt = (room, side) => {
    const a = room.phi + side * (room.gapHalf + 0.12)
    return [[room.c[0] + (room.r + 0.06) * Math.sin(a), 1.6, room.c[1] + (room.r + 0.06) * Math.cos(a)], a]
  }
  const [cafeSignP, cafeSignA] = signAt(CAFE, 1)
  const [forumSignP, forumSignA] = signAt(FORUM, -1)
  return (
    <>
      {[CAFE, FORUM].map((room) => (
        <group key={room.num}>
          <Arc c={room.c} rx={room.r} a0={room.phi + room.gapHalf} a1={room.phi + TAU - room.gapHalf} material={M.glass} />
          <Instanced items={mullions(room)} material={M.mullion} geometry={BOX} />
          {[2, 3.2].map((rr, i) => (
            <mesh key={i} position={[room.c[0] + rr * Math.sin(room.phi + 2.4 + i), H / 2, room.c[1] + rr * Math.cos(room.phi + 2.4 + i)]} material={M.column} scale={[0.25, H, 0.25]} geometry={CYL} />
          ))}
        </group>
      ))}
      <Plane p={cafeSignP} rot={cafeSignA} w={0.5} h={0.62} material={cafeSign} />
      <Plane p={forumSignP} rot={forumSignA} w={0.5} h={0.62} material={forumSign} />
      {/* café counter: wood front, glass display case, white top */}
      <Arc c={CAFE_COUNTER.c} rx={CAFE_COUNTER.r + 0.35} a0={CAFE_COUNTER.a0} a1={CAFE_COUNTER.a1} h={1.05} material={M.desk} />
      <mesh geometry={counterTop} material={M.tableWhite} />
      <Arc c={CAFE_COUNTER.c} rx={CAFE_COUNTER.r + 0.1} a0={CAFE_COUNTER.a0} a1={CAFE_COUNTER.a1} y0={1.09} h={0.45} material={F.caseGlass} />
      {CAFE_TABLES.map((t, i) => (
        <mesh key={i} position={[t.x, 1.02, t.z]} material={M.tableWhite} scale={[0.4, 0.03, 0.4]} geometry={CYL} />
      ))}
      {FORUM_TABLES.map((t, i) => (
        <mesh key={i} position={[t.x, 0.74, t.z]} material={M.desk} scale={[2.5, 0.05, 0.9]} geometry={BOX} />
      ))}
    </>
  )
}

// ---------- Charley's Place: steel kitchen backdrop, curved wood servery, purple neon; the dining room
function Charleys({ M, F }) {
  const top = useMemo(() => sectorGeo(SERVERY.c, SERVERY.r - 0.4, SERVERY.r + 0.4, SERVERY.a0, SERVERY.a1, 1.0, 0.04), [])
  const kx = (KITCHEN.x0 + KITCHEN.x1) / 2
  const tables = useMemo(() => DINING_TABLES.map((t) => ({ p: [t.x, 0.74, t.z], s: [0.55, 0.03, 0.55] })), [])
  const posts = useMemo(() => DINING_TABLES.map((t) => ({ p: [t.x, 0.37, t.z], s: [0.06, 0.74, 0.06] })), [])
  return (
    <>
      <mesh position={[kx, 1.9, KITCHEN.z1 + 0.12]} material={F.steelBack} scale={[KITCHEN.x1 - KITCHEN.x0 - 0.4, 3.8, 0.04]} geometry={BOX} />
      <mesh position={[kx, H - 0.55, KITCHEN.z1 + 0.6]} material={M.white} scale={[KITCHEN.x1 - KITCHEN.x0, 0.9, 1.0]} geometry={BOX} />
      <Plane p={[kx + 3, H - 0.55, KITCHEN.z1 + 1.12]} w={5.2} h={1.0} material={F.neon} />
      <Arc c={SERVERY.c} rx={SERVERY.r + 0.4} a0={SERVERY.a0} a1={SERVERY.a1} h={1.0} material={M.desk} />
      <mesh geometry={top} material={M.tableWhite} />
      <Instanced items={tables} material={M.tableWhite} geometry={CYL} />
      <Instanced items={posts} material={F.chrome} geometry={BOX} />
      <Plane p={[(BANQUETTE.a[0] + BANQUETTE.b[0]) / 2 + 1.2, 2.2, -36.42]} w={2.6} h={2.6} material={F.stripes} />
      {KIOSKS.map(([x, z], i) => (
        <group key={i}>
          <mesh position={[x, 0.85, z]} material={M.desk} scale={[1.1, 1.7, 1.1]} geometry={BOX} />
          <Plane p={[x, 1.05, z + 0.56]} w={0.9} h={1.0} material={M.poster} />
        </group>
      ))}
      <Instanced items={COLUMNS1.map(([x, z]) => ({ p: [x, H / 2, z], s: [0.3, H, 0.3] }))} material={M.column} geometry={CYL} />
    </>
  )
}

// ---------- south: suite signs on the glass, lounge tables, atrium photos, collage mural; lobby; auditorium
function SouthAndLobby({ M, F }) {
  const suiteSigns = useMemo(() => SUITES.map((s) => new THREE.MeshBasicMaterial({ map: T.signTex(s.name, s.num) })), [])
  const audSign = useMemo(() => new THREE.MeshBasicMaterial({ map: T.signTex(AUDITORIUM.name, AUDITORIUM.num) }), [])
  return (
    <>
      {SUITES.map((s, i) => (
        <Plane key={i} p={[s.x0 + 1.2, 1.55, SUITE_Z[0] - 0.06]} rot={Math.PI} w={0.5} h={0.62} material={suiteSigns[i]} />
      ))}
      {LOUNGE.map((l, i) => (
        <mesh key={i} position={[l.x, 0.38, l.z]} material={M.desk} scale={[1.3, 0.06, 0.8]} geometry={BOX} />
      ))}
      {/* atrium: black-and-white photographs along the suites' back wall */}
      {[-18, -12.5, -7, 3, 8.5, 14].map((x, i) => (
        <group key={x}>
          <mesh position={[x, 1.8, SUITE_Z[1] + 0.12]} material={M.dark} scale={[1.7, 1.25, 0.04]} geometry={BOX} />
          <Plane p={[x, 1.8, SUITE_Z[1] + 0.145]} w={1.55} h={1.12} material={F.bw[i % F.bw.length]} />
        </group>
      ))}
      {/* the collage mural on the Welcome Center's west wall, facing the Forum corridor */}
      <Plane p={[SUITES[0].x0 - 0.09, 2.0, (SUITE_Z[0] + SUITE_Z[1]) / 2]} rot={-Math.PI / 2} w={6} h={3} material={F.collage} />
      {/* main lobby: name wall + glass entrance doors on Whitney Ave */}
      <Plane p={[LOBBY_WALL.x - 0.21, 2.6, 0]} rot={-Math.PI / 2} w={6.5} h={1.6} material={F.evans} />
      {[-1.2, 1.2].map((dz) => (
        <group key={dz}>
          <mesh position={[ENTRANCE.x + 0.05, 1.25, dz]} material={M.meetGlass} scale={[0.04, 2.5, 2.3]} geometry={BOX} />
          <mesh position={[ENTRANCE.x + 0.12, 1.1, dz - Math.sign(dz) * 0.9]} material={M.steel} scale={[0.03, 1.4, 0.03]} geometry={BOX} />
        </group>
      ))}
      <mesh position={[ENTRANCE.x + 0.05, 2.55, 0]} material={M.mullion} scale={[0.1, 0.12, 4.9]} geometry={BOX} />
      {/* Zhang Auditorium: frosted glass doors in the east wall (locked) */}
      {AUDITORIUM.doors.map(([x, z], i) => (
        <group key={i}>
          <mesh position={[x - 0.12, 1.4, z]} material={M.mullion} scale={[0.06, 2.8, 2.3]} geometry={BOX} />
          <mesh position={[x - 0.16, 1.35, z]} material={F.frosted} scale={[0.03, 2.6, 2.1]} geometry={BOX} />
        </group>
      ))}
      <Plane p={[EAST - 0.18, 1.6, 0]} rot={-Math.PI / 2} w={0.5} h={0.62} material={audSign} />
    </>
  )
}

function Lights({ M }) {
  const lights = useMemo(() => {
    const out = []
    const { xMin, xMax, zMin, zMax } = BOUNDS
    const skip = (x, z) =>
      inPoly(x, z, COURTYARD) ||
      SPIRALS.some((t) => Math.hypot(x - t.c[0], z - t.c[1]) < TOWER_R + 0.3) ||
      [CAFE, FORUM].some((r) => Math.hypot(x - r.c[0], z - r.c[1]) < r.r)
    for (let x = xMin + 1.2; x < xMax; x += 2.4) for (let z = zMin + 1.2; z < zMax; z += 2.4) if (!skip(x, z)) out.push({ p: [x, H - 0.04, z] })
    // pin lights in the slatted ceilings
    for (const r of [CAFE, FORUM]) for (let a = 0; a < TAU; a += TAU / 14) for (const rr of [2.5, 5]) out.push({ p: [r.c[0] + rr * Math.sin(a), H - 0.07, r.c[1] + rr * Math.cos(a)] })
    return out
  }, [])
  const geo = useMemo(() => {
    const g = new THREE.CircleGeometry(0.09, 12)
    g.rotateX(Math.PI / 2)
    return g
  }, [])
  return (
    <>
      <Instanced items={lights} material={M.lamp} geometry={geo} />
      <Instanced items={PLANTS1.map(([x, z]) => ({ p: [x, 0.3, z], s: [0.3, 0.6, 0.3] }))} material={M.pot} geometry={BOX} />
      <Instanced items={PLANTS1.map(([x, z]) => ({ p: [x, 1.1, z], s: [0.5, 0.65, 0.5] }))} material={M.leaf} geometry={SPHERE} />
    </>
  )
}

export default function Floor1({ M }) {
  const F = useFloorMats()
  return (
    <group position={[0, ELEV1, 0]}>
      <Ground M={M} F={F} />
      <Courtyard M={M} F={F} />
      <Walls M={M} list={WALLS1} />
      <Stairs M={M} />
      <GlassRooms M={M} F={F} />
      <Charleys M={M} F={F} />
      <SouthAndLobby M={M} F={F} />
      <OfficeDoors M={M} doors={OFFICE_DOORS1} />
      <Chairs M={M} F={F} />
      <Lights M={M} />
    </group>
  )
}
