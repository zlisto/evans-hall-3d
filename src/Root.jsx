import { useCallback, useState } from 'react'
import App from './App.jsx'
import Home from './Home.jsx'

// Handsome Dan's front page, then the building. No login: the chat gets an anonymous session on its own.
export default function Root() {
  const [view, setView] = useState('home')
  const exit = useCallback(() => {
    if (document.pointerLockElement) document.exitPointerLock()
    setView('home')
  }, [])
  return view === 'home' ? <Home onEnter={() => setView('game')} /> : <App onExit={exit} />
}
