import { Environment, Lightformer, ContactShadows } from '@react-three/drei'
import { palette } from './materials'

type StudioLightingProps = {
  /** Overall intensity multiplier for the rig. */
  intensity?: number
  keyColor?: string
  fillColor?: string
  rimColor?: string
  /** Render a soft contact shadow disc grounding objects at y=groundY. */
  ground?: boolean
  groundY?: number
  groundOpacity?: number
}

/**
 * Light directions, exported so hand-written shaders and fake shadows can
 * stay consistent with the rig instead of guessing.
 */
export const STUDIO_KEY_POSITION: [number, number, number] = [4, 5, 4]
export const STUDIO_FILL_POSITION: [number, number, number] = [-6, 2, 2]
export const STUDIO_RIM_POSITION: [number, number, number] = [-2, 3, -6]

/**
 * Fully procedural studio softbox rig built from drei <Lightformer> planes,
 * baked into a small IBL cubemap by <Environment>. No external HDRI files —
 * this must render identically with zero network access, in dev and in prod.
 */
export function StudioLighting({
  intensity = 1,
  keyColor = '#fff6e8',
  fillColor = '#e7eef5',
  rimColor = '#ffd9ad',
  ground = true,
  groundY = -1,
  groundOpacity = 0.55,
}: StudioLightingProps) {
  return (
    <>
      <Environment resolution={256} background={false}>
        {/* key: large soft box, upper front-right */}
        <Lightformer
          form="rect"
          intensity={2.4 * intensity}
          color={keyColor}
          position={STUDIO_KEY_POSITION}
          rotation={[-Math.PI / 4, Math.PI / 5, 0]}
          scale={[6, 4, 1]}
        />
        {/* fill: broad, dim, cool, from the left */}
        <Lightformer
          form="rect"
          intensity={0.9 * intensity}
          color={fillColor}
          position={STUDIO_FILL_POSITION}
          rotation={[0, Math.PI / 2.4, 0]}
          scale={[5, 6, 1]}
        />
        {/* rim: warm edge light from behind, separates subject from bg */}
        <Lightformer
          form="rect"
          intensity={2.8 * intensity}
          color={rimColor}
          position={STUDIO_RIM_POSITION}
          rotation={[0, Math.PI, 0]}
          scale={[4, 3, 1]}
        />
        {/* soft top wash */}
        <Lightformer form="ring" intensity={0.6 * intensity} color="#ffffff" position={[0, 6, 0]} rotation={[Math.PI / 2, 0, 0]} scale={8} />
        {/* low bounce card, floor-color, adds believable ground bounce */}
        <Lightformer
          form="rect"
          intensity={0.5 * intensity}
          color={palette.linen200}
          position={[0, -2, 3]}
          rotation={[Math.PI / 2, 0, 0]}
          scale={[8, 8, 1]}
        />
      </Environment>
      {ground && (
        <ContactShadows
          position={[0, groundY, 0]}
          opacity={groundOpacity}
          scale={14}
          blur={2.4}
          far={4}
          resolution={512}
          color={palette.ink900}
        />
      )}
    </>
  )
}
