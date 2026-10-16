import { useCallback, useEffect, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import World from './World.jsx'
import Player from './Player.jsx'
import Minimap from './Minimap.jsx'
import TouchControls from './TouchControls.jsx'
import TalkAim from './TalkAim.jsx'
import ChatPanel from './ChatPanel.jsx'
import DeanPanel from './DeanPanel.jsx'
import Schedule from './Schedule.jsx'
import { TALKER_NAMES, talkerTitle } from './Faculty.jsx'
import { DEAN_SLUG } from './Dean.jsx'
import { EYE, SPAWN } from './layout.js'
import { onIdentity, presence } from './mvw.js'
import { setMuted } from './audio.js'
import { startSong } from './song.js'

export default function App({ onExit }) {
  const [locked, setLocked] = useState(false)
  const [where, setWhere] = useState('')
  const [showMap, setShowMap] = useState(true)
  const [showSchedule, setShowSchedule] = useState(false)
  const lockRef = useRef()
  const mapRef = useRef()
  const onLock = useCallback((v) => setLocked(v), [])
  const onWhere = useCallback((w) => setWhere(w), [])
  // phones have no pointer lock, so they get a joystick + drag-to-look instead
  const [isTouch] = useState(() => matchMedia('(pointer: coarse)').matches) // phones + tablets; touchscreen laptops still get mouse mode
  const [touchOn, setTouchOn] = useState(false)
  const touchRef = useRef({ active: false, move: [0, 0], look: [0, 0], jump: false })
  const setTouch = (on) => {
    touchRef.current.active = on
    touchRef.current.move = [0, 0]
    setTouchOn(on)
  }
  const playing = locked || touchOn
  // chatting: who you're talking to (backend slug) and who the crosshair is on
  const [chat, setChat] = useState(null)
  const [aimAt, setAimAt] = useState(null)
  const onAim = useCallback((slug) => setAimAt(slug), [])
  const openChat = useCallback((slug) => {
    setChat(slug)
    if (document.pointerLockElement) document.exitPointerLock() // free the mouse for the chat window
  }, [])
  const closeChat = useCallback(
    (resume) => {
      setChat(null)
      if (resume && !touchRef.current.active) lockRef.current?.() // ✕ button click: jump straight back in
    },
    [],
  )
  // Metaverse Web: tell the Metaverse Browser where you are, and greet you by the name it sends
  useEffect(() => {
    if (where) presence(`Yale SOM · ${where}`)
  }, [where])
  const [hello, setHello] = useState(null) // brief toast when the Metaverse Browser sends a name
  const [visitor, setVisitor] = useState(null) // lasting name for Dean's greeting
  useEffect(
    () =>
      onIdentity(({ name, color }) => {
        if (!name) return
        const who = { name: String(name).slice(0, 40), color: /^#[0-9a-f]{3,8}$/i.test(color ?? '') ? color : null }
        setVisitor(who.name)
        setHello(who)
        setTimeout(() => setHello(null), 6000)
      }),
    [],
  )
  // chill background music: starts on your first click or key (browsers need one); N or the button mutes it
  const [musicOn, setMusicOn] = useState(true)
  useEffect(() => setMuted(!musicOn), [musicOn])
  useEffect(() => {
    const start = () => startSong()
    window.addEventListener('pointerdown', start, { once: true })
    window.addEventListener('keydown', start, { once: true })
    return () => {
      window.removeEventListener('pointerdown', start)
      window.removeEventListener('keydown', start)
    }
  }, [])
  useEffect(() => {
    const k = (e) => {
      if (e.target.closest?.('input, textarea')) return
      if (e.code === 'KeyN') setMusicOn((v) => !v)
      if (e.code === 'KeyM') setShowMap((v) => !v)
      if (e.code === 'KeyT') setShowSchedule((v) => !v)
    }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [])

  return (
    <>
      <Canvas
        camera={{ fov: 72, near: 0.05, far: 800, position: [SPAWN.x, EYE, SPAWN.z] }}
        dpr={[1, 1.75]}
      >
        <World talkingTo={chat} onTalk={openChat} />
        <Player lockRef={lockRef} mapRef={mapRef} touchRef={touchRef} onLock={onLock} onWhere={onWhere} />
        <TalkAim enabled={playing && !chat} onAim={onAim} onTalk={openChat} />
      </Canvas>

      {aimAt && playing && !chat && (
        <div className="talkhint">
          {touchOn ? (
            <button onClick={() => openChat(aimAt)}>💬 Talk to {talkerTitle(aimAt)}</button>
          ) : (
            <span>
              <b>Click</b> or <b>E</b> to talk to {talkerTitle(aimAt)}
            </span>
          )}
        </div>
      )}
      {chat === DEAN_SLUG ? (
        <DeanPanel key={chat} visitor={visitor} onClose={closeChat} />
      ) : (
        chat && <ChatPanel key={chat} slug={chat} name={TALKER_NAMES[chat] ?? chat} onClose={closeChat} />
      )}

      <div className="where">
        <span className="dot" />
        {where}
      </div>
      {hello && (
        <div className="mvw-hello" style={hello.color ? { borderColor: hello.color } : undefined}>
          Welcome to Yale SOM, <b>{hello.name}</b>!
        </div>
      )}
      <div className={showMap ? 'mapwrap' : 'mapwrap hidden'}>
        <Minimap drawRef={mapRef} />
      </div>
      <button className="maptoggle" onClick={() => setShowMap((s) => !s)}>
        {showMap ? 'hide map' : 'map'}
      </button>
      <button className="maptoggle musictoggle" onClick={() => setMusicOn((v) => !v)} aria-label={musicOn ? 'Mute music' : 'Play music'}>
        {musicOn ? '♪ music' : '♪ off'}
      </button>
      <button className="maptoggle schedtoggle" onClick={() => setShowSchedule((s) => !s)}>
        {showSchedule ? 'hide schedule' : 'schedule'}
      </button>
      {showSchedule && !chat && <Schedule where={where} onClose={() => setShowSchedule(false)} />}
      {playing && !chat && <div className={aimAt ? 'crosshair on' : 'crosshair'} />}
      {touchOn && !chat && <TouchControls touchRef={touchRef} onPause={() => setTouch(false)} />}

      {!playing && !chat && (
        <div className="overlay" onClick={() => (isTouch ? setTouch(true) : lockRef.current?.())}>
          <div className="card">
            <div className="kicker">Yale SOM · Evans Hall</div>
            <h1>Evans Hall</h1>
            <p className="sub">Dean Kerwin Charles greets you at the door. Floor 1: the courtyard, McNay Café and Charley's. Floors 2 and 4: the classroom drums. The spiral stairs on the west side connect them all.</p>
            <button className="go">{isTouch ? 'Tap to walk in' : 'Click to walk in'}</button>
            {!isTouch && (
              <button
                className="go alt"
                onClick={(e) => {
                  e.stopPropagation()
                  setTouch(true)
                }}
              >
                Use on-screen joystick
              </button>
            )}
            {isTouch ? (
              <div className="keys">
                <span><b>Left thumb</b> joystick to walk (push all the way to hurry)</span>
                <span><b>Right thumb</b> drag to look</span>
              </div>
            ) : (
              <div className="keys">
                <span><b>W A S D</b> walk</span>
                <span><b>Mouse</b> look</span>
                <span><b>Shift</b> sprint</span>
                <span><b>Space</b> jump</span>
                <span><b>C</b> crouch</span>
                <span><b>M</b> map</span>
                <span><b>T</b> schedule</span>
                <span><b>N</b> music</span>
                <span><b>Esc</b> pause</span>
              </div>
            )}
            <button
              className="logout"
              onClick={(e) => {
                e.stopPropagation()
                onExit()
              }}
            >
              Back to Handsome Dan
            </button>
          </div>
        </div>
      )}
    </>
  )
}
