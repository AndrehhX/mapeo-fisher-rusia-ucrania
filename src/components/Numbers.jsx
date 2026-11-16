import { useEffect, useRef } from 'react'
import { gsap, reducedMotion } from '../lib/motion'
import { NUMBERS } from '../data/content'

/** Formato del informe: punto de miles y coma decimal (2.105 · 5,7). */
const fmt = (n, d = 0) => {
  const [i, dec] = n.toFixed(d).split('.')
  const int = i.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return dec ? `${int},${dec}` : int
}

/** Tres cifras, una por pantalla. El número cuenta con el scroll mientras la foto aparece detrás. */
export default function Numbers({ ready }) {
  const root = useRef()

  useEffect(() => {
    if (!ready) return
    const ctx = gsap.context(() => {
      const slides = gsap.utils.toArray('.num-slide')
      const imgs = gsap.utils.toArray('.num-bg img')
      const tl = gsap.timeline({
        scrollTrigger: { trigger: root.current, start: 'top top', end: 'bottom bottom', scrub: reducedMotion ? true : 0.7 },
      })
      slides.forEach((slide, i) => {
        const item = NUMBERS[i]
        const el = slide.querySelector('.n')
        const o = { v: 0 }
        const at = i
        // La primera cifra ya está en pantalla al llegar a la sección; las demás entran con el scroll
        if (i === 0) gsap.set([slide, imgs[i]], { autoAlpha: 1 })
        else tl.fromTo(slide, { autoAlpha: 0, scale: 0.92 }, { autoAlpha: 1, scale: 1, duration: 0.25, ease: 'power2.out' }, at)
        const count = { v: item.value, ease: 'power2.out', onUpdate: () => (el.textContent = fmt(o.v, item.decimals || 0)) }
        tl.fromTo(imgs[i], { opacity: i === 0 ? 0.25 : 0, scale: 1.15 }, { opacity: 0.5, scale: 1, duration: 0.9, ease: 'none' }, at)
        // La primera cifra cuenta mientras la sección entra en pantalla
        if (i === 0) gsap.fromTo(o, { v: 0 }, { ...count, scrollTrigger: { trigger: root.current, start: 'top 85%', end: 'top top', scrub: 0.7 } })
        else tl.fromTo(o, { v: 0 }, { ...count, duration: 0.55 }, at)
        if (i < slides.length - 1) {
          tl.to(slide, { autoAlpha: 0, scale: 1.06, duration: 0.2, ease: 'power2.in' }, at + 0.8).to(imgs[i], { opacity: 0, duration: 0.2 }, at + 0.8)
        }
      })
    }, root)
    return () => ctx.revert()
  }, [ready])

  return (
    <section className="numbers" id="cifras" ref={root} style={{ height: `${NUMBERS.length * 110 + 60}vh` }}>
      <div className="sticky">
        <div className="num-bg" aria-hidden="true">
          {NUMBERS.map((n) => (
            <img key={n.img} src={n.img} alt="" loading="lazy" decoding="async" />
          ))}
        </div>
        {NUMBERS.map((n) => (
          <div className="num-slide" key={n.label}>
            <div className="num-value">
              {n.prefix && <span className="pre">{n.prefix}</span>}
              <span className="n">{fmt(0, n.decimals || 0)}</span>
              {n.unit && <small>{n.unit}</small>}
            </div>
            <div className="num-label">{n.label}</div>
            <p className="num-note">{n.note}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
