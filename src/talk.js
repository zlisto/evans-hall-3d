// Characters you can chat with register their root object here so the crosshair can find them.
// slug (the backend's professor id) -> THREE.Object3D
export const TALKERS = new Map()

export const REACH = 7 // meters: how close you need to be to start a chat

const API = import.meta.env.VITE_API_URL ?? '' // dev: Vite proxies /api to the FastAPI backend

export async function api(path, body) {
  const res = await fetch(`${API}/api${path}`, body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : undefined)
  if (!res.ok) {
    const detail = await res.json().then((d) => d.detail).catch(() => null)
    throw new Error(detail || `HTTP ${res.status}`)
  }
  return res.json()
}
