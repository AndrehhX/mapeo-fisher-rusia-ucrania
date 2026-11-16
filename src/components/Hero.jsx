import { Suspense, useEffect, useRef } from 'react'
import Stage from '../three/Stage'
import Globe from '../three/Globe'
import { gsap, reducedMotion } from '../lib/motion'
import { useInView } from '../lib/useInView'
import { AUTHOR } from '../data/content'

export default function Hero({ ready }) {
  const root = useRef()
  const progress = useRef(0)
  const inView = useInView(root, '0px')

  useEffect(() => {
    if (!ready) return
    const ctx = gsap.context(() => {
      if (!reducedMotion) {
        gsap
          .timeline({ defaults: { ease: 'expo.out' } })
          .from('.hero-canvas', { autoAlpha: 0, scale: 1.15, duration: 3 }, 0)
          .from('.hero-title span', { yPercent: 40, autoAlpha: 0, duration: 1.6, stagger: 0.12 }, 0.3)
          .from('.hero-sub, .hero-by, .scroll-hint', { y: 16, autoAlpha: 0, duration: 1.2, stagger: 0.1 }, 0.9)
      }

      gsap
        .timeline({
          scrollTrigger: {
            trigger: root.current,
            start: 'top top',
            end: 'bottom bottom',
            scrub: 0.6,
            onUpdate: (s) => (progress.current = s.progress),
          },
        })
        .to('.scroll-hint', { autoAlpha: 0, duration: 0.03 }, 0)
        .to('.hero-copy', { scale: 0.86, autoAlpha: 0, duration: 0.14, ease: 'power1.in' }, 0.06)
        .fromTo('.beat-1', { autoAlpha: 0, y: 60 }, { autoAlpha: 1, y: 0, duration: 0.1 }, 0.28)
        .to('.hero-key', { autoAlpha: 1, duration: 0.1 }, 0.3)
        .to('.beat-1', { autoAlpha: 0, y: -60, duration: 0.08 }, 0.52)
        .fromTo('.beat-2', { autoAlpha: 0, y: 60 }, { autoAlpha: 1, y: 0, duration: 0.1 }, 0.64)
        .to({}, { duration: 0.26 })
    }, root)
    return () => ctx.revert()
  }, [ready])

  return (
    <section className="hero" id="inicio" ref={root}>
      <div className="sticky">
        <div className="hero-canvas">
          <Stage
            active={inView}
            camera={{ fov: 35, position: [0, 0, 6.4], near: 0.1, far: 100 }}
            bloom={{ intensity: 0.65, luminanceThreshold: 0.28, luminanceSmoothing: 0.35, radius: 0.6 }}
          >
            <color attach="background" args={['#000000']} />
            <Suspense fallback={null}>
              <Globe progress={progress} />
            </Suspense>
          </Stage>
        </div>
        <div className="hero-shade" />

        <div className="hero-copy">
          <h1 className="display hero-title">
            <span>Rusia.</span>
            <span>Ucrania.</span>
          </h1>
          <p className="hero-sub">Una guerra vista a través del mapeo de conflictos de Simon Fisher.</p>
          <p className="hero-by">{AUTHOR} · Universidad del Valle de Guatemala</p>
        </div>

        <div className="hero-beat beat-1">
          <p className="display">2014</p>
          <p>
            <b>La guerra no empezó en 2022.</b> Empezó con Crimea y el Donbás.
          </p>
        </div>
        <div className="hero-beat beat-2">
          <p className="display">2022</p>
          <p>
            <b>Invasión a gran escala.</b> Desde Rusia, Bielorrusia y Crimea.
          </p>
        </div>

        <div className="hero-key" aria-label="Leyenda del globo">
          <span>
            <i style={{ background: '#3d8bff' }} /> Ucrania
          </span>
          <span>
            <i style={{ background: '#ffd23f' }} /> Crimea, ocupada
          </span>
          <span>
            <i style={{ background: '#e0313f' }} /> Rusia
          </span>
          <span>
            <i style={{ background: '#b0414d' }} /> Bielorrusia
          </span>
        </div>

        <div className="scroll-hint" aria-hidden="true" />
      </div>
    </section>
  )
}
