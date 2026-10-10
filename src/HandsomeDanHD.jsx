import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

// High-detail Handsome Dan for the home page (the game uses the lighter HandsomeDan.jsx).
// English bulldog: broad skull with forehead wrinkles, nose rope, heavy pink-edged jowls, underbite,
// sleepy eyes with pink lower lids, rose ears, dewlap, bowed front legs, brindle flank patch,
// navy Yale bandana. Built in meters, facing +z, feet at y = 0.

const SPH = new THREE.SphereGeometry(1, 48, 32)
const CAP = new THREE.CapsuleGeometry(1, 1, 12, 24)
const TORUS = new THREE.TorusGeometry(1, 0.18, 12, 40, Math.PI) // half ring, for wrinkles and folds
const EAR = new THREE.SphereGeometry(1, 32, 16, 0, Math.PI) // half shell, for folded rose ears
const COLLAR = new THREE.TorusGeometry(0.16, 0.03, 12, 40)
const KERCHIEF = new THREE.ShapeGeometry(new THREE.Shape([new THREE.Vector2(-0.17, 0.07), new THREE.Vector2(0.17, 0.07), new THREE.Vector2(0, -0.13)]))
{
  // ShapeGeometry UVs come out in meters; stretch them to 0..1 so the whole bandana texture (with the Y) shows
  const pos = KERCHIEF.attributes.position
  const uv = KERCHIEF.attributes.uv
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (pos.getX(i) + 0.17) / 0.34, (pos.getY(i) + 0.13) / 0.2)
}

function canvasTex(size, draw, repeat = 1) {
  const c = document.createElement('canvas')
  c.width = c.height = size
  draw(c.getContext('2d'), size)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.repeat.set(repeat, repeat)
  return t
}

// short white coat: soft speckled noise
const furTex = () =>
  canvasTex(
    256,
    (g, n) => {
      g.fillStyle = '#f2eee6'
      g.fillRect(0, 0, n, n)
      for (let i = 0; i < 9000; i++) {
        const v = 215 + Math.floor(Math.random() * 40)
        g.fillStyle = `rgba(${v},${v - 4},${v - 10},0.5)`
        g.fillRect(Math.random() * n, Math.random() * n, 1, 2)
      }
    },
    4,
  )

// brindle: tan with dark tiger streaks
const brindleTex = () =>
  canvasTex(256, (g, n) => {
    g.fillStyle = '#9a6a3f'
    g.fillRect(0, 0, n, n)
    for (let i = 0; i < 90; i++) {
      g.strokeStyle = `rgba(${40 + Math.random() * 30},${25 + Math.random() * 15},15,${0.5 + Math.random() * 0.4})`
      g.lineWidth = 2 + Math.random() * 5
      g.beginPath()
      const x = Math.random() * n
      g.moveTo(x, 0)
      g.bezierCurveTo(x + 20 - Math.random() * 40, n * 0.33, x + 20 - Math.random() * 40, n * 0.66, x + 10 - Math.random() * 20, n)
      g.stroke()
    }
  })

// navy bandana with a white Yale "Y"
const bandanaTex = () =>
  canvasTex(256, (g, n) => {
    g.fillStyle = '#0f2a57'
    g.fillRect(0, 0, n, n)
    g.strokeStyle = 'rgba(255,255,255,0.18)'
    g.lineWidth = 3
    g.strokeRect(10, 10, n - 20, n - 20)
    g.fillStyle = '#ffffff'
    g.font = 'bold 120px Georgia, serif'
    g.textAlign = 'center'
    g.textBaseline = 'middle'
    g.fillText('Y', n / 2, n * 0.62)
  })

export default function HandsomeDanHD() {
  const M = useMemo(() => {
    const fur = furTex()
    const s = (o) => new THREE.MeshStandardMaterial({ roughness: 0.85, ...o })
    return {
      white: s({ color: '#ffffff', map: fur }),
      shade: s({ color: '#e9e2d6', map: fur }), // folds sit a touch darker
      pink: s({ color: '#e7a3a0', roughness: 0.6 }),
      lip: s({ color: '#dcaaa3', roughness: 0.55 }),
      nose: s({ color: '#1d1b1c', roughness: 0.35 }),
      eye: s({ color: '#1a0f0a', roughness: 0.15 }),
      earTip: s({ color: '#4a4140', side: THREE.DoubleSide }),
      earIn: s({ color: '#b98d88', side: THREE.DoubleSide }),
      brindle: s({ map: brindleTex() }),
      bandana: s({ map: bandanaTex(), roughness: 0.9, side: THREE.DoubleSide }),
      navy: s({ color: '#0f2a57', roughness: 0.9 }),
      nail: s({ color: '#cfc6b8', roughness: 0.4 }),
      tooth: s({ color: '#fbf6ea', roughness: 0.3 }),
    }
  }, [])

  const chest = useRef()
  const head = useRef()
  const lids = useRef([])
  const tail = useRef()
  const jowls = useRef([])

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    const breathe = 1 + Math.sin(t * 2.2) * 0.02
    chest.current.scale.set(breathe, breathe, 1)
    head.current.rotation.y = Math.sin(t * 0.5) * 0.18
    head.current.rotation.x = Math.sin(t * 0.37) * 0.04
    tail.current.rotation.y = Math.sin(t * 9) * 0.5
    // sleepy blink every few seconds
    const blink = Math.max(0, Math.sin(t * 1.3)) ** 40
    lids.current.forEach((l) => l && (l.scale.y = 0.012 * (1 + blink * 1.2))) // lid drops over the eye
    jowls.current.forEach((j, i) => j && (j.position.y = -0.085 + Math.sin(t * 2.2 + i) * 0.002))
  })

  const B = ({ g = SPH, m, p, s, r = [0, 0, 0] }) => <mesh geometry={g} material={m} position={p} scale={s} rotation={r} />

  return (
    <group>
      {/* ---------- body: deep chest, barrel ribs, lower rump */}
      <group ref={chest}>
        <B m={M.white} p={[0, 0.37, 0.15]} s={[0.215, 0.2, 0.17]} />
        <B g={CAP} m={M.white} p={[0, 0.37, -0.05]} r={[Math.PI / 2, 0, 0]} s={[0.185, 0.16, 0.165]} />
        <B m={M.white} p={[0, 0.36, -0.22]} s={[0.17, 0.165, 0.15]} />
        {/* shoulders */}
        {[-1, 1].map((sx) => (
          <B key={sx} m={M.white} p={[0.13 * sx, 0.42, 0.13]} s={[0.1, 0.12, 0.12]} />
        ))}
        {/* brindle patch on his left flank and hip */}
        <B m={M.brindle} p={[0.085, 0.39, -0.2]} s={[0.115, 0.14, 0.135]} />
        <B m={M.brindle} p={[0.11, 0.33, -0.13]} s={[0.08, 0.08, 0.08]} />
      </group>

      {/* ---------- front legs: wide-set and slightly bowed, with toes */}
      {[-1, 1].map((sx) => (
        <group key={sx} position={[0.135 * sx, 0.3, 0.15]}>
          <B g={CAP} m={M.white} p={[0.012 * sx, -0.06, 0]} r={[0, 0, -0.12 * sx]} s={[0.055, 0.08, 0.058]} />
          <B g={CAP} m={M.white} p={[0.02 * sx, -0.19, 0.01]} r={[0, 0, 0.08 * sx]} s={[0.045, 0.07, 0.048]} />
          <B m={M.white} p={[0.025 * sx, -0.28, 0.035]} s={[0.058, 0.03, 0.07]} />
          {[-1, 0, 1].map((tx) => (
            <group key={tx}>
              <B m={M.white} p={[0.025 * sx + tx * 0.026, -0.284, 0.088]} s={[0.019, 0.017, 0.022]} />
              <B m={M.nail} p={[0.025 * sx + tx * 0.026, -0.292, 0.108]} s={[0.006, 0.005, 0.008]} />
            </group>
          ))}
        </group>
      ))}

      {/* ---------- back legs: muscular thighs, angled hocks */}
      {[-1, 1].map((sx) => (
        <group key={sx} position={[0.12 * sx, 0.33, -0.24]}>
          <B m={sx > 0 ? M.brindle : M.white} p={[0.02 * sx, 0, 0.01]} s={[0.07, 0.11, 0.1]} />
          <B g={CAP} m={M.white} p={[0.02 * sx, -0.15, -0.035]} r={[-0.3, 0, 0]} s={[0.042, 0.07, 0.045]} />
          <B g={CAP} m={M.white} p={[0.02 * sx, -0.25, -0.02]} r={[0.2, 0, 0]} s={[0.038, 0.035, 0.04]} />
          <B m={M.white} p={[0.02 * sx, -0.31, 0.015]} s={[0.05, 0.025, 0.065]} />
        </group>
      ))}

      {/* screw tail */}
      <group ref={tail} position={[0, 0.42, -0.36]}>
        <B m={M.white} p={[0, 0, -0.01]} s={[0.03, 0.028, 0.03]} />
        <B m={M.shade} p={[0.012, 0.014, -0.025]} s={[0.018, 0.018, 0.018]} />
      </group>

      {/* ---------- bandana: navy collar knot + kerchief triangle with the Yale Y */}
      <mesh geometry={COLLAR} material={M.navy} position={[0, 0.5, 0.22]} rotation={[Math.PI / 2 - 0.5, 0, 0]} />
      <mesh geometry={KERCHIEF} position={[0, 0.42, 0.335]} rotation={[-0.32, 0, 0]} material={M.bandana} />

      {/* ---------- neck with a heavy dewlap */}
      <B m={M.white} p={[0, 0.5, 0.25]} s={[0.15, 0.13, 0.12]} />
      <B m={M.shade} p={[0, 0.44, 0.3]} s={[0.12, 0.07, 0.08]} />
      <B g={TORUS} m={M.shade} p={[0, 0.465, 0.33]} r={[0.6, 0, Math.PI]} s={[0.09, 0.05, 0.05]} />

      {/* ---------- head */}
      <group ref={head} position={[0, 0.6, 0.33]}>
        {/* broad flat skull + cheeks */}
        <B m={M.white} p={[0, 0.02, 0]} s={[0.17, 0.14, 0.15]} />
        {[-1, 1].map((sx) => (
          <B key={sx} m={M.white} p={[0.1 * sx, -0.055, 0.03]} s={[0.1, 0.095, 0.1]} />
        ))}
        {/* forehead wrinkles + center furrow */}
        {[0, 1, 2].map((i) => (
          <B key={i} g={TORUS} m={M.shade} p={[0, 0.1 - i * 0.022, 0.118 - i * 0.012]} r={[-0.55, 0, 0]} s={[0.07 - i * 0.008, 0.035, 0.03]} />
        ))}
        <B m={M.shade} p={[0, 0.07, 0.13]} s={[0.008, 0.035, 0.008]} />
        {/* brow ridges */}
        {[-1, 1].map((sx) => (
          <B key={sx} m={M.white} p={[0.055 * sx, 0.035, 0.125]} r={[0, 0, -0.25 * sx]} s={[0.05, 0.022, 0.03]} />
        ))}

        {/* sleepy eyes: dark eye, heavy upper lid that blinks, pink lower lid */}
        {[-1, 1].map((sx, i) => (
          <group key={sx} position={[0.062 * sx, 0.014, 0.142]}>
            <B m={M.pink} p={[0, -0.003, -0.002]} s={[0.028, 0.02, 0.012]} />
            <B m={M.eye} p={[0, 0.002, 0.004]} s={[0.019, 0.016, 0.01]} />
            <B m={M.white} p={[0, 0.015, 0.007]} s={[0.03, 0.022, 0.014]} r={[0.3, 0, -0.2 * sx]} />
            <mesh ref={(el) => (lids.current[i] = el)} geometry={SPH} material={M.white} position={[0, 0.012, 0.006]} scale={[0.026, 0.012, 0.013]} />
            <B m={M.pink} p={[0, -0.015, 0.008]} s={[0.022, 0.006, 0.006]} />
          </group>
        ))}

        {/* short pushed-in muzzle, nose rope, big black nose with nostrils */}
        <B m={M.white} p={[0, -0.04, 0.14]} s={[0.085, 0.06, 0.05]} />
        <B g={TORUS} m={M.shade} p={[0, -0.005, 0.165]} r={[-0.2, 0, 0]} s={[0.055, 0.03, 0.03]} />
        <group position={[0, -0.018, 0.19]}>
          <B m={M.nose} p={[0, 0, 0]} s={[0.05, 0.03, 0.022]} />
          {[-1, 1].map((sx) => (
            <B key={sx} m={M.eye} p={[0.022 * sx, -0.006, 0.017]} r={[0, 0, 0.5 * sx]} s={[0.011, 0.006, 0.006]} />
          ))}
          <B m={M.nose} p={[0, -0.025, 0.004]} s={[0.004, 0.015, 0.004]} />
        </group>

        {/* heavy jowls (flews) drooping past the jaw, pink lip edges */}
        {[-1, 1].map((sx, i) => (
          <group key={sx} ref={(el) => (jowls.current[i] = el)} position={[0.055 * sx, -0.085, 0.15]}>
            <B m={M.white} p={[0, 0, 0]} r={[0.25, 0, 0.18 * sx]} s={[0.07, 0.085, 0.055]} />
            <B m={M.lip} p={[0.012 * sx, -0.07, 0.01]} r={[0.25, 0, 0.18 * sx]} s={[0.045, 0.014, 0.03]} />
            <B m={M.lip} p={[-0.03 * sx, -0.035, 0.04]} s={[0.012, 0.03, 0.008]} />
          </group>
        ))}
        {/* underbite: wide lower jaw jutting forward, lower lip, two little teeth */}
        <B m={M.white} p={[0, -0.135, 0.15]} s={[0.07, 0.035, 0.045]} />
        <B m={M.lip} p={[0, -0.12, 0.18]} s={[0.045, 0.009, 0.014]} />
        {[-1, 1].map((sx) => (
          <B key={sx} m={M.tooth} p={[0.03 * sx, -0.105, 0.183]} s={[0.006, 0.011, 0.005]} />
        ))}

        {/* rose ears: folded back, dark tips, pink inside */}
        {[-1, 1].map((sx) => (
          <group key={sx} position={[0.135 * sx, 0.09, -0.02]} rotation={[0.4, -0.6 * sx, 0.9 * sx]}>
            <mesh geometry={EAR} material={M.earTip} scale={[0.05, 0.03, 0.04]} />
            <mesh geometry={EAR} material={M.earIn} position={[0, -0.003, 0.004]} scale={[0.038, 0.022, 0.03]} />
          </group>
        ))}
      </group>
    </group>
  )
}
