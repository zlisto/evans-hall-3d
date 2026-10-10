import { ASSIGNMENTS } from './rooms.js'

// "Who teaches where": every room with a real course, grouped by floor. The room you're standing in
// is highlighted (its number is at the end of the location label, e.g. "Farr Classroom · 4420").
export default function Schedule({ where, onClose }) {
  const here = where.match(/(\d{4})$/)?.[1]
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
      <div className="schedule-body">
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
        <p className="snote">Take the spiral stairs (A or B, west side) up to floor 4. Press T to close.</p>
      </div>
    </div>
  )
}
