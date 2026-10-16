// This world's place on the Metaverse Web (mvw/0.1): its arrival points (?spawn=<id>) and its portals.
// Listed for other worlds in public/.well-known/metaverse.json; keep the ids in sync.
import { CLOISTER_W, K, LIBRARY, SPAWN } from './layout.js'

export const MY_ID = 'evans_hall_3d' // our id in the metaverse registry
export const SQUARE = 'https://zlisto.github.io/hub_world/'
export const DARUL = import.meta.env.DEV ? 'http://localhost:5174/' : 'https://zlisto.github.io/darul_kebab/'
export const HPA = 'https://baggs99.github.io/som-explore/office.html'
export const LIGHTHOUSE = 'https://zlisto.github.io/lighthouse-of-alexandria/'

// Metaverse Square portal: floor 2, west cloister, against the Ross Library glass, facing east
export const PORTAL = { x: LIBRARY.x1 + 0.8, z: 6, rot: Math.PI / 2 }

// Extra doors beside the square portal (same facing, stepped along the cloister).
export const DOORS = [
  {
    id: 'to_darul_kebab',
    label: 'Darul Kebab',
    sub: 'lunch · Cambridge',
    href: DARUL,
    spawn: 'front_door',
    back: 'from_darul',
    x: PORTAL.x,
    z: PORTAL.z - 4,
    rot: PORTAL.rot,
  },
  {
    id: 'to_hpa_office',
    label: 'HPA Office',
    sub: 'scans · Baggs99',
    href: HPA,
    spawn: 'default',
    back: 'from_hpa',
    x: PORTAL.x,
    z: PORTAL.z - 8,
    rot: PORTAL.rot,
  },
  {
    id: 'to_lighthouse',
    label: 'Lighthouse of Alexandria',
    sub: 'ancient learning · bridge',
    href: LIGHTHOUSE,
    spawn: 'from_square',
    back: 'from_lighthouse',
    x: PORTAL.x,
    z: PORTAL.z + 4,
    rot: PORTAL.rot,
    color: '#ffd166',
  },
]

// yaw is the camera's rotation.y: 0 looks north (-z), -PI/2 looks east (+x)
export const SPAWNS = {
  default: { x: SPAWN.x, z: SPAWN.z, yaw: 0 }, // southwest corner by the Class of 1980 classroom, facing north
  from_square: { x: PORTAL.x + 2.6, z: PORTAL.z, yaw: -Math.PI / 2 }, // just in front of the portal, facing into the cloister
  from_darul: { x: PORTAL.x + 2.6, z: PORTAL.z - 4, yaw: -Math.PI / 2 },
  from_hpa: { x: PORTAL.x + 2.6, z: PORTAL.z - 8, yaw: -Math.PI / 2 },
  from_lighthouse: { x: PORTAL.x + 2.6, z: PORTAL.z + 4, yaw: -Math.PI / 2 },
  // Starter World lands by Tauhid's classroom (Blumetti 2200) on the west cloister
  room_2200: { x: -CLOISTER_W, z: -22 * K, yaw: Math.PI },
  from_starter: { x: -CLOISTER_W, z: -22 * K, yaw: Math.PI },
}
