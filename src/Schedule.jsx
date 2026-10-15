import { useEffect, useRef } from 'react'
import { ASSIGNMENTS } from './rooms.js'

// "Who teaches where": every room with a real course, grouped by floor. The room you're standing in
// is highlighted (its number is at the end of the location label, e.g. "Farr Classroom · 4420").
export default function Schedule({ where, onClose }) {
  const here = where.match(/(\d{4})$/)?.[1]
  const body = useRef(null)
  // While you're looking around, the mouse is locked to the game, so the wheel never reaches the list.
  // Catch it (and PageUp/PageDown) anywhere and scroll the schedule instead, no need to free the mouse.
  useEffect(() => {
    const el = body.current
    const onWheel = (e) => {
      if (el.contains(e.target)) return // mouse is free and over the list: let it scroll normally
      el.scrollBy({ top: e.deltaY * (e.deltaMode === 1 ? 32 : 1) })
      e.preventDefault()
    }
    const onKey = (e) => {
      if (e.code === 'PageDown' || e.code === 'PageUp') {
        el.scrollBy({ top: (e.code === 'PageDown' ? 1 : -1) * Math.max(el.clientHeight * 0.85, 300) })
        e.preventDefault()
      }
    }
    window.addEventListener('wheel', onWheel, { passive: false })
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('wheel', onWheel)
      window.removeEventListener('keydown', onKey)
    }
  }, [])
  const floors = [2, 4].map((f) => ({ f, rooms: ASSIGNMENTS.filter((a) => a.floor === f).sort((a, b) => a.room.localeCompare(b.room)) }))
  return (
    <div className="schedule" role="dialog" aria-label="Class schedule">
      <header>
        <div>
          <div className="kicker">Fall 2026 · Evans Hall</div>
          <b>Who teaches where</b>
        </div>
        <button className="chat-close" onClick={onClose} aria-label="Close schedule">
          ✕
        </button>
      </header>
      <div className="schedule-body" ref={body}>
        {floors.map(({ f, rooms }) => (
          <section key={f}>
            <h3>Floor {f}</h3>
            {rooms.map((a) => {
              const times = [...new Set(a.sections.map((s) => s.time))]
              return (
                <div key={a.room} className={a.room === here ? 'srow here' : 'srow'}>
                  <span className="sroom">{a.room}</span>
                  <span className="scourse">
                    <b>{a.course}</b> {a.title}
                    <small>
                      Prof. {a.professor} · {a.session} · {times.slice(0, 2).join(', ')}
                      {times.length > 2 ? ` +${times.length - 2} more` : ''}
                    </small>
                  </span>
                </div>
              )
            })}
          </section>
        ))}
        <p className="snote">Take the spiral stairs (A or B, west side) up to floor 4. Scroll with the mouse wheel. Press T to close.</p>
      </div>
    </div>
  )
}
