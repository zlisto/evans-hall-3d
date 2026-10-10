import { useCallback, useEffect, useState } from 'react'
import App from './App.jsx'
import Home from './Home.jsx'
import { api, auth } from './talk.js'

// Home page until you log in, then the game. A remembered login skips straight to the game.
export default function Root() {
  const [view, setView] = useState(() => (auth.get() ? 'checking' : 'home'))

  useEffect(() => {
    if (view !== 'checking') return
    api('/auth/me')
      .then(() => setView('game'))
      .catch(() => {
        auth.set(null)
        setView('home')
      })
  }, [view])

  const logout = useCallback(() => {
    auth.set(null)
    if (document.pointerLockElement) document.exitPointerLock()
    setView('home')
  }, [])

  if (view === 'checking') return <div className="home-loading">Virtual Yale SOM…</div>
  if (view === 'home') return <Home onEnter={() => setView('game')} />
  return <App onLogout={logout} />
}
