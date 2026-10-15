import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { B, BOX, CAP, CYL, SPH, m, useTalker } from './avatar.js'

// One avatar for any professor, built from an `appearance` object (professor_profiles.appearance in the
// DB, served by /api/avatars). Every field is optional:
//   skin       CSS color
//   hair       { color, style: 'swept' | 'short' | 'wavy' | 'curly' | 'curlyLong' | 'long' | 'bob' | 'bun' | 'bald' }
//   beard      null | 'stubble' | 'short' | 'full' | 'mustache'   (+ beardColor, defaults to hair color)
//   glasses    null | { color, shape: 'rect' | 'round' }
//   top        { type: 'blazer' | 'shirt' | 'sweater' | 'hoodie', color, inner }  (inner = shirt under blazer/sweater)
//   bottom     'pants' | 'skirt'   pants: color   shoes: color
//   height     meters (default 1.75)    build: 'slim' | 'average' | 'broad'
//   gesture    'hands' | 'point'  (how they talk with their hands while chatting)
//   accessory  null | 'lapelMic' | 'scarf' | 'tie'   (+ accessoryColor)
// Faces +z; its own right hand is at -x.

const DEF = {
  skin: '#d9a77f',
  hair: { color: '#2a1d15', style: 'short' },
  beard: null,
  glasses: null,
  top: { type: 'shirt', color: '#dfe6ef', inner: '#ffffff' },
  bottom: 'pants',
  pants: '#2f3440',
  shoes: '#1b1714',
  height: 1.75,
  build: 'average',
  gesture: 'hands',
  accessory: null,
}

function Hair({ style, color }) {
  const tufts = (pts, r) => pts.map((p, i) => <B key={i} c={color} p={p} s={[r, r * 0.75, r]} />)
  switch (style) {
    case 'bald':
      return <B c={color} p={[0, 0.06, -0.06]} s={[0.115, 0.07, 0.1]} />
    case 'swept': // short sides, volume swept up and back on top
      return (
        <>
          <B c={color} p={[0, 0.115, -0.02]} s={[0.118, 0.09, 0.122]} />
          {tufts([[-0.04, 0.19, 0.07], [0.02, 0.2, 0.075], [0.06, 0.185, 0.05], [-0.02, 0.205, 0.02], [0.03, 0.2, -0.03]], 0.05)}
          {[-1, 1].map((sx) => (
            <B key={sx} c={color} p={[0.1 * sx, 0.09, -0.01]} s={[0.02, 0.05, 0.08]} />
          ))}
        </>
      )
    case 'wavy':
      return (
        <>
          <B c={color} p={[0, 0.12, -0.02]} s={[0.12, 0.09, 0.124]} />
          {tufts([[-0.06, 0.19, 0.06], [0, 0.2, 0.075], [0.06, 0.19, 0.055], [-0.03, 0.205, 0], [0.045, 0.205, -0.02], [-0.085, 0.15, -0.04], [0.085, 0.15, -0.03], [0, 0.16, -0.095]], 0.055)}
        </>
      )
    case 'curly':
      return tufts(
        Array.from({ length: 16 }, (_, i) => {
          const a = (i / 16) * Math.PI * 2
          return [Math.cos(a) * 0.09, 0.17 + Math.sin(a * 3) * 0.02, Math.sin(a) * 0.09 - 0.01]
        }).concat([[0, 0.21, 0], [0.04, 0.2, 0.05], [-0.04, 0.2, 0.05]]),
        0.055,
      )
    case 'curlyLong': // shoulder-length curls: volume all round, down past the jaw
      return tufts(
        [
          ...Array.from({ length: 14 }, (_, i) => {
            const a = (i / 14) * Math.PI * 2
            return [Math.cos(a) * 0.1, 0.16 + Math.sin(a * 2) * 0.015, Math.sin(a) * 0.1 - 0.02]
          }),
          [0, 0.21, 0.02], [0.05, 0.2, 0.06], [-0.05, 0.2, 0.06], [0, 0.17, -0.11],
          ...[-1, 1].flatMap((sx) => [
            [0.12 * sx, 0.08, -0.01], [0.13 * sx, 0.0, -0.03], [0.125 * sx, -0.08, -0.02], [0.1 * sx, -0.14, 0.0],
            [0.07 * sx, 0.06, -0.1], [0.08 * sx, -0.04, -0.1], [0.06 * sx, -0.12, -0.08],
          ]),
          [0, 0.02, -0.12], [0, -0.08, -0.11],
        ],
        0.058,
      )
    case 'long': // long straight hair: rounded crown, a part down the middle, strands past the shoulders
      return (
        <>
          <B c={color} p={[0, 0.12, -0.015]} s={[0.122, 0.095, 0.127]} />
          <B c={color} p={[0, 0.02, -0.06]} s={[0.125, 0.16, 0.08]} />
          <mesh geometry={CAP} material={m(color)} position={[0, -0.09, -0.07]} scale={[0.11, 0.1, 0.05]} />
          {[-1, 1].map((sx) => (
            <group key={sx}>
              <mesh geometry={CAP} material={m(color)} position={[0.105 * sx, 0.0, 0.015]} rotation={[0.08, 0, -0.06 * sx]} scale={[0.032, 0.08, 0.05]} />
              <mesh geometry={CAP} material={m(color)} position={[0.095 * sx, -0.12, 0.035]} rotation={[0.25, 0, 0.12 * sx]} scale={[0.03, 0.06, 0.035]} />
              <B c={color} p={[0.05 * sx, 0.165, 0.07]} r={[0.5, 0, 0.35 * sx]} s={[0.07, 0.03, 0.05]} />
            </group>
          ))}
        </>
      )
    case 'bob': // chin-length: full crown, side-swept fringe, sides ending at the jaw
      return (
        <>
          <B c={color} p={[0, 0.12, -0.015]} s={[0.124, 0.095, 0.128]} />
          <B c={color} p={[0, 0.04, -0.05]} s={[0.127, 0.12, 0.09]} />
          <B c={color} p={[0.035, 0.17, 0.075]} r={[0.45, 0, -0.3]} s={[0.085, 0.032, 0.05]} />
          {[-1, 1].map((sx) => (
            <mesh key={sx} geometry={CAP} material={m(color)} position={[0.108 * sx, 0.01, 0.01]} rotation={[0.1, 0, -0.08 * sx]} scale={[0.036, 0.075, 0.06]} />
          ))}
        </>
      )
    case 'bun':
      return (
        <>
          <B c={color} p={[0, 0.115, -0.02]} s={[0.12, 0.09, 0.124]} />
          <B c={color} p={[0, 0.17, -0.12]} s={[0.06, 0.055, 0.06]} />
        </>
      )
    default: // short
      return (
        <>
          <B c={color} p={[0, 0.115, -0.018]} s={[0.12, 0.09, 0.122]} />
          {[-1, 1].map((sx) => (
            <B key={sx} g={BOX} c={color} p={[0.106 * sx, 0.09, -0.01]} s={[0.012, 0.055, 0.08]} />
          ))}
        </>
      )
  }
}

function Face({ skin, hairColor, beard, beardColor, glasses }) {
  const bc = beardColor ?? hairColor
  return (
    <>
      {[-1, 1].map((sx) => (
        <group key={sx}>
          <B c="#ffffff" p={[0.042 * sx, 0.075, 0.105]} s={[0.02, 0.015, 0.01]} />
          <B c="#2a1a12" p={[0.042 * sx, 0.075, 0.113]} s={[0.01, 0.011, 0.006]} />
          <B g={BOX} c={hairColor} p={[0.044 * sx, 0.103, 0.11]} r={[0, 0, -0.1 * sx]} s={[0.038, 0.007, 0.008]} />
        </group>
      ))}
      <B c={skin} p={[0, 0.04, 0.121]} s={[0.018, 0.028, 0.021]} />
      {/* gentle smile: a center line with corners turned up */}
      <B g={BOX} c="#8a4b3e" p={[0, -0.006, 0.113]} s={[0.032, 0.009, 0.008]} />
      {[-1, 1].map((sx) => (
        <B key={sx} g={BOX} c="#8a4b3e" p={[0.021 * sx, -0.001, 0.111]} r={[0, 0, 0.55 * sx]} s={[0.016, 0.008, 0.008]} />
      ))}
      {beard === 'stubble' && <B c={bc} o={{ transparent: true, opacity: 0.3 }} p={[0, -0.02, 0.025]} s={[0.1, 0.06, 0.093]} />}
      {(beard === 'short' || beard === 'full') && (
        <>
          <B c={bc} p={[0, beard === 'full' ? -0.04 : -0.025, 0.05]} s={[0.098, beard === 'full' ? 0.085 : 0.065, 0.085]} />
          <B c={skin} p={[0, -0.002, 0.11]} s={[0.035, 0.016, 0.012]} />
        </>
      )}
      {(beard === 'mustache' || beard === 'short' || beard === 'full') && <B g={BOX} c={bc} p={[0, 0.014, 0.117]} s={[0.055, 0.013, 0.012]} />}
      {glasses && (
        <>
          {[-1, 1].map((sx) =>
            glasses.shape === 'round' ? (
              <mesh key={sx} position={[0.044 * sx, 0.075, 0.122]} material={m(glasses.color ?? '#111111')} scale={0.026}>
                <torusGeometry args={[1, 0.12, 8, 24]} />
              </mesh>
            ) : (
              <group key={sx} position={[0.044 * sx, 0.075, 0.122]}>
                <B g={BOX} c={glasses.color ?? '#111111'} p={[0, 0.02, 0]} s={[0.055, 0.008, 0.007]} />
                <B g={BOX} c={glasses.color ?? '#111111'} p={[0, -0.018, 0]} s={[0.055, 0.007, 0.007]} />
                <B g={BOX} c={glasses.color ?? '#111111'} p={[0.027 * sx, 0, 0]} s={[0.007, 0.045, 0.007]} />
              </group>
            ),
          )}
          <B g={BOX} c={glasses.color ?? '#111111'} p={[0, 0.08, 0.124]} s={[0.028, 0.006, 0.006]} />
        </>
      )}
    </>
  )
}

export default function PersonAvatar({ slug, look = {}, position = [0, 0, 0], rotation = 0, talking = false, onTalk }) {
  const L = { ...DEF, ...look, hair: { ...DEF.hair, ...look.hair }, top: { ...DEF.top, ...look.top } }
  const k = L.height / 1.75 // overall scale
  const w = L.build === 'slim' ? 0.92 : L.build === 'broad' ? 1.12 : 1 // body width
  const { root, head, gesture, clickProps } = useTalker(slug, { position, rotation, talking, headY: 1.62 * k })
  const armR = useRef()
  const armL = useRef()

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    const g = gesture.current
    if (L.gesture === 'point') {
      // lecturing: the right arm lifts to point every few seconds, the left hand gestures low
      const lift = g * (0.6 + 0.6 * Math.max(0, Math.sin(t * 1.1)))
      armR.current.rotation.x = -0.1 - lift * 1.9
      armR.current.rotation.z = -0.1 - lift * 0.25
      armL.current.rotation.x = -0.15 - g * (0.45 + Math.sin(t * 2.4) * 0.25)
      armL.current.rotation.z = 0.1 + g * 0.15
    } else {
      armR.current.rotation.x = -0.1 - g * (0.9 + Math.sin(t * 3.1) * 0.35)
      armR.current.rotation.z = -0.1 - g * 0.25
      armL.current.rotation.x = -0.15 - g * (0.6 + Math.sin(t * 2.5 + 1) * 0.3)
      armL.current.rotation.z = 0.1 + g * 0.2
    }
  })

  const top = m(L.top.color)
  const skin = m(L.skin)
  const open = L.top.type === 'blazer' || L.top.type === 'sweater' // shows a collar underneath
  return (
    <group ref={root} position={position} rotation={[0, rotation, 0]} {...clickProps(onTalk)}>
      <group scale={[k, k, k]}>
        {/* shoes */}
        {[-1, 1].map((sx) => (
          <B key={sx} g={BOX} c={L.shoes} p={[0.1 * sx * w, 0.04, 0.03]} s={[0.1, 0.08, 0.26]} />
        ))}
        {/* legs: trousers or a skirt */}
        {L.bottom === 'skirt' ? (
          <>
            {[-1, 1].map((sx) => (
              <mesh key={sx} geometry={CAP} material={skin} position={[0.09 * sx, 0.35, 0]} scale={[0.055, 0.2, 0.058]} />
            ))}
            <mesh material={m(L.pants)} position={[0, 0.72, 0]}>
              <cylinderGeometry args={[0.2 * w, 0.27 * w, 0.42, 24]} />
            </mesh>
          </>
        ) : (
          <>
            {[-1, 1].map((sx) => (
              <mesh key={sx} geometry={CAP} material={m(L.pants)} position={[0.1 * sx * w, 0.5, 0]} scale={[0.075 * w, 0.34, 0.08]} />
            ))}
            <B g={BOX} c={L.pants} p={[0, 0.88, 0]} s={[0.34 * w, 0.12, 0.2]} />
          </>
        )}
        {/* torso */}
        <mesh material={top} position={[0, 1.22, 0]} scale={[w, 1, 1]}>
          <cylinderGeometry args={[0.2, 0.19, 0.62, 28]} />
        </mesh>
        <B c={L.top.color} p={[0, 1.5, 0]} s={[0.25 * w, 0.09, 0.16]} />
        {open && (
          <>
            {/* the shirt showing in the open front + collar points */}
            <B g={BOX} c={L.top.inner} p={[0, 1.33, 0.18]} s={[0.1, 0.36, 0.03]} />
            <B g={BOX} c={L.skin} p={[0, 1.49, 0.16]} r={[-0.25, 0, Math.PI / 4]} s={[0.055, 0.055, 0.02]} />
            {[-1, 1].map((sx) => (
              <B key={sx} g={BOX} c={L.top.inner} p={[0.045 * sx, 1.51, 0.16]} r={[-0.3, 0, 0.55 * sx]} s={[0.07, 0.025, 0.012]} />
            ))}
            {/* lapels */}
            {L.top.type === 'blazer' &&
              [-1, 1].map((sx) => <B key={sx} g={BOX} c={L.top.color} p={[0.075 * sx, 1.36, 0.185]} r={[0, 0, 0.32 * sx]} s={[0.05, 0.34, 0.02]} />)}
          </>
        )}
        {L.top.type === 'hoodie' && <B c={L.top.color} p={[0, 1.5, -0.12]} s={[0.17, 0.12, 0.1]} />}
        {L.top.type === 'shirt' && (
          <>
            <B g={BOX} c={L.skin} p={[0, 1.49, 0.16]} r={[-0.25, 0, Math.PI / 4]} s={[0.055, 0.055, 0.02]} />
            {[0.95, 1.1, 1.25].map((y) => (
              <B key={y} c="#f4f6fa" p={[0, y, 0.193]} s={[0.008, 0.008, 0.004]} />
            ))}
          </>
        )}
        {L.accessory === 'tie' && <B g={BOX} c={L.accessoryColor ?? '#7a1f2b'} p={[0, 1.3, 0.2]} s={[0.04, 0.3, 0.01]} />}
        {L.accessory === 'scarf' && (
          <mesh material={m(L.accessoryColor ?? '#a23b3b')} position={[0, 1.5, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.12, 0.04, 10, 24]} />
          </mesh>
        )}
        {L.accessory === 'lapelMic' && <B g={BOX} c="#111111" p={[0.09, 1.4, 0.2]} s={[0.018, 0.03, 0.015]} />}
        <B g={CYL} c={L.skin} p={[0, 1.58, 0]} s={[0.05, 0.07, 0.05]} />

        {/* arms */}
        {[
          [armR, -1],
          [armL, 1],
        ].map(([ref, sx]) => (
          <group key={sx} ref={ref} position={[0.235 * sx * w, 1.48, 0]}>
            <mesh geometry={CAP} material={top} position={[0, -0.25, 0]} scale={[0.062, 0.21, 0.062]} />
            <mesh geometry={SPH} material={skin} position={[0, -0.53, 0.01]} scale={[0.042, 0.053, 0.038]} />
          </group>
        ))}

        {/* head */}
        <group ref={head} position={[0, 1.64, 0]}>
          <B c={L.skin} p={[0, 0.06, 0]} s={[0.11, 0.134, 0.12]} />
          {[-1, 1].map((sx) => (
            <B key={sx} c={L.skin} p={[0.111 * sx, 0.055, -0.005]} s={[0.02, 0.034, 0.02]} />
          ))}
          <Hair style={L.hair.style} color={L.hair.color} />
          <Face skin={L.skin} hairColor={L.hair.color} beard={L.beard} beardColor={L.beardColor} glasses={L.glasses} />
        </group>
      </group>
    </group>
  )
}
