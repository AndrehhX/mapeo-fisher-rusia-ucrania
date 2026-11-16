import credits from '../data/credits.json'

/** Texto de crédito corto para una imagen de /public/img. */
export function creditFor(src) {
  const slug = src.replace(/^.*\//, '').replace(/\.webp$/, '')
  const c = credits[slug]
  if (!c) return ''
  return `Foto: ${c.author} · ${c.license} · Wikimedia Commons`
}
