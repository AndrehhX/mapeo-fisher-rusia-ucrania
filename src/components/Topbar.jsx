import { useEffect, useRef, useState } from 'react'
import { ScrollTrigger, scrollToId } from '../lib/motion'
import { IconExpand } from './Icons'

// Orden de escenas para el modo presentación (AvPág / RePág, o un clicker)
const STOPS = ['inicio', 'idea', 'momentos', 'mapa', 'relatos', 'cifras', 'mesa', 'cierre']

export default function Topbar({ ready }) {
  const bar = useRef()
  const [solid, setSolid] = useState(false)
  const solidRef = useRef(false)

  useEffect(() => {
    if (!ready) return
    const st = ScrollTrigger.create({
      start: 0,
      end: 'max',
      onUpdate: (s) => {
        if (bar.current) bar.current.style.transform = `scaleX(${s.progress})`
        const next = s.scroll() > window.innerHeight * 3.2
        if (next !== solidRef.current) {
          solidRef.current = next
          setSolid(next)
        }
      },
    })
    return () => st.kill()
  }, [ready])

  useEffect(() => {
    const current = () => {
      const mid = window.innerHeight * 0.5
      let idx = 0
      STOPS.forEach((id, i) => {
        const el = document.getElementById(id)
        if (el && el.getBoundingClientRect().top <= mid) idx = i
      })
      return idx
    }
    const onKey = (e) => {
      if (e.target.closest('input, textarea')) return
      if (e.key === 'PageDown') {
        e.preventDefault()
        scrollToId(STOPS[Math.min(current() + 1, STOPS.length - 1)])
      } else if (e.key === 'PageUp') {
        e.preventDefault()
        scrollToId(STOPS[Math.max(current() - 1, 0)])
      } else if (e.key === 'f' || e.key === 'F') {
        toggleFullscreen()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <>
      <div className="progress" aria-hidden="true">
        <i ref={bar} />
      </div>
      <header className={'topbar' + (solid ? ' solid' : '')}>
        <a className="wordmark" href="#inicio" onClick={(e) => (e.preventDefault(), scrollToId('inicio'))}>
          <i aria-hidden="true">
            <b style={{ background: 'var(--ua)' }} />
            <b style={{ background: 'var(--ru)' }} />
          </i>
          Mapeo del conflicto
        </a>
        <button className="icon-btn" onClick={toggleFullscreen} aria-label="Pantalla completa (F)" title="Pantalla completa (F)">
          <IconExpand />
        </button>
      </header>
    </>
  )
}

function toggleFullscreen() {
  if (!document.fullscreenElement) document.documentElement.requestFullscreen?.()
  else document.exitFullscreen?.()
}
