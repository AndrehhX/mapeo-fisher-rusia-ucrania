import { use, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Html, Line } from '@react-three/drei'
import * as THREE from 'three'
import { AttackArrow, Strike } from './Attacks'
import { bindUniforms } from './bindUniforms'

// Nube de puntos en binario (Int16: lat×100, lon×100, tipo). Se descarga en paralelo al JS
// y no infla el bundle; <Suspense> en el Hero espera a que llegue.
export const pointsPromise =
  typeof window !== 'undefined'
    ? fetch(new URL('globe.bin', document.baseURI)).then((r) => r.arrayBuffer()).then((b) => new Int16Array(b))
    : null

const R = 2
const DEG = Math.PI / 180

/** lat/lon → vector. lon 0 / lat 0 mira hacia +Z (la cámara). Este a la derecha. */
export function llToVec(lat, lon, r = R) {
  const la = lat * DEG
  const lo = lon * DEG
  return new THREE.Vector3(r * Math.cos(la) * Math.sin(lo), r * Math.sin(la), r * Math.cos(la) * Math.cos(lo))
}

// Tipos: 0 tierra · 1 Ucrania · 2 Rusia · 3 Crimea · 4 Bielorrusia
const TYPE_COLOR = [
  new THREE.Color('#5d6470'),
  new THREE.Color('#3d8bff'),
  new THREE.Color('#e0313f'),
  new THREE.Color('#e8b923'),
  new THREE.Color('#b0414d'),
]
const TYPE_SIZE = [1, 1.45, 1.05, 1.15, 1.1]

const CITIES = {
  kyiv: { lat: 50.45, lon: 30.52, label: 'Kyiv', color: '#ffd23f' },
  moscow: { lat: 55.75, lon: 37.62, label: 'Moscú', color: '#ff5a66' },
  minsk: { lat: 53.9, lon: 27.56, label: 'Minsk', color: '#d06a74' },
  crimea: { lat: 45.0, lon: 34.1, label: 'Crimea (ocupada)', color: '#ffd23f' },
  washington: { lat: 38.9, lon: -77.04, label: 'Washington', color: '#7fb2ff' },
  brussels: { lat: 50.85, lon: 4.35, label: 'Bruselas', color: '#5fd0ff' },
  abudhabi: { lat: 24.45, lon: 54.38, label: 'Abu Dabi', color: '#ffffff' },
}

// Arcos globales (fase 1) y ejes de invasión (fase 2)
const ARCS = [
  { from: 'washington', to: 'kyiv', color: '#7fb2ff', lift: 0.9 },
  { from: 'brussels', to: 'kyiv', color: '#5fd0ff', lift: 0.35 },
  { from: 'abudhabi', to: 'kyiv', color: '#ffffff', lift: 0.45, dashed: true },
  { from: 'abudhabi', to: 'moscow', color: '#ffffff', lift: 0.5, dashed: true },
]
// 2014: ocupación de Crimea y guerra en el Donbás
const ARROWS_2014 = [
  { from: [44.4, 41.6], to: [45.15, 34.6] }, // hacia Crimea
  { from: [46.6, 44.6], to: [47.95, 37.95] }, // hacia Donetsk
  { from: [50.6, 44.2], to: [48.6, 39.4] }, // hacia Luhansk
]
// 2022: los cuatro ejes de la invasión a gran escala
const AXES = [
  { from: [53.3, 27.6], to: [50.75, 30.3] }, // desde Bielorrusia hacia Kyiv
  { from: [52.4, 38.0], to: [50.2, 36.2] }, // hacia Járkiv
  { from: [48.7, 41.8], to: [48.1, 37.85] }, // hacia el Donbás
  { from: [45.2, 34.3], to: [46.8, 32.6] }, // desde Crimea hacia Jersón
]
// Ataques de largo alcance (ilustrativos): punto de lanzamiento → ciudad
const STRIKES = [
  { from: [53.25, 34.37], to: [50.45, 30.52], label: 'Kyiv' },
  { from: [50.6, 36.6], to: [49.99, 36.23], label: 'Járkiv' },
  { from: [44.6, 33.4], to: [46.48, 30.73], label: 'Odesa' },
  { from: [47.24, 39.7], to: [48.46, 35.05], label: 'Dnipró' },
  { from: [44.4, 35.6], to: [47.84, 35.14], label: 'Zaporiyia' },
  { from: [51.73, 36.19], to: [49.84, 24.03], label: 'Leópolis' },
]

function arcPoints(a, b, lift, n = 64) {
  const mid = a.clone().add(b).multiplyScalar(0.5)
  mid.setLength(R + lift)
  const curve = new THREE.QuadraticBezierCurve3(a, mid, b)
  return curve.getPoints(n)
}

const pointVert = /* glsl */ `
  attribute vec3 aColor;
  attribute float aSize;
  attribute float aType;
  uniform float uTime;
  uniform float uPixel;
  uniform float uFocus;
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    // Atenuar puntos de la cara posterior del globo
    vec3 n = normalize(normalMatrix * normalize(position));
    float facing = smoothstep(-0.15, 0.35, dot(n, normalize(-mv.xyz)));
    float hot = step(0.5, aType) * step(aType, 1.5) + step(2.5, aType) * step(aType, 3.5);
    float tw = 0.75 + 0.25 * sin(uTime * 2.0 + position.x * 9.0 + position.y * 7.0);
    vColor = aColor;
    float base = aType < 0.5 ? mix(0.55, 0.28, uFocus) : 1.0;
    vAlpha = facing * base * mix(1.0, tw, hot);
    gl_PointSize = aSize * uPixel * (1.0 + hot * uFocus * 0.2) * (5.2 / -mv.z);
    gl_Position = projectionMatrix * mv;
  }
`
const pointFrag = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c);
    if (d > 0.5) discard;
    float a = smoothstep(0.5, 0.1, d);
    gl_FragColor = vec4(vColor * (0.9 + 0.6 * (1.0 - d * 2.0)), a * vAlpha);
  }
`
const atmoVert = /* glsl */ `
  varying vec3 vN;
  varying vec3 vV;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vN = normalize(normalMatrix * normal);
    vV = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`
const atmoFrag = /* glsl */ `
  varying vec3 vN;
  varying vec3 vV;
  uniform vec3 uColor;
  uniform float uPower;
  void main() {
    float f = pow(1.0 - abs(dot(vN, vV)), uPower);
    gl_FragColor = vec4(uColor, f * 0.9);
  }
`

function Points({ focus }) {
  const { gl } = useThree()
  const mat = useRef()
  const raw = use(pointsPromise)
  const geo = useMemo(() => {
    const n = raw.length / 3
    const pos = new Float32Array(n * 3)
    const col = new Float32Array(n * 3)
    const size = new Float32Array(n)
    const type = new Float32Array(n)
    for (let i = 0; i < n; i++) {
      const t = raw[i * 3 + 2]
      const v = llToVec(raw[i * 3] / 100, raw[i * 3 + 1] / 100, R * 1.001)
      pos[i * 3] = v.x
      pos[i * 3 + 1] = v.y
      pos[i * 3 + 2] = v.z
      const c = TYPE_COLOR[t]
      col[i * 3] = c.r
      col[i * 3 + 1] = c.g
      col[i * 3 + 2] = c.b
      size[i] = TYPE_SIZE[t] * (t === 1 ? 0.62 : 1)
      type[i] = t
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    g.setAttribute('aColor', new THREE.BufferAttribute(col, 3))
    g.setAttribute('aSize', new THREE.BufferAttribute(size, 1))
    g.setAttribute('aType', new THREE.BufferAttribute(type, 1))
    return g
  }, [raw])
  const uniforms = useMemo(
    () => ({ uTime: { value: 0 }, uPixel: { value: Math.min(gl.getPixelRatio(), 2) * 2.4 }, uFocus: { value: 0 } }),
    [gl],
  )
  useFrame((s) => {
    uniforms.uTime.value = s.clock.elapsedTime
    // el tamaño del punto sigue al DPR adaptativo
    uniforms.uPixel.value = Math.min(s.viewport.dpr, 2) * 2.4
    uniforms.uFocus.value += (focus.current - uniforms.uFocus.value) * 0.08
  })
  return (
    <points geometry={geo}>
      <shaderMaterial
        ref={bindUniforms(uniforms)}
        vertexShader={pointVert}
        fragmentShader={pointFrag}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
}

function Arc({ pts, color, dashed, opacity }) {
  const ref = useRef()
  const comet = useRef()
  useFrame((_, dt) => {
    const o = opacity.current
    if (ref.current) ref.current.material.opacity = o * (dashed ? 0.5 : 0.35)
    if (comet.current) {
      comet.current.material.dashOffset -= dt * 0.9
      comet.current.material.opacity = o
    }
  })
  return (
    <group>
      <Line ref={ref} points={pts} color={color} lineWidth={1} transparent dashed={dashed} dashSize={0.05} gapSize={0.05} />
      <Line ref={comet} points={pts} color={color} lineWidth={2.4} transparent dashed dashSize={0.5} gapSize={2.6} />
    </group>
  )
}

function Marker({ city, opacity, size = 1 }) {
  const ring = useRef()
  const dot = useRef()
  const label = useRef()
  const lastOp = useRef(-1)
  const pos = useMemo(() => llToVec(city.lat, city.lon, R * 1.004), [city])
  const quat = useMemo(() => new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), pos.clone().normalize()), [pos])
  const tmp = useMemo(() => new THREE.Vector3(), [])
  const n = useMemo(() => new THREE.Vector3(), [])
  useFrame((s) => {
    const t = (s.clock.elapsedTime * 0.6 + city.lat * 0.01) % 1
    const o = opacity.current
    if (ring.current) {
      ring.current.scale.setScalar(size * (0.4 + t * 1.6))
      ring.current.material.opacity = (1 - t) * o
    }
    if (dot.current) dot.current.material.opacity = o
    if (label.current) {
      ring.current.getWorldPosition(tmp)
      n.copy(tmp).normalize()
      const facing = n.dot(tmp.clone().sub(s.camera.position).normalize().negate())
      const v = Math.round(Math.max(0, Math.min(1, (facing - 0.15) * 4)) * o * 100) / 100
      if (v !== lastOp.current) {
        lastOp.current = v
        label.current.style.opacity = String(v)
      }
    }
  })
  return (
    <group position={pos} quaternion={quat}>
      <mesh ref={ring}>
        <ringGeometry args={[0.035, 0.045, 48]} />
        <meshBasicMaterial color={city.color} transparent depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh ref={dot}>
        <circleGeometry args={[0.014 * size, 20]} />
        <meshBasicMaterial color={city.color} transparent />
      </mesh>
      <Html center style={{ pointerEvents: 'none' }} zIndexRange={[10, 0]}>
        <div ref={label} className="mono" style={{ fontSize: 10, color: city.color, whiteSpace: 'nowrap', transform: 'translate(52%, -120%)', textShadow: '0 1px 8px #000', opacity: 0 }}>
          {city.label}
        </div>
      </Html>
    </group>
  )
}

/**
 * Globo de puntos. `progress` (ref 0..1) llega del scroll del hero:
 * 0 → giro libre y arcos globales · 0.35 → Ucrania al frente · 1 → acercamiento + ejes de invasión.
 */
export default function Globe({ progress }) {
  const group = useRef()
  const focus = useRef(0)
  const globalOp = useRef(1)
  const localOp = useRef(0)
  const { camera, size } = useThree()

  const arcs = useMemo(() => ARCS.map((a) => ({ ...a, pts: arcPoints(llToVec(CITIES[a.from].lat, CITIES[a.from].lon), llToVec(CITIES[a.to].lat, CITIES[a.to].lon), a.lift) })), [])
  const draw14 = useRef(0)
  const draw22 = useRef(0)
  const strikeOp = useRef(0)

  const target = { y: -30.5 * DEG, x: 48.5 * DEG }
  const idle = useRef(-60 * DEG)

  useFrame((s, dt) => {
    const p = progress.current
    idle.current += dt * 0.07
    // ángulo libre más cercano al objetivo (evita giros completos al interpolar)
    let free = idle.current
    while (free - target.y > Math.PI) free -= Math.PI * 2
    while (free - target.y < -Math.PI) free += Math.PI * 2
    const k = THREE.MathUtils.smoothstep(p, 0.08, 0.42)
    const g = group.current
    g.rotation.y = THREE.MathUtils.lerp(free, target.y, k)
    g.rotation.x = THREE.MathUtils.lerp(0.32, target.x, k)

    const portrait = size.width < size.height
    const far = portrait ? 11.5 : 8.2
    const near = portrait ? 4.4 : 3.1
    // Dos acercamientos: a la región para 2014 (Crimea y Donbás) y más cerca para 2022
    const mid = portrait ? 5.8 : 3.9
    const z1 = THREE.MathUtils.lerp(far, mid, THREE.MathUtils.smoothstep(p, 0.12, 0.42))
    const z = THREE.MathUtils.lerp(z1, near, THREE.MathUtils.smoothstep(p, 0.55, 0.9))
    // Al inicio el globo asoma por abajo como un horizonte; luego sube al centro
    const yOff = THREE.MathUtils.lerp(portrait ? 1.6 : 1.55, 0, THREE.MathUtils.smoothstep(p, 0.05, 0.4))
    camera.position.set(Math.sin(s.clock.elapsedTime * 0.2) * 0.04, yOff + Math.cos(s.clock.elapsedTime * 0.17) * 0.03, z)
    camera.lookAt(0, yOff, 0)

    focus.current = k
    globalOp.current = 1 - THREE.MathUtils.smoothstep(p, 0.25, 0.45)
    localOp.current = THREE.MathUtils.smoothstep(p, 0.3, 0.5)
    // 2014: se dibujan y se retiran al pasar a 2022 para no amontonarse con los ejes de la invasión
    draw14.current = Math.min(THREE.MathUtils.clamp((p - 0.3) / 0.16, 0, 1.3), THREE.MathUtils.clamp((0.63 - p) / 0.07, 0, 1.3))
    draw22.current = THREE.MathUtils.clamp((p - 0.6) / 0.16, 0, 1.4)
    strikeOp.current = THREE.MathUtils.smoothstep(p, 0.7, 0.8)
  })

  return (
    <group ref={group}>
      <mesh>
        <sphereGeometry args={[R * 0.995, 64, 64]} />
        <meshBasicMaterial color="#07090d" />
      </mesh>
      <mesh scale={1.12}>
        <sphereGeometry args={[R, 64, 64]} />
        <shaderMaterial
          vertexShader={atmoVert}
          fragmentShader={atmoFrag}
          uniforms={{ uColor: { value: new THREE.Color('#3d6fd8') }, uPower: { value: 3.2 } }}
          transparent
          side={THREE.BackSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      <Points focus={focus} />
      {arcs.map((a, i) => (
        <Arc key={i} pts={a.pts} color={a.color} dashed={a.dashed} opacity={globalOp} />
      ))}
      {ARROWS_2014.map((a, i) => (
        <AttackArrow key={'a14' + i} from={a.from} to={a.to} draw={draw14} index={i} radius={R} />
      ))}
      {AXES.map((a, i) => (
        <AttackArrow key={'a22' + i} from={a.from} to={a.to} draw={draw22} index={i} radius={R} />
      ))}
      {STRIKES.map((st, i) => (
        <Strike key={st.label} from={st.from} to={st.to} opacity={strikeOp} offset={i * 0.83} period={3.6 + (i % 3) * 0.7} radius={R} />
      ))}
      {['washington', 'brussels', 'abudhabi'].map((c) => (
        <Marker key={c} city={CITIES[c]} opacity={globalOp} />
      ))}
      {['kyiv', 'moscow', 'minsk', 'crimea'].map((c) => (
        <Marker key={c} city={CITIES[c]} opacity={localOp} size={0.55} />
      ))}
    </group>
  )
}
