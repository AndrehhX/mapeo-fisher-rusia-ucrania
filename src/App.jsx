import { useEffect, useState } from 'react'
import { ScrollTrigger, initSmoothScroll } from './lib/motion'
import Topbar from './components/Topbar'
import Hero from './components/Hero'
import Statement from './components/Statement'
import Scenes from './components/Scenes'
import MapSection from './components/MapSection'
import Stories from './components/Stories'
import Numbers from './components/Numbers'
import Table from './components/Table'
import End from './components/End'

/**
 * Guion de ~5 minutos:
 * globo (2014 → 2022) · la idea de Fisher · cuatro momentos · el mapa ·
 * dos relatos · tres cifras · la mesa de Abu Dabi · cierre.
 */
export default function App() {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual'
    window.scrollTo(0, 0)
    let alive = true
    const start = () => alive && setReady(true)
    Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 1500))]).then(start)
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    if (!ready) return
    initSmoothScroll()
    const refresh = () => ScrollTrigger.refresh()
    window.addEventListener('load', refresh)
    const t = setTimeout(refresh, 600)
    return () => {
      window.removeEventListener('load', refresh)
      clearTimeout(t)
    }
  }, [ready])

  return (
    <div style={{ opacity: ready ? 1 : 0, transition: 'opacity .8s ease' }}>
      <Topbar ready={ready} />
      <main>
        <Hero ready={ready} />
        <Statement ready={ready} />
        <Scenes ready={ready} />
        <MapSection />
        <Stories ready={ready} />
        <Numbers ready={ready} />
        <Table ready={ready} />
        <End />
      </main>
    </div>
  )
}
