import { useMemo } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { EffectComposer, Bloom, Vignette, Noise, ToneMapping, N8AO } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'

type PostFXProps = {
  bloom?: boolean
  grain?: boolean
  vignette?: boolean
  ao?: boolean
}

/**
 * @react-three/postprocessing sizes a new EffectComposer from state left over
 * by the last canvas it touched, so with several canvases on one page a
 * section can render at another section's resolution (seen: 1360×1117 inside
 * a 765×611 card). Re-assert the renderer size from this canvas's own size.
 */
function SizeGuard() {
  const tmp = useMemo(() => new THREE.Vector2(), [])
  useFrame(({ gl, size }) => {
    gl.getSize(tmp)
    if (Math.abs(tmp.x - size.width) > 0.5 || Math.abs(tmp.y - size.height) > 0.5) gl.setSize(size.width, size.height)
  })
  return null
}

/**
 * Shared cinematic finishing pass. Keep effects subtle — AAA reads as
 * "restrained and correct", not as a Bloom demo.
 */
export function PostFX({ bloom = true, grain = true, vignette = true, ao = false }: PostFXProps) {
  return (
    <>
      <SizeGuard />
      <EffectComposer multisampling={4} enableNormalPass={ao}>
        <>
          {ao && <N8AO aoRadius={0.6} intensity={1.4} distanceFalloff={1} />}
          {bloom && <Bloom luminanceThreshold={0.86} luminanceSmoothing={0.3} intensity={0.35} mipmapBlur radius={0.6} />}
          {vignette && <Vignette eskil={false} offset={0.28} darkness={0.55} />}
          {grain && <Noise opacity={0.028} premultiply />}
          <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
        </>
      </EffectComposer>
    </>
  )
}
