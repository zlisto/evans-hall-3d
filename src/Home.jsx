import { useEffect, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import HandsomeDanHD from './HandsomeDanHD.jsx'
import { api, auth } from './talk.js'

// Front door: Handsome Dan on a pink pedestal next to the login card. Logging in opens the game.

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
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [slow, setSlow] = useState(false)

  useEffect(() => {
    if (!busy) {
      setSlow(false)
      return
    }
    const t = setTimeout(() => setSlow(true), 4000) // free Render servers nap; the first login can take a minute
    return () => clearTimeout(t)
  }, [busy])

  const submit = async (e) => {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    setError('')
    try {
      const r = await api('/auth/login', { email, password })
      auth.set(r.token)
      onEnter()
    } catch (err) {
      setError(err.status === 401 || err.status === 429 ? err.message : "Couldn't reach the server. Try again in a minute.")
      setBusy(false)
    }
  }

  return (
    <div className="home">
      <div className="home-dan">
        <DanStage />
      </div>
      <form className="card home-card" onSubmit={submit}>
        <div className="kicker">Yale SOM · Evans Hall</div>
        <h1>Virtual Yale SOM</h1>
        <p className="sub">Walk the 2nd floor of Evans Hall with Handsome Dan, and chat with AI versions of the professors in their classrooms.</p>
        <input type="email" autoComplete="username" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus required aria-label="Email" />
        <input type="password" autoComplete="current-password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required aria-label="Password" />
        {error && <div className="login-error">{error}</div>}
        <button className="go" type="submit" disabled={busy}>
          {busy ? (slow ? 'Waking up the server…' : 'Logging in…') : 'Log in'}
        </button>
      </form>
    </div>
  )
}
