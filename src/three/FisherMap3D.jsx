import { memo, Suspense, use, useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Billboard, Html, Line, OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { bindUniforms } from './bindUniforms'
import gsap from 'gsap'
import { ACTORS, ISSUE_BOXES, RELATIONS } from '../data/content'
import { pointsPromise } from './Globe'

export const byId = Object.fromEntries(ACTORS.map((a) => [a.id, a]))
export const radiusOf = (a) => (a.self ? 0.26 : 0.3 + a.power * 0.62)

export const REL_COLORS = {
  zigzag: '#ff9f0a',
  line: '#c9c6bf',
  dotted: '#9fb3c8',
  double: '#e9e5dc',
  arrow: null, // color del actor de origen
  broken: '#c9c6bf',
}

/* ───────── Shaders ───────── */
const sphereVert = /* glsl */ `
  varying vec3 vN;
  varying vec3 vV;
  varying vec3 vW;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vN = normalize(normalMatrix * normal);
    vV = normalize(-mv.xyz);
    vW = normalize(position);
    gl_Position = projectionMatrix * mv;
  }
`
// Esfera sombreada (como las del libro) pero luminosa: núcleo oscuro, luz superior-izquierda y borde fresnel.
const sphereFrag = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  uniform float uHot;
  varying vec3 vN;
  varying vec3 vV;
  varying vec3 vW;
  void main() {
    vec3 L = normalize(vec3(-0.5, 0.7, 0.6));
    float diff = max(dot(vN, L), 0.0);
    float fres = pow(1.0 - max(dot(vN, vV), 0.0), 2.4);
    vec3 H = normalize(L + vV);
    float spec = pow(max(dot(vN, H), 0.0), 48.0);
    vec3 col = uColor * (0.1 + diff * 0.55) + uColor * fres * (1.3 + uHot) + vec3(spec * 0.55);
    gl_FragColor = vec4(col, uOpacity);
  }
`
const glowFrag = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  varying vec2 vUv;
  void main() {
    float d = length(vUv - 0.5) * 2.0;
    float a = pow(max(1.0 - d, 0.0), 2.6);
    gl_FragColor = vec4(uColor, a * uOpacity);
  }
`
const uvVert = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`
// Sombra extendida de actores externos (Fisher): gradiente radial oscuro con borde tenue
const shadowFrag = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  varying vec2 vUv;
  void main() {
    float d = length(vUv - 0.5) * 2.0;
    if (d > 1.0) discard;
    float body = pow(smoothstep(1.0, 0.0, d), 1.6) * 0.22;
    float ang = atan(vUv.y - 0.5, vUv.x - 0.5);
    float dash = step(0.5, fract(ang * 18.0 / 6.2831));
    float rim = smoothstep(0.975, 0.99, d) * smoothstep(1.0, 0.99, d) * 0.55 * dash;
    gl_FragColor = vec4(uColor, (body + rim) * uOpacity);
  }
`

/* ───────── Geometría de relaciones ───────── */
function endpoints(a, b) {
  const A = new THREE.Vector3(...a.pos)
  const B = new THREE.Vector3(...b.pos)
  const dir = B.clone().sub(A).normalize()
  const s = A.clone().add(dir.clone().multiplyScalar(radiusOf(a) + 0.06))
  const e = B.clone().sub(dir.clone().multiplyScalar(radiusOf(b) + 0.06))
  return { s, e, dir }
}
const perpOf = (dir) => new THREE.Vector3(-dir.y, dir.x, 0).normalize()

function zigzag(s, e, dir, amp, step) {
  const len = s.distanceTo(e)
  const n = Math.max(4, Math.round(len / step))
  const p = perpOf(dir)
  const pts = []
  for (let i = 0; i <= n; i++) {
    const t = i / n
    const base = s.clone().lerp(e, t)
    const k = i === 0 || i === n ? 0 : (i % 2 ? 1 : -1)
    pts.push(base.add(p.clone().multiplyScalar(k * amp)))
  }
  return pts
}

/* ───────── Nodo (actor) ───────── */
function Node({ actor, on, state, onSelect, onHover, appear }) {
  const group = useRef()
  const sphere = useRef()
  const glow = useRef()
  const ring = useRef()
  const body = useRef()
  const label = useRef()
  const r = radiusOf(actor)
  const color = useMemo(() => new THREE.Color(actor.color), [actor.color])
  const uni = useMemo(() => ({ uColor: { value: color }, uOpacity: { value: 1 }, uHot: { value: 0 } }), [color])
  const guni = useMemo(() => ({ uColor: { value: color }, uOpacity: { value: 0.5 } }), [color])
  const cur = useRef({ o: 0, s: -1, hot: 0, v: 0 })
  const seed = useMemo(() => Math.random() * 10, [])

  useFrame((st, dt) => {
    const { dim, hot } = state(actor.id)
    const c = cur.current
    // v: 0 → 1 cuando el actor entra en escena (intro o simulación), 1 → 0 cuando sale
    const ready = appear.current >= 0 && st.clock.elapsedTime > appear.current + actor.delay
    const want = ready && on ? 1 : 0
    c.v = THREE.MathUtils.clamp(c.v + (want ? dt / 1.1 : -dt / 0.45), 0, 1)
    const eased = want ? 1 - Math.pow(1 - c.v, 4) : c.v * c.v
    c.o += ((dim ? 0.16 : 1) - c.o) * 0.1
    c.hot += ((hot ? 1 : 0) - c.hot) * 0.12
    // Escala de entrada en el grupo exterior (solo cambia durante la intro: la etiqueta HTML queda quieta);
    // la respiración y el flotado van en el grupo interior, que no arrastra la etiqueta.
    if (Math.abs(eased - c.s) > 1e-4) {
      c.s = eased
      group.current.scale.setScalar(Math.max(eased, 0.0001))
      // vuelo desde la profundidad
      group.current.position.z = actor.pos[2] - (1 - eased) * 9
      group.current.position.y = actor.pos[1] - (1 - eased) * 1.2
      if (label.current) label.current.style.opacity = eased > 0.6 ? '' : '0'
    }
    const breathe = 1 + Math.sin(st.clock.elapsedTime * 1.3 + seed) * 0.018
    body.current.scale.setScalar(breathe * (1 + c.hot * 0.08))
    body.current.position.y = Math.sin(st.clock.elapsedTime * 0.6 + seed) * 0.06
    uni.uOpacity.value = c.o
    uni.uHot.value = c.hot
    guni.uOpacity.value = c.o * (0.4 + c.hot * 0.5)
    if (label.current) label.current.classList.toggle('dim', dim)
    if (ring.current) {
      ring.current.material.opacity = c.o * (0.22 + c.hot * 0.5)
      ring.current.scale.setScalar(1 + c.hot * 0.12 + Math.sin(st.clock.elapsedTime * 0.8 + seed) * 0.02)
    }
  })

  const handlers = {
    onPointerOver: (e) => {
      e.stopPropagation()
      onHover(actor.id)
      document.body.style.cursor = 'pointer'
    },
    onPointerOut: () => {
      onHover(null)
      document.body.style.cursor = ''
    },
    onClick: (e) => {
      e.stopPropagation()
      onSelect(actor.id)
    },
  }

  return (
    <group ref={group} position={actor.pos} scale={0.0001}>
      <group ref={body}>
      <Billboard>
        <mesh ref={glow} scale={r * (actor.self ? 4 : 3.6)}>
          <planeGeometry />
          <shaderMaterial ref={bindUniforms(guni)} vertexShader={uvVert} fragmentShader={glowFrag} uniforms={guni} transparent depthWrite={false} blending={THREE.AdditiveBlending} />
        </mesh>
      </Billboard>
      {actor.self ? (
        <>
          <mesh ref={sphere} {...handlers}>
            <sphereGeometry args={[r, 48, 48]} />
            <meshBasicMaterial color="#050506" />
          </mesh>
          <Billboard>
            <mesh>
              <ringGeometry args={[r * 1.02, r * 1.12, 64]} />
              <meshBasicMaterial color="#ffd23f" transparent opacity={0.9} />
            </mesh>
          </Billboard>
        </>
      ) : (
        <>
          <mesh ref={sphere} {...handlers}>
            <sphereGeometry args={[r, 64, 64]} />
            <shaderMaterial ref={bindUniforms(uni)} vertexShader={sphereVert} fragmentShader={sphereFrag} uniforms={uni} transparent />
          </mesh>
          {/* Contorno del círculo de Fisher */}
          <Billboard>
            <mesh ref={ring}>
              <ringGeometry args={[r * 1.22, r * 1.24, 96]} />
              <meshBasicMaterial color={actor.color} transparent opacity={0.35} depthWrite={false} />
            </mesh>
          </Billboard>
        </>
      )}
      </group>
      <Html position={[0, -r - 0.16, 0]} zIndexRange={[20, 0]} style={{ pointerEvents: 'none' }}>
        <NodeLabel actor={actor} labelRef={label} />
      </Html>
    </group>
  )
}

// Nota: el contenido de <Html> vive en otra raíz de React (sin contexto R3F),
// por eso la clase `dim` se actualiza desde el useFrame del nodo.
function NodeLabel({ actor, labelRef }) {
  return (
    <div ref={labelRef} className="node-label">
      <b>{actor.short || actor.name}</b>
    </div>
  )
}

/* ───────── Relación ───────── */
// Textura circular suave para las partículas de flujo
let dotTex
function getDotTexture() {
  if (dotTex) return dotTex
  const c = document.createElement('canvas')
  c.width = c.height = 64
  const g = c.getContext('2d')
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32)
  grd.addColorStop(0, 'rgba(255,255,255,1)')
  grd.addColorStop(0.35, 'rgba(255,255,255,.55)')
  grd.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = grd
  g.fillRect(0, 0, 64, 64)
  dotTex = new THREE.CanvasTexture(c)
  return dotTex
}

const NEUTRAL = new THREE.Color('#aab4c3')
const WHITE = new THREE.Color('#ffffff')
const AMBER = new THREE.Color(REL_COLORS.zigzag)

/** Degradado de color a lo largo de un trazo (de un actor al otro). */
const gradient = (pts, c1, c2) => pts.map((_, i) => c1.clone().lerp(c2, i / Math.max(1, pts.length - 1)))

function Relation({ rel, on, idx, state, filters, onHoverRel, appear }) {
  const a = byId[rel.a]
  const b = byId[rel.b]
  const lines = useRef([])
  const extras = useRef()
  const spark = useRef()
  const flow = useRef()
  const cur = useRef(0)
  const tier = rel.tier || 1
  const baseColor = rel.type === 'arrow' ? a.color : REL_COLORS[rel.type]

  const geo = useMemo(() => {
    const A = new THREE.Vector3(...a.pos)
    const B = new THREE.Vector3(...b.pos)
    // Curva base: recta, o arco con vértice a cierta altura y hacia el fondo (rel.arc)
    let curve
    if (rel.arc) {
      const [peak, depth] = rel.arc
      const mid = A.clone().lerp(B, 0.5)
      const ctrl = new THREE.Vector3(mid.x, 2 * peak - mid.y, 2 * depth - mid.z)
      curve = new THREE.QuadraticBezierCurve3(A, ctrl, B)
    } else curve = new THREE.LineCurve3(A, B)
    // Recortar en la superficie de cada esfera
    const L = curve.getLength()
    const t0 = (radiusOf(a) + 0.08) / L
    const t1 = 1 - (radiusOf(b) + 0.08) / L
    const N = rel.arc ? 64 : 28
    const along = (u0 = t0, u1 = t1, off = 0) => {
      const pts = []
      for (let i = 0; i <= N; i++) {
        const t = u0 + ((u1 - u0) * i) / N
        const pt = curve.getPoint(t)
        if (off) pt.add(perpOf(curve.getTangent(t)).multiplyScalar(off))
        pts.push(pt)
      }
      return pts
    }
    const s = curve.getPoint(t0)
    const e = curve.getPoint(t1)
    const dir = e.clone().sub(s).normalize()
    const out = { curve, t0, t1, s, e, dir, len: s.distanceTo(e), paths: [], width: tier === 1 ? 1.8 : 1.1, dashed: false }
    out.mid = curve.getPoint((t0 + t1) / 2)
    out.midDir = curve.getTangent((t0 + t1) / 2)

    const ca = new THREE.Color(a.color)
    const cb = new THREE.Color(b.color)
    switch (rel.type) {
      case 'zigzag':
        out.paths = [zigzag(s, e, dir, rel.main ? 0.2 : 0.12, rel.main ? 0.34 : 0.28)]
        out.width = rel.main ? 3.4 : 1.8
        out.colors = [gradient(out.paths[0], AMBER, AMBER)]
        break
      case 'double':
        out.paths = [along(t0, t1, 0.06), along(t0, t1, -0.06)]
        out.colors = out.paths.map((p) => gradient(p, ca.clone().lerp(WHITE, 0.25), cb.clone().lerp(WHITE, 0.25)))
        break
      case 'dotted':
        out.paths = [along()]
        out.dashed = true
        out.colors = [gradient(out.paths[0], NEUTRAL, NEUTRAL)]
        break
      case 'arrow': {
        const cut = t1 - 0.22 / L
        out.paths = [along(t0, cut)]
        out.tip = e.clone()
        out.tipDir = curve.getTangent(t1)
        out.colors = [gradient(out.paths[0], ca.clone().lerp(WHITE, 0.15), ca)]
        break
      }
      case 'broken': {
        out.paths = [along()]
        out.colors = [gradient(out.paths[0], NEUTRAL, NEUTRAL)]
        const w = 0.24
        const n = perpOf(out.midDir)
        const tick = (o) => {
          const c = out.mid.clone().add(out.midDir.clone().multiplyScalar(o))
          return [c.clone().add(n.clone().multiplyScalar(w)), c.clone().add(n.clone().multiplyScalar(-w))]
        }
        out.ticks = [tick(-0.08), tick(0.08)]
        break
      }
      default:
        out.paths = [along()]
        out.colors = [gradient(out.paths[0], ca.clone().lerp(WHITE, 0.4), cb.clone().lerp(WHITE, 0.4))]
    }
    return out
  }, [a, b, rel, tier])

  const tipQuat = useMemo(() => new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), geo.tipDir || geo.dir), [geo])

  // Partículas que recorren la relación (dirección del apoyo / de la influencia)
  const FLOW = rel.type === 'zigzag' ? 0 : 5
  const flowGeo = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(Math.max(FLOW, 1) * 3), 3))
    return g
  }, [FLOW])
  const flowSeed = useMemo(() => Math.random(), [])

  // Cilindro invisible en el tramo central para facilitar el hover sobre líneas finas
  const hit = useMemo(() => {
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), geo.midDir)
    return { q, len: rel.arc ? Math.min(geo.len * 0.35, 2.6) : geo.len * 0.8 }
  }, [geo, rel.arc])

  const draw = useRef(0)
  useFrame((st, dt) => {
    const visible = filters[rel.type] !== false
    const { hot, focus } = state(rel.a, rel.b)
    const ready = appear.current >= 0 && st.clock.elapsedTime > appear.current + 0.9 + idx * 0.07
    const want = ready && on && visible
    draw.current = THREE.MathUtils.clamp(draw.current + (want ? dt / (rel.main ? 1.3 : 0.9) : -dt / 0.35), 0, 1)
    const d = draw.current
    const shown = d > 0 ? 1 : 0
    // Jerarquía: sin foco, las secundarias quedan tenues; con foco, solo brilla lo relevante
    const idle = tier === 1 ? 0.85 : 0.16
    const target = !visible ? 0 : (focus ? (hot ? 1 : 0.05) : idle) * shown
    cur.current += (target - cur.current) * 0.09
    const o = cur.current
    const w = geo.width * (hot && tier === 2 ? 1.8 : hot ? 1.25 : 1)
    const ease = 1 - Math.pow(1 - d, 3)
    lines.current.forEach((l) => {
      if (!l) return
      l.material.opacity = o
      l.material.linewidth += (w - l.material.linewidth) * 0.12
      // revelar los segmentos de la línea como si se trazara
      const segs = l.userData.segs || (l.userData.segs = l.geometry.attributes.instanceStart?.count || 1)
      l.geometry.instanceCount = d >= 1 ? Infinity : Math.ceil(ease * segs)
    })
    if (extras.current) extras.current.traverse((m) => m.material && (m.material.opacity = o * (d >= 0.98 ? 1 : 0)))
    if (spark.current) {
      spark.current.visible = d >= 1
      spark.current.material.dashOffset -= dt * (rel.main ? 1.4 : 0.9)
      spark.current.material.opacity = o * (rel.main ? 1 : 0.8)
    }
    if (flow.current && FLOW) {
      const arr = flow.current.geometry.attributes.position.array
      const speed = 0.09 + (hot ? 0.06 : 0)
      for (let i = 0; i < FLOW; i++) {
        const u = (st.clock.elapsedTime * speed + i / FLOW + flowSeed) % 1
        const p = geo.curve.getPoint(geo.t0 + (geo.t1 - geo.t0) * u)
        arr[i * 3] = p.x
        arr[i * 3 + 1] = p.y
        arr[i * 3 + 2] = p.z
      }
      flow.current.geometry.attributes.position.needsUpdate = true
      flow.current.material.opacity = Math.max(0, o - 0.15) * (tier === 1 || hot ? 1 : 0) * (d >= 1 ? 1 : 0)
    }
  })

  return (
    <group>
      {geo.paths.map((pts, i) => (
        <Line
          key={i}
          ref={(el) => (lines.current[i] = el)}
          points={pts}
          vertexColors={geo.colors[i]}
          lineWidth={geo.width}
          transparent
          dashed={geo.dashed}
          dashSize={0.1}
          gapSize={0.12}
          depthWrite={false}
        />
      ))}
      {rel.type === 'zigzag' && (
        <Line ref={spark} points={geo.paths[0]} color="#fff1d6" lineWidth={geo.width * 0.9} transparent dashed dashSize={0.4} gapSize={rel.main ? 1.4 : 2.2} depthWrite={false} />
      )}
      {FLOW > 0 && (
        <points ref={flow} geometry={flowGeo}>
          <pointsMaterial map={getDotTexture()} color={baseColor || '#ffffff'} size={rel.type === 'double' ? 0.16 : 0.13} sizeAttenuation transparent depthWrite={false} blending={THREE.AdditiveBlending} />
        </points>
      )}
      <group ref={extras}>
        {geo.tip && (
          <mesh position={geo.tip.clone().sub((geo.tipDir || geo.dir).clone().multiplyScalar(0.11))} quaternion={tipQuat}>
            <coneGeometry args={[0.08, 0.24, 20]} />
            <meshBasicMaterial color={baseColor} transparent />
          </mesh>
        )}
        {geo.ticks?.map((pts, i) => (
          <Line key={i} points={pts} color="#ff6b5e" lineWidth={2.6} transparent />
        ))}
      </group>
      <mesh
        position={geo.mid}
        quaternion={hit.q}
        onPointerOver={(e) => {
          e.stopPropagation()
          if (filters[rel.type] === false || draw.current < 0.5) return
          onHoverRel(rel, e)
          document.body.style.cursor = 'help'
        }}
        onPointerMove={(e) => filters[rel.type] !== false && onHoverRel(rel, e)}
        onPointerOut={() => {
          onHoverRel(null)
          document.body.style.cursor = ''
        }}
      >
        <cylinderGeometry args={[0.18, 0.18, hit.len, 6, 1, true]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  )
}

/* ───────── Sombras de actores externos ───────── */
function ExternalShadow({ pos, radius, label, labelPos, visible }) {
  const uni = useMemo(() => ({ uColor: { value: new THREE.Color('#8fa3c0') }, uOpacity: { value: 0 } }), [])
  useFrame(() => {
    uni.uOpacity.value += ((visible ? 1 : 0) - uni.uOpacity.value) * 0.08
  })
  return (
    <group position={pos}>
      <mesh scale={radius * 2}>
        <planeGeometry />
        <shaderMaterial ref={bindUniforms(uni)} vertexShader={uvVert} fragmentShader={shadowFrag} uniforms={uni} transparent depthWrite={false} />
      </mesh>
      {label && <Html position={labelPos} zIndexRange={[5, 0]} style={{ pointerEvents: 'none', opacity: visible ? 1 : 0, transition: 'opacity .5s' }}>
        <div className="shadow-label">{label}</div>
      </Html>}
    </group>
  )
}

/* ───────── Auras de cada bloque (fondo) ───────── */
const auraFrag = /* glsl */ `
  uniform vec3 uColor;
  uniform float uTime;
  varying vec2 vUv;
  void main() {
    vec2 p = vUv - 0.5;
    float d = length(p * vec2(1.0, 1.25)) * 2.0;
    float a = pow(max(1.0 - d, 0.0), 2.2) * (0.16 + 0.03 * sin(uTime * 0.5));
    gl_FragColor = vec4(uColor, a);
  }
`
function Aura({ pos, color, scale }) {
  const uni = useMemo(() => ({ uColor: { value: new THREE.Color(color) }, uTime: { value: 0 } }), [color])
  useFrame((s) => {
    uni.uTime.value = s.clock.elapsedTime
  })
  return (
    <mesh position={pos} scale={[...scale, 1]}>
      <planeGeometry />
      <shaderMaterial ref={bindUniforms(uni)} vertexShader={uvVert} fragmentShader={auraFrag} uniforms={uni} transparent depthWrite={false} blending={THREE.AdditiveBlending} />
    </mesh>
  )
}

/* ───────── Fondo geográfico: la región en puntos, detrás del mapa conceptual ───────── */
const GEO_COLORS = [new THREE.Color('#3a4250'), new THREE.Color('#2f6bff'), new THREE.Color('#ff3b46'), new THREE.Color('#e8b923'), new THREE.Color('#b0414d')]
function GeoBackdrop() {
  const raw = use(pointsPromise)
  const ref = useRef()
  const geo = useMemo(() => {
    const pos = []
    const col = []
    for (let i = 0; i < raw.length; i += 3) {
      const lat = raw[i] / 100
      const lon = raw[i + 1] / 100
      if (lon < 8 || lon > 62 || lat < 38 || lat > 64) continue
      const t = raw[i + 2]
      // proyección simple centrada en Ucrania
      pos.push((lon - 33) * 0.42, (lat - 49) * 0.62, 0)
      const c = GEO_COLORS[t]
      col.push(c.r, c.g, c.b)
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3))
    return g
  }, [raw])
  useFrame((s) => {
    ref.current.material.opacity = 0.3 + Math.sin(s.clock.elapsedTime * 0.4) * 0.05
  })
  return (
    <points ref={ref} geometry={geo} position={[0.4, -0.2, -9]} rotation={[-0.28, 0, 0]} scale={1.15}>
      <pointsMaterial map={getDotTexture()} vertexColors size={0.11} sizeAttenuation transparent opacity={0.3} depthWrite={false} blending={THREE.AdditiveBlending} />
    </points>
  )
}

/* ───────── Polvo de fondo ───────── */
function Dust() {
  const ref = useRef()
  const geo = useMemo(() => {
    const n = 900
    const p = new Float32Array(n * 3)
    for (let i = 0; i < n; i++) {
      p[i * 3] = (Math.random() - 0.5) * 40
      p[i * 3 + 1] = (Math.random() - 0.5) * 24
      p[i * 3 + 2] = -3 - Math.random() * 14
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(p, 3))
    return g
  }, [])
  useFrame((s) => {
    ref.current.rotation.z = s.clock.elapsedTime * 0.004
  })
  return (
    <points ref={ref} geometry={geo}>
      <pointsMaterial size={0.035} color="#8a94a6" transparent opacity={0.5} depthWrite={false} sizeAttenuation />
    </points>
  )
}

/* ───────── Cámara: encuadre responsivo + recorrido ───────── */
const FOV = 38
function fitDistance(aspect) {
  const t = Math.tan((FOV / 2) * (Math.PI / 180))
  return Math.max(4.9 / t, 8.2 / (t * aspect)) + 0.4
}

function CameraRig({ tourStep, tour, selected }) {
  const { camera, size, controls } = useThree()
  const base = fitDistance(size.width / size.height)
  const factor = base / 15.5

  useEffect(() => {
    if (!controls) return
    let pos
    let target
    if (tourStep != null && tour[tourStep]) {
      const step = tour[tourStep]
      const pts = step.focus.map((id) => byId[id]?.pos || ISSUE_BOXES.find((b) => b.id === id)?.pos).filter(Boolean)
      const c = step.target
        ? new THREE.Vector3(...step.target)
        : pts.reduce((acc, p) => acc.add(new THREE.Vector3(...p)), new THREE.Vector3()).multiplyScalar(1 / pts.length)
      target = c
      const rel = new THREE.Vector3(...step.cam).sub(new THREE.Vector3(c.x, c.y, 0))
      pos = c.clone().add(new THREE.Vector3(rel.x * 0.4, rel.y * 0.4, step.cam[2] * factor))
    } else if (selected) {
      const p = new THREE.Vector3(...byId[selected].pos)
      // dejar espacio al panel lateral en escritorio
      const shift = size.width > 900 ? 2.2 * factor : 0
      target = p.clone().add(new THREE.Vector3(shift, 0, 0))
      pos = target.clone().add(new THREE.Vector3(0.6, 0.4, 9 * factor))
    } else {
      // Desplazado hacia abajo para dejar libre el dock inferior
      target = new THREE.Vector3(0, -0.8, 0)
      pos = new THREE.Vector3(0, -0.55, base)
    }
    const tl = gsap.timeline({ defaults: { duration: 1.6, ease: 'expo.inOut' } })
    tl.to(camera.position, { x: pos.x, y: pos.y, z: pos.z }, 0)
    tl.to(controls.target, { x: target.x, y: target.y, z: target.z, onUpdate: () => controls.update() }, 0)
    return () => tl.kill()
  }, [tourStep, selected, base, factor, controls, camera, size.width, tour])

  return null
}

/* ───────── Escena ───────── */
function FisherMap3D({ hovered, setHovered, selected, onSelect, tourStep, tour, filters, showPositions, onHoverRel, active, year }) {
  const appear = useRef(-1)
  const { clock, size } = useThree()

  useEffect(() => {
    if (active && appear.current < 0) appear.current = clock.elapsedTime
  }, [active, clock])

  const actors = useMemo(() => ACTORS.map((a, i) => ({ ...a, delay: i * 0.09 })), [])

  // Foco: recorrido > hover > selección
  const focusSet = useMemo(() => {
    if (tourStep != null && tour[tourStep]) return new Set(tour[tourStep].focus)
    const id = hovered || selected
    if (!id) return null
    const s = new Set([id])
    RELATIONS.forEach((r) => {
      if (r.a === id) s.add(r.b)
      if (r.b === id) s.add(r.a)
    })
    return s
  }, [hovered, selected, tourStep, tour])

  const stateRef = useRef()
  stateRef.current = (a, b) => {
    if (!focusSet) return { dim: false, hot: false, focus: false }
    if (b === undefined) return { dim: !focusSet.has(a), hot: focusSet.has(a) && (a === hovered || a === selected), focus: true }
    const center = hovered || selected
    const on = tourStep != null ? focusSet.has(a) && focusSet.has(b) : a === center || b === center
    return { dim: !on, hot: on, focus: true }
  }
  const state = (a, b) => stateRef.current(a, b)

  const mobile = size.width < 700

  return (
    <>
      <color attach="background" args={['#000000']} />
      <fog attach="fog" args={['#000000', 16, 38]} />
      <OrbitControls
        makeDefault
        enableZoom={false}
        enablePan={false}
        enableRotate={!mobile}
        enableDamping
        dampingFactor={0.06}
        rotateSpeed={0.45}
        minAzimuthAngle={-0.55}
        maxAzimuthAngle={0.55}
        minPolarAngle={Math.PI / 2 - 0.45}
        maxPolarAngle={Math.PI / 2 + 0.35}
      />
      <CameraRig tourStep={tourStep} tour={tour} selected={selected} />
      <Dust />
      <Suspense fallback={null}>
        <GeoBackdrop />
      </Suspense>
      <Aura pos={[-4.6, 0.2, -4]} color="#2f6bff" scale={[17, 12]} />
      <Aura pos={[4.8, 0.2, -4]} color="#ff2d3a" scale={[17, 12]} />

      <ExternalShadow pos={[-6.7, 0.3, -1.2]} radius={3.3} visible={filters.shadow !== false} />
      <ExternalShadow pos={[6.7, 2.5, -1.2]} radius={1.45} visible={filters.shadow !== false} />

      {RELATIONS.map((r, i) => (
        <Relation key={i} idx={i} rel={r} on={year == null || (r.since || 0) <= year} state={state} filters={filters} onHoverRel={onHoverRel} appear={appear} />
      ))}
      {actors.map((a) => (
        <Node key={a.id} actor={a} on={year == null || (a.since || 0) <= year} state={state} onSelect={onSelect} onHover={setHovered} appear={appear} />
      ))}

      {filters.box !== false && (year == null || year >= 2014) &&
        ISSUE_BOXES.map((b) => (
          <Html key={b.id} position={b.pos} zIndexRange={[30, 0]}>
            <IssueBox box={b} focusSet={focusSet} />
          </Html>
        ))}

      {showPositions && (
        <>
          <Html position={[-3.6, 2.45, 0.5]} zIndexRange={[40, 0]}>
            <PositionBox actor={byId.ua} />
          </Html>
          <Html position={[3.9, 2.25, 0.5]} zIndexRange={[40, 0]}>
            <PositionBox actor={byId.ru} />
          </Html>
        </>
      )}
    </>
  )
}

function IssueBox({ box, focusSet }) {
  const dim = focusSet && !focusSet.has(box.id) && !(focusSet.has('ua') && focusSet.has('ru'))
  return (
    <div className={'issue-box' + (dim ? ' dim' : '')} title="Tema en disputa (cuadro, según Fisher)">
      {box.label}
    </div>
  )
}

function PositionBox({ actor }) {
  return (
    <div className="pos-box" style={{ borderColor: actor.color + '88' }}>
      <h5 style={{ color: actor.color }}>Posición · {actor.name}</h5>
      <ul>
        {actor.position.map((p) => (
          <li key={p}>{p}</li>
        ))}
      </ul>
    </div>
  )
}

// memo: el canvas solo se vuelve a renderizar cuando cambia el estado del mapa
export default memo(FisherMap3D)
