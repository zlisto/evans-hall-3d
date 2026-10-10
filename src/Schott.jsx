import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { B, BOX, CAP, CYL, SPH, m, useTalker } from './avatar.js'

// Prof. Peter Schott: wavy swept-back brown hair, light stubble, light-blue open-collar oxford shirt
// tucked into khakis, brown loafers. His Totoro buddy stands next to him. Upbeat SoCal energy:
// big hand gestures while he talks.

export const SCHOTT = { slug: 'peter-schott', name: 'Peter Schott' }

const SKIN = '#e8bd9b'
const HAIR = '#5b3a22'
const SHIRT = '#bcd2ef'
const KHAKI = '#c7b38a'
const LEATHER = '#5a3519'

const TORSO = new THREE.CylinderGeometry(0.195, 0.19, 0.6, 28)

function Totoro({ position, rotation }) {
  const body = useRef()
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    body.current.position.y = Math.abs(Math.sin(t * 1.6)) * 0.03 // happy little bounce
    body.current.rotation.z = Math.sin(t * 1.6) * 0.05
  })
  const gray = '#7f8486'
  const cream = '#eee4c8'
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <group ref={body}>
        <B c={gray} p={[0, 0.25, 0]} s={[0.21, 0.25, 0.19]} />
        <B c={cream} p={[0, 0.22, 0.07]} s={[0.16, 0.18, 0.13]} />
        {/* chevron marks on the belly */}
        {[
          [-0.06, 0.31],
          [0, 0.33],
          [0.06, 0.31],
          [-0.03, 0.27],
          [0.03, 0.27],
        ].map(([x, y], i) => (
          <B key={i} g={BOX} c={gray} p={[x, y, 0.198]} r={[0, 0, 0]} s={[0.03, 0.008, 0.005]} />
        ))}
        {/* ears */}
        {[-1, 1].map((sx) => (
          <B key={sx} c={gray} p={[0.08 * sx, 0.52, 0]} r={[0, 0, -0.12 * sx]} s={[0.035, 0.07, 0.03]} />
        ))}
        {/* eyes, nose, whiskers */}
        {[-1, 1].map((sx) => (
          <group key={sx}>
            <B c="#ffffff" p={[0.07 * sx, 0.41, 0.15]} s={[0.032, 0.032, 0.015]} />
            <B c="#111111" p={[0.07 * sx, 0.41, 0.163]} s={[0.014, 0.014, 0.006]} />
            {[0, 1, 2].map((i) => (
              <B key={i} g={BOX} c="#222222" p={[0.15 * sx, 0.39 - i * 0.015, 0.13]} r={[0, 0, (i - 1) * 0.15 * sx]} s={[0.08, 0.003, 0.003]} />
            ))}
          </group>
        ))}
        <B c="#222222" p={[0, 0.425, 0.172]} s={[0.022, 0.01, 0.01]} />
        {/* stubby arms + feet */}
        {[-1, 1].map((sx) => (
          <group key={sx}>
            <B c={gray} p={[0.19 * sx, 0.24, 0.02]} r={[0, 0, 0.3 * sx]} s={[0.05, 0.1, 0.05]} />
            <B c={gray} p={[0.08 * sx, 0.02, 0.04]} s={[0.06, 0.03, 0.08]} />
          </group>
        ))}
      </group>
    </group>
  )
}

export default function Schott({ position = [0, 0, 0], rotation = 0, talking = false, onTalk }) {
  const { root, head, gesture, clickProps } = useTalker(SCHOTT.slug, { position, rotation, talking, headY: 1.68 })
  const armR = useRef()
  const armL = useRef()

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    const g = gesture.current
    // big, upbeat two-handed gestures while he talks; relaxed otherwise
    armR.current.rotation.x = -0.1 - g * (1.0 + Math.sin(t * 3.4) * 0.45)
    armR.current.rotation.z = -0.1 - g * (0.35 + Math.sin(t * 1.9) * 0.15)
    armL.current.rotation.x = -0.1 - g * (0.8 + Math.sin(t * 2.9 + 1.3) * 0.45)
    armL.current.rotation.z = 0.1 + g * (0.3 + Math.sin(t * 2.2) * 0.15)
  })

  // Totoro stands at his left side, outside the turning body so it stays put while he faces you
  const totoro = useMemo(() => {
    const [ox, oz] = [0.65, 0.15]
    const c = Math.cos(rotation)
    const s = Math.sin(rotation)
    return [position[0] + ox * c + oz * s, position[1], position[2] - ox * s + oz * c]
  }, [position, rotation])

  const shirt = m(SHIRT)
  const skin = m(SKIN)
  return (
    <>
      <group ref={root} position={position} rotation={[0, rotation, 0]} {...clickProps(onTalk)}>
        {/* brown loafers */}
        {[-1, 1].map((sx) => (
          <group key={sx} position={[0.1 * sx, 0, 0.03]}>
            <B g={BOX} c={LEATHER} p={[0, 0.04, 0]} s={[0.1, 0.08, 0.27]} />
            <B g={BOX} c="#3a2210" p={[0, 0.005, 0]} s={[0.105, 0.012, 0.275]} />
          </group>
        ))}
        {/* khaki chinos + brown belt */}
        {[-1, 1].map((sx) => (
          <mesh key={sx} geometry={CAP} material={m(KHAKI)} position={[0.1 * sx, 0.5, 0]} scale={[0.077, 0.34, 0.082]} />
        ))}
        <B g={BOX} c={KHAKI} p={[0, 0.88, 0]} s={[0.34, 0.12, 0.2]} />
        <B g={BOX} c={LEATHER} p={[0, 0.94, 0]} s={[0.35, 0.035, 0.205]} />
        <B g={BOX} c="#c9c9d1" o={{ metalness: 0.9, roughness: 0.25 }} p={[0, 0.94, 0.104]} s={[0.04, 0.03, 0.006]} />

        {/* light-blue oxford shirt, tucked in, open collar */}
        <mesh geometry={TORSO} material={shirt} position={[0, 1.25, 0]} />
        <B c={SHIRT} p={[0, 1.53, 0]} s={[0.25, 0.09, 0.16]} />
        {/* open neck: skin V + collar points */}
        <B g={BOX} c={SKIN} p={[0, 1.5, 0.15]} r={[-0.25, 0, Math.PI / 4]} s={[0.07, 0.07, 0.02]} />
        {[-1, 1].map((sx) => (
          <B key={sx} g={BOX} c="#d3e2f6" p={[0.055 * sx, 1.52, 0.155]} r={[-0.3, 0, 0.55 * sx]} s={[0.085, 0.03, 0.012]} />
        ))}
        {/* placket buttons + chest pocket */}
        <B g={BOX} c="#aac3e6" p={[0, 1.24, 0.193]} s={[0.025, 0.44, 0.004]} />
        {[1.38, 1.26, 1.14, 1.02].map((y) => (
          <B key={y} c="#f4f6fa" p={[0, y, 0.197]} s={[0.008, 0.008, 0.004]} />
        ))}
        <B g={BOX} c="#aac3e6" p={[0.09, 1.33, 0.19]} s={[0.075, 0.075, 0.006]} />
        <B g={CYL} c={SKIN} p={[0, 1.6, 0]} s={[0.052, 0.07, 0.052]} />

        {/* shirt sleeves + hands. His right hand is at -x. */}
        {[
          [armR, -1],
          [armL, 1],
        ].map(([ref, sx]) => (
          <group key={sx} ref={ref} position={[0.235 * sx, 1.5, 0]}>
            <mesh geometry={CAP} material={shirt} position={[0, -0.25, 0]} scale={[0.062, 0.21, 0.062]} />
            <B g={CYL} c="#d3e2f6" p={[0, -0.48, 0]} s={[0.056, 0.03, 0.056]} />
            <mesh geometry={SPH} material={skin} position={[0, -0.54, 0.01]} scale={[0.043, 0.054, 0.039]} />
          </group>
        ))}

        {/* head */}
        <group ref={head} position={[0, 1.66, 0]}>
          <B c={SKIN} p={[0, 0.06, 0]} s={[0.11, 0.135, 0.12]} />
          {/* square jaw with light stubble */}
          <B c={SKIN} p={[0, -0.015, 0.02]} s={[0.095, 0.06, 0.09]} />
          <B c="#8a6a52" o={{ transparent: true, opacity: 0.35 }} p={[0, -0.02, 0.025]} s={[0.098, 0.058, 0.092]} />
          {[-1, 1].map((sx) => (
            <B key={sx} c={SKIN} p={[0.11 * sx, 0.055, -0.005]} s={[0.02, 0.034, 0.02]} />
          ))}
          {/* wavy brown hair, swept up and back with volume */}
          <B c={HAIR} p={[0, 0.125, -0.02]} s={[0.118, 0.09, 0.122]} />
          {[
            [-0.06, 0.19, 0.06, 0.05],
            [0.0, 0.205, 0.075, 0.055],
            [0.06, 0.195, 0.055, 0.05],
            [-0.03, 0.21, 0.0, 0.055],
            [0.04, 0.21, -0.02, 0.05],
            [-0.08, 0.16, -0.04, 0.045],
            [0.085, 0.16, -0.03, 0.045],
            [0.0, 0.17, -0.09, 0.06],
          ].map(([x, y, z, r], i) => (
            <B key={i} c={HAIR} p={[x, y, z]} s={[r, r * 0.75, r]} />
          ))}
          {[-1, 1].map((sx) => (
            <B key={sx} c={HAIR} p={[0.1 * sx, 0.1, -0.02]} s={[0.025, 0.065, 0.085]} />
          ))}
          {/* blue-gray eyes, friendly brows */}
          {[-1, 1].map((sx) => (
            <group key={sx}>
              <B c="#ffffff" p={[0.042 * sx, 0.075, 0.104]} s={[0.02, 0.014, 0.01]} />
              <B c="#5d7a8c" p={[0.042 * sx, 0.075, 0.112]} s={[0.01, 0.011, 0.006]} />
              <B c="#111111" p={[0.042 * sx, 0.075, 0.116]} s={[0.005, 0.006, 0.003]} />
              <B g={BOX} c={HAIR} p={[0.044 * sx, 0.1, 0.11]} r={[0, 0, 0.1 * sx]} s={[0.044, 0.01, 0.01]} />
            </group>
          ))}
          {/* nose + easy smile */}
          <B c={SKIN} p={[0, 0.04, 0.12]} s={[0.019, 0.03, 0.022]} />
          <B g={BOX} c="#8c4a3c" p={[0, -0.005, 0.112]} s={[0.048, 0.01, 0.008]} />
          {[-1, 1].map((sx) => (
            <B key={sx} g={BOX} c="#8c4a3c" p={[0.027 * sx, 0.0, 0.11]} r={[0, 0, 0.5 * sx]} s={[0.012, 0.007, 0.007]} />
          ))}
        </group>
      </group>
      <Totoro position={totoro} rotation={rotation} />
    </>
  )
}
