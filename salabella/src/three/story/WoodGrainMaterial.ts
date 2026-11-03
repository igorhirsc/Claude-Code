import * as THREE from 'three'
import { palette } from '@/three/common/materials'
import { STUDIO_FILL_POSITION, STUDIO_KEY_POSITION, STUDIO_RIM_POSITION } from '@/three/common/Lighting'
import { simplexNoise3D } from './noiseGLSL'

/** Ring geometry, shared by the material (log re-parametrisation) and mesh. */
export const RING_MAJOR = 1
export const RING_MINOR = 0.25

const dir = (p: readonly [number, number, number]) => new THREE.Vector3(...p).normalize()
const c = (hex: string) => new THREE.Color(hex)

/*
  Turned-wood shader for a torus lying flat (object Z = world up).

  The torus is re-parametrised as a bent log: `dir` (the unit vector in the
  ring plane) runs ALONG the log, and `cs` is the point inside the log's
  cross-section (x = outward from the ring centre, y = up). The pith sits
  below and inside the tube, so growth rings cross the turned surface as
  long arcs — the cathedral figure you get when a ring is cut from a plank.
  Every noise lookup uses `dir`/`cs`/object position, all continuous around
  the ring, so there is no seam at the wrap.

  Lighting is hand-rolled from the shared studio rig directions: wrapped
  Lambert key + fill, low wood-tinted Blinn-Phong lacquer, warm fresnel rim.
  The summed light is kept below ~0.96 before tone mapping so the lacquer
  highlight never clips to white, then three's own tonemapping/colorspace
  chunks keep it in the site's ACES pipeline.
*/
const vertexShader = /* glsl */ `
varying vec3 vObj;
varying vec3 vObjNormal;
varying vec3 vWorldPos;
varying vec3 vWorldNormal;

void main() {
  vObj = position;
  vObjNormal = normal;
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorldPos = wp.xyz;
  vWorldNormal = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`

const fragmentShader = /* glsl */ `
uniform vec3 uEarly;
uniform vec3 uLate;
uniform vec3 uDeep;
uniform vec3 uKeyColor;
uniform vec3 uFillColor;
uniform vec3 uRimColor;
uniform vec3 uKeyDir;
uniform vec3 uFillDir;
uniform vec3 uRimDir;
uniform float uMajor;

varying vec3 vObj;
varying vec3 vObjNormal;
varying vec3 vWorldPos;
varying vec3 vWorldNormal;

${simplexNoise3D}

void main() {
  vec3 P = vObj;
  float rho = length(P.xy);
  vec2 dir = P.xy / max(rho, 1e-4);          // along the log (seamless)
  vec2 cs = vec2(rho - uMajor, P.z);         // inside the log's cross-section

  // --- growth rings -------------------------------------------------------
  // Pith below/inside the tube: rings surface as long, slightly eccentric arcs.
  vec2 pith = vec2(-0.12, -0.78);
  float d = length(cs - pith);

  // Strong domain warp (2.6) plus a second, finer octave so neighbouring
  // rings wander independently instead of running as parallel stripes. The
  // final displacement stays under about half a ring spacing, so the figure
  // reads as growth rings, not marble.
  vec3 q = P * 1.1;
  vec3 w = vec3(fbm3(q), fbm3(q + vec3(5.2, 1.3, 2.8)), 0.0);
  float warp = fbm3(q + 2.6 * w);
  float warpHi = snoise(q * 4.2 + 1.3 * w);
  // The fine octave is kept small: any more and ring edges start to jitter.
  d += 0.027 * warp + 0.003 * warpHi;

  // Slow ring-frequency drift along the log: the tree grew faster some years.
  float drift = snoise(vec3(dir * 0.8, 4.7));
  float rd = d * 19.0 * (1.0 + 0.2 * drift);
  float ringId = floor(rd);
  float f = fract(rd);

  // Per-ring latewood width noise, itself wandering along the log.
  float wN = 0.5 + 0.5 * snoise(vec3(ringId * 0.73, 2.1, dir.x * 0.6 + dir.y * 0.4));
  float width = mix(0.16, 0.46, wN);
  // Wide, soft edges: earlywood fades into latewood, latewood eases back
  // out before the boundary — tonal bands, not woodcut lines.
  float late = smoothstep(1.0 - width - 0.26, 1.0 - width + 0.1, f) * (1.0 - smoothstep(0.82, 1.0, f));
  late *= mix(0.6, 1.0, wN);

  // --- fibres & pores -----------------------------------------------------
  // Fast across the rings, slow along the log -> fibre streaks between rings.
  float streak = clamp(0.5 + 0.62 * fbm3(vec3(dir * 2.6, d * 48.0)), 0.0, 1.0);
  float pores = smoothstep(0.62, 0.95, snoise(vec3(dir * 46.0, d * 210.0)));

  vec3 base = mix(uEarly, uLate, late * 0.64);
  base *= mix(0.78, 1.16, streak);
  base *= 0.9 + 0.18 * (0.5 + 0.5 * snoise(P * 0.7 + 3.0));   // board-scale tone drift
  base = mix(base, uDeep, pores * 0.22 + late * late * 0.1);

  // --- lighting (shared studio rig directions) ---------------------------
  vec3 N = normalize(vWorldNormal);
  vec3 V = normalize(cameraPosition - vWorldPos);
  float ndk = dot(N, uKeyDir);
  float key = clamp((ndk + 0.15) / 1.15, 0.0, 1.0);
  float fill = clamp((dot(N, uFillDir) + 0.3) / 1.3, 0.0, 1.0);
  float rimL = clamp(dot(N, uRimDir) * 0.5 + 0.5, 0.0, 1.0);

  // Cheap occlusion: the underside near the plinth and the inner bore.
  vec3 nObj = normalize(vObjNormal);
  float aoUnder = mix(0.35, 1.0, smoothstep(-0.9, 0.3, nObj.z));
  vec2 nCs = normalize(cs + vec2(1e-5));
  float aoBore = mix(0.74, 1.0, smoothstep(-0.95, 0.15, nCs.x));
  float ao = aoUnder * aoBore;

  vec3 diffuse = base * (uKeyColor * 0.86 * key + uFillColor * 0.2 * fill + uFillColor * 0.05) * ao;

  // Lacquer: low, broad-ish, tinted toward the wood so it never reads white.
  vec3 H = normalize(uKeyDir + V);
  float nh = max(dot(N, H), 0.0);
  // Tight clearcoat lobe over a faint broad sheen; the clamp below keeps the
  // sum under 0.96 so the highlight never blows out.
  float spec = pow(nh, 96.0) * 0.27 + pow(nh, 10.0) * 0.035;
  spec *= mix(1.0, 0.7, late) * mix(1.0, 0.6, pores) * smoothstep(-0.1, 0.3, ndk);
  vec3 specCol = mix(base, uKeyColor, 0.45);

  float fres = pow(1.0 - max(dot(N, V), 0.0), 3.0);
  vec3 rim = uRimColor * fres * (0.06 + 0.16 * rimL) * ao;

  vec3 col = diffuse + specCol * spec * ao + rim;
  col = min(col, vec3(0.96));

  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`

/** Hand-written GLSL wood grain for the turned ring. */
export function createWoodGrainMaterial() {
  // Freijó: honey earlywood, rust-brown latewood. All derived from tokens.
  const early = c(palette.brass400).lerp(c(palette.clay400), 0.45).lerp(c(palette.ink600), 0.18).multiplyScalar(0.92)
  const late = c(palette.clay600).lerp(c(palette.ink700), 0.42)
  const deep = c(palette.ink700)

  return new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      uEarly: { value: early },
      uLate: { value: late },
      uDeep: { value: deep },
      uKeyColor: { value: c(palette.linen50) },
      uFillColor: { value: c(palette.cream) },
      uRimColor: { value: c(palette.brass200) },
      uKeyDir: { value: dir(STUDIO_KEY_POSITION) },
      uFillDir: { value: dir(STUDIO_FILL_POSITION) },
      uRimDir: { value: dir(STUDIO_RIM_POSITION) },
      uMajor: { value: RING_MAJOR },
    },
  })
}

/*
  Plinth the ring rests on: a warm pool of light under the key that falls
  off into the frame's ink, so the frame edges match the background colour.
*/
const groundVertex = /* glsl */ `
varying vec3 vWorldPos;
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorldPos = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`

const groundFragment = /* glsl */ `
uniform vec3 uPool;
uniform vec3 uEdge;
uniform vec2 uCenter;
varying vec3 vWorldPos;

${simplexNoise3D}

void main() {
  float r = length(vWorldPos.xz - uCenter);
  float pool = 1.0 - smoothstep(0.3, 6.5, r);
  pool *= pool;
  // faint stone/linen tooth so the plinth never reads as a flat gradient
  float tooth = snoise(vec3(vWorldPos.xz * 9.0, 1.0)) * 0.5 + snoise(vec3(vWorldPos.xz * 31.0, 2.0)) * 0.25;
  vec3 col = mix(uEdge, uPool, pool) * (1.0 + tooth * 0.05 * pool);
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`

export function createPlinthMaterial() {
  return new THREE.ShaderMaterial({
    vertexShader: groundVertex,
    fragmentShader: groundFragment,
    uniforms: {
      uPool: { value: c(palette.ink600) },
      uEdge: { value: c(palette.ink800).lerp(c(palette.ink700), 0.6) },
      uCenter: { value: new THREE.Vector2(0.35, 0.25) },
    },
  })
}
