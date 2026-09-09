import { assertLockedPatternDrawing, type LockedPatternDrawing } from './patternDrawingContract'
import { connectorShapeListSchema } from '../lib/connectorShapeContract'
import type { DesignRecipe } from './designRecipe'
import { fingerprintShape } from '../lib/connectorShapeFingerprint'
import { compileConnectorLibrary } from '../lib/connectorPresentation/blueprints'

export type DesignSpaceDesignId = 'arrow' | 'arrowBite' | 'arrowBiteReverse' | 'arrowReverse' | 'arrow4' | 'arrow4Reverse'
  | 'mangopare' | 'koruWave' | 'koruWave2' | 'koruWave3' | 'koruWave4' | 'triangle' | 'triangle2'
export type LockedDesign = Readonly<{
  id: number
  designId: DesignSpaceDesignId
  name: string
  drawing: LockedPatternDrawing
  recipe?: DesignRecipe
  fingerprint?: string
}>
export const DESIGN_COLLECTION_KEY = 'connectors.design-space.collection.v1'
export const PRODUCTION_DESIGN_COLLECTION_KEY = 'connectors.production-shapes.complete.v1'

const requiredProductionFaces = Object.freeze([
  ['two-frond-arrow', 'send'], ['two-frond-arrow', 'accept'],
  ['negative-triangle', 'accept'],
  ['skinny-wave', 'send'], ['skinny-wave', 'accept'],
  ['fat-wave', 'send'], ['fat-wave', 'accept'],
] as const)

function productionCollectionFrom(collection: readonly LockedDesign[]): readonly LockedDesign[] {
  const library = compileConnectorLibrary(collection)
  const ids = new Set<number>()
  for (const [blueprintId, role] of requiredProductionFaces) {
    const face = library.get(blueprintId)?.[role]
    if (face?.status === 'ready') ids.add(face.snapshotId)
  }
  return collection.filter(({ id }) => ids.has(id))
}

export function isCompleteProductionCollection(collection: readonly LockedDesign[]): boolean {
  const library = compileConnectorLibrary(collection)
  return requiredProductionFaces.every(([blueprintId, role]) => library.get(blueprintId)?.[role].status === 'ready')
}

/** Select current versions without discarding the append-only saved history. */
export function latestDesignVersions(collection: readonly LockedDesign[]): readonly LockedDesign[] {
  const latest = new Map<string, LockedDesign>()
  for (const design of collection) {
    const isWave = design.designId.startsWith('koruWave')
    const style = design.recipe?.source.kind === 'wave'
      && (design.recipe.source.input.innerWidthRatio ?? 1) < 1 ? 'Skinny' : 'Fat'
    const key = isWave ? `${design.designId}:${style}`
      : design.designId === 'mangopare' ? `${design.designId}:${design.name}` : design.designId
    const previous = latest.get(key)
    if (!previous || design.id > previous.id) latest.set(key, isWave
      ? { ...design, name: `${design.name.replace(/ · (Fat|Skinny)$/, '')} · ${style}` } : design)
  }
  return [...latest.values()]
}

let loadingCollection: Promise<readonly LockedDesign[]> | null = null
let cacheVersion = 0

/** Reads are shared between consumers. Legacy import only sends missing snapshots. */
export function loadDesignSpaceCollection(): Promise<readonly LockedDesign[]> {
  if (loadingCollection) return loadingCollection
  const legacy = readDesignSpaceCollection()
  loadingCollection = (async () => {
    const saved = await syncDesignSpaceCollection()
    {
      const ids = new Set(saved.map(({ id }) => id))
      const missing = legacy.filter(({ id }) => !ids.has(id))
      try {
        const result = missing.length ? await syncDesignSpaceCollection(missing) : saved
        return result
      } catch (error) {
        // Preserve recoverable local snapshots until the import is acknowledged.
        try { window.localStorage.setItem(DESIGN_COLLECTION_KEY, JSON.stringify([...saved, ...missing])) } catch { /* Cache only. */ }
        throw error
      }
    }
  })().finally(() => { loadingCollection = null })
  return loadingCollection
}

export async function syncDesignSpaceCollection(shapes: readonly LockedDesign[] = []): Promise<readonly LockedDesign[]> {
  const version = ++cacheVersion
  const upload = await Promise.all(shapes.map(async (shape) => shape.recipe
    ? { ...shape, fingerprint: await fingerprintShape(shape) } : shape))
  const response = await fetch('/__connector_shapes', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ shapes: upload }), signal: AbortSignal.timeout(30000),
  })
  const result = await response.json() as { shapes?: unknown; error?: string }
  if (!response.ok) throw new Error(result.error ?? 'The shared shape library could not be reached.')
  const saved = connectorShapeListSchema.parse(result.shapes) as readonly LockedDesign[]
  for (const shape of saved) {
    if (shape.fingerprint && shape.fingerprint !== await fingerprintShape(shape)) {
      throw new Error(`The saved drawing for ${shape.name} failed its integrity check.`)
    }
  }
  const serialized = JSON.stringify(saved)
  // Approved snapshot IDs are immutable, so any verified complete response is
  // safe to keep even if a newer Design Space history request finished first.
  if (isCompleteProductionCollection(saved)) {
    const production = JSON.stringify(productionCollectionFrom(saved))
    try {
      window.localStorage.setItem(PRODUCTION_DESIGN_COLLECTION_KEY, production)
    } catch {
      // Older builds cached the entire append-only Design Space history, which
      // can consume the browser quota. The server has just returned that full
      // history successfully, so discard only the redundant local copy and
      // reserve local storage for the small production pack.
      try {
        window.localStorage.removeItem(DESIGN_COLLECTION_KEY)
        window.localStorage.setItem(PRODUCTION_DESIGN_COLLECTION_KEY, production)
      } catch { /* Disposable cache only. */ }
    }
  }
  if (version === cacheVersion) {
    try {
      window.localStorage.setItem(DESIGN_COLLECTION_KEY, serialized)
    } catch { /* Disposable cache only. */ }
  }
  return saved
}

function readCollectionKey(key: string): readonly LockedDesign[] {
  if (typeof window === 'undefined') return []
  try {
    const value: unknown = JSON.parse(window.localStorage.getItem(key) ?? '[]')
    if (!Array.isArray(value)) return []
    return Object.freeze(value.flatMap((candidate): LockedDesign[] => {
      if (candidate == null || typeof candidate !== 'object') return []
      try {
        const locked = candidate as LockedDesign
        if (!Number.isFinite(locked.id) || typeof locked.name !== 'string'
          || typeof locked.designId !== 'string' || typeof locked.drawing?.path !== 'string'
          || typeof locked.drawing.viewBox !== 'string' || locked.drawing.drawing == null) return []
        assertLockedPatternDrawing(locked.drawing)
        const name = locked.designId === 'mangopare'
          && locked.drawing.sourceContractKey === 'mangopare.composition.experimental.v49'
          ? 'Mangopare · 2 fronds' : locked.name
        return [Object.freeze({ ...locked, name })]
      } catch { return [] }
    }))
  } catch { return [] }
}

export function readDesignSpaceCollection(): readonly LockedDesign[] {
  return readCollectionKey(DESIGN_COLLECTION_KEY)
}

export function readProductionDesignSpaceCollection(): readonly LockedDesign[] {
  const collection = readCollectionKey(PRODUCTION_DESIGN_COLLECTION_KEY)
  return isCompleteProductionCollection(collection) ? collection : []
}
