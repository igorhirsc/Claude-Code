import { createContext, useContext, useEffect, useMemo, type ComponentType } from 'react'
import * as THREE from 'three'
import { RoundedBox } from '@react-three/drei'
import {
  palette,
  fabricMaterial,
  boucleMaterial,
  woodMaterial,
  brassMaterial,
  ceramicMaterial,
} from '@/three/common/materials'

/* ------------------------------------------------------------------------ */
/* Catalogue categories — imported by the /colecoes page to filter products. */
/* ------------------------------------------------------------------------ */

export type CategoryId = 'sofas' | 'poltronas' | 'mesas' | 'estantes' | 'iluminacao' | 'decoracao'

export type Category = {
  id: CategoryId
  label: string
  description: string
}

export const CATEGORIES: readonly Category[] = [
  { id: 'sofas', label: 'Sofás', description: 'Linhas baixas, assento profundo e estrutura em madeira maciça.' },
  { id: 'poltronas', label: 'Poltronas', description: 'Volumes macios em bouclé e linho, feitos para ler devagar.' },
  { id: 'mesas', label: 'Mesas', description: 'Tampos em freijó e encaixes de marcenaria deixados à vista.' },
  { id: 'estantes', label: 'Estantes', description: 'Marcenaria sob medida para livros, cerâmicas e memórias.' },
  { id: 'iluminacao', label: 'Iluminação', description: 'Latão escovado e cúpulas laqueadas para uma luz baixa e quente.' },
  { id: 'decoracao', label: 'Decoração', description: 'Cerâmica de torno e capim dourado do Jalapão, peça a peça.' },
] as const

/* ------------------------------------------------------------------------ */
/* Authoring constants                                                       */
/* ------------------------------------------------------------------------ */

/**
 * Each icon is authored roughly centred on its own origin, with its lowest
 * point (feet / base) at y = SHADOW_Y[id]. Every mesh below is positioned
 * relative to that constant, so this table *is* the geometry's floor — not a
 * hand-tuned guess. The scene places the contact shadow at
 * `SHADOW_Y[id] * ICON_SCALE[id] * cellScale` so it touches every object.
 */
export const SHADOW_Y: Record<CategoryId, number> = {
  // legs 0.12 + plinth 0.26 + back 0.43 → top at F + 0.81
  sofas: -0.405,
  // base sits directly on the floor; back top at F + 0.92
  poltronas: -0.46,
  // leg 0.72 + top 0.06 → top at F + 0.78
  mesas: -0.39,
  // feet 0.08 + carcass 1.42 → top at F + 1.50
  estantes: -0.75,
  // base disc → shade crown at about F + 1.30
  iluminacao: -0.65,
  // vase body 0.87 + golden-grass stems → tips at about F + 1.32
  decoracao: -0.66,
}

/** Normalises visual weight so a long sofa and a tall shelf read equally. */
export const ICON_SCALE: Record<CategoryId, number> = {
  sofas: 0.78,
  poltronas: 1.12,
  mesas: 0.9,
  estantes: 0.86,
  iluminacao: 1.08,
  decoracao: 0.94,
}

/**
 * Floor footprint in local units (width along x, depth along z, centre),
 * used to shape the contact shadow to the object's real base.
 */
export const SHADOW_FOOTPRINT: Record<CategoryId, { w: number; d: number; cx: number; cz: number }> = {
  sofas: { w: 2.24, d: 0.92, cx: 0, cz: 0 },
  poltronas: { w: 1.22, d: 1.08, cx: 0, cz: 0 },
  mesas: { w: 1.9, d: 0.95, cx: 0, cz: 0 },
  estantes: { w: 1.05, d: 0.38, cx: 0, cz: 0 },
  iluminacao: { w: 0.62, d: 0.56, cx: -0.2, cz: 0 },
  decoracao: { w: 1.04, d: 0.52, cx: 0.04, cz: 0 },
}

/**
 * Small contact blobs under each foot (local x, z, radius), so leggy pieces
 * get a crisp touch-point where they meet the floor, not just a soft pool.
 * Coordinates are the same leg positions used by the geometry below.
 */
export const SHADOW_CONTACTS: Record<CategoryId, [number, number, number][]> = {
  sofas: [
    [-0.98, 0.33, 0.07],
    [0.98, 0.33, 0.07],
    [-0.98, -0.33, 0.07],
    [0.98, -0.33, 0.07],
  ],
  poltronas: [],
  mesas: [
    [-0.8, 0.36, 0.075],
    [0.8, 0.36, 0.075],
    [-0.8, -0.36, 0.075],
    [0.8, -0.36, 0.075],
  ],
  estantes: [
    [-0.45, 0.13, 0.05],
    [0.45, 0.13, 0.05],
    [-0.45, -0.13, 0.05],
    [0.45, -0.13, 0.05],
  ],
  iluminacao: [],
  decoracao: [],
}

/** Resting three-quarter view per icon (yaw). Pitch is shared by the scene. */
export const BASE_YAW: Record<CategoryId, number> = {
  sofas: -0.36,
  poltronas: -0.62,
  mesas: -0.4,
  estantes: -0.48,
  iluminacao: -0.42,
  decoracao: -0.3,
}

/* ------------------------------------------------------------------------ */
/* Shared materials                                                          */
/* ------------------------------------------------------------------------ */

type IconMaterials = ReturnType<typeof buildMaterials>

function buildMaterials() {
  const phys = (p: THREE.MeshPhysicalMaterialParameters) => new THREE.MeshPhysicalMaterial(p)
  return {
    sofaFabric: phys(fabricMaterial(palette.clay400)),
    boucle: phys(boucleMaterial(palette.linen200)),
    walnut: phys(woodMaterial(palette.clay600)),
    freijo: phys(woodMaterial(palette.brass500)),
    brass: phys(brassMaterial()),
    lacquer: phys(woodMaterial(palette.moss500, { roughness: 0.3, clearcoat: 0.8, clearcoatRoughness: 0.15 })),
    shadeInner: new THREE.MeshStandardMaterial({
      color: palette.linen200,
      emissive: palette.brass300,
      emissiveIntensity: 0.35,
      roughness: 0.8,
      side: THREE.BackSide,
    }),
    // Tone-mapped on purpose: warm glow without clipping to white.
    bulb: new THREE.MeshStandardMaterial({
      color: palette.brass300,
      emissive: palette.brass400,
      emissiveIntensity: 2.0,
      roughness: 0.4,
    }),
    ceramicClay: phys(ceramicMaterial(palette.clay500)),
    ceramicCream: phys(ceramicMaterial(palette.linen100)),
    goldenGrass: phys(fabricMaterial(palette.brass300, { roughness: 0.6, sheen: 0.8 })),
    bookLinen: phys(fabricMaterial(palette.linen300, { sheen: 0.4 })),
    bookClay: phys(fabricMaterial(palette.clay500, { sheen: 0.4 })),
    bookMoss: phys(fabricMaterial(palette.moss500, { sheen: 0.5 })),
    bookBrass: phys(fabricMaterial(palette.brass200, { sheen: 0.4 })),
  }
}

const MaterialsContext = createContext<IconMaterials | null>(null)

/** One material set for all six icons; disposed when the scene unmounts. */
export function IconMaterialsProvider({ children }: { children: React.ReactNode }) {
  const mats = useMemo(() => buildMaterials(), [])
  useEffect(() => () => Object.values(mats).forEach((m) => m.dispose()), [mats])
  return <MaterialsContext.Provider value={mats}>{children}</MaterialsContext.Provider>
}

function useMats() {
  const m = useContext(MaterialsContext)
  if (!m) throw new Error('Category icons must render inside <IconMaterialsProvider>')
  return m
}

/* ------------------------------------------------------------------------ */
/* Icons                                                                     */
/* ------------------------------------------------------------------------ */

/** Sofá — long, low and rectilinear: track arms, two seat cushions, legs. */
export function SofaIcon() {
  const m = useMats()
  const F = SHADOW_Y.sofas
  const legs: [number, number][] = [
    [-0.98, 0.33],
    [0.98, 0.33],
    [-0.98, -0.33],
    [0.98, -0.33],
  ]
  return (
    <group>
      {legs.map(([x, z]) => (
        <mesh key={`${x}${z}`} position={[x, F + 0.065, z]} material={m.walnut}>
          <cylinderGeometry args={[0.038, 0.03, 0.13, 16]} />
        </mesh>
      ))}
      {/* plinth: F+0.12 → F+0.38 */}
      <RoundedBox args={[2.24, 0.26, 0.92]} radius={0.05} smoothness={4} position={[0, F + 0.25, 0]} material={m.sofaFabric} />
      {/* backrest, overlapping the plinth by 0.03 */}
      <RoundedBox args={[2.24, 0.46, 0.24]} radius={0.08} smoothness={4} position={[0, F + 0.58, -0.34]} material={m.sofaFabric} />
      {/* track arms */}
      {[-1.02, 1.02].map((x) => (
        <RoundedBox key={x} args={[0.2, 0.46, 0.92]} radius={0.06} smoothness={4} position={[x, F + 0.37, 0]} material={m.sofaFabric} />
      ))}
      {/* seat cushions sink 0.02 into the plinth */}
      {[-0.46, 0.46].map((x) => (
        <RoundedBox key={x} args={[0.9, 0.17, 0.74]} radius={0.07} smoothness={4} position={[x, F + 0.445, 0.07]} material={m.sofaFabric} />
      ))}
      {/* back cushions, leaning slightly */}
      {[-0.46, 0.46].map((x) => (
        <RoundedBox
          key={x}
          args={[0.9, 0.32, 0.16]}
          radius={0.07}
          smoothness={4}
          position={[x, F + 0.64, -0.17]}
          rotation={[-0.12, 0, 0]}
          material={m.sofaFabric}
        />
      ))}
    </group>
  )
}

/** Poltrona — a chunky bouclé "cloud": deep, rounded, almost cubic. */
export function ArmchairIcon() {
  const m = useMats()
  const F = SHADOW_Y.poltronas
  return (
    <group>
      {/* base block sits on the floor: F → F+0.44 */}
      <RoundedBox args={[1.2, 0.44, 1.06]} radius={0.19} smoothness={5} position={[0, F + 0.22, 0]} material={m.boucle} />
      {/* back pillow: F+0.30 → F+0.92, sunk deep into the base */}
      <RoundedBox args={[1.2, 0.62, 0.38]} radius={0.18} smoothness={5} position={[0, F + 0.61, -0.34]} material={m.boucle} />
      {/* fat arm pillows overlap base and back generously */}
      {[-0.44, 0.44].map((x) => (
        <RoundedBox key={x} args={[0.34, 0.6, 1.06]} radius={0.17} smoothness={5} position={[x, F + 0.38, 0.0]} material={m.boucle} />
      ))}
      {/* seat cushion, tucked between the arms */}
      <RoundedBox args={[0.62, 0.22, 0.82]} radius={0.1} smoothness={5} position={[0, F + 0.47, 0.1]} material={m.boucle} />
    </group>
  )
}

/** Mesa — freijó dining table: slab top, apron, four tapered legs. */
export function TableIcon() {
  const m = useMats()
  const F = SHADOW_Y.mesas
  const LEG_H = 0.72
  const legs: [number, number][] = [
    [-0.8, 0.36],
    [0.8, 0.36],
    [-0.8, -0.36],
    [0.8, -0.36],
  ]
  return (
    <group>
      {legs.map(([x, z]) => (
        <mesh key={`${x}${z}`} position={[x, F + LEG_H / 2, z]} material={m.freijo}>
          {/* tapered: 0.05 under the top, 0.032 at the floor */}
          <cylinderGeometry args={[0.05, 0.032, LEG_H, 20]} />
        </mesh>
      ))}
      {/* apron, overlapping the legs and the underside of the top */}
      <RoundedBox args={[1.66, 0.09, 0.78]} radius={0.015} smoothness={2} position={[0, F + LEG_H - 0.02, 0]} material={m.freijo} />
      {/* top: F+0.72 → F+0.78 */}
      <RoundedBox args={[1.9, 0.06, 0.95]} radius={0.022} smoothness={3} position={[0, F + LEG_H + 0.03, 0]} material={m.freijo} />
    </group>
  )
}

type Book = { x: number; w: number; h: number; mat: keyof IconMaterials; tilt?: number }

/** Estante — open walnut bookcase, styled with books and a small pot. */
export function ShelfIcon() {
  const m = useMats()
  const F = SHADOW_Y.estantes
  const BOARD = 0.04
  const DEPTH = 0.36
  // board centre heights (each board spans ±0.02)
  const boards = [F + 0.1, F + 0.55, F + 1.0, F + 1.48]
  const shelfTop = (i: number) => boards[i] + BOARD / 2
  const row1: Book[] = [
    { x: -0.41, w: 0.06, h: 0.34, mat: 'bookClay' },
    { x: -0.345, w: 0.05, h: 0.3, mat: 'bookLinen' },
    { x: -0.285, w: 0.06, h: 0.36, mat: 'bookMoss' },
    { x: -0.22, w: 0.05, h: 0.31, mat: 'bookBrass' },
    { x: -0.12, w: 0.05, h: 0.3, mat: 'bookLinen', tilt: -0.32 },
  ]
  const row3: Book[] = [
    { x: 0.17, w: 0.05, h: 0.3, mat: 'bookBrass' },
    { x: 0.23, w: 0.06, h: 0.34, mat: 'bookClay' },
    { x: 0.295, w: 0.05, h: 0.28, mat: 'bookLinen' },
    { x: 0.36, w: 0.06, h: 0.33, mat: 'bookMoss' },
  ]
  const renderBook = (b: Book, base: number) => (
    <mesh
      key={`${base}${b.x}`}
      // a tilted book pivots on its lower-left corner so it still rests on the board
      position={[b.x + (b.tilt ? Math.sin(-b.tilt) * (b.h / 2) : 0), base + (b.h / 2) * Math.cos(b.tilt ?? 0), 0.02]}
      rotation={[0, 0, b.tilt ?? 0]}
      material={m[b.mat]}
    >
      <boxGeometry args={[b.w, b.h, 0.26]} />
    </mesh>
  )
  return (
    <group>
      {/* feet: F → F+0.08 */}
      {[-0.45, 0.45].flatMap((x) =>
        [-0.13, 0.13].map((z) => (
          <mesh key={`${x}${z}`} position={[x, F + 0.04, z]} material={m.walnut}>
            <cylinderGeometry args={[0.025, 0.02, 0.08, 12]} />
          </mesh>
        )),
      )}
      {/* side panels F+0.08 → F+1.50 */}
      {[-0.5, 0.5].map((x) => (
        <RoundedBox key={x} args={[0.05, 1.42, DEPTH]} radius={0.012} smoothness={2} position={[x, F + 0.79, 0]} material={m.walnut} />
      ))}
      {boards.map((y) => (
        <RoundedBox key={y} args={[1.0, BOARD, DEPTH]} radius={0.01} smoothness={2} position={[0, y, 0]} material={m.walnut} />
      ))}
      {/* thin back rail for rigidity */}
      <mesh position={[0, F + 1.2, -DEPTH / 2 + 0.015]} material={m.walnut}>
        <boxGeometry args={[0.98, 0.05, 0.02]} />
      </mesh>

      {row1.map((b) => renderBook(b, shelfTop(0)))}
      {/* shelf 1, right: ceramic pot */}
      <mesh position={[0.25, shelfTop(0) + 0.11, 0]} scale={[1, 0.86, 1]} material={m.ceramicClay}>
        <sphereGeometry args={[0.13, 32, 24]} />
      </mesh>

      {/* shelf 2: horizontal stack + brass sphere */}
      {[
        { w: 0.36, h: 0.05, mat: 'bookLinen' as const },
        { w: 0.32, h: 0.045, mat: 'bookClay' as const },
        { w: 0.34, h: 0.05, mat: 'bookMoss' as const },
      ].map((b, i) => (
        <mesh key={i} position={[-0.22, shelfTop(1) + 0.025 + i * 0.048, 0.02]} rotation={[0, i * 0.08 - 0.05, 0]} material={m[b.mat]}>
          <boxGeometry args={[b.w, b.h, 0.24]} />
        </mesh>
      ))}
      <mesh position={[-0.22, shelfTop(1) + 0.144 + 0.07, 0.02]} material={m.brass}>
        <sphereGeometry args={[0.07, 32, 24]} />
      </mesh>
      <mesh position={[0.24, shelfTop(1) + 0.13, 0]} material={m.ceramicCream}>
        <cylinderGeometry args={[0.09, 0.11, 0.26, 32]} />
      </mesh>

      {row3.map((b) => renderBook(b, shelfTop(2)))}
      <mesh position={[-0.25, shelfTop(2) + 0.06, 0]} scale={[1, 0.7, 1]} material={m.ceramicCream}>
        <sphereGeometry args={[0.12, 32, 24]} />
      </mesh>
    </group>
  )
}

/** Iluminação — brass task lamp with a lacquered shade and a warm bulb. */
export function LampIcon() {
  const m = useMats()
  const F = SHADOW_Y.iluminacao
  const BASE_X = -0.2
  const joint = new THREE.Vector3(BASE_X, F + 1.04, 0)
  const end = new THREE.Vector3(0.34, F + 1.2, 0)
  const arm = end.clone().sub(joint)
  const armLen = arm.length()
  const armMid = joint.clone().add(end).multiplyScalar(0.5)
  const armRotZ = -Math.atan2(arm.x, arm.y)
  // shade: open cone, mouth tilted 55° down-and-forward so the bulb shows
  const TILT = 0.96
  const SHADE_H = 0.3
  const axisDown = new THREE.Vector3(0, -Math.cos(TILT), Math.sin(TILT))
  const shadeCentre = end.clone().addScaledVector(axisDown, SHADE_H / 2 + 0.02)
  const bulbPos = shadeCentre.clone().addScaledVector(axisDown, 0.04)
  return (
    <group>
      {/* weighted base: F → F+0.05 */}
      <mesh position={[BASE_X, F + 0.025, 0]} material={m.brass}>
        <cylinderGeometry args={[0.26, 0.27, 0.05, 48]} />
      </mesh>
      <mesh position={[BASE_X, F + 0.06, 0]} material={m.brass}>
        <cylinderGeometry args={[0.06, 0.08, 0.04, 32]} />
      </mesh>
      {/* stem */}
      <mesh position={[BASE_X, F + 0.55, 0]} material={m.brass}>
        <cylinderGeometry args={[0.02, 0.022, 0.98, 16]} />
      </mesh>
      <mesh position={joint} material={m.brass}>
        <sphereGeometry args={[0.042, 24, 16]} />
      </mesh>
      {/* arm */}
      <mesh position={armMid} rotation={[0, 0, armRotZ]} material={m.brass}>
        <cylinderGeometry args={[0.016, 0.016, armLen, 12]} />
      </mesh>
      <mesh position={end} material={m.brass}>
        <sphereGeometry args={[0.034, 24, 16]} />
      </mesh>
      {/* shade */}
      <group position={shadeCentre} rotation={[-TILT, 0, 0]}>
        <mesh material={m.lacquer}>
          <cylinderGeometry args={[0.065, 0.22, SHADE_H, 48, 1, true]} />
        </mesh>
        <mesh material={m.shadeInner}>
          <cylinderGeometry args={[0.062, 0.214, SHADE_H - 0.005, 48, 1, true]} />
        </mesh>
        {/* crown cap closes the narrow end */}
        <mesh position={[0, SHADE_H / 2, 0]} material={m.brass}>
          <cylinderGeometry args={[0.05, 0.068, 0.04, 32]} />
        </mesh>
      </group>
      <mesh position={bulbPos} material={m.bulb}>
        <sphereGeometry args={[0.075, 32, 24]} />
      </mesh>
    </group>
  )
}

const VASE_PROFILE = [
  [0.0, 0.0],
  [0.15, 0.0],
  [0.19, 0.03],
  [0.235, 0.16],
  [0.25, 0.32],
  [0.22, 0.5],
  [0.14, 0.66],
  [0.075, 0.76],
  [0.068, 0.83],
  [0.085, 0.87],
  [0.07, 0.87],
  [0.058, 0.8],
].map(([r, y]) => new THREE.Vector2(r, y))

/** Decoração — thrown ceramic vase with golden grass, books and a pot. */
export function DecorIcon() {
  const m = useMats()
  const F = SHADOW_Y.decoracao
  const VASE_X = -0.22
  const NECK_Y = F + 0.84
  const stems = [
    { len: 0.5, rz: 0.22, rx: 0.05 },
    { len: 0.44, rz: -0.12, rx: -0.08 },
    { len: 0.42, rz: 0.42, rx: 0.12 },
    { len: 0.36, rz: -0.34, rx: 0.02 },
  ]
  return (
    <group>
      {/* tall thrown vase: F → F+0.87 */}
      <mesh position={[VASE_X, F, 0]} material={m.ceramicClay}>
        <latheGeometry args={[VASE_PROFILE, 64]} />
      </mesh>
      {stems.map((s, i) => {
        const dir = new THREE.Vector3(0, 1, 0).applyEuler(new THREE.Euler(s.rx, 0, s.rz))
        const mid = new THREE.Vector3(VASE_X, NECK_Y, 0).addScaledVector(dir, s.len / 2)
        const tip = new THREE.Vector3(VASE_X, NECK_Y, 0).addScaledVector(dir, s.len)
        return (
          <group key={i}>
            <mesh position={mid} rotation={[s.rx, 0, s.rz]} material={m.goldenGrass}>
              <cylinderGeometry args={[0.006, 0.009, s.len, 6]} />
            </mesh>
            <mesh position={tip} material={m.goldenGrass}>
              <sphereGeometry args={[0.04, 16, 12]} />
            </mesh>
          </group>
        )
      })}
      {/* stacked art books: F → F+0.12 */}
      <RoundedBox args={[0.5, 0.06, 0.34]} radius={0.008} smoothness={2} position={[0.3, F + 0.03, 0]} rotation={[0, 0.1, 0]} material={m.bookLinen} />
      <RoundedBox args={[0.44, 0.05, 0.3]} radius={0.008} smoothness={2} position={[0.3, F + 0.085, 0.01]} rotation={[0, -0.08, 0]} material={m.bookClay} />
      {/* squat cream pot on the books */}
      <mesh position={[0.3, F + 0.11 + 0.13 * 0.8, 0.01]} scale={[1, 0.8, 1]} material={m.ceramicCream}>
        <sphereGeometry args={[0.15, 40, 28]} />
      </mesh>
      <mesh position={[0.3, F + 0.11 + 0.13 * 0.8 * 2 + 0.01, 0.01]} material={m.ceramicCream}>
        <cylinderGeometry args={[0.05, 0.06, 0.05, 32]} />
      </mesh>
    </group>
  )
}

export const CATEGORY_ICONS: Record<CategoryId, ComponentType> = {
  sofas: SofaIcon,
  poltronas: ArmchairIcon,
  mesas: TableIcon,
  estantes: ShelfIcon,
  iluminacao: LampIcon,
  decoracao: DecorIcon,
}
