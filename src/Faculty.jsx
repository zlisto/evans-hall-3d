import { useEffect, useMemo, useState } from 'react'
import * as THREE from 'three'
import Professor, { PROFESSORS } from './Professor.jsx'
import Zaman, { ZAMAN } from './Zaman.jsx'
import Schott, { SCHOTT } from './Schott.jsx'
import PersonAvatar from './PersonAvatar.jsx'
import { DRUMS, K, LECTERNS } from './layout.js'
import { DRUMS4, ELEV4 } from './floor4.js'
import { ELEV1 } from './floor1.js'
import { ASSIGNMENTS, ROOM_ASSIGN } from './rooms.js'
import { api } from './talk.js'
import SAVED_LOOKS from '../data/avatars.json'

// hand-built avatars, keyed by backend slug. Everyone else with a researched look in the DB
// (professor_profiles.appearance, via /api/avatars) gets a PersonAvatar.
export const TALKER_AVATARS = {
  [ZAMAN.slug]: { Avatar: Zaman, ...ZAMAN },
  [SCHOTT.slug]: { Avatar: Schott, ...SCHOTT },
}
// names for the chat window: every professor with a room can be talked to once they have an avatar
export const TALKER_NAMES = Object.fromEntries(ASSIGNMENTS.map((a) => [a.slug, a.professor]))

// Hogwarts guest professors for any room without a real course (every classroom is assigned now;
// Hagrid still hangs out in the courtyard)
export const GUEST_PROFESSOR = {}

function plaqueTex(name) {
  const c = document.createElement('canvas')
  c.width = 512
  c.height = 128
  const g = c.getContext('2d')
  g.fillStyle = '#c9a44a'
  g.fillRect(0, 0, 512, 128)
  g.fillStyle = '#2a1d0c'
  g.fillRect(8, 8, 496, 112)
  g.fillStyle = '#f3dfa8'
  g.font = 'bold 44px Georgia, serif'
  g.textAlign = 'center'
  g.fillText(`Prof. ${name.split(' ').slice(-1)[0]}`, 256, 80)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

// one entry per classroom on floors 2 and 4: who stands at the front, and the lectern plaque
function roomItems(drums, y) {
  return drums.flatMap((d, i) => {
    const real = ROOM_ASSIGN[d.id]
    const guest = !real && GUEST_PROFESSOR[d.id]
    const name = real ? real.professor : guest && PROFESSORS[guest].name
    if (!name) return [] // open room
    const { fc, back, t, half, rot } = d.front
    const lec = LECTERNS[i]
    return [
      {
        key: d.id,
        avatar: real && TALKER_AVATARS[real.slug],
        slug: real?.slug,
        guest,
        pos: [fc[0] + back[0] * 1.15 - t[0] * half * 0.3, y, fc[1] + back[1] * 1.15 - t[1] * half * 0.3],
        rot,
        plaque: { p: [lec.x + back[0] * 0.26, y + 0.85, lec.z + back[1] * 0.26], mat: new THREE.MeshBasicMaterial({ map: plaqueTex(name) }) },
      },
    ]
  })
}

export default function Faculty({ talkingTo, onTalk }) {
  const items = useMemo(() => [...roomItems(DRUMS, 0), ...roomItems(DRUMS4, ELEV4)], [])
  // slug -> appearance. Starts from the copy saved with the site (so GitHub Pages shows everyone),
  // then takes the backend's live list when it's reachable.
  const [looks, setLooks] = useState(SAVED_LOOKS)
  useEffect(() => {
    api('/avatars')
      .then((live) => setLooks({ ...SAVED_LOOKS, ...live }))
      .catch(() => {}) // backend offline: keep the saved looks
  }, [])
  return (
    <>
      {items.map((it, i) => (
        <group key={it.key}>
          {it.avatar ? (
            <it.avatar.Avatar position={it.pos} rotation={it.rot} talking={talkingTo === it.avatar.slug} onTalk={onTalk} />
          ) : looks[it.slug] ? (
            <PersonAvatar slug={it.slug} look={looks[it.slug]} position={it.pos} rotation={it.rot} talking={talkingTo === it.slug} onTalk={onTalk} />
          ) : it.guest ? (
            <Professor who={it.guest} position={it.pos} rotation={it.rot} phase={i * 1.7} />
          ) : null}
          <mesh position={it.plaque.p} rotation={[0, it.rot, 0]} material={it.plaque.mat}>
            <planeGeometry args={[0.6, 0.15]} />
          </mesh>
        </group>
      ))}
      {/* Hagrid keeps an eye on the Labubus in the courtyard */}
      <Professor who="hagrid" position={[-10.5 * K, ELEV1, -2 * K]} rotation={Math.PI / 2} />
    </>
  )
}
