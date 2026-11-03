import { EffectComposer, Bloom, Vignette, Noise, ToneMapping, N8AO } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'

type PostFXProps = {
  bloom?: boolean
  grain?: boolean
  vignette?: boolean
  ao?: boolean
}

/**
 * Shared cinematic finishing pass. Keep effects subtle — AAA reads as
 * "restrained and correct", not as a Bloom demo.
 */
export function PostFX({ bloom = true, grain = true, vignette = true, ao = false }: PostFXProps) {
  return (
    <EffectComposer multisampling={4} enableNormalPass={ao}>
      <>
        {ao && <N8AO aoRadius={0.6} intensity={1.4} distanceFalloff={1} />}
        {bloom && <Bloom luminanceThreshold={0.86} luminanceSmoothing={0.3} intensity={0.35} mipmapBlur radius={0.6} />}
        {vignette && <Vignette eskil={false} offset={0.28} darkness={0.55} />}
        {grain && <Noise opacity={0.028} premultiply />}
        <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      </>
    </EffectComposer>
  )
}
