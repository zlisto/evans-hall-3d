import PersonAvatar from './PersonAvatar.jsx'
import { DEAN, SPAWN } from './layout.js'
import LOOK from '../data/avatars.json'

// Dean Kerwin Charles greets you at the default spawn in the west cloister.
export const DEAN_SLUG = 'kerwin-charles'
export const DEAN_NAME = 'Kerwin Charles'

const LOOK_DEAN = LOOK[DEAN_SLUG] ?? {
  skin: '#6b4428',
  hair: { color: '#2a1c14', style: 'bald' },
  beard: null,
  glasses: { color: '#1a1a1a', shape: 'rect' },
  top: { type: 'blazer', color: '#6e7278', inner: '#b8d4e8' },
  bottom: 'pants',
  pants: '#4a4e54',
  shoes: '#1a1a1a',
  height: 1.8,
  build: 'average',
  gesture: 'hands',
  accessory: 'tie',
  accessoryColor: '#5c1a2e',
}

export default function Dean({ talking = false, onTalk }) {
  return (
    <PersonAvatar
      slug={DEAN_SLUG}
      look={LOOK_DEAN}
      position={[DEAN.x, 0, DEAN.z]}
      rotation={Math.atan2(SPAWN.x - DEAN.x, SPAWN.z - DEAN.z)}
      talking={talking}
      onTalk={onTalk}
    />
  )
}
