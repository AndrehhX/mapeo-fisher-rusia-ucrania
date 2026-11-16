import { useEffect, useState } from 'react'

/** true mientras el elemento está cerca del viewport — para pausar escenas WebGL fuera de pantalla. */
export function useInView(ref, rootMargin = '200px') {
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { rootMargin })
    io.observe(el)
    return () => io.disconnect()
  }, [ref, rootMargin])
  return inView
}
