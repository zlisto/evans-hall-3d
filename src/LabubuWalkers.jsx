import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import Labubu, { YALE_BLUE } from './Labubu.jsx'
import { ELEV1 } from './floor1.js'
import { ELEV4 } from './floor4.js'
import { DRUMS, K, MEET_FRONT } from './layout.js'

// middle of the back hallway, between the drums' outer walls and the meeting rooms' glass fronts
const HALL_Z = (Math.max(...DRUMS.map((d) => d.c[1] + d.rz)) + MEET_FRONT) / 2

// Labubus walking laps of the hallways on floors 1, 2 and 4. Each one follows a closed path at its own
// speed and spacing, bobbing a little with each step.

// the cloister loop around the courtyard (same centerline Handsome Dan uses)
const CLOISTER = Array.from({ length: 160 }, (_, i) => {
  const t = (i / 160) * Math.PI * 2
  const c = Math.cos(t)
  const s = Math.sin(t)
  return [24.4 * K * Math.sign(c) * Math.pow(Math.abs(c), 1 / 3), 21.4 * K * Math.sign(s) * Math.pow(Math.abs(s), 1 / 3)]
})
const reversed = [...CLOISTER].reverse()
// out-and-back along a straight back hallway
const pace = (z, x0, x1) => [[x0, z], [x1, z]]

const OUTFITS = [
  { fur: '#5a3d2e', shirt: 'yale', pants: '#1d2a44' },
  { fur: '#ff8fc7', shirt: '#ffffff', pants: YALE_BLUE },
  { fur: '#9fe0c6', shirt: 'stripes', pants: '#2c2c30' },
  { fur: '#d9c2a0', shirt: 'yale', overalls: true, pants: '#e8dcc0', hat: 'bucket' },
  { fur: '#b9a5e6', shirt: '#ff4fa3', pants: '#111114' },
  { fur: '#7fb2ff', shirt: 'yale', pants: '#d8cfc0' },
  { fur: '#2b2b2e', shirt: '#ff4fa3', pants: '#2c2c30' },
  { fur: '#f2a65a', shirt: 'stripes', pants: YALE_BLUE },
  { fur: '#f2efe9', shirt: YALE_BLUE, pants: '#3d5a8a', hat: '#ffb3d9' },
  { fur: '#c98f6b', shirt: '#7a9e7e', pants: '#d8cfc0' },
]
const EXPRESSIONS = ['grin', 'happy', 'mischief', 'surprised', 'sleepy']

// [path, floor height, how many walkers, speed m/s]
const LANES = [
  [CLOISTER, 0, 4, 1.2],
  [reversed, 0, 3, 1.0],
  [pace(HALL_Z, -33 * K, 21 * K), 0, 1, 0.9],
  [pace(-HALL_Z, -33 * K, 21 * K), 0, 1, 1.1],
  [CLOISTER, ELEV4, 3, 1.1],
  [reversed, ELEV4, 3, 1.3],
  [pace(HALL_Z, -33 * K, 21 * K), ELEV4, 1, 1.0],
  [pace(-HALL_Z, -33 * K, 21 * K), ELEV4, 1, 0.9],
  [CLOISTER, ELEV1, 3, 1.0],
  [reversed, ELEV1, 3, 1.2],
]

function measure(path) {
  const pts = [...path, path[0]]
  const cum = [0]
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]))
  return { pts, cum, length: cum[cum.length - 1] }
}

function Walker({ route, y, speed, offset, look, phase }) {
  const g = useRef()
  const seg = useRef(0)
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    const d = (offset + t * speed) % route.length
    let i = seg.current
    // walk forward from the last segment (wrapping) until d falls inside it
    if (d < route.cum[i]) i = 0
    while (i < route.pts.length - 2 && route.cum[i + 1] < d) i++
    seg.current = i
    const [ax, az] = route.pts[i]
    const [bx, bz] = route.pts[i + 1]
    const u = (d - route.cum[i]) / (route.cum[i + 1] - route.cum[i] || 1)
    const step = t * speed * 3.4 + phase
    g.current.position.set(ax + (bx - ax) * u, y + Math.abs(Math.sin(step)) * 0.05, az + (bz - az) * u)
    g.current.rotation.set(0, Math.atan2(bx - ax, bz - az), Math.sin(step) * 0.07)
  })
  return (
    <group ref={g}>
      <Labubu {...look} anim="idle" height={look.height} phase={phase} />
    </group>
  )
}

export default function LabubuWalkers() {
  const walkers = useMemo(() => {
    const out = []
    let n = 0
    for (const [path, y, count, speed] of LANES) {
      const route = measure(path)
      for (let k = 0; k < count; k++, n++) {
        out.push({
          key: n,
          route,
          y,
          speed: speed * (0.9 + ((n * 37) % 20) / 100),
          offset: (route.length / count) * k + n * 3.1,
          phase: n * 0.7,
          look: { ...OUTFITS[n % OUTFITS.length], expression: EXPRESSIONS[n % EXPRESSIONS.length], height: 0.85 + ((n * 13) % 30) / 100 },
        })
      }
    }
    return out
  }, [])
  return walkers.map(({ key, ...w }) => <Walker key={key} {...w} />)
}
