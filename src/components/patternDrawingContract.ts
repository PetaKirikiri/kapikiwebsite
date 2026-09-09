import { LOCKED_PATTERN_SOURCE_HISTORY } from './lockedPatternSourceHistory'

export const LOCKED_PATTERN_SOURCE_REGISTRY = Object.freeze({
  'arrow.bite.experimental.v1': Object.freeze({
    version: 1, locked: true, equationRevision: 'source-arm-exterior-fill-without-stem-v1',
  }),
  'connector.equilateral-midpoint-triangle.v1': Object.freeze({
    version: 1, locked: true, equationRevision: 'equilateral-midpoint-triangle-no-stem-v1',
  }),
  'connector.full-size-triangle.v1': Object.freeze({
    version: 1, locked: true, equationRevision: 'original-midpoint-triangle-no-stem-v1',
  }),
  'connector.wave4-corner.v1': Object.freeze({
    version: 1, locked: true, equationRevision: 'source-derived-top-left-exterior-v1',
  }),
  'koru.fibonacci.v1': Object.freeze({
    version: 1,
    locked: true,
    equationRevision: 'golden-radial-roller-v1',
  }),
  'mangopare.v1': Object.freeze({
    version: 17,
    locked: true,
    equationRevision: 'arrow-matched-outer-frond-v17',
  }),
  'arrow.v1': Object.freeze({
    version: 2,
    locked: true,
    equationRevision: 'canonical-body-and-stem-envelope-v2',
  }),
  'connector.verb-koru.v1': Object.freeze({
    version: 4,
    locked: true,
    equationRevision: 'proportion-preserved-fibonacci-wave-v4',
  }),
  'connector.noun-triangle.v1': Object.freeze({
    version: 4,
    locked: true,
    equationRevision: 'canonical-body-and-stem-envelope-v4',
  }),
  'connector.noun-triangle-centre.v1': Object.freeze({
    version: 1,
    locked: true,
    equationRevision: 'outer-edge-midpoint-centre-cutout-v5',
  }),
  'trajectory.quintic-hermite.experimental.v1': Object.freeze({
    version: 1,
    locked: true,
    equationRevision: 'quintic-hermite-trajectory-v1',
  }),
  'trajectory.ballistic.experimental.v1': Object.freeze({
    version: 1,
    locked: true,
    equationRevision: 'single-projectile-equation-v1',
  }),
  'mangopare.composition.experimental.v49': Object.freeze({
    version: 49, locked: true, equationRevision: 'curvature-rate-matched-umbrella-v49',
  }),
  'mangopare.four-fronds.experimental.v1': Object.freeze({
    version: 1, locked: true, equationRevision: 'v49-base-plus-source-derived-inner-pair-v1',
  }),
  'mangopare.four-to-two.experimental.v1': Object.freeze({
    version: 1, locked: true, equationRevision: 'four-frond-source-minus-rotated-right-pair-v1',
  }),
  'arrow.composition.experimental.v1': Object.freeze({
    version: 4, locked: true, equationRevision: 'canonical-body-and-stem-envelope-v4',
  }),
  'arrow.four-fronds.experimental.v1': Object.freeze({
    version: 1, locked: true, equationRevision: 'arrow-base-plus-arm-derived-inner-pair-v1',
  }),
})

export type LockedPatternSourceKey = keyof typeof LOCKED_PATTERN_SOURCE_REGISTRY

export type LockedPatternDrawing = Readonly<{
  sourceContractKey: LockedPatternSourceKey
  sourceVersion: number
  equationRevision: string
  locked: true
  path: string
  viewBox: string
  drawing: Readonly<
    | { fill: string; stroke: 'none' }
    | { fill: 'none'; stroke: string; strokeWidth: number }
  >
}>


export function sealLockedPatternDrawing(
  sourceContractKey: LockedPatternSourceKey,
  geometry: Readonly<{
    path: string
    viewBox: string
    drawing: LockedPatternDrawing['drawing']
  }>,
): LockedPatternDrawing {
  const registration = LOCKED_PATTERN_SOURCE_REGISTRY[sourceContractKey]
  if (!registration?.locked) {
    throw new Error(`Pattern source ${sourceContractKey} is not registered and locked.`)
  }
  return Object.freeze({
    sourceContractKey,
    sourceVersion: registration.version,
    equationRevision: registration.equationRevision,
    locked: true,
    path: geometry.path,
    viewBox: geometry.viewBox,
    drawing: geometry.drawing,
  })
}

export function assertLockedPatternDrawing(
  drawing: LockedPatternDrawing,
): asserts drawing is LockedPatternDrawing {
  const registration = LOCKED_PATTERN_SOURCE_REGISTRY[drawing.sourceContractKey]
  const current = registration && drawing.sourceVersion === registration.version
    && drawing.equationRevision === registration.equationRevision
  const historical = LOCKED_PATTERN_SOURCE_HISTORY.some((source) => source.sourceContractKey === drawing.sourceContractKey
    && source.version === drawing.sourceVersion && source.equationRevision === drawing.equationRevision)
  if (drawing.locked !== true || (!current && !historical)) {
    throw new Error('The Drawer rejected an unregistered or altered pattern source contract.')
  }
}
