import { useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import HandsomeDanHD from './HandsomeDanHD.jsx'
import { ensureSession } from './talk.js'

// Front door: Handsome Dan on a pink pedestal next to the welcome card. Enter opens the building.

// slow sway left and right so his face stays toward you
function Sway({ children }) {
  const g = useRef()
  useFrame(({ clock }) => (g.current.rotation.y = Math.sin(clock.elapsedTime * 0.35) * 0.7))
  return <group ref={g}>{children}</group>
}

function DanStage() {
  return (
    <Canvas camera={{ position: [0.2, 0.6, 2.2], fov: 30 }} dpr={[1, 1.75]} onCreated={({ camera }) => camera.lookAt(0, 0.34, 0)}>
      <ambientLight intensity={0.7} />
      <directionalLight position={[2, 3, 2]} intensity={1.6} />
      <pointLight position={[-1.5, 1, -1]} intensity={6} color="#ff4fa3" />
      <Sway>
        <HandsomeDanHD />
      </Sway>
      <mesh position={[0, -0.03, 0]}>
        <cylinderGeometry args={[0.42, 0.46, 0.06, 48]} />
        <meshStandardMaterial color="#ff4fa3" emissive="#ff4fa3" emissiveIntensity={0.35} roughness={0.4} />
      </mesh>
    </Canvas>
  )
}

export default function Home({ onEnter }) {
  const enter = (e) => {
    e.preventDefault()
    ensureSession().catch(() => {}) // warm up a chat session in the background (wakes a sleeping server too)
    onEnter()
  }
  return (
    <div className="home">
      <div className="home-dan">
        <DanStage />
      </div>
      <form className="card home-card" onSubmit={enter}>
        <div className="kicker">Yale SOM · Evans Hall</div>
        <h1>Virtual Yale SOM</h1>
        <p className="sub">Explore three floors of Evans Hall with Handsome Dan, play with the Labubus in the courtyard, and chat with AI versions of the professors in their classrooms.</p>
        <button className="go" type="submit" autoFocus>
          Enter
        </button>
      </form>
    </div>
  )
}
