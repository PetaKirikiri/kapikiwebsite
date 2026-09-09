import type { LockedDesign } from '../../components/designSpaceCollection'
import { assertLockedPatternDrawing, type LockedPatternDrawing } from '../../components/patternDrawingContract'

export type ConnectorRole = 'send' | 'accept' | 'cap'
export type ConnectingRole = Exclude<ConnectorRole, 'cap'>
export type ConnectorBlueprintId = 'nominal-bite' | 'two-frond-arrow' | 'negative-triangle' | 'skinny-wave' | 'fat-wave' | 'four-frond-arrow' | 'two-frond-mangopare' | 'four-frond-mangopare' | 'object-triangle' | 'agent-triangle'
type SavedFace = Readonly<{
  snapshotId: number
  designId: LockedDesign['designId']
  materialSide: 'left' | 'right'
  fingerprint?: string
}>
export type ConnectorBlueprint = Readonly<{
  id: ConnectorBlueprintId
  label: string
  stem: 'flat' | 'rounded'
  style: 'skinny' | 'fat' | 'stem'
  faces: Readonly<Record<ConnectingRole, SavedFace | null>>
}>

// Explicit, immutable Design Lab snapshots. Saving a new draft never silently
// changes a production connection. Both orientations are saved drawings, not
// runtime rotations. A missing face is deliberately not substituted.
const waveSend: SavedFace = {
  snapshotId: 1788665000166, designId: 'koruWave4', materialSide: 'left',
  fingerprint: '9264cad2a8d79f950fbe8d9d3e6357cecbaea36febc031ed776a760fc349a1ac',
}
const fatWaveSend: SavedFace = {
  snapshotId: 1788620139540, designId: 'koruWave4', materialSide: 'left',
  fingerprint: 'f795c5747ecb61235c6294516fb65570e79df38cc05b2823e521ffea23956176',
}
const arrowSend: SavedFace = { snapshotId: 1788409525200, designId: 'arrow4', materialSide: 'left' }
const mangopareSend: SavedFace = { snapshotId: 1788179770153, designId: 'mangopare', materialSide: 'left' }
const fourFrondMangopareSnapshot = 1788232379102

export const CONNECTOR_BLUEPRINTS: readonly ConnectorBlueprint[] = Object.freeze([
  { id: 'nominal-bite', label: 'Nominal predicate bite', stem: 'flat', style: 'stem', faces: {
    send: { snapshotId: 1788915573737, designId: 'arrowBite', materialSide: 'left',
      fingerprint: 'b649c6dcbb0c8f19eaeff239c5aa222d9e870adee95f3611b1f58046979eb8ac' },
    accept: { snapshotId: 1788915619609, designId: 'arrowBiteReverse', materialSide: 'right',
      fingerprint: 'b19a993cf150a339ad3058c5fb7cd964b18bea5f1c4b462499abe6f6b294ae10' },
  } },
  { id: 'two-frond-arrow', label: 'Two-frond arrow', stem: 'flat', style: 'stem', faces: {
    send: { snapshotId: 1788915573737, designId: 'arrowBite', materialSide: 'left',
      fingerprint: 'b649c6dcbb0c8f19eaeff239c5aa222d9e870adee95f3611b1f58046979eb8ac' },
    accept: { snapshotId: 1788915619609, designId: 'arrowBiteReverse', materialSide: 'right',
      fingerprint: 'b19a993cf150a339ad3058c5fb7cd964b18bea5f1c4b462499abe6f6b294ae10' },
  } },
  { id: 'negative-triangle', label: 'Negative triangle', stem: 'flat', style: 'stem', faces: {
    send: { snapshotId: 1788890100003, designId: 'triangle2', materialSide: 'left' },
    accept: { snapshotId: 1788890100002, designId: 'triangle2', materialSide: 'right' },
  } },
  { id: 'object-triangle', label: 'Object triangle', stem: 'flat', style: 'stem', faces: {
    send: { snapshotId: 1788890100003, designId: 'triangle2', materialSide: 'left' }, accept: null,
  } },
  { id: 'agent-triangle', label: 'Doer triangle', stem: 'flat', style: 'stem', faces: {
    send: { snapshotId: 1788890100002, designId: 'triangle2', materialSide: 'left' }, accept: null,
  } },
  { id: 'skinny-wave', label: 'Skinny wave', stem: 'flat', style: 'skinny', faces: {
    send: waveSend,
    accept: { snapshotId: 1788665574475, designId: 'koruWave3', materialSide: 'right',
      fingerprint: 'c154b0a4028b165a341af2d7a6e139c6247bbf013068e09aefe88899df43eb11' },
  } },
  { id: 'fat-wave', label: 'Fat wave', stem: 'flat', style: 'fat', faces: {
    send: fatWaveSend,
    accept: { snapshotId: 1788621210021, designId: 'koruWave3', materialSide: 'right',
      fingerprint: 'dfdcf64195701c31d39d464973c2e6157a1a26671ca058f68f944c31b6cc6c9a' },
  } },
  { id: 'four-frond-arrow', label: 'Four-frond arrow', stem: 'rounded', style: 'stem', faces: {
    send: arrowSend,
    accept: { snapshotId: 1788410473040, designId: 'arrow4Reverse', materialSide: 'right' },
  } },
  { id: 'two-frond-mangopare', label: 'Two-frond Mangopare', stem: 'rounded', style: 'stem', faces: {
    send: mangopareSend, accept: null,
  } },
  { id: 'four-frond-mangopare', label: 'Four-frond Mangopare', stem: 'rounded', style: 'stem', faces: {
    send: { snapshotId: fourFrondMangopareSnapshot, designId: 'mangopare', materialSide: 'left' },
    accept: { snapshotId: fourFrondMangopareSnapshot, designId: 'mangopare', materialSide: 'right' },
  } },
])

export function connectorBlueprintFor(posCode: string | null, family: string | null): ConnectorBlueprint | null {
  const id: ConnectorBlueprintId | null = posCode === 'conditional_marker' || posCode === 'adverb'
    ? 'skinny-wave'
    : family === 'verb' ? 'skinny-wave'
    : family === 'noun' ? 'four-frond-arrow'
      : family === 'particle' ? posCode === 'tam' ? 'skinny-wave'
        : posCode === 'nominal_predicate' || posCode === 'nominal_marker' ? 'fat-wave'
        : posCode === 'object_marker' || posCode === 'determiner' ? 'four-frond-arrow'
          : posCode === 'negative' ? 'negative-triangle'
          : 'two-frond-arrow'
        : null
  return CONNECTOR_BLUEPRINTS.find((blueprint) => blueprint.id === id) ?? null
}

export type CompiledFace = Readonly<{
  status: 'ready'
  snapshotId: number
  materialSide: 'left' | 'right'
  drawing: LockedPatternDrawing
}> | Readonly<{ status: 'unavailable'; reason: string }>
export type ConnectorLibrary = ReadonlyMap<ConnectorBlueprintId, Readonly<Record<ConnectingRole, CompiledFace>>>

export function compileConnectorLibrary(collection: readonly LockedDesign[]): ConnectorLibrary {
  return new Map(CONNECTOR_BLUEPRINTS.map((blueprint) => {
    const compile = (role: ConnectingRole): CompiledFace => {
      const face = blueprint.faces[role]
      if (face == null) return { status: 'unavailable', reason: `${blueprint.label}: no saved ${role} face is approved.` }
      const matches = collection.filter((shape) => shape.id === face.snapshotId)
      const shape = matches.length === 1 ? matches[0] : undefined
      const unavailable = (): CompiledFace => ({ status: 'unavailable',
        reason: `${blueprint.label}: approved ${role} snapshot ${face.snapshotId} is missing or incompatible.` })
      if (!shape || shape.designId !== face.designId || shape.drawing.viewBox !== '0 0 96 96'
        || (face.fingerprint && shape.fingerprint !== face.fingerprint)) return unavailable()
      if (blueprint.style === 'skinny' && (shape.recipe?.source.kind !== 'wave'
        || shape.recipe.source.input.innerWidthRatio !== 0.55)) return unavailable()
      if (blueprint.style === 'fat' && (shape.recipe?.source.kind !== 'wave'
        || (shape.recipe.source.input.innerWidthRatio ?? 1) !== 1)) return unavailable()
      if (face.materialSide !== (role === 'accept' ? 'right' : 'left')) return unavailable()
      try { assertLockedPatternDrawing(shape.drawing) } catch { return unavailable() }
      return { status: 'ready', snapshotId: shape.id, materialSide: face.materialSide, drawing: shape.drawing }
    }
    return [blueprint.id, { send: compile('send'), accept: compile('accept') }] as const
  }))
}
