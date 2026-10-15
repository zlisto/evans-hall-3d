// This world's place on the Metaverse Web (mvw/0.1): its arrival points (?spawn=<id>) and its portal
// to Metaverse Square. Listed for other worlds in public/.well-known/metaverse.json; keep the ids in sync.
import { LIBRARY, SPAWN } from './layout.js'

export const MY_ID = 'evans_hall_3d' // our id in the metaverse registry
export const SQUARE = 'https://zlisto.github.io/hub_world/'

// Metaverse Square portal: floor 2, west cloister, against the Ross Library glass, facing east
export const PORTAL = { x: LIBRARY.x1 + 0.8, z: 6, rot: Math.PI / 2 }

// yaw is the camera's rotation.y: 0 looks north (-z), -PI/2 looks east (+x)
export const SPAWNS = {
  default: { x: SPAWN.x, z: SPAWN.z, yaw: 0 }, // southwest corner by the Class of 1980 classroom, facing north
  from_square: { x: PORTAL.x + 2.6, z: PORTAL.z, yaw: -Math.PI / 2 }, // just in front of the portal, facing into the cloister
}
