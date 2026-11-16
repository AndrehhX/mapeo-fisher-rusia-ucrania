import { useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { PerformanceMonitor } from '@react-three/drei'
import { EffectComposer, Bloom, SMAA } from '@react-three/postprocessing'

// Resolución inicial prudente: en pantallas retina 2x renderizar a 1.5x ya se ve nítido
const START_DPR = typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 1.5) : 1

/**
 * Canvas con calidad adaptativa:
 * - DPR que baja a 1 si el equipo no sostiene los FPS y vuelve a subir si se recupera.
 * - Sin MSAA en el framebuffer (el composer renderiza a su propio buffer); SMAA lo suaviza más barato.
 * - Bloom con menos niveles de mipmap.
 * - frameloop "never" cuando la escena no está en pantalla.
 */
export default function Stage({ active, camera, bloom = {}, children, ...rest }) {
  const [dpr, setDpr] = useState(START_DPR)
  const [lowPower, setLowPower] = useState(false)

  return (
    <Canvas
      frameloop={active ? 'always' : 'never'}
      dpr={dpr}
      camera={camera}
      gl={{ antialias: false, stencil: false, powerPreference: 'high-performance' }}
      {...rest}
    >
      <PerformanceMonitor
        flipflops={3}
        onDecline={() => setDpr(1)}
        onIncline={() => setDpr(START_DPR)}
        onFallback={() => {
          setDpr(1)
          setLowPower(true)
        }}
      />
      {children}
      <EffectComposer multisampling={0} enableNormalPass={false}>
        {!lowPower && <Bloom mipmapBlur levels={5} {...bloom} />}
        <SMAA />
      </EffectComposer>
    </Canvas>
  )
}
