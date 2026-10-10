import { Fragment, useEffect, useRef, useState } from 'react'
import { api } from './talk.js'

const TOOL_LABELS = {
  search_courses: 'searched the course catalog',
  get_course: 'pulled up course details',
  courses_by_professor: "looked up a colleague's classes",
  courses_by_schedule: 'checked the class schedule',
}

// conversations survive closing and reopening the window (until the page reloads)
const memory = new Map() // slug -> { profile, messages, sessionId }

// tiny, safe markdown: **bold**, `code`, "- " bullets, line breaks
function inline(text) {
  return text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) return <b key={i}>{part.slice(2, -2)}</b>
    if (part.startsWith('`') && part.endsWith('`')) return <code key={i}>{part.slice(1, -1)}</code>
    return <Fragment key={i}>{part}</Fragment>
  })
}
function Rich({ text }) {
  const blocks = []
  for (const line of text.split('\n')) {
    const bullet = line.match(/^\s*[-*•]\s+(.*)/)
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

export default function ChatPanel({ slug, name, onClose, onAuthLost }) {
  const saved = memory.get(slug)
  const [profile, setProfile] = useState(saved?.profile ?? null)
  const [messages, setMessages] = useState(saved?.messages ?? [])
  const [sessionId, setSessionId] = useState(saved?.sessionId ?? null)
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [offline, setOffline] = useState(false)
  const [usage, setUsage] = useState(null) // { spent, limit } for this login session; the server is the source of truth
  const box = useRef()
  const field = useRef()
  const last = name.split(' ').slice(-1)[0]

  useEffect(() => {
    memory.set(slug, { profile, messages, sessionId })
  }, [slug, profile, messages, sessionId])

  useEffect(() => {
    if (profile) return
    api(`/professors/${slug}`)
      .then((p) => {
        setProfile(p)
        setMessages((m) => (m.some((x) => x.role !== 'system') ? m : [{ role: 'prof', text: p.greeting }])) // drop old "offline" notes
      })
      .catch(() => {
        setOffline(true)
        setMessages([{ role: 'system', text: `Prof. ${last}'s AI brain isn't running right now. Start the backend (see backend/README.md) and try again.` }])
      })
  }, [slug, profile, last])

  useEffect(() => {
    api('/auth/me')
      .then((m) => setUsage({ spent: m.spent_usd, limit: m.limit_usd }))
      .catch((err) => err.status === 401 && onAuthLost()) // login expired: back to the home page
  }, [onAuthLost])
  const limitHit = usage !== null && usage.spent >= usage.limit

  useEffect(() => {
    box.current?.scrollTo({ top: box.current.scrollHeight, behavior: 'smooth' })
  }, [messages, busy])

  useEffect(() => {
    field.current?.focus()
    const esc = (e) => e.code === 'Escape' && onClose(false)
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [onClose])

  const send = async () => {
    const text = input.trim()
    if (!text || busy || limitHit) return
    setInput('')
    setMessages((m) => [...m, { role: 'me', text }])
    setBusy(true)
    try {
      const r = await api(`/professors/${slug}/chat`, { message: text, session_id: sessionId })
      setSessionId(r.session_id)
      setOffline(false)
      setMessages((m) => [...m, { role: 'prof', text: r.reply, tools: [...new Set(r.tools_used)] }])
      setUsage({ spent: r.spent_usd, limit: r.limit_usd })
    } catch (err) {
      if (err.status === 401) return onAuthLost() // login expired: back to the home page
      if (err.status === 402) {
        setInput(text)
        setMessages((m) => m.slice(0, -1))
        setUsage((u) => ({ spent: Math.max(u?.spent ?? 0, u?.limit ?? 0), limit: u?.limit ?? 0 })) // server says we're out
        return
      }
      setMessages((m) => [...m, { role: 'system', text: `Couldn't reach Prof. ${last}: ${err.message}` }])
    } finally {
      setBusy(false)
      field.current?.focus()
    }
  }

  const sub = profile ? [profile.courses.join(', '), profile.rooms.join(', '), 'AI version'].filter(Boolean).join(' · ') : offline ? 'offline' : 'connecting…'
  return (
    <div className="chat" role="dialog" aria-label={`Chat with Prof. ${name}`}>
      <header>
        <div className="chat-avatar">{name.split(' ').map((w) => w[0]).join('')}</div>
        <div className="chat-title">
          <b>Prof. {name}</b>
          <span>{sub}</span>
        </div>
        <button className="chat-close" onClick={() => onClose(true)} aria-label="Close chat and keep walking">
          ✕
        </button>
      </header>
      {usage && (
        <div className="chat-meter" title="AI cost for this login session">
          <div className="bar">
            <i style={{ width: `${Math.min(100, (usage.spent / usage.limit) * 100)}%` }} />
          </div>
          <span>
            ${usage.spent.toFixed(4)} of ${usage.limit.toFixed(2)} used
          </span>
        </div>
      )}
      <div className="chat-log" ref={box}>
        {messages.map((msg, i) => (
          <div key={i} className={`msg ${msg.role}`}>
            {msg.tools?.length > 0 && (
              <div className="tools">
                {msg.tools.map((t) => (
                  <span key={t}>🔎 {TOOL_LABELS[t] ?? t}</span>
                ))}
              </div>
            )}
            <div className="bubble">{msg.role === 'prof' ? <Rich text={msg.text} /> : msg.text}</div>
          </div>
        ))}
        {limitHit && (
          <div className="limit-flash" role="alert">
            <b>Free Tier Limit Reached</b>
            <span>This login has used its ${usage.limit.toFixed(2)} of AI chat. You can keep exploring Evans Hall.</span>
          </div>
        )}
        {busy && (
          <div className="msg prof">
            <div className="bubble thinking">
              Prof. {last} is thinking<i>.</i>
              <i>.</i>
              <i>.</i>
            </div>
          </div>
        )}
      </div>
      <form
        className="chat-input"
        onSubmit={(e) => {
          e.preventDefault()
          send()
        }}
      >
        <textarea
          ref={field}
          rows={1}
          value={input}
          placeholder={limitHit ? 'Chat limit reached' : `Ask Prof. ${last} anything…`}
          disabled={limitHit}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              send()
            }
          }}
        />
        <button type="submit" disabled={busy || limitHit || !input.trim()}>
          Send
        </button>
      </form>
    </div>
  )
}
