import { useEffect, useSyncExternalStore } from 'react'
import { localFirstRead } from '../localFirstData'
import { connectorShapeListSchema } from '../connectorShapeContract'
import { fingerprintShape } from '../connectorShapeFingerprint'
import { CONNECTOR_BLUEPRINTS, compileConnectorLibrary } from './blueprints'
import type { LockedDesign } from '../../components/designSpaceCollection'

// The blueprint contract owns the IDs. This is a disposable, verified display
// cache of those immutable database snapshots, never a second artwork owner.
export const PUBLIC_SHAPE_IDS = [...new Set(CONNECTOR_BLUEPRINTS.flatMap(blueprint =>
  Object.values(blueprint.faces).flatMap(face => face ? [face.snapshotId] : [])))].sort((a, b) => a - b)
export const PUBLIC_SHAPE_URL = `/__connector_shapes?ids=${PUBLIC_SHAPE_IDS.join(',')}`
const key = ['production-connector-shapes', 'v1', ...PUBLIC_SHAPE_IDS] as const
const listeners = new Set<() => void>()
let snapshot: Readonly<{ collection: readonly LockedDesign[]; loading: boolean; error: string | null }> = {
  collection: [], loading: true, error: null,
}
let reading: Promise<void> | null = null
export const getPublicShapes = () => snapshot
export function subscribePublicShapes(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener) } }
function publish(next: typeof snapshot) { snapshot = next; listeners.forEach(listener => listener()) }

const verifiedCollections = new WeakSet<object>()
export async function validatePublicShapes(value: unknown): Promise<readonly LockedDesign[]> {
  if (Array.isArray(value) && verifiedCollections.has(value)) return value as readonly LockedDesign[]
  const shapes = connectorShapeListSchema.parse(value) as readonly LockedDesign[]
  if (shapes.length !== PUBLIC_SHAPE_IDS.length || PUBLIC_SHAPE_IDS.some(id => shapes.filter(shape => shape.id === id).length !== 1)) {
    throw new Error('The approved connector pack is incomplete.')
  }
  await Promise.all(shapes.map(async shape => {
    if (shape.fingerprint && shape.fingerprint !== await fingerprintShape(shape)) throw new Error('Connector integrity check failed.')
  }))
  const library = compileConnectorLibrary(shapes)
  for (const blueprint of CONNECTOR_BLUEPRINTS) for (const role of ['send', 'accept'] as const) {
    if (blueprint.faces[role] && library.get(blueprint.id)?.[role].status !== 'ready') {
      throw new Error('An approved connector face is incompatible.')
    }
  }
  verifiedCollections.add(shapes)
  return shapes
}

export function loadPublicConnectorShapes(): Promise<void> {
  if (reading) return reading
  if (snapshot.collection.length) return Promise.resolve()
  publish({ ...snapshot, loading: true, error: null })
  reading = localFirstRead(key, async () => {
    const response = await fetch(PUBLIC_SHAPE_URL, { signal: AbortSignal.timeout(20000) })
    if (!response.ok) throw new Error('Connector shapes are temporarily unavailable.')
    const result = await response.json() as { shapes: unknown }
    return validatePublicShapes(result.shapes)
  }).then(async shapes => {
    // The persistent cache must pass the same contract after a new page load.
    const collection = await validatePublicShapes(shapes)
    publish({ collection, loading: false, error: null })
  }).catch((cause: unknown) => {
    publish({ ...snapshot, loading: false, error: cause instanceof Error ? cause.message : 'Could not load connector shapes.' })
  }).finally(() => { reading = null })
  return reading
}
const readOnlySave = async (_shape: LockedDesign) => false
export function usePublicConnectorShapes(_options: Readonly<{ production?: boolean }> = {}) {
  const state = useSyncExternalStore(subscribePublicShapes, getPublicShapes, getPublicShapes)
  useEffect(() => { void loadPublicConnectorShapes() }, [])
  return { ...state, saving: false, refresh: loadPublicConnectorShapes, save: readOnlySave }
}
