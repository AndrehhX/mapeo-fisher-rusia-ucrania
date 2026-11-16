import { Suspense, useCallback, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState } from 'react'
import Stage from '../three/Stage'
import FisherMap3D, { byId, REL_COLORS } from '../three/FisherMap3D'
import RelIcon from './RelIcon'
import { IconClose, IconLegend, IconNext, IconPlay, IconPosition, IconPrev, IconStop } from './Icons'
import { gsap } from '../lib/motion'
import { useInView } from '../lib/useInView'
import { RELATIONS, TOUR, CAPTIONS, LEGEND, EVOLUTION, SCOPE } from '../data/content'
import { creditFor } from './Credit'

const TYPE_NAME = {
  zigzag: 'Conflicto',
  double: 'Alianza',
  line: 'Relación estrecha',
  dotted: 'Vínculo intermitente',
  arrow: 'Influencia',
  broken: 'Relación rota',
}
const relColor = (r) => (r.type === 'arrow' ? byId[r.a].color : REL_COLORS[r.type])
const NO_FILTERS = {}

export default function MapSection() {
  const root = useRef()
  const inView = useInView(root, '100px')
  const [hovered, setHovered] = useState(null)
  const [selected, setSelected] = useState(null)
  const [step, setStep] = useState(null)
  const [legend, setLegend] = useState(false)
  const [positions, setPositions] = useState(false)
  const tip = useRef()

  // El tooltip se mueve por referencia: pasar el mouse sobre una línea no vuelve a renderizar la escena
  const onHoverRel = useCallback((rel, e) => {
    if (!rel) return tip.current?.hide()
    const box = root.current.getBoundingClientRect()
    tip.current?.show(rel, e.nativeEvent.clientX - box.left, e.nativeEvent.clientY - box.top, box.width)
  }, [])

  const select = useCallback((id) => {
    setStep(null)
    setSelected((cur) => (cur === id ? null : id))
  }, [])

  // Simulación: -1 = mapa vacío, 0..n-1 = cada año, null = presente
  const [sim, setSim] = useState(null)
  const year = sim == null ? null : sim < 0 ? 0 : EVOLUTION[sim].year

  useEffect(() => {
    if (sim == null) return
    const wait = sim < 0 ? 900 : sim < EVOLUTION.length - 1 ? 3800 : 4200
    const t = setTimeout(() => setSim((v) => (v == null ? null : v + 1 < EVOLUTION.length ? v + 1 : null)), wait)
    return () => clearTimeout(t)
  }, [sim])

  const toggleSim = useCallback(() => {
    setSelected(null)
    setStep(null)
    setSim((v) => (v == null ? -1 : null))
  }, [])

  const go = useCallback((s) => {
    setSelected(null)
    setSim(null)
    setStep(s)
  }, [])

  // ← → recorren los pasos; Esc vuelve a la vista general
  useEffect(() => {
    if (!inView) return
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setSelected(null)
        setStep(null)
        setLegend(false)
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        go(step == null ? 0 : Math.min(TOUR.length - 1, step + 1))
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        go(step == null || step === 0 ? null : step - 1)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [inView, step, go])

  return (
    <section className="map-sec" id="mapa" ref={root}>
      <div className="map-canvas">
        <Stage
          active={inView}
          camera={{ fov: 38, position: [-0.4, 0.5, 16], near: 0.1, far: 80 }}
          bloom={{ intensity: 0.55, luminanceThreshold: 0.35, luminanceSmoothing: 0.3, radius: 0.6 }}
          onPointerMissed={() => setSelected(null)}
        >
          <Suspense fallback={null}>
            <FisherMap3D
              hovered={hovered}
              setHovered={setHovered}
              selected={selected}
              onSelect={select}
              tourStep={step}
              tour={TOUR}
              filters={NO_FILTERS}
              showPositions={positions}
              onHoverRel={onHoverRel}
              active={inView}
              year={year}
            />
          </Suspense>
        </Stage>
      </div>

      <div className="map-ui">
        <header className="map-head">
          <h2>El mapa</h2>
          <dl className="map-scope" aria-label="Delimitación del mapa">
            {SCOPE.map((s) => (
              <div key={s.k}>
                <dt>{s.k}</dt>
                <dd>{s.v}</dd>
              </div>
            ))}
          </dl>
        </header>
        <MapYear year={year} />

        {legend && <LegendPop />}
        <Dock step={step} go={go} sim={sim} toggleSim={toggleSim} legend={legend} setLegend={setLegend} positions={positions} setPositions={setPositions} />

        <RelTip ref={tip} />
        <ActorPanel id={selected} onClose={() => setSelected(null)} onSelect={select} />
      </div>
    </section>
  )
}

/** Año de la simulación: los dígitos ruedan de un año al siguiente. */
function MapYear({ year }) {
  const el = useRef()
  const val = useRef({ v: 2014 })
  useEffect(() => {
    if (!year) return
    gsap.to(val.current, {
      v: year,
      duration: 1.2,
      ease: 'power3.inOut',
      onUpdate: () => el.current && (el.current.textContent = Math.round(val.current.v)),
    })
  }, [year])
  return (
    <div className={'map-year' + (year != null ? ' on' : '')} aria-hidden="true">
      <span ref={el}>2014</span>
    </div>
  )
}

function Dock({ step, go, sim, toggleSim, legend, setLegend, positions, setPositions }) {
  const text = useRef()
  const ev = sim != null && sim >= 0 ? EVOLUTION[sim] : null
  const s = ev || (step == null ? null : TOUR[step])
  const playing = sim != null

  useEffect(() => {
    gsap.fromTo(text.current.children, { y: 10, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.6, stagger: 0.05, ease: 'power3.out' })
  }, [step, sim])

  return (
    <div className="dock">
      <div className="dock-step" ref={text} aria-live="polite">
        <h4>{s ? s.title : playing ? 'Así empezó…' : 'Seis pasos para leerlo.'}</h4>
        <p>{s ? s.text : playing ? 'El mapa se arma año por año.' : 'Cada círculo es un actor y su tamaño, su poder. Cada línea, una relación. Usa ← →.'}</p>
      </div>
      <div className="dock-bar">
        <div className="seg" role="group" aria-label="Pasos del recorrido">
          <button className={'all' + (step == null ? ' on' : '')} onClick={() => go(null)}>
            Todo
          </button>
          {TOUR.map((t, i) => (
            <button key={t.title} className={step === i ? 'on' : ''} onClick={() => go(i)} aria-label={`Paso ${i + 1}: ${t.title}`}>
              {i + 1}
            </button>
          ))}
        </div>
        <div className="tools">
          <button className={'pill sim' + (playing ? ' on' : '')} onClick={toggleSim} aria-pressed={playing}>
            {playing ? <IconStop /> : <IconPlay />}
            {playing ? 'Detener' : 'Evolución'}
          </button>
          <button className="icon-btn" onClick={() => go(step == null ? null : step === 0 ? null : step - 1)} aria-label="Paso anterior">
            <IconPrev />
          </button>
          <button className="icon-btn" onClick={() => go(step == null ? 0 : Math.min(TOUR.length - 1, step + 1))} aria-label="Paso siguiente">
            <IconNext />
          </button>
          <button className={'pill' + (legend ? ' on' : '')} onClick={() => setLegend((v) => !v)} aria-pressed={legend}>
            <IconLegend />
            Leyenda
          </button>
          <button className={'pill' + (positions ? ' on' : '')} onClick={() => setPositions((v) => !v)} aria-pressed={positions}>
            <IconPosition />
            Posiciones
          </button>
        </div>
      </div>
    </div>
  )
}

function LegendPop() {
  const ref = useRef()
  useEffect(() => {
    gsap.fromTo(ref.current, { y: 12, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.45, ease: 'power3.out' })
  }, [])
  const items = LEGEND.filter((l) => l.type !== 'circle')
  return (
    <div className="legend-pop" ref={ref}>
      <div>
        <RelIcon type="circle" />
        Tamaño = poder
      </div>
      {items.map((l) => (
        <div key={l.type}>
          <RelIcon type={l.type} color={l.type === 'line' || l.type === 'dotted' || l.type === 'double' || l.type === 'arrow' ? '#d1d1d6' : undefined} />
          {l.type === 'box' ? 'Asunto en disputa' : l.type === 'shadow' ? 'Actores externos' : TYPE_NAME[l.type]}
        </div>
      ))}
    </div>
  )
}

function RelTip({ ref }) {
  const el = useRef()
  const [rel, setRel] = useState(null)
  useImperativeHandle(ref, () => ({
    show(r, x, y, w) {
      setRel((cur) => (cur === r ? cur : r))
      if (el.current) el.current.style.transform = `translate3d(${Math.min(x, w - 350) + 14}px, ${y + 14}px, 0)`
    },
    hide: () => setRel(null),
  }))
  // Siempre el mismo nodo DOM: la posición se escribe antes de que React pinte el contenido
  return (
    <div className="rel-tip" ref={el} hidden={!rel}>
      {rel && (
        <>
          <small>{TYPE_NAME[rel.type]}</small>
          <h5>
            <RelIcon type={rel.type} color={relColor(rel)} />
            {byId[rel.a].name} {rel.type === 'arrow' ? '→' : '·'} {byId[rel.b].name}
          </h5>
          {rel.text}
        </>
      )}
    </div>
  )
}

function ActorPanel({ id, onClose, onSelect }) {
  const panel = useRef()
  const [shown, setShown] = useState(id)
  useLayoutEffect(() => {
    gsap.set(panel.current, { xPercent: 110 })
  }, [])
  const actor = byId[shown]

  useEffect(() => {
    if (id) setShown(id)
    gsap.to(panel.current, id ? { xPercent: 0, duration: 0.8, ease: 'expo.out' } : { xPercent: 110, duration: 0.5, ease: 'power3.in' })
  }, [id])

  useEffect(() => {
    if (!shown) return
    gsap.fromTo(panel.current.querySelectorAll('.actor-panel-body > *'), { y: 20, autoAlpha: 0 }, { y: 0, autoAlpha: 1, stagger: 0.04, duration: 0.6, ease: 'power3.out', delay: 0.08 })
    panel.current.scrollTop = 0
  }, [shown])

  const rels = useMemo(() => (shown ? RELATIONS.filter((r) => r.a === shown || r.b === shown) : []), [shown])
  const slug = actor?.img?.replace(/^.*\//, '').replace('.webp', '')

  return (
    <aside className="actor-panel" ref={panel} aria-hidden={!id} inert={!id} style={{ '--accent': actor?.color }} data-lenis-prevent>
      {actor && (
        <>
          <button className="icon-btn close" onClick={onClose} aria-label="Cerrar">
            <IconClose />
          </button>
          {actor.img && (
            <div className="actor-panel-img">
              <img src={actor.img} alt={CAPTIONS[slug] || actor.name} decoding="async" />
            </div>
          )}
          <div className="actor-panel-body" style={{ paddingTop: actor.img ? 4 : 64 }}>
            <div>
              <span className="actor-kind" style={{ color: actor.color === '#ffffff' ? 'var(--ua-2)' : actor.color }}>
                {actor.kind}
              </span>
              <h3>{actor.full}</h3>
            </div>
            <p style={{ margin: 0, color: 'var(--text-2)', fontSize: 15 }}>{actor.role}</p>
            {!actor.self && (
              <div>
                <h6>Poder relativo</h6>
                <div className="meter">
                  <i style={{ width: `${actor.power * 100}%` }} />
                </div>
              </div>
            )}
            <div>
              <h6>Quiere</h6>
              <ul>
                {actor.interests.map((i) => (
                  <li key={i}>{i}</li>
                ))}
              </ul>
            </div>
            <div>
              <h6>Posición</h6>
              <ul>
                {actor.position.map((i) => (
                  <li key={i}>{i}</li>
                ))}
              </ul>
            </div>
            <div>
              <h6>Relaciones</h6>
              <ul className="rel-list">
                {rels.map((r, i) => {
                  const other = byId[r.a === shown ? r.b : r.a]
                  return (
                    <li key={i}>
                      <RelIcon type={r.type} color={relColor(r)} w={30} h={12} />
                      <span>
                        <button className="link-btn" onClick={() => onSelect(other.id)}>
                          {other.name}
                        </button>
                        <span style={{ color: 'var(--text-3)' }}> · {r.label}</span>
                      </span>
                    </li>
                  )
                })}
              </ul>
            </div>
            {actor.img && <p className="credit">{creditFor(actor.img)}</p>}
          </div>
        </>
      )}
    </aside>
  )
}
