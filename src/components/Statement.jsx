import { useEffect, useMemo, useRef } from 'react'
import { ScrollTrigger } from '../lib/motion'
import { STATEMENT } from '../data/content'

/** Párrafo que se ilumina palabra por palabra mientras se hace scroll. */
export default function Statement({ ready }) {
  const root = useRef()
  const words = useMemo(() => STATEMENT.split(' '), [])

  useEffect(() => {
    if (!ready) return
    const spans = root.current.querySelectorAll('.w')
    let last = -1
    const st = ScrollTrigger.create({
      trigger: root.current,
      start: 'top top',
      end: 'bottom bottom',
      onUpdate: (s) => {
        const n = Math.min(spans.length, Math.round(s.progress * 1.15 * spans.length))
        if (n === last) return
        const [lo, hi] = n > last ? [Math.max(last, 0), n] : [n, last]
        for (let i = lo; i < hi; i++) spans[i].classList.toggle('on', i < n)
        last = n
      },
    })
    return () => st.kill()
  }, [ready])

  return (
    <section className="statement" id="idea" ref={root}>
      <div className="sticky">
        <div className="statement-inner">
          <p className="statement-text">
            {words.map((w, i) => (
              <span key={i} className="w">
                {w}{' '}
              </span>
            ))}
          </p>
          <p className="statement-cite">Fisher et al., Trabajando con el conflicto, 2010</p>
        </div>
      </div>
    </section>
  )
}
