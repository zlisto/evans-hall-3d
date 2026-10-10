import { useEffect, useRef } from 'react'
import { BEIN, BOUNDS, COURTYARD, DRUMS, LIBRARY, MEETING, STAIRS, TOWER_R, arc } from './layout.js'
import { DRUMS4, READING } from './floor4.js'
import { CAFE, FORUM, KITCHEN, SUITES, SUITE_Z } from './floor1.js'
import { DAN } from './HandsomeDan.jsx'

const PAD = 3
const X0 = BOUNDS.xMin - PAD
const X1 = BOUNDS.xMax + BEIN.terrace + PAD
const Z0 = BOUNDS.zMin - PAD
const Z1 = BOUNDS.zMax + PAD
const S = 2.6 // px per meter
const Wpx = Math.round((X1 - X0) * S)
const Hpx = Math.round((Z1 - Z0) * S)
const px = (x, z) => [(x - X0) * S, (z - Z0) * S]

function drawStairs(g) {
  g.fillStyle = '#ff4fa3'
  g.font = 'bold 10px system-ui, sans-serif'
  for (const s of STAIRS) {
    if (s.spiral) {
      g.beginPath()
      g.arc(...px(...s.c), TOWER_R * S, 0, Math.PI * 2)
      g.fill()
      g.fillStyle = '#0b0b0d'
      g.fillText(s.id, ...px(s.c[0] - 0.9, s.c[1] + 1.2))
      g.fillStyle = '#ff4fa3'
      continue
    }
    g.fillRect(...px(s.c[0] - s.w / 2, s.c[1] - s.d / 2), s.w * S, s.d * S)
    g.fillStyle = '#0b0b0d'
    g.fillText(s.id, ...px(s.c[0] - 0.9, s.c[1] + 1.2))
    g.fillStyle = '#ff4fa3'
  }
}

// ground floor: the courtyard is walkable; round café + Forum in the west corners
function drawFloor1(g, path) {
  g.fillStyle = '#1a1a1f'
  g.strokeStyle = '#ff4fa3'
  g.lineWidth = 1.5
  path([[BOUNDS.xMin, BOUNDS.zMin], [BOUNDS.xMax, BOUNDS.zMin], [BOUNDS.xMax, BOUNDS.zMax], [BOUNDS.xMin, BOUNDS.zMax]])
  g.fill()
  g.stroke()
  path(arc(BEIN.c, BEIN.r, BEIN.r, 0, Math.PI, 30)) // Zhang Auditorium sits under the Beinecke Room
  g.fillStyle = '#2b2236'
  g.fill()
  g.stroke()
  path(COURTYARD)
  g.fillStyle = '#26472a'
  g.fill()
  g.strokeStyle = '#ffb3d9'
  g.stroke()
  g.strokeStyle = '#ff4fa3'
  for (const r of [CAFE, FORUM]) {
    path(arc(r.c, r.r, r.r, 0, Math.PI * 2, 48))
    g.fillStyle = '#3b2a1c'
    g.fill()
    g.stroke()
  }
  g.fillStyle = '#26262e'
  g.fillRect(...px(KITCHEN.x0, KITCHEN.z0), (KITCHEN.x1 - KITCHEN.x0) * S, (KITCHEN.z1 - KITCHEN.z0) * S)
  g.fillRect(...px(-35, 44.3), 57.6 * S, (BOUNDS.zMax - 44.3) * S)
  g.fillRect(...px(-35, BOUNDS.zMin), 57.6 * S, (-45.3 - BOUNDS.zMin) * S)
  g.fillRect(...px(SUITES[0].x0, SUITE_Z[0]), (SUITES[3].x1 - SUITES[0].x0) * S, (SUITE_Z[1] - SUITE_Z[0]) * S)
  g.fillStyle = '#ffd6ea'
  g.font = '9px system-ui, sans-serif'
  g.fillText('CAFÉ', ...px(CAFE.c[0] - 2.5, CAFE.c[1] + 1))
  g.fillText('FORUM', ...px(FORUM.c[0] - 3, FORUM.c[1] + 1))
  g.fillText("CHARLEY'S", ...px(-15, -33))
  g.fillText('COURTYARD', ...px(-7, 1))
  g.fillText('LOBBY', ...px(-39, 1))
  g.fillText('AUDITORIUM', ...px(BEIN.c[0] + 0.5, 1))
  g.fillText('N ↑', ...px(BOUNDS.xMax + 6, BOUNDS.zMin + 2))
}

function drawStatic(g, level) {
  const path = (pts, close = true) => {
    g.beginPath()
    pts.forEach((p, i) => (i ? g.lineTo(...px(...p)) : g.moveTo(...px(...p))))
    if (close) g.closePath()
  }
  g.fillStyle = '#0b0b0d'
  g.fillRect(0, 0, Wpx, Hpx)
  if (level === 1) {
    drawFloor1(g, path)
    drawStairs(g)
    g.font = 'bold 11px system-ui, sans-serif'
    g.fillStyle = '#ffd6ea'
    g.fillText('FLOOR 1', ...px(BOUNDS.xMax + 2, BOUNDS.zMax - 1))
    return
  }
  const drums = level === 4 ? DRUMS4 : DRUMS
  // building
  g.fillStyle = '#1a1a1f'
  g.strokeStyle = '#ff4fa3'
  g.lineWidth = 1.5
  path([[BOUNDS.xMin, BOUNDS.zMin], [BOUNDS.xMax, BOUNDS.zMin], [BOUNDS.xMax, BOUNDS.zMax], [BOUNDS.xMin, BOUNDS.zMax]])
  g.fill()
  g.stroke()
  // terrace + Beinecke (floor 4 looks down on its roof)
  path(arc(BEIN.c, BEIN.terrace, BEIN.terrace, 0, Math.PI, 30))
  g.fillStyle = '#2a2622'
  g.fill()
  path(arc(BEIN.c, BEIN.r, BEIN.r, 0, Math.PI, 30))
  g.fillStyle = level === 4 ? '#222226' : '#3a2a33'
  g.fill()
  if (level === 2) g.stroke()
  // courtyard
  path(COURTYARD)
  g.fillStyle = '#18321a'
  g.fill()
  g.strokeStyle = '#ffb3d9'
  g.stroke()
  // drums
  g.strokeStyle = '#ff4fa3'
  for (const d of drums) {
    path(arc(d.c, d.rx, d.rz, 0, Math.PI * 2, 48))
    g.fillStyle = '#16244f'
    g.fill()
    for (const [a0, a1] of d.arcs) {
      path(arc(d.c, d.rx, d.rz, a0, a1, 32), false)
      g.stroke()
    }
  }
  // library / reading room, meeting rooms / offices, stairs
  g.fillStyle = '#3b2a1c'
  g.fillRect(...px(LIBRARY.x0, LIBRARY.z0), (LIBRARY.x1 - LIBRARY.x0) * S, (LIBRARY.z1 - LIBRARY.z0) * S)
  g.fillStyle = '#26262e'
  if (level === 2) for (const m of MEETING) g.fillRect(...px(m.x - 2.6, m.z - 2.8), 5.2 * S, 5.6 * S)
  else {
    g.fillRect(...px(-35, 44.3), 57.6 * S, (BOUNDS.zMax - 44.3) * S)
    g.fillRect(...px(-35, BOUNDS.zMin), 57.6 * S, (-45.3 - BOUNDS.zMin) * S)
  }
  drawStairs(g)
  g.fillStyle = '#ffd6ea'
  g.font = '9px system-ui, sans-serif'
  g.fillText(level === 4 ? 'KENNEY' : 'ROSS LIB', ...px(LIBRARY.x0 + 0.6, 1))
  if (level === 2) g.fillText('BEINECKE', ...px(BEIN.c[0] + 2, 1))
  g.font = 'bold 11px system-ui, sans-serif'
  g.fillText(level === 4 ? 'FLOOR 4' : 'FLOOR 2', ...px(BOUNDS.xMax + 2, BOUNDS.zMax - 1))
  g.font = '9px system-ui, sans-serif'
  g.fillText('COURTYARD', ...px(-7, 1))
  g.fillText('N ↑', ...px(BOUNDS.xMax + 6, BOUNDS.zMin + 2))
  for (const d of drums) g.fillText(d.id, ...px(d.c[0] - 2.4, d.c[1] + 1))
}

export default function Minimap({ drawRef }) {
  const ref = useRef()
  useEffect(() => {
    const bgs = {}
    for (const level of [1, 2, 4]) {
      const bg = document.createElement('canvas')
      bg.width = Wpx
      bg.height = Hpx
      drawStatic(bg.getContext('2d'), level)
      bgs[level] = bg
    }
    const g = ref.current.getContext('2d')
    drawRef.current = (x, z, fx, fz, level = 2) => {
      g.drawImage(bgs[level], 0, 0)
      // Handsome Dan tours floor 2
      if (level === 2) {
        const [dx, dy] = px(DAN.x, DAN.z)
        g.fillStyle = '#4a90ff'
        g.strokeStyle = '#ffffff'
        g.lineWidth = 1.5
        g.beginPath()
        g.arc(dx, dy, 4, 0, Math.PI * 2)
        g.fill()
        g.stroke()
      }
      const [cx, cy] = px(x, z)
      g.fillStyle = 'rgba(255,79,163,0.25)'
      g.beginPath()
      g.moveTo(cx, cy)
      const a = Math.atan2(fz, fx)
      g.arc(cx, cy, 26, a - 0.5, a + 0.5)
      g.closePath()
      g.fill()
      g.fillStyle = '#ffffff'
      g.beginPath()
      g.arc(cx, cy, 4, 0, Math.PI * 2)
      g.fill()
    }
  }, [drawRef])
  return <canvas ref={ref} className="minimap" width={Wpx} height={Hpx} />
}

