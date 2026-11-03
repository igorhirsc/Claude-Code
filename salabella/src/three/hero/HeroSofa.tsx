import { useEffect, useMemo } from 'react'
import { brassMaterial, fabricMaterial, woodMaterial } from '@/three/common/materials'
import { softBox } from './geometry'
import { ARM_INNER, ARM_X, SEAT_TUCK, SOFA, backTransform, upholsteryColor, woodColor } from './sofaSpec'

function Leg({ x, z, lite }: { x: number; z: number; lite: boolean }) {
  const h = SOFA.legH + 0.004
  const sx = Math.sign(x)
  const sz = Math.sign(z)
  const seg = lite ? 14 : 28
  // Splay: the foot kicks outward, mid-century style, pivoting at the tray.
  return (
    <group position={[x, SOFA.legH, z]} rotation={[-sz * SOFA.legSplay, 0, sx * SOFA.legSplay]}>
      <mesh position={[0, -h / 2, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.026, 0.0165, h, seg, 1]} />
        <meshPhysicalMaterial {...woodMaterial(woodColor)} />
      </mesh>
      {/* brass sabot cuff on the foot */}
      <mesh position={[0, -h + 0.019, 0]} castShadow>
        <cylinderGeometry args={[0.0188, 0.0176, 0.038, seg, 1]} />
        <meshPhysicalMaterial {...brassMaterial({ roughness: 0.32 })} />
      </mesh>
      <mesh position={[0, -h + 0.0385, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.0186, 0.0016, 8, seg]} />
        <meshPhysicalMaterial {...brassMaterial({ roughness: 0.22 })} />
      </mesh>
    </group>
  )
}

export function HeroSofa({ lite = false }: { lite?: boolean }) {
  const geos = useMemo(() => {
    const s = lite ? 0.6 : 1
    const q = (n: number) => Math.max(6, Math.round(n * s))
    const armD = SOFA.arm.zFront - SOFA.arm.zBack
    const seatW = (ARM_INNER + SEAT_TUCK) * 2
    const seatD = SOFA.seat.zFront - SOFA.seat.zBack
    return {
      tray: softBox(SOFA.width, SOFA.trayH, SOFA.depth, 0.014, { seg: [q(20), 6, q(12)] }),
      arm: softBox(SOFA.arm.w, SOFA.arm.h, armD, SOFA.arm.r, { seg: [q(10), q(18), q(26)], crownY: 0.008 }),
      seat: softBox(seatW, SOFA.seat.h, seatD, SOFA.seat.r, {
        seg: [q(44), q(12), q(28)],
        crownY: SOFA.seat.crown,
      }),
      back: softBox(SOFA.width - 0.02, SOFA.back.h, SOFA.back.d, SOFA.back.r, {
        seg: [q(48), q(22), q(10)],
        crownZ: SOFA.back.crown,
      }),
    }
  }, [lite])
  useEffect(() => () => Object.values(geos).forEach((g) => g.dispose()), [geos])

  const fabric = fabricMaterial(upholsteryColor, { roughness: 0.88, sheenRoughness: 0.62 })
  const armZ = (SOFA.arm.zBack + SOFA.arm.zFront) / 2
  const back = backTransform()

  return (
    <group>
      {/* wooden tray the upholstery sits in */}
      <mesh geometry={geos.tray} position={[0, SOFA.legH + SOFA.trayH / 2, 0]} castShadow receiveShadow>
        <meshPhysicalMaterial {...woodMaterial(woodColor)} />
      </mesh>

      {/* ONE continuous backrest volume — no split cushions, no seam. */}
      <mesh geometry={geos.back} position={back.position} rotation={back.rotation} castShadow receiveShadow>
        <meshPhysicalMaterial {...fabric} />
      </mesh>

      {/* ONE continuous bench seat, tucked into the arms and the back. */}
      <mesh
        geometry={geos.seat}
        position={[0, SOFA.base + SOFA.seat.h / 2, (SOFA.seat.zBack + SOFA.seat.zFront) / 2]}
        castShadow
        receiveShadow
      >
        <meshPhysicalMaterial {...fabric} />
      </mesh>

      {[-1, 1].map((s) => (
        <mesh
          key={s}
          geometry={geos.arm}
          position={[s * ARM_X, SOFA.base + SOFA.arm.h / 2, armZ]}
          castShadow
          receiveShadow
        >
          <meshPhysicalMaterial {...fabric} />
        </mesh>
      ))}

      {[-1, 1].flatMap((sx) =>
        [-1, 1].map((sz) => (
          <Leg key={`${sx}${sz}`} x={sx * SOFA.legInset.x} z={sz * SOFA.legInset.z} lite={lite} />
        )),
      )}
    </group>
  )
}
