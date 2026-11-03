/// <reference lib="webworker" />
import { armchairBodyMesh } from './upholstery'

/** Meshing the upholstery takes ~0.5–1 s of pure math; keep it off the main thread. */
self.onmessage = () => {
  const m = armchairBodyMesh()
  ;(self as unknown as DedicatedWorkerGlobalScope).postMessage(m, [
    m.positions.buffer,
    m.normals.buffer,
    m.uvs.buffer,
    m.indices.buffer,
  ])
}
