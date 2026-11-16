import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'

gsap.registerPlugin(ScrollTrigger)

export const reducedMotion =
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

let lenis = null

/** Scroll suave sincronizado con ScrollTrigger (un solo reloj: el ticker de GSAP). */
export function initSmoothScroll() {
  if (lenis || reducedMotion) return lenis
  lenis = new Lenis({ duration: 1.15, easing: (t) => 1 - Math.pow(1 - t, 4), wheelMultiplier: 0.95 })
  lenis.on('scroll', ScrollTrigger.update)
  gsap.ticker.add((time) => lenis.raf(time * 1000))
  gsap.ticker.lagSmoothing(0)
  return lenis
}

export function scrollToId(id, opts = {}) {
  const el = document.getElementById(id)
  if (!el) return
  if (lenis) lenis.scrollTo(el, { duration: 1.4, ...opts })
  else el.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth' })
}

export const getLenis = () => lenis
export { gsap, ScrollTrigger }

// Solo en desarrollo: acceso desde la consola para depurar animaciones
if (import.meta.env.DEV && typeof window !== 'undefined') window.__motion = { gsap, ScrollTrigger, getLenis: () => lenis }
