// Which course + professor is in which Virtual Evans room. Source of truth: data/room_assignments.json
// (generated from the course catalog; the backend reads the same file).
import data from '../data/room_assignments.json'

export const ASSIGNMENTS = data.rooms
export const ROOM_ASSIGN = Object.fromEntries(ASSIGNMENTS.map((a) => [a.room, a]))
