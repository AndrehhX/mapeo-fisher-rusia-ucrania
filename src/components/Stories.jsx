import { useEffect, useRef } from 'react'
import { gsap, reducedMotion } from '../lib/motion'
import { STORIES } from '../data/content'

export default function Stories({ ready }) {
  const root = useRef()

  useEffect(() => {
    if (!ready || reducedMotion) return
    const ctx = gsap.context(() => {
      gsap.from('.stories-head > *', { y: 60, autoAlpha: 0, duration: 1.2, ease: 'expo.out', stagger: 0.1, scrollTrigger: { trigger: '.stories-head', start: 'top 80%' } })
      gsap.utils.toArray('.story-row').forEach((row) => {
        const [ua, ru] = row.querySelectorAll('.story-pair p')
        gsap
          .timeline({ scrollTrigger: { trigger: row, start: 'top 82%' } })
          .from(row.querySelector('.story-topic'), { autoAlpha: 0, y: 20, duration: 0.8, ease: 'power3.out' })
          .from(ua, { autoAlpha: 0, x: -50, duration: 1.1, ease: 'expo.out' }, '<0.1')
          .from(ru, { autoAlpha: 0, x: 50, duration: 1.1, ease: 'expo.out' }, '<0.12')
      })
    }, root)
    return () => ctx.revert()
  }, [ready])

  return (
    <section className="stories" id="relatos" ref={root}>
      <div className="wrap">
        <header className="stories-head">
          <p className="eyebrow">Lo que disputan</p>
          <h2 className="display">
            Una guerra.
            <br />
            <span className="dim">Dos relatos.</span>
          </h2>
        </header>
        <div className="story-cols" aria-hidden="true">
          <span>
            <i style={{ background: 'var(--ua)' }} /> Ucrania
          </span>
          <span>
            <i style={{ background: 'var(--ru)' }} /> Rusia
          </span>
        </div>
        {STORIES.map((s) => (
          <div className="story-row" key={s.topic}>
            <div className="story-topic">{s.topic}</div>
            <div className="story-pair">
              <p data-who="Ucrania">{s.ua}</p>
              <p data-who="Rusia">{s.ru}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
