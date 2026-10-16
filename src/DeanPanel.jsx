import { Fragment, useEffect, useRef, useState } from 'react'
import { DEAN_FACTS, DEAN_GREETING } from './deanFacts.js'
import { DOORS, MY_ID, SQUARE } from './metaverse.js'
import { navigate } from './mvw.js'
import { fadeOut, whoosh } from './audio.js'

// Wonder-style chat for Dean Charles: fixed Q&A pills + Go → doorways (like Scopabubu / Labubuldore).

const DESTINATIONS = [
  { label: 'Metaverse Square', sub: 'every world · portal', href: SQUARE, spawn: `by_${MY_ID}`, back: 'from_square' },
  ...DOORS.map((d) => ({ label: d.label, sub: d.sub, href: d.href, spawn: d.spawn, back: d.back })),
]

function inline(text) {
  return text.split(/(\*\*[^*]+\*\*|`[^`]+`|https:\/\/[^\s)]+[^\s).,:])/g).map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) return <b key={i}>{part.slice(2, -2)}</b>
    if (part.startsWith('`') && part.endsWith('`')) return <code key={i}>{part.slice(1, -1)}</code>
    if (part.startsWith('https://'))
      return (
        <a key={i} href={part} target="_blank" rel="noreferrer">
          {part.replace('https://', '')}
        </a>
      )
    return <Fragment key={i}>{part}</Fragment>
  })
}

function Rich({ text }) {
  const blocks = []
  for (const line of text.split('\n')) {
    const bullet = line.match(/^\s*-\s+(.*)/)
    const last = blocks[blocks.length - 1]
    if (bullet) {
      if (last?.type === 'ul') last.items.push(bullet[1])
      else blocks.push({ type: 'ul', items: [bullet[1]] })
    } else if (line.trim()) blocks.push({ type: 'p', text: line })
  }
  return blocks.map((b, i) =>
    b.type === 'ul' ? (
      <ul key={i}>
        {b.items.map((it, j) => (
          <li key={j}>{inline(it)}</li>
        ))}
      </ul>
    ) : (
      <p key={i}>{inline(b.text)}</p>
    ),
  )
}

let saved = null

export default function DeanPanel({ visitor, onClose }) {
  const [messages, setMessages] = useState(() => saved ?? [{ who: 'dean', text: DEAN_GREETING(visitor) }])
  const [typing, setTyping] = useState(false)
  const log = useRef()
  useEffect(() => {
    saved = messages
    log.current?.scrollTo({ top: log.current.scrollHeight, behavior: 'smooth' })
  }, [messages, typing])
  useEffect(() => {
    const esc = (e) => e.code === 'Escape' && onClose(false)
    addEventListener('keydown', esc)
    return () => removeEventListener('keydown', esc)
  }, [onClose])

  const asked = new Set(messages.filter((m) => m.who === 'you').map((m) => m.text))
  const ask = (fact) => {
    if (typing) return
    setMessages((m) => [...m, { who: 'you', text: fact.q }])
    setTyping(true)
    setTimeout(() => {
      setMessages((m) => [...m, { who: 'dean', text: fact.a }])
      setTyping(false)
    }, 650)
  }
  const go = (d) => {
    fadeOut()
    whoosh()
    navigate(d.href, d.spawn, d.back)
  }

  return (
    <div className="guide dean-panel" role="dialog" aria-label="Talking with Dean Kerwin Charles">
      <header>
        <div className="guide-avatar">KC</div>
        <div className="guide-title">
          Kerwin Charles
          <span>Dean · Yale School of Management</span>
        </div>
        <button className="guide-close" onClick={() => onClose(true)} aria-label="Close">
          ×
        </button>
      </header>
      <div className="guide-log" ref={log}>
        {messages.map((m, i) => (
          <div key={i} className={`guide-msg ${m.who === 'you' ? 'you' : 'tauhid'}`}>
            <Rich text={m.text} />
          </div>
        ))}
        {typing && <div className="guide-msg tauhid typing">…</div>}
        <div className="world-list">
          <p className="world-none">I can send you through a doorway from here:</p>
          {DESTINATIONS.map((d) => (
            <div key={d.label} className="world-card ok">
              <div className="world-head">
                <span className="world-dot" />
                <b>{d.label}</b>
                <button type="button" onClick={() => go(d)}>
                  Go →
                </button>
              </div>
              <span className="world-host">{d.sub}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="guide-asks">
        {DEAN_FACTS.map((f) => (
          <button key={f.q} className={asked.has(f.q) ? 'asked' : ''} onClick={() => ask(f)} disabled={typing}>
            {f.q}
          </button>
        ))}
      </div>
      <div className="guide-foot">Click outside the chat, Esc or × to keep exploring</div>
    </div>
  )
}
