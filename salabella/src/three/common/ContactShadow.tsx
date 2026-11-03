import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { HorizontalBlurShader, VerticalBlurShader } from 'three-stdlib'

/**
 * Objects on this layer are drawn by the main camera but are invisible to
 * every ContactShadow capture: shadow catchers, other contact shadows, UI
 * callouts. Anything that should never cast a contact shadow lives here.
 */
export const OVERLAY_LAYER = 1

/** Put an object (and its whole subtree) on the overlay layer only. */
export function toOverlayLayer(root: THREE.Object3D) {
  root.traverse((o) => o.layers.set(OVERLAY_LAYER))
}

type ContactShadowProps = {
  position?: [number, number, number]
  /** Footprint on the floor (m), [x, z]. */
  scale: [number, number]
  resolution?: number
  blur?: number
  /** How far above the floor occluders still darken it (m). */
  far?: number
  opacity?: number
  color: THREE.ColorRepresentation
  /**
   * Captures to make before going idle. Infinity re-captures every rendered
   * frame (moving casters); a finite count captures once and holds.
   */
  frames?: number
  /** Changing this re-arms a finite `frames` capture. */
  captureKey?: unknown
}

/**
 * Contact shadow in the spirit of drei's <ContactShadows>, fixed for this
 * site's pipeline:
 * - it CLEARS its render targets on every capture. EffectComposer turns the
 *   renderer's autoClear off, so drei's version accumulated depth frame on
 *   frame (the floor kept darkening and grew hard wedges);
 * - captures only see layer 0, so shadow catchers, the other contact shadow
 *   and overlay callouts (OVERLAY_LAYER) can never shadow the floor;
 * - the blur runs on its own private camera + quad, so it works wherever the
 *   shadow is positioned (drei's blur quad sat at the world origin).
 */
export function ContactShadow({
  position = [0, 0, 0],
  scale,
  resolution = 512,
  blur = 1,
  far = 1,
  opacity = 1,
  color,
  frames = Infinity,
  captureKey,
}: ContactShadowProps) {
  const gl = useThree((s) => s.gl)
  const scene = useThree((s) => s.scene)
  const camera = useThree((s) => s.camera)
  const invalidate = useThree((s) => s.invalidate)
  const group = useRef<THREE.Group>(null!)
  const mesh = useRef<THREE.Mesh>(null!)
  const [w, h] = scale

  const res = useMemo(() => {
    const target = new THREE.WebGLRenderTarget(resolution, resolution)
    const targetBlur = new THREE.WebGLRenderTarget(resolution, resolution)
    target.texture.generateMipmaps = targetBlur.texture.generateMipmaps = false

    const floorGeo = new THREE.PlaneGeometry(w, h).rotateX(Math.PI / 2)
    const shadowCam = new THREE.OrthographicCamera(-w / 2, w / 2, h / 2, -h / 2, 0, far)

    const depth = new THREE.MeshDepthMaterial()
    depth.depthTest = depth.depthWrite = false
    const ucolor = new THREE.Color(color)
    depth.onBeforeCompile = (shader) => {
      shader.uniforms.ucolor = { value: ucolor }
      shader.fragmentShader = shader.fragmentShader
        .replace('void main() {', 'uniform vec3 ucolor;\nvoid main() {')
        // colourise, and fade with height so the closest contact stays darkest
        .replace('vec4( vec3( 1.0 - fragCoordZ ), opacity );', 'vec4( ucolor * fragCoordZ * 2.0, ( 1.0 - fragCoordZ ) * 1.0 );')
    }

    const hBlur = new THREE.ShaderMaterial(HorizontalBlurShader)
    const vBlur = new THREE.ShaderMaterial(VerticalBlurShader)
    hBlur.depthTest = vBlur.depthTest = false
    // private full-target quad for the blur passes
    const blurCam = new THREE.OrthographicCamera(-0.5, 0.5, 0.5, -0.5, 0, 2)
    const blurQuad = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), hBlur)
    blurQuad.position.z = -1
    blurQuad.updateMatrixWorld()
    return { target, targetBlur, floorGeo, shadowCam, depth, hBlur, vBlur, blurCam, blurQuad }
  }, [resolution, w, h, far, color])

  useEffect(
    () => () => {
      res.target.dispose()
      res.targetBlur.dispose()
      res.floorGeo.dispose()
      res.depth.dispose()
      res.hBlur.dispose()
      res.vBlur.dispose()
      res.blurQuad.geometry.dispose()
    },
    [res],
  )

  // The main camera must see the overlay layer; captures never do.
  useLayoutEffect(() => {
    camera.layers.enable(OVERLAY_LAYER)
    toOverlayLayer(mesh.current)
  }, [camera, res])

  const count = useRef(0)
  useEffect(() => {
    count.current = 0
    invalidate()
  }, [captureKey, res, invalidate])

  const blurPass = (amount: number) => {
    const { target, targetBlur, hBlur, vBlur, blurCam, blurQuad } = res
    blurQuad.material = hBlur
    hBlur.uniforms.tDiffuse.value = target.texture
    hBlur.uniforms.h.value = amount / 256
    gl.setRenderTarget(targetBlur)
    gl.render(blurQuad, blurCam)
    blurQuad.material = vBlur
    vBlur.uniforms.tDiffuse.value = targetBlur.texture
    vBlur.uniforms.v.value = amount / 256
    gl.setRenderTarget(target)
    gl.render(blurQuad, blurCam)
  }

  const clearColor = useMemo(() => new THREE.Color(), [])
  useFrame(() => {
    if (count.current >= frames) return
    count.current++
    const prevTarget = gl.getRenderTarget()
    const prevBackground = scene.background
    const prevOverride = scene.overrideMaterial
    const prevAlpha = gl.getClearAlpha()
    gl.getClearColor(clearColor)

    group.current.visible = false
    scene.background = null
    scene.overrideMaterial = res.depth
    gl.setRenderTarget(res.target)
    gl.setClearColor(0x000000, 0)
    gl.clear(true, true, false)
    gl.render(scene, res.shadowCam)
    blurPass(blur)
    blurPass(blur * 0.4)

    gl.setClearColor(clearColor, prevAlpha)
    gl.setRenderTarget(prevTarget)
    scene.overrideMaterial = prevOverride
    scene.background = prevBackground
    group.current.visible = true
  })

  return (
    <group ref={group} position={position} rotation-x={Math.PI / 2}>
      <mesh ref={mesh} geometry={res.floorGeo} scale={[1, -1, 1]} rotation={[-Math.PI / 2, 0, 0]}>
        <meshBasicMaterial transparent map={res.target.texture} opacity={opacity} depthWrite={false} />
      </mesh>
      <primitive object={res.shadowCam} />
    </group>
  )
}
