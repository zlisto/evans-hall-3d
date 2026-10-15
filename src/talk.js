// Characters you can chat with register their root object here so the crosshair can find them.
// slug (the backend's professor id) -> THREE.Object3D
export const TALKERS = new Map()

export const REACH = 7 // meters: how close you need to be to start a chat

const API = import.meta.env.VITE_API_URL ?? '' // dev: Vite proxies /api to the FastAPI backend

// anonymous visitor-session token (no login), remembered in this browser so the chat spend limit
// carries across reloads (storage can be blocked, e.g. private windows)
const TOKEN_KEY = 'som-token'
let memoryToken = null
export const auth = {
  get: () => {
    try {
      return localStorage.getItem(TOKEN_KEY) ?? memoryToken
    } catch {
      return memoryToken
    }
  },
  set: (token) => {
    memoryToken = token
    try {
      if (token) localStorage.setItem(TOKEN_KEY, token)
      else localStorage.removeItem(TOKEN_KEY)
    } catch {
      /* memory only */
    }
  },
}

export async function api(path, body) {
  const headers = {}
  const token = auth.get()
  if (token) headers.Authorization = `Bearer ${token}`
  if (body) headers['Content-Type'] = 'application/json'
  const res = await fetch(`${API}/api${path}`, body ? { method: 'POST', headers, body: JSON.stringify(body) } : { headers })
  if (!res.ok) {
    const detail = await res.json().then((d) => d.detail).catch(() => null)
    const err = new Error(typeof detail === 'string' ? detail : `HTTP ${res.status}`)
    err.status = res.status
    throw err
  }
  return res.json()
}

// a fresh anonymous session from the backend
export async function newSession() {
  const r = await api('/session', {})
  auth.set(r.token)
  return r.token
}

// use the saved session, or start one
export async function ensureSession() {
  return auth.get() ?? newSession()
}
