import { useEffect, useRef } from 'react'
import { gsap, reducedMotion } from '../lib/motion'
import { TABLE } from '../data/content'

export default function Table({ ready }) {
  const root = useRef()

  useEffect(() => {
    if (!ready) return
    const ctx = gsap.context(() => {
      gsap.fromTo('.table-bg img', { yPercent: -6, scale: 1.1 }, { yPercent: 6, scale: 1, ease: 'none', scrollTrigger: { trigger: root.current, start: 'top bottom', end: 'bottom top', scrub: true } })
      if (reducedMotion) return
      gsap.from('.table-head > *', { y: 50, autoAlpha: 0, duration: 1.2, stagger: 0.1, ease: 'expo.out', scrollTrigger: { trigger: '.table-head', start: 'top 80%' } })
      gsap.from('.table-card', { y: 80, autoAlpha: 0, duration: 1.3, stagger: 0.15, ease: 'expo.out', scrollTrigger: { trigger: '.table-cols', start: 'top 85%' } })
      gsap.from('.table-card li', { y: 24, autoAlpha: 0, duration: 0.9, stagger: 0.07, ease: 'power3.out', scrollTrigger: { trigger: '.table-cols', start: 'top 75%' } })
      gsap.from('.table-foot', { autoAlpha: 0, y: 30, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: '.table-foot', start: 'top 90%' } })
    }, root)
    return () => ctx.revert()
  }, [ready])

  return (
    <section className="table-sec" id="mesa" ref={root}>
      <div className="table-bg" aria-hidden="true">
        <img src="img/abudhabi.webp" alt="" loading="lazy" decoding="async" />
      </div>
      <div className="wrap">
        <header className="table-head">
          <p className="eyebrow">Abu Dabi · 10 y 11 de noviembre de 2026</p>
          <h2 className="display">
            Una mesa.
            <br />
            <span className="dim">Ningún acuerdo, todavía.</span>
          </h2>
        </header>
        <div className="table-cols">
          <div className="table-card">
            <h3>
              <i style={{ background: 'var(--ru)' }} /> Rusia exige
            </h3>
            <ol>
              {TABLE.ru.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ol>
          </div>
          <div className="table-card">
            <h3>
              <i style={{ background: 'var(--ua)' }} /> Ucrania propone
            </h3>
            <ol>
              {TABLE.ua.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ol>
          </div>
        </div>
        <p className="table-foot">Estados Unidos se sienta con ambos. Europa, por ahora, no.</p>
      </div>
    </section>
  )
}
