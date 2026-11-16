/**
 * Genera la nube de puntos del globo (public/globe.bin).
 * Fuente cartográfica: Natural Earth 1:50m (dominio público) vía world-atlas.
 *
 * Natural Earth dibuja Crimea dentro de Rusia (control de facto). Este proyecto
 * sigue las fronteras reconocidas internacionalmente (Res. ONU 68/262, 2014):
 * los puntos de la península se marcan como "Crimea — territorio ucraniano ocupado".
 *
 * Uso: node scripts/build-globe.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { feature } from 'topojson-client'
import { geoContains, geoBounds } from 'd3-geo'

const load = (f) => JSON.parse(readFileSync(new URL(`../node_modules/world-atlas/${f}`, import.meta.url)))
const w50 = load('countries-50m.json')
const w110 = load('countries-110m.json')
const countries = feature(w50, w50.objects.countries).features
const byName = (n) => countries.find((f) => f.properties.name === n)

// Tierra global a 1:110m, con prefiltro por caja envolvente de cada país (rápido)
const coarse = feature(w110, w110.objects.countries).features.map((f) => {
  const [[x0, y0], [x1, y1]] = geoBounds(f)
  return { f, x0, y0, x1, y1, wrap: x0 > x1 }
})
const onLand = (lon, lat) =>
  coarse.some(({ f, x0, y0, x1, y1, wrap }) =>
    lat >= y0 && lat <= y1 && (wrap ? lon >= x0 || lon <= x1 : lon >= x0 && lon <= x1) && geoContains(f, [lon, lat]))
const UA = byName('Ukraine')
const RU = byName('Russia')
const BY = byName('Belarus')

// Tipos: 0 tierra · 1 Ucrania · 2 Rusia · 3 Crimea (ocupada) · 4 Bielorrusia
const isCrimea = (lon, lat) => lon > 32.4 && lon < 36.62 && lat > 44.3 && lat < 46.25

const inBox = (lon, lat) => lon > 19 && lon < 60 && lat > 40 && lat < 60
function classify(lon, lat) {
  if (!inBox(lon, lat)) {
    if (!onLand(lon, lat)) return -1
    return geoContains(RU, [lon, lat]) ? 2 : 0
  }
  if (geoContains(UA, [lon, lat])) return 1
  if (geoContains(RU, [lon, lat])) return isCrimea(lon, lat) ? 3 : 2
  if (geoContains(BY, [lon, lat])) return 4
  return onLand(lon, lat) ? 0 : -1
}

const out = []
const push = (lat, lon, t) => out.push(Math.round(lat * 100) / 100, Math.round(lon * 100) / 100, t)

// 1) Malla global uniforme (espiral de Fibonacci)
const N = 70000
const golden = Math.PI * (3 - Math.sqrt(5))
for (let i = 0; i < N; i++) {
  const y = 1 - (i / (N - 1)) * 2
  const lat = (Math.asin(y) * 180) / Math.PI
  const lon = ((((i * golden * 180) / Math.PI) % 360) + 540) % 360 - 180
  const t = classify(lon, lat)
  if (t === 1 || t === 3) continue // Ucrania y Crimea se muestrean más denso abajo
  if (t >= 0) push(lat, lon, t)
}

// 2) Ucrania (incl. Crimea) en alta densidad
for (let lat = 44.2; lat <= 52.5; lat += 0.16) {
  for (let lon = 22.0; lon <= 40.3; lon += 0.16 / Math.cos((lat * Math.PI) / 180)) {
    const t = classify(lon, lat)
    if (t === 1 || t === 3) push(lat, lon, t)
  }
}

// Binario compacto: Int16 [lat×100, lon×100, tipo] — se descarga aparte del bundle JS
const bin = Int16Array.from(out.map((v, i) => (i % 3 === 2 ? v : Math.round(v * 100))))
writeFileSync(new URL('../public/globe.bin', import.meta.url), Buffer.from(bin.buffer))
const counts = [0, 0, 0, 0, 0]
for (let i = 2; i < out.length; i += 3) counts[out[i]]++
console.log('puntos:', out.length / 3, '· por tipo [tierra, UA, RU, Crimea, BY]:', counts)
