import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { bindUniforms } from './bindUniforms'

/**
 * Animaciones de ataque sobre el globo:
 *  - AttackArrow: flecha de mapa militar (cinta que se ensancha + punta) que avanza por la superficie.
 *  - Strike: misil con estela de fuego y humo, destello de lanzamiento e impacto en capas
 *    (flash, dos ondas expansivas, chispas y brasa).
 * Todo se dibuja con shaders propios para que los bordes sean suaves y brillen con el bloom.
 */

const DEG = Math.PI / 180
const smooth = (x) => x * x * (3 - 2 * x)
const clamp01 = (x) => Math.min(1, Math.max(0, x))

export function llDir(lat, lon) {
  const la = lat * DEG
  const lo = lon * DEG
  return new THREE.Vector3(Math.cos(la) * Math.sin(lo), Math.sin(la), Math.cos(la) * Math.cos(lo))
}

/** Punto sobre el arco de círculo máximo entre a y b (vectores unitarios), a radio r(u). */
function greatCircle(a, b, u, out) {
  const ang = a.angleTo(b)
  if (ang < 1e-6) return out.copy(a)
  const s = Math.sin(ang)
  return out
    .copy(a)
    .multiplyScalar(Math.sin((1 - u) * ang) / s)
    .addScaledVector(b, Math.sin(u * ang) / s)
}

/* ════════════════════════ Flecha ════════════════════════ */
const SHAFT = 44
const HEAD = 8
const RINGS = SHAFT + 1 + HEAD

const arrowVert = /* glsl */ `
  attribute vec2 aUv;      // x: avance 0..1 · y: lado -1..1
  attribute float aDist;   // distancia real desde la cola
  attribute float aHead;   // 1 en la punta
  varying vec2 vUv;
  varying float vDist;
  varying float vHead;
  void main() {
    vUv = aUv; vDist = aDist; vHead = aHead;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`
const arrowFrag = /* glsl */ `
  uniform float uTime;
  uniform float uOpacity;
  uniform float uDone;
  varying vec2 vUv;
  varying float vDist;
  varying float vHead;
  void main() {
    float side = abs(vUv.y);
    float edge = 1.0 - smoothstep(0.62, 1.0, side);           // borde suave
    float core = pow(1.0 - side, 3.0);                         // brillo central
    vec3 dark = vec3(0.35, 0.02, 0.05);
    vec3 red = vec3(1.0, 0.16, 0.2);
    vec3 col = mix(dark, red, smoothstep(0.0, 0.85, vUv.x));
    // galones que corren hacia la punta
    float f = fract(vDist * 22.0 - uTime * 1.6);
    float chevron = smoothstep(0.0, 0.12, f) * smoothstep(0.42, 0.22, f) * (1.0 - vHead);
    col += vec3(1.0, 0.45, 0.35) * chevron * 0.55 * smoothstep(0.1, 0.6, vUv.x);
    col += vec3(1.0, 0.55, 0.45) * core * (0.3 + vHead * 0.35);
    // la punta respira cuando la flecha ya llegó
    col *= 1.0 + vHead * (0.25 + 0.2 * sin(uTime * 4.0)) * uDone;
    float alpha = edge * smoothstep(0.0, 0.18, vUv.x) * uOpacity;
    gl_FragColor = vec4(col * 1.15, alpha);
  }
`

export function AttackArrow({ from, to, draw, index, radius }) {
  const mesh = useRef()
  const last = useRef(-1)
  const { a, b, L, geo, uniforms } = useMemo(() => {
    const a = llDir(...from)
    const b = llDir(...to)
    const L = a.angleTo(b) * radius
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(RINGS * 2 * 3), 3).setUsage(THREE.DynamicDrawUsage))
    g.setAttribute('aUv', new THREE.BufferAttribute(new Float32Array(RINGS * 2 * 2), 2).setUsage(THREE.DynamicDrawUsage))
    g.setAttribute('aDist', new THREE.BufferAttribute(new Float32Array(RINGS * 2), 1).setUsage(THREE.DynamicDrawUsage))
    const head = new Float32Array(RINGS * 2)
    for (let i = SHAFT + 1; i < RINGS; i++) head[i * 2] = head[i * 2 + 1] = 1
    g.setAttribute('aHead', new THREE.BufferAttribute(head, 1))
    const idx = []
    for (let i = 0; i < RINGS - 1; i++) {
      const k = i * 2
      idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2)
    }
    g.setIndex(idx)
    return { a, b, L, geo: g, uniforms: { uTime: { value: 0 }, uOpacity: { value: 0 }, uDone: { value: 0 } } }
  }, [from, to, radius])

  const tmp = useMemo(() => ({ p: new THREE.Vector3(), q: new THREE.Vector3(), t: new THREE.Vector3(), s: new THREE.Vector3() }), [])

  // Reconstruye la cinta para la longitud dibujada `e` (0..1): cola fina → cuerpo ancho → punta triangular
  const build = (e) => {
    const pos = geo.attributes.position.array
    const uv = geo.attributes.aUv.array
    const dist = geo.attributes.aDist.array
    const total = e * L
    const headLen = Math.min(0.065, total * 0.3)
    const shaftEnd = Math.max(0, e - headLen / L)
    const lift = (u) => radius * 1.004 + Math.sin(Math.PI * u) * 0.012
    for (let i = 0; i < RINGS; i++) {
      let u
      let w
      if (i <= SHAFT) {
        const k = i / SHAFT
        u = k * shaftEnd
        w = THREE.MathUtils.lerp(0.0025, 0.014, smooth(k))
      } else {
        const k = (i - SHAFT) / HEAD
        u = shaftEnd + k * (e - shaftEnd)
        w = THREE.MathUtils.lerp(0.035, 0.0003, k)
      }
      greatCircle(a, b, u, tmp.p).normalize()
      greatCircle(a, b, Math.min(1, u + 0.002), tmp.q).normalize()
      tmp.t.copy(tmp.q).sub(tmp.p).normalize()
      tmp.s.crossVectors(tmp.t, tmp.p).normalize()
      tmp.p.multiplyScalar(lift(u))
      const o = i * 6
      pos[o] = tmp.p.x + tmp.s.x * w
      pos[o + 1] = tmp.p.y + tmp.s.y * w
      pos[o + 2] = tmp.p.z + tmp.s.z * w
      pos[o + 3] = tmp.p.x - tmp.s.x * w
      pos[o + 4] = tmp.p.y - tmp.s.y * w
      pos[o + 5] = tmp.p.z - tmp.s.z * w
      const along = e > 0 ? u / e : 0
      uv[i * 4] = along
      uv[i * 4 + 1] = 1
      uv[i * 4 + 2] = along
      uv[i * 4 + 3] = -1
      dist[i * 2] = dist[i * 2 + 1] = u * L
    }
    geo.attributes.position.needsUpdate = true
    geo.attributes.aUv.needsUpdate = true
    geo.attributes.aDist.needsUpdate = true
    geo.computeBoundingSphere()
  }

  useFrame((s) => {
    const d = clamp01((draw.current - index * 0.14) / 0.6)
    const e = 1 - Math.pow(1 - d, 3)
    uniforms.uTime.value = s.clock.elapsedTime
    uniforms.uOpacity.value = d > 0 ? Math.min(1, d * 6) : 0
    uniforms.uDone.value = smooth(clamp01((d - 0.9) / 0.1))
    mesh.current.visible = d > 0
    if (d > 0 && Math.abs(e - last.current) > 1e-4) {
      last.current = e
      build(Math.max(e, 0.02))
    }
  })

  return (
    <mesh ref={mesh} geometry={geo} frustumCulled={false} renderOrder={5}>
      <shaderMaterial ref={bindUniforms(uniforms)} vertexShader={arrowVert} fragmentShader={arrowFrag} uniforms={uniforms} transparent depthWrite={false} side={THREE.DoubleSide} />
    </mesh>
  )
}

/* ════════════════════════ Misil ════════════════════════ */
const TRAIL = 34
const SPARKS = 14

const trailVert = /* glsl */ `
  attribute float aK;      // 0 = cabeza · 1 = final de la estela
  uniform float uPixel;
  uniform float uFade;
  varying float vK;
  void main() {
    vK = aK;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    float size = mix(5.0, 1.4, pow(aK, 0.7)) + aK * (1.0 - aK) * 7.0; // el humo se abre
    gl_PointSize = size * uPixel * (3.2 / -mv.z) * uFade;
    gl_Position = projectionMatrix * mv;
  }
`
const trailFrag = /* glsl */ `
  uniform float uOpacity;
  varying float vK;
  void main() {
    float d = length(gl_PointCoord - 0.5) * 2.0;
    if (d > 1.0) discard;
    float soft = pow(1.0 - d, 1.8);
    // blanco-amarillo → naranja → rojo → humo gris
    vec3 hot = vec3(1.0, 0.95, 0.8);
    vec3 fire = vec3(1.0, 0.45, 0.12);
    vec3 smoke = vec3(0.32, 0.28, 0.27);
    vec3 col = mix(hot, fire, smoothstep(0.0, 0.18, vK));
    col = mix(col, smoke, smoothstep(0.35, 0.9, vK));
    float a = soft * pow(1.0 - vK, 1.6) * uOpacity;
    gl_FragColor = vec4(col * (0.85 + (1.0 - vK) * 0.6), a * 0.9);
  }
`
// Disco en el plano tangente: onda, destello o brasa según el modo
const fxVert = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`
const ringFrag = /* glsl */ `
  uniform float uR;        // radio 0..1
  uniform float uW;        // grosor
  uniform float uAlpha;
  uniform vec3 uColor;
  varying vec2 vUv;
  void main() {
    float d = length(vUv - 0.5) * 2.0;
    float ring = smoothstep(uR - uW, uR, d) * (1.0 - smoothstep(uR, uR + uW * 0.6, d));
    gl_FragColor = vec4(uColor * 1.6, ring * uAlpha);
  }
`
const glowFrag = /* glsl */ `
  uniform float uAlpha;
  uniform vec3 uColor;
  uniform float uPow;
  varying vec2 vUv;
  void main() {
    float d = length(vUv - 0.5) * 2.0;
    float g = pow(max(1.0 - d, 0.0), uPow);
    gl_FragColor = vec4(uColor * (1.0 + g), g * uAlpha);
  }
`
const sparkFrag = /* glsl */ `
  uniform float uAlpha;
  void main() {
    float d = length(gl_PointCoord - 0.5) * 2.0;
    if (d > 1.0) discard;
    gl_FragColor = vec4(vec3(1.0, 0.75, 0.4) * 1.8, pow(1.0 - d, 2.0) * uAlpha);
  }
`
const sparkVert = /* glsl */ `
  uniform float uPixel;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = 2.2 * uPixel * (3.2 / -mv.z);
    gl_Position = projectionMatrix * mv;
  }
`

const additive = { transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }

function makeUniforms(extra) {
  return Object.fromEntries(Object.entries(extra).map(([k, v]) => [k, { value: v }]))
}

export function Strike({ from, to, opacity, offset, period, radius }) {
  const trail = useRef()
  const sparks = useRef()
  const fx = useRef()
  const launch = useRef()

  const S = useMemo(() => {
    const a = llDir(...from)
    const b = llDir(...to)
    const ang = a.angleTo(b)
    const height = 0.05 + ang * radius * 0.42
    const at = (u, out) => greatCircle(a, b, u, out).normalize().multiplyScalar(radius * 1.004 + Math.sin(Math.PI * u) * height)

    const trailGeo = new THREE.BufferGeometry()
    trailGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(TRAIL * 3), 3).setUsage(THREE.DynamicDrawUsage))
    trailGeo.setAttribute('aK', new THREE.BufferAttribute(Float32Array.from({ length: TRAIL }, (_, i) => i / (TRAIL - 1)), 1))

    const dirs = Array.from({ length: SPARKS }, (_, i) => {
      const ang2 = (i / SPARKS) * Math.PI * 2 + Math.random() * 0.4
      return { x: Math.cos(ang2), y: Math.sin(ang2), v: 0.6 + Math.random() * 0.8 }
    })
    const sparkGeo = new THREE.BufferGeometry()
    sparkGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(SPARKS * 3), 3).setUsage(THREE.DynamicDrawUsage))

    const end = b.clone().multiplyScalar(radius * 1.003)
    const start = a.clone().multiplyScalar(radius * 1.003)
    const q = (v) => new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), v.clone().normalize())
    return {
      at,
      trailGeo,
      sparkGeo,
      dirs,
      end,
      start,
      qEnd: q(b),
      qStart: q(a),
      u: {
        trail: makeUniforms({ uOpacity: 0, uPixel: 1, uFade: 1 }),
        flash: makeUniforms({ uAlpha: 0, uColor: new THREE.Color('#ffe2b8'), uPow: 2.4 }),
        ember: makeUniforms({ uAlpha: 0, uColor: new THREE.Color('#ff5a1f'), uPow: 1.6 }),
        ring1: makeUniforms({ uR: 0, uW: 0.08, uAlpha: 0, uColor: new THREE.Color('#ffb070') }),
        ring2: makeUniforms({ uR: 0, uW: 0.05, uAlpha: 0, uColor: new THREE.Color('#ff5a3c') }),
        spark: makeUniforms({ uAlpha: 0, uPixel: 1 }),
        launch: makeUniforms({ uAlpha: 0, uColor: new THREE.Color('#ffc9a0'), uPow: 2.0 }),
      },
    }
  }, [from, to, radius])

  const tmp = useMemo(() => new THREE.Vector3(), [])

  useFrame((s) => {
    const o = opacity.current
    const px = Math.min(s.viewport.dpr, 2)
    S.u.trail.uPixel.value = px
    S.u.spark.uPixel.value = px
    const visible = o > 0.001
    trail.current.visible = sparks.current.visible = fx.current.visible = launch.current.visible = visible
    if (!visible) return

    const t = ((s.clock.elapsedTime + offset) % period) / period
    const FLY = 0.42
    const fly = clamp01(t / FLY)
    const e = fly < 1 ? fly * fly * (3 - 2 * fly) * 0.15 + fly * 0.85 : 1 // acelera al final
    const hit = clamp01((t - FLY) / (1 - FLY))

    // ── Estela: posiciones de la cabeza en instantes anteriores
    const arr = S.trailGeo.attributes.position.array
    for (let i = 0; i < TRAIL; i++) {
      const u = Math.max(0, e - i * 0.0105)
      S.at(Math.min(u, 1), tmp)
      arr[i * 3] = tmp.x
      arr[i * 3 + 1] = tmp.y
      arr[i * 3 + 2] = tmp.z
    }
    S.trailGeo.attributes.position.needsUpdate = true
    // tras el impacto la estela se consume
    S.u.trail.uOpacity.value = o * (fly < 1 ? 1 : Math.max(0, 1 - hit * 4))
    S.u.trail.uFade.value = fly < 1 ? 1 : Math.max(0.2, 1 - hit * 2)

    // ── Destello de lanzamiento
    const l = clamp01(t / 0.06)
    S.u.launch.uAlpha.value = o * (t < 0.12 ? Math.sin(l * Math.PI) * 0.9 + (t < 0.06 ? 0 : Math.max(0, 0.3 - (t - 0.06) * 5)) : 0)
    launch.current.scale.setScalar(0.5 + l * 0.8)

    // ── Impacto en capas
    const h1 = clamp01(hit / 0.18) // flash rápido
    S.u.flash.uAlpha.value = o * (hit > 0 ? (h1 < 1 ? h1 : Math.max(0, 1 - (hit - 0.18) * 4)) : 0)
    fx.current.children[0].scale.setScalar(0.4 + smooth(h1) * 0.9)
    S.u.ring1.uR.value = Math.pow(hit, 0.55) * 0.95
    S.u.ring1.uAlpha.value = o * (hit > 0 ? Math.pow(1 - hit, 1.6) : 0)
    const h2 = clamp01((hit - 0.12) / 0.88)
    S.u.ring2.uR.value = Math.pow(h2, 0.6) * 0.95
    S.u.ring2.uAlpha.value = o * (h2 > 0 ? Math.pow(1 - h2, 2) * 0.8 : 0)
    S.u.ember.uAlpha.value = o * (hit > 0 ? Math.sin(Math.min(1, hit * 1.4) * Math.PI) * 0.8 * (0.85 + Math.sin(s.clock.elapsedTime * 22) * 0.15) : 0)

    // ── Chispas que salen disparadas sobre el plano tangente
    const sp = S.sparkGeo.attributes.position.array
    const r = smooth(clamp01(hit / 0.5)) * 0.042
    S.dirs.forEach((d, i) => {
      sp[i * 3] = d.x * r * d.v
      sp[i * 3 + 1] = d.y * r * d.v
      sp[i * 3 + 2] = Math.sin(clamp01(hit / 0.5) * Math.PI) * 0.012 * d.v
    })
    S.sparkGeo.attributes.position.needsUpdate = true
    S.u.spark.uAlpha.value = o * (hit > 0 ? Math.pow(1 - clamp01(hit / 0.55), 1.4) : 0)
  })

  return (
    <group>
      <points ref={trail} geometry={S.trailGeo} frustumCulled={false} renderOrder={6}>
        <shaderMaterial ref={bindUniforms(S.u.trail)} vertexShader={trailVert} fragmentShader={trailFrag} uniforms={S.u.trail} {...additive} />
      </points>
      <group ref={launch} position={S.start} quaternion={S.qStart}>
        <mesh>
          <planeGeometry args={[0.04, 0.04]} />
          <shaderMaterial ref={bindUniforms(S.u.launch)} vertexShader={fxVert} fragmentShader={glowFrag} uniforms={S.u.launch} {...additive} />
        </mesh>
      </group>
      <group ref={fx} position={S.end} quaternion={S.qEnd}>
        <mesh renderOrder={7}>
          <planeGeometry args={[0.06, 0.06]} />
          <shaderMaterial ref={bindUniforms(S.u.flash)} vertexShader={fxVert} fragmentShader={glowFrag} uniforms={S.u.flash} {...additive} />
        </mesh>
        <mesh renderOrder={7}>
          <planeGeometry args={[0.12, 0.12]} />
          <shaderMaterial ref={bindUniforms(S.u.ring1)} vertexShader={fxVert} fragmentShader={ringFrag} uniforms={S.u.ring1} {...additive} />
        </mesh>
        <mesh renderOrder={7}>
          <planeGeometry args={[0.08, 0.08]} />
          <shaderMaterial ref={bindUniforms(S.u.ring2)} vertexShader={fxVert} fragmentShader={ringFrag} uniforms={S.u.ring2} {...additive} />
        </mesh>
        <mesh renderOrder={7}>
          <planeGeometry args={[0.035, 0.035]} />
          <shaderMaterial ref={bindUniforms(S.u.ember)} vertexShader={fxVert} fragmentShader={glowFrag} uniforms={S.u.ember} {...additive} />
        </mesh>
        <points ref={sparks} geometry={S.sparkGeo} frustumCulled={false}>
          <shaderMaterial ref={bindUniforms(S.u.spark)} vertexShader={sparkVert} fragmentShader={sparkFrag} uniforms={S.u.spark} {...additive} />
        </points>
      </group>
    </group>
  )
}
