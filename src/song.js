import { bass, drum, epiano, pad, playSong } from './audio.js'

// "Evans Hall Study Session": a chill lo-fi loop, generated in code. 76 bpm, swung eighth notes.
// Four jazzy chords (Fmaj7, Em7, Dm7, Cmaj7), a warm pad, soft electric-piano comping, a round bass,
// brushed drums, and a lazy melody that changes a little every time around.

const EIGHTH = 60 / 76 / 2
const SWING = 0.12 // off-beat eighths land a little late

// one bar per chord: pad voicing + bass root (MIDI note numbers)
const CHORDS = [
  { pad: [53, 57, 60, 64], root: 41 }, // Fmaj7
  { pad: [52, 55, 59, 62], root: 40 }, // Em7
  { pad: [50, 53, 57, 60], root: 38 }, // Dm7
  { pad: [48, 52, 55, 59], root: 36 }, // Cmaj7
]
const PENTA = [72, 74, 76, 79, 81, 84] // C major pentatonic, up an octave: always sounds right over these chords

let seed = 409
const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296)

// a fresh 4-bar melody: sparse, stepwise, resting often
function melody() {
  const out = new Map() // step (0..31) -> note
  let i = Math.floor(rnd() * PENTA.length)
  for (let s = 0; s < 32; s++) {
    if (rnd() < (s % 2 ? 0.12 : 0.28)) {
      i = Math.max(0, Math.min(PENTA.length - 1, i + [-2, -1, -1, 0, 1, 1, 2][Math.floor(rnd() * 7)]))
      out.set(s, PENTA[i])
    }
  }
  return out
}

let tune = melody()

function step(n, t) {
  const s = n % 32 // 4 bars x 8 eighths
  const bar = Math.floor(s / 8)
  const e = s % 8
  const at = t + (e % 2 ? SWING * EIGHTH : 0)
  const chord = CHORDS[bar]
  if (s === 0 && n > 0 && Math.floor(n / 32) % 2 === 0) tune = melody() // new melody every other loop

  if (e === 0) pad(t, chord.pad, EIGHTH * 8, 0.035, 700)
  // comping: soft chord stabs on beat 1 and the "and" of 2
  if (e === 0 || e === 3) chord.pad.slice(1).forEach((m, k) => epiano(at + k * 0.012, m, 0.03, (k - 1) * 0.3))
  // bass: root on 1, fifth-ish pickup on the "and" of 3
  if (e === 0) bass(t, chord.root, EIGHTH * 3, 0.1)
  if (e === 5) bass(at, chord.root + 7, EIGHTH * 2, 0.07)
  // brushed drums: kick on 1 and 3, soft snare on 2 and 4, light hats
  if (e === 0 || e === 4) drum(t, 'ge', 0.22)
  if (e === 2 || e === 6) drum(t, 'na', 0.12)
  drum(at, e % 2 ? 'ka' : 'ti', 0.06)
  // melody: only after the first time around, so it eases in
  if (n >= 32 && tune.has(s)) epiano(at, tune.get(s), 0.05, 0.15)
}

export const startSong = () => playSong(EIGHTH, step)
