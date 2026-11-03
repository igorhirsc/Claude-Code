import { armchairBodyMesh, type MeshArrays } from './upholstery'

let pending: Promise<MeshArrays> | null = null

/**
 * The upholstered body, meshed once per page load in a Web Worker and shared
 * by every scene that shows the Aurora (home configurator + catalogue quick
 * view). Falls back to meshing on the main thread if workers are unavailable.
 */
export function loadArmchairBody(): Promise<MeshArrays> {
  if (pending) return pending
  pending = new Promise<MeshArrays>((resolve) => {
    try {
      const worker = new Worker(new URL('./upholstery.worker.ts', import.meta.url), { type: 'module' })
      worker.onmessage = (e: MessageEvent<MeshArrays>) => {
        resolve(e.data)
        worker.terminate()
      }
      worker.onerror = () => {
        worker.terminate()
        resolve(armchairBodyMesh())
      }
      worker.postMessage(null)
    } catch {
      resolve(armchairBodyMesh())
    }
  })
  return pending
}
