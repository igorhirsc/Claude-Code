import { Suspense, type ReactNode } from 'react'
import { Canvas, type CanvasProps } from '@react-three/fiber'
import * as THREE from 'three'

type CanvasShellProps = CanvasProps & {
  children: ReactNode
  fallback?: ReactNode
}

/**
 * Consistent renderer + color pipeline for every 3D section: ACES filmic
 * tone mapping, correct color space, soft shadows, capped DPR for perf.
 * Every section's <Canvas> should be this component, not a raw R3F Canvas.
 * Pass `frameloop="demand"` when the section is off-screen so it stops
 * rendering every frame.
 */
export function CanvasShell({ children, fallback = null, shadows = true, dpr = [1, 1.75], ...rest }: CanvasShellProps) {
  return (
    <Canvas
      shadows={shadows}
      dpr={dpr}
      gl={{
        antialias: true,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.05,
      }}
      camera={{ fov: 32, position: [0, 1.4, 8] }}
      {...rest}
    >
      <Suspense fallback={fallback}>{children}</Suspense>
    </Canvas>
  )
}
