import { useEffect, useRef } from 'react'
import { gsap, reducedMotion } from '../lib/motion'
import { SCENES, CAPTIONS } from '../data/content'

const slugOf = (src) => src.replace(/^.*\//, '').replace('.webp', '')

/**
 * Cuatro momentos a pantalla completa. Cada foto entra con un recorte que se abre
 * desde el centro, el año se desliza y la imagen hace un leve zoom-out (Ken Burns inverso).
 */
export default function Scenes({ ready }) {
  const root = useRef()

  useEffect(() => {
    if (!ready || reducedMotion) return
    const ctx = gsap.context(() => {
      gsap.utils.toArray('.scene').forEach((scene) => {
        const media = scene.querySelector('.scene-media')
        const img = scene.querySelector('img')
        const tl = gsap.timeline({
          scrollTrigger: { trigger: scene, start: 'top 85%', end: 'top 5%', scrub: 0.8 },
        })
        tl.fromTo(media, { clipPath: 'inset(14% 18% 14% 18% round 28px)' }, { clipPath: 'inset(0% 0% 0% 0% round 0px)', ease: 'none', duration: 1 }, 0)
          .fromTo(img, { scale: 1.3 }, { scale: 1.04, ease: 'none', duration: 1 }, 0)
          .fromTo(scene.querySelector('.scene-year'), { yPercent: 40, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, ease: 'power2.out', duration: 0.4 }, 0.45)
          .fromTo(scene.querySelector('.scene-text'), { y: 40, autoAlpha: 0 }, { y: 0, autoAlpha: 1, ease: 'power2.out', duration: 0.4 }, 0.6)

        gsap.to(img, { yPercent: 8, ease: 'none', scrollTrigger: { trigger: scene, start: 'top top', end: 'bottom top', scrub: true } })
      })
    }, root)
    return () => ctx.revert()
  }, [ready])

  return (
    <section className="scenes" id="momentos" ref={root} aria-label="Cuatro momentos">
      {SCENES.map((s) => (
        <article className="scene" key={s.year}>
          <div className="scene-media">
            <img src={s.img} alt={CAPTIONS[slugOf(s.img)] || ''} loading="lazy" decoding="async" />
          </div>
          <div className="scene-copy">
            <p className="scene-year">{s.year}</p>
            <div className="scene-text">
              <h3>{s.title}</h3>
              <p>{s.text}</p>
            </div>
          </div>
        </article>
      ))}
    </section>
  )
}
