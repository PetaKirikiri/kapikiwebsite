import polygonClipping from 'polygon-clipping'
import {
  makeArrowHeadFrame,
  type ArrowHeadPoint,
} from './arrowHeadGeometry'
import { CONNECTOR_GEOMETRY_STANDARD } from './connectorGeometryStandard'
import type { FibonacciGrowthDirection } from './equationOwnedKoruGeometry'
import {
  makeLockedFibonacciKoruAsset,
  type LockedFibonacciKoruAsset,
} from './lockedFibonacciKoruSource'
import {
  MANGOPARE_FOUR_FROND_DEFAULT_INPUT,
  makeMangopareInnerFrondAssetPair,
} from './mangopareFourFrondGeometry'
import type { PlacedKoru } from './mangopareGeometry'
import { makeEquationAttachmentTransform } from './equationAttachmentGeometry'

export const ARROW_COMPOSITION_GEOMETRY_PROVENANCE = 'parametric' as const
export const ARROW_COMPOSITION_RECIPE = Object.freeze({
  stemCount: 1,
  straightArmCount: 2,
  lockedKoruCount: 2,
})
export const ARROW_FOUR_FROND_COMPOSITION_RECIPE = Object.freeze({
  stemCount: 1,
  straightArmCount: 2,
  lockedKoruCount: 4,
})

export type ArrowCompositionInput = Readonly<{
  armLength: number
  armAngleDegrees: number
  blueThickness: number
  turns: number
  rotationDegrees: number
  wholeShapeRotationDegrees: number
  direction: FibonacciGrowthDirection
}>

export type ArrowFourFrondCompositionInput = ArrowCompositionInput & Readonly<{
  leftSmallFrondRotationDegrees: number
  leftSmallFrondMoveX: number
  leftSmallFrondMoveY: number
  rightSmallFrondRotationDegrees: number
  rightSmallFrondMoveX: number
  rightSmallFrondMoveY: number
}>

export { ARROW_COMPOSITION_CONTROLS } from './designInputControls'
import { ARROW_COMPOSITION_CONTROLS } from './designInputControls'


export const ARROW_COMPOSITION_DEFAULT_INPUT: ArrowCompositionInput = Object.freeze({
  armLength: ARROW_COMPOSITION_CONTROLS.armLength.defaultValue,
  armAngleDegrees: ARROW_COMPOSITION_CONTROLS.armAngleDegrees.defaultValue,
  blueThickness: ARROW_COMPOSITION_CONTROLS.blueThickness.defaultValue,
  turns: ARROW_COMPOSITION_CONTROLS.turns.defaultValue,
  rotationDegrees: ARROW_COMPOSITION_CONTROLS.rotationDegrees.defaultValue,
  wholeShapeRotationDegrees: ARROW_COMPOSITION_CONTROLS.wholeShapeRotationDegrees.defaultValue,
  direction: ARROW_COMPOSITION_CONTROLS.direction.defaultValue,
})

export type ArrowCompositionGeometry = Readonly<{
  path: string
  viewBox: string
  drawing: Readonly<{ fill: string; stroke: 'none' }>
}>

export type ArrowFourFrondDiagnosticPoint = Readonly<{
  kind: 'frond-end' | 'arrow-target'
  side: 'left' | 'right'
  x: number
  y: number
}>

const CENTER_X = CONNECTOR_GEOMETRY_STANDARD.faceWidth / 2
const VIEW_BOX = `0 0 ${CONNECTOR_GEOMETRY_STANDARD.faceWidth} ${CONNECTOR_GEOMETRY_STANDARD.frameHeight}`
const COLOR = '#398aa6'
const ARROW_INNER_FROND_SCALE = 0.78
const ARROW_INNER_FROND_ARM_PROGRESS = 0.77
const ARROW_INNER_FROND_ACCEPTED_MOVE_X = 3
const ARROW_INNER_FROND_ACCEPTED_MOVE_Y = -3
// Keep the two small koru as an exact mirrored pair. Their curl bodies sit as
// independent islands in the negative space; only their loose legs approach
// the Arrow and can be clipped when the final join is made.
const ARROW_LEFT_INNER_FROND_ROTATION_DEGREES = 180
const ARROW_RIGHT_INNER_FROND_ROTATION_DEGREES = -180
const ARROW_LEFT_INNER_FROND_MOVE_X = -9
const ARROW_RIGHT_INNER_FROND_MOVE_X = 9
const ARROW_LEFT_INNER_FROND_MOVE_Y = 9
const ARROW_RIGHT_INNER_FROND_MOVE_Y = 9

export { ARROW_FOUR_FROND_CONTROLS } from './designInputControls'
import { ARROW_FOUR_FROND_CONTROLS } from './designInputControls'


export const ARROW_FOUR_FROND_DEFAULT_INPUT: ArrowFourFrondCompositionInput = Object.freeze({
  ...ARROW_COMPOSITION_DEFAULT_INPUT,
  leftSmallFrondRotationDegrees: ARROW_LEFT_INNER_FROND_ROTATION_DEGREES,
  leftSmallFrondMoveX: ARROW_LEFT_INNER_FROND_MOVE_X,
  leftSmallFrondMoveY: ARROW_LEFT_INNER_FROND_MOVE_Y,
  rightSmallFrondRotationDegrees: ARROW_RIGHT_INNER_FROND_ROTATION_DEGREES,
  rightSmallFrondMoveX: ARROW_RIGHT_INNER_FROND_MOVE_X,
  rightSmallFrondMoveY: ARROW_RIGHT_INNER_FROND_MOVE_Y,
})

function clean(value: number): number {
  return Number(value.toFixed(3))
}

function makeArrowFourFrondPlacement(input: ArrowFourFrondCompositionInput) {
  const frame = makeArrowHeadFrame(input.armLength, input.armAngleDegrees)
  const mangopareInnerPair = makeMangopareInnerFrondAssetPair({
    ...MANGOPARE_FOUR_FROND_DEFAULT_INPUT,
    wholeShapeRotationDegrees: 0,
  })
  const rightRotationDegrees = 255 + (
    input.rightSmallFrondRotationDegrees - input.leftSmallFrondRotationDegrees
  ) / 2
  const acceptedRightFrond = adjustArrowInnerFrond(
    mangopareInnerPair[0], rightRotationDegrees,
    ARROW_INNER_FROND_ACCEPTED_MOVE_X, ARROW_INNER_FROND_ACCEPTED_MOVE_Y,
  )
  const requestedMoveX = (
    (input.rightSmallFrondMoveX - ARROW_RIGHT_INNER_FROND_MOVE_X)
    - (input.leftSmallFrondMoveX - ARROW_LEFT_INNER_FROND_MOVE_X)
  ) / 2
  const requestedMoveY = (
    (input.rightSmallFrondMoveY - ARROW_RIGHT_INNER_FROND_MOVE_Y)
    + (input.leftSmallFrondMoveY - ARROW_LEFT_INNER_FROND_MOVE_Y)
  ) / 2
  // Position controls may move the connection along the valid arm trail, but
  // cannot pull the source-owned loose endpoint away from that trail.
  const requestedDistanceAlongArm = (
    requestedMoveX * frame.rightTangent.x
    + requestedMoveY * frame.rightTangent.y
  )
  const rightTarget = Object.freeze({
    x: frame.apex.x
      + (frame.rightEnd.x - frame.apex.x) * ARROW_INNER_FROND_ARM_PROGRESS
      + frame.rightTangent.x * requestedDistanceAlongArm,
    y: frame.apex.y
      + (frame.rightEnd.y - frame.apex.y) * ARROW_INNER_FROND_ARM_PROGRESS
      + frame.rightTangent.y * requestedDistanceAlongArm,
  })
  const endpointMovement = Object.freeze({
    x: rightTarget.x - acceptedRightFrond.endpoints.end.x,
    y: rightTarget.y - acceptedRightFrond.endpoints.end.y,
  })
  const rightMoveX = ARROW_INNER_FROND_ACCEPTED_MOVE_X + endpointMovement.x
  const sharedMoveY = ARROW_INNER_FROND_ACCEPTED_MOVE_Y + endpointMovement.y
  const rightFrond = adjustArrowInnerFrond(
    mangopareInnerPair[0], rightRotationDegrees, rightMoveX, sharedMoveY,
  )
  return Object.freeze({
    frame,
    rightFrond,
    leftFrond: Object.freeze({
      ...rightFrond,
      path: mirrorAcrossCenter(rightFrond.path),
      endpoints: Object.freeze({
        start: Object.freeze({ x: 2 * CENTER_X - rightFrond.endpoints.start.x, y: rightFrond.endpoints.start.y }),
        end: Object.freeze({ x: 2 * CENTER_X - rightFrond.endpoints.end.x, y: rightFrond.endpoints.end.y }),
      }),
    }),
    rightTarget,
    leftTarget: Object.freeze({ x: 2 * CENTER_X - rightTarget.x, y: rightTarget.y }),
  })
}

/** Temporary visual anchors: actual loose-end candidates and intended arm positions. */
export function makeArrowFourFrondDiagnosticPoints(
  input: ArrowFourFrondCompositionInput = ARROW_FOUR_FROND_DEFAULT_INPUT,
): readonly ArrowFourFrondDiagnosticPoint[] {
  const placement = makeArrowFourFrondPlacement(input)
  const rightEnd = placement.rightFrond.endpoints.end
  const leftEnd = placement.leftFrond.endpoints.end
  return Object.freeze([
    Object.freeze({ kind: 'frond-end', side: 'right', ...rightEnd }),
    Object.freeze({ kind: 'frond-end', side: 'left', ...leftEnd }),
    Object.freeze({ kind: 'arrow-target', side: 'right', ...placement.rightTarget }),
    Object.freeze({ kind: 'arrow-target', side: 'left', ...placement.leftTarget }),
  ])
}

function adjustArrowInnerFrond(
  asset: PlacedKoru,
  rotationDegrees: number,
  moveX: number,
  moveY: number,
): PlacedKoru {
  const path = asset.path
  const points = [...path.matchAll(/(?:[ML])(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/gu)]
    .map((match) => ({ x: Number(match[1]), y: Number(match[2]) }))
  if (points.length < 3) throw new Error('Arrow inner frond received an empty source path.')
  const origin = {
    x: (Math.min(...points.map(({ x }) => x)) + Math.max(...points.map(({ x }) => x))) / 2,
    y: (Math.min(...points.map(({ y }) => y)) + Math.max(...points.map(({ y }) => y))) / 2,
  }
  const rotation = rotationDegrees * Math.PI / 180
  const cosine = Math.cos(rotation)
  const sine = Math.sin(rotation)
  const transformPoint = (point: ArrowHeadPoint) => {
    const localX = (point.x - origin.x) * ARROW_INNER_FROND_SCALE
    const localY = (point.y - origin.y) * ARROW_INNER_FROND_SCALE
    return Object.freeze({
      x: clean(origin.x + localX * cosine - localY * sine + moveX),
      y: clean(origin.y + localX * sine + localY * cosine + moveY),
    })
  }
  const transformedPath = path.replace(
    /([ML])(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/gu,
    (_, command: string, rawX: string, rawY: string) => {
      const localX = (Number(rawX) - origin.x) * ARROW_INNER_FROND_SCALE
      const localY = (Number(rawY) - origin.y) * ARROW_INNER_FROND_SCALE
      return `${command}${clean(origin.x + localX * cosine - localY * sine + moveX)} ${clean(
        origin.y + localX * sine + localY * cosine + moveY,
      )}`
    },
  )
  return Object.freeze({
    ...asset,
    path: transformedPath,
    endpoints: Object.freeze({
      start: transformPoint(asset.endpoints.start),
      end: transformPoint(asset.endpoints.end),
    }),
  })
}

function segmentRegion(
  start: ArrowHeadPoint,
  end: ArrowHeadPoint,
  width: number,
  roundEnd: boolean,
): string {
  const dx = end.x - start.x
  const dy = end.y - start.y
  const length = Math.hypot(dx, dy) || 1
  const tangent = { x: dx / length, y: dy / length }
  const normal = { x: -tangent.y, y: tangent.x }
  const radius = width / 2
  const startA = { x: start.x + normal.x * radius, y: start.y + normal.y * radius }
  const endA = { x: end.x + normal.x * radius, y: end.y + normal.y * radius }
  const startB = { x: start.x - normal.x * radius, y: start.y - normal.y * radius }
  const endB = { x: end.x - normal.x * radius, y: end.y - normal.y * radius }
  const points: ArrowHeadPoint[] = [startA, endA]
  if (roundEnd) {
    const normalAngle = Math.atan2(normal.y, normal.x)
    for (let index = 1; index <= 12; index += 1) {
      const angle = normalAngle - Math.PI * index / 12
      points.push({ x: end.x + Math.cos(angle) * radius, y: end.y + Math.sin(angle) * radius })
    }
  } else {
    points.push(endB)
  }
  points.push(startB)
  return points.map((point, index) => (
    `${index === 0 ? 'M' : 'L'}${clean(point.x)} ${clean(point.y)}`
  )).join(' ') + ' Z'
}

function smoothstep(value: number): number {
  return value * value * (3 - 2 * value)
}

function attachedSegmentRegion(
  start: ArrowHeadPoint,
  end: ArrowHeadPoint,
  width: number,
  endWidthVector: ArrowHeadPoint,
): string {
  const dx = end.x - start.x
  const dy = end.y - start.y
  const length = Math.hypot(dx, dy) || 1
  const tangent = { x: dx / length, y: dy / length }
  const normal = { x: -tangent.y, y: tangent.x }
  const vectorLength = Math.hypot(endWidthVector.x, endWidthVector.y) || 1
  const rawEndNormal = {
    x: endWidthVector.x / vectorLength,
    y: endWidthVector.y / vectorLength,
  }
  const endNormal = rawEndNormal.x * normal.x + rawEndNormal.y * normal.y >= 0
    ? rawEndNormal
    : { x: -rawEndNormal.x, y: -rawEndNormal.y }
  const overlap = Math.max(0.02, width * 0.015)
  const samples = Array.from({ length: 25 }, (_, index) => {
    const progress = index / 24
    const influence = smoothstep(Math.max(0, (progress - 0.75) / 0.25))
    const blended = {
      x: normal.x * (1 - influence) + endNormal.x * influence,
      y: normal.y * (1 - influence) + endNormal.y * influence,
    }
    const blendedLength = Math.hypot(blended.x, blended.y) || 1
    const center = {
      x: start.x + dx * progress + tangent.x * overlap * influence,
      y: start.y + dy * progress + tangent.y * overlap * influence,
    }
    const cross = {
      x: blended.x / blendedLength * width / 2,
      y: blended.y / blendedLength * width / 2,
    }
    return {
      outer: { x: center.x + cross.x, y: center.y + cross.y },
      inner: { x: center.x - cross.x, y: center.y - cross.y },
    }
  })
  const outer = samples.map(({ outer }, index) => (
    `${index === 0 ? 'M' : 'L'}${clean(outer.x)} ${clean(outer.y)}`
  )).join(' ')
  const inner = [...samples].reverse().map(({ inner }) => (
    `L${clean(inner.x)} ${clean(inner.y)}`
  )).join(' ')
  return `${outer} ${inner} Z`
}

function lineIntersection(
  pointA: ArrowHeadPoint,
  directionA: ArrowHeadPoint,
  pointB: ArrowHeadPoint,
  directionB: ArrowHeadPoint,
): ArrowHeadPoint {
  const cross = directionA.x * directionB.y - directionA.y * directionB.x
  if (Math.abs(cross) < 1e-8) {
    throw new Error('Arrow-head tangents cannot produce a finite apex.')
  }
  const delta = { x: pointB.x - pointA.x, y: pointB.y - pointA.y }
  const distance = (delta.x * directionB.y - delta.y * directionB.x) / cross
  return {
    x: pointA.x + directionA.x * distance,
    y: pointA.y + directionA.y * distance,
  }
}

/** Mitered material at the equation-derived meeting of the two straight arms. */
function apexRegion(
  apex: ArrowHeadPoint,
  leftTangent: ArrowHeadPoint,
  rightTangent: ArrowHeadPoint,
  width: number,
): string {
  const radius = width / 2
  const leftOuter = {
    x: apex.x - leftTangent.y * radius,
    y: apex.y + leftTangent.x * radius,
  }
  const rightOuter = {
    x: apex.x + rightTangent.y * radius,
    y: apex.y - rightTangent.x * radius,
  }
  const tip = lineIntersection(leftOuter, leftTangent, rightOuter, rightTangent)
  const bisectorLength = Math.hypot(
    leftTangent.x + rightTangent.x,
    leftTangent.y + rightTangent.y,
  ) || 1
  const inner = {
    x: apex.x + (leftTangent.x + rightTangent.x) / bisectorLength * radius,
    y: apex.y + (leftTangent.y + rightTangent.y) / bisectorLength * radius,
  }
  return `M${clean(leftOuter.x)} ${clean(leftOuter.y)} L${clean(tip.x)} ${clean(tip.y)} L${clean(rightOuter.x)} ${clean(rightOuter.y)} L${clean(inner.x)} ${clean(inner.y)} Z`
}

type PlacedArrowKoru = Readonly<{
  path: string
  attachment: Readonly<{ widthVector: ArrowHeadPoint }>
}>

function placeLockedKoru(
  asset: LockedFibonacciKoruAsset,
  target: ArrowHeadPoint,
  inwardTangent: ArrowHeadPoint,
  desiredWidth: number,
  rotationDegrees: number,
): PlacedArrowKoru {
  const sourceInward = {
    x: -asset.attachment.outwardTangent.x,
    y: -asset.attachment.outwardTangent.y,
  }
  const scale = desiredWidth / asset.attachment.width
  const transform = makeEquationAttachmentTransform(
    { point: asset.attachment.center, tangent: sourceInward },
    { point: target, tangent: inwardTangent },
    scale,
    rotationDegrees,
  )
  return Object.freeze({
    path: transform.transformPath(asset.drawing.path),
    attachment: Object.freeze({
      widthVector: Object.freeze((() => {
        const rotated = transform.transformVector(asset.attachment.widthVector)
        return { x: scale * rotated.x, y: scale * rotated.y }
      })()),
    }),
  })
}

function mirrorAcrossCenter(path: string): string {
  return path.replace(
    /([ML])(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/gu,
    (_, command: string, rawX: string, rawY: string) => (
      `${command}${clean(2 * CENTER_X - Number(rawX))} ${rawY}`
    ),
  )
}

function rotateCompleteShape(path: string, rotationDegrees: number): string {
  if (rotationDegrees === 0) return path
  const radians = rotationDegrees * Math.PI / 180
  const cosine = Math.cos(radians)
  const sine = Math.sin(radians)
  return path.replace(
    /([ML])(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/gu,
    (_, command: string, rawX: string, rawY: string) => {
      const localX = Number(rawX) - CENTER_X
      const localY = Number(rawY) - CENTER_X
      return `${command}${clean(CENTER_X + localX * cosine - localY * sine)} ${
        clean(CENTER_X + localX * sine + localY * cosine)
      }`
    },
  )
}

function pathRing(path: string): [number, number][] {
  const ring = [...path.matchAll(/(?:[ML])(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/gu)]
    .map((match) => [Number(match[1]), Number(match[2])] as [number, number])
  if (ring.length < 3) throw new Error('Arrow composition contains an empty region.')
  ring.push([...ring[0]] as [number, number])
  return ring
}

function ringTwiceArea(ring: readonly [number, number][]): number {
  return ring.reduce((sum, [x, y], index) => {
    const [nextX, nextY] = ring[(index + 1) % ring.length]
    return sum + (x * nextY) - (nextX * y)
  }, 0)
}

function uniteRegions(regions: readonly string[], allowDisconnected = false): string {
  const polygons = regions.map((path) => [pathRing(path)])
  const union = polygonClipping.union(polygons[0], ...polygons.slice(1))
  const material = union.filter(([outside]) => Math.abs(ringTwiceArea(outside)) > 0.01)
  if (!allowDisconnected && material.length !== 1) {
    throw new Error(`Arrow attachment equation produced ${material.length} disconnected regions.`)
  }
  return material.flatMap((polygon) => polygon
    .filter((ring) => Math.abs(ringTwiceArea(ring)) > 0.01)
    .map((ring) => ring.map(([x, y], index) => (
      `${index === 0 ? 'M' : 'L'}${clean(x)} ${clean(y)}`
    )).join(' ') + ' Z')).join(' ')
}

function assertInput(input: ArrowCompositionInput): void {
  const numeric = [
    input.armLength,
    input.armAngleDegrees,
    input.blueThickness,
    input.turns,
    input.rotationDegrees,
    input.wholeShapeRotationDegrees,
  ]
  if (numeric.some((value) => !Number.isFinite(value))) {
    throw new Error('Every Arrow attachment input must be finite.')
  }
  const inRange = (value: number, range: Readonly<{ min: number; max: number }>) => (
    value >= range.min && value <= range.max
  )
  if (!inRange(input.armLength, ARROW_COMPOSITION_CONTROLS.armLength)
    || !inRange(input.armAngleDegrees, ARROW_COMPOSITION_CONTROLS.armAngleDegrees)
    || !inRange(input.blueThickness, ARROW_COMPOSITION_CONTROLS.blueThickness)
    || !inRange(input.turns, ARROW_COMPOSITION_CONTROLS.turns)
    || !inRange(input.rotationDegrees, ARROW_COMPOSITION_CONTROLS.rotationDegrees)
    || !inRange(
      input.wholeShapeRotationDegrees,
      ARROW_COMPOSITION_CONTROLS.wholeShapeRotationDegrees,
    )) {
    throw new Error('An Arrow attachment input is outside its equation range.')
  }
  if (!ARROW_COMPOSITION_CONTROLS.direction.options.some(
    ({ value }) => value === input.direction,
  )) {
    throw new Error('Arrow koru direction must be clockwise or anticlockwise.')
  }
}

export function makeArrowCompositionGeometry(
  input: ArrowCompositionInput = ARROW_COMPOSITION_DEFAULT_INPUT,
): ArrowCompositionGeometry {
  assertInput(input)
  const path = rotateCompleteShape(
    uniteRegions(makeArrowCompositionRegions(input)),
    input.wholeShapeRotationDegrees,
  )
  return Object.freeze({
    path,
    viewBox: VIEW_BOX,
    drawing: Object.freeze({ fill: COLOR, stroke: 'none' as const }),
  })
}

/** Fill the exterior of the source arm V; retain both exact arms and curls,
 * omitting only the first (stem) region. Rotation places that filled side left. */
export function makeArrowBiteGeometry(input: ArrowCompositionInput): ArrowCompositionGeometry {
  const baseLength = Math.min(input.armLength, ARROW_COMPOSITION_CONTROLS.armLength.max)
  assertInput({ ...input, armLength: baseLength })
  if (!Number.isFinite(input.armLength) || input.armLength > 2.5) throw new Error('Bite arm length is outside its equation range.')
  const baseFrame = makeArrowHeadFrame(baseLength, input.armAngleDegrees)
  const extend = (point: ArrowHeadPoint): ArrowHeadPoint => ({
    x: baseFrame.apex.x + (point.x - baseFrame.apex.x) * input.armLength / baseLength,
    y: baseFrame.apex.y + (point.y - baseFrame.apex.y) * input.armLength / baseLength,
  })
  const frame = input.armLength === baseLength ? baseFrame : {
    ...baseFrame, leftEnd: extend(baseFrame.leftEnd), rightEnd: extend(baseFrame.rightEnd),
  }
  const koru = makeLockedFibonacciKoruAsset({ blueThickness: input.blueThickness, turns: input.turns,
    radiusStabilisation: 0, direction: input.direction, rotationDegrees: 0 })
  const width = CONNECTOR_GEOMETRY_STANDARD.faceWidth
  const edgeY = frame.apex.y + (width / 2) * frame.leftTangent.y / Math.abs(frame.leftTangent.x)
  const exterior = `M0 0 L${width} 0 L${width} ${edgeY} L${frame.apex.x} ${frame.apex.y} L0 ${edgeY} Z`
  const path = rotateCompleteShape(uniteRegions([
    exterior, ...makeArrowCompositionRegionsFrom(frame, koru, input).slice(1),
  ]), input.wholeShapeRotationDegrees)
  return Object.freeze({ path, viewBox: VIEW_BOX, drawing: Object.freeze({ fill: COLOR, stroke: 'none' as const }) })
}

/** A separate Arrow version whose smaller pair is derived from the same locked koru equation. */
export function makeArrowFourFrondCompositionGeometry(
  input: ArrowFourFrondCompositionInput = ARROW_FOUR_FROND_DEFAULT_INPUT,
): ArrowCompositionGeometry {
  assertInput(input)
  const fourFrondValues = [
    input.leftSmallFrondRotationDegrees,
    input.leftSmallFrondMoveX,
    input.leftSmallFrondMoveY,
    input.rightSmallFrondRotationDegrees,
    input.rightSmallFrondMoveX,
    input.rightSmallFrondMoveY,
  ]
  if (fourFrondValues.some((value) => !Number.isFinite(value))) {
    throw new Error('Every Arrow four-frond placement input must be finite.')
  }
  const fourFrondRanges = ARROW_FOUR_FROND_CONTROLS
  if (input.leftSmallFrondRotationDegrees < fourFrondRanges.leftSmallFrondRotationDegrees.min
    || input.leftSmallFrondRotationDegrees > fourFrondRanges.leftSmallFrondRotationDegrees.max
    || input.leftSmallFrondMoveX < fourFrondRanges.leftSmallFrondMoveX.min
    || input.leftSmallFrondMoveX > fourFrondRanges.leftSmallFrondMoveX.max
    || input.leftSmallFrondMoveY < fourFrondRanges.leftSmallFrondMoveY.min
    || input.leftSmallFrondMoveY > fourFrondRanges.leftSmallFrondMoveY.max
    || input.rightSmallFrondRotationDegrees < fourFrondRanges.rightSmallFrondRotationDegrees.min
    || input.rightSmallFrondRotationDegrees > fourFrondRanges.rightSmallFrondRotationDegrees.max
    || input.rightSmallFrondMoveX < fourFrondRanges.rightSmallFrondMoveX.min
    || input.rightSmallFrondMoveX > fourFrondRanges.rightSmallFrondMoveX.max
    || input.rightSmallFrondMoveY < fourFrondRanges.rightSmallFrondMoveY.min
    || input.rightSmallFrondMoveY > fourFrondRanges.rightSmallFrondMoveY.max) {
    throw new Error('An Arrow four-frond placement input is outside its equation range.')
  }
  const placement = makeArrowFourFrondPlacement(input)
  const frame = placement.frame
  const outerKoru = makeLockedFibonacciKoruAsset({
    blueThickness: input.blueThickness,
    turns: input.turns,
    radiusStabilisation: 0,
    direction: input.direction,
    rotationDegrees: 0,
  })
  // Place one equation-owned small frond, then derive its partner by exact
  // reflection. Averaging the paired controls preserves the user's intended
  // distance while preventing stale independent settings from breaking the
  // pair's symmetry. With the accepted 90-degree whole-shape rotation this
  // vertical-axis reflection becomes the required horizontal-axis inverse.
  // Begin from the accepted visual placement. Measure how far its centre has
  // travelled along the arm, then translate it parallel to that arm until it
  // reaches halfway. This preserves the accepted perpendicular clearance:
  // the curl remains an island in the pink space instead of sitting on the arm.
  // The saved left/right values describe the accepted placement, so only
  // their deviation from those defaults may adjust the equation-derived arm
  // position. Adding the raw values here a second time moves the pair back
  // across the horizontal stem instead of leaving it on the diagonal arms.
  const arrowInnerPair = Object.freeze([
    placement.rightFrond.path,
    placement.leftFrond.path,
  ])
  const path = rotateCompleteShape(
    uniteRegions([
      ...makeArrowCompositionRegionsFrom(frame, outerKoru, input),
      ...arrowInnerPair,
    ], true),
    input.wholeShapeRotationDegrees,
  )
  return Object.freeze({
    path,
    viewBox: VIEW_BOX,
    drawing: Object.freeze({ fill: COLOR, stroke: 'none' as const }),
  })
}

function makeArrowCompositionRegions(input: ArrowCompositionInput): readonly string[] {
  const frame = makeArrowHeadFrame(input.armLength, input.armAngleDegrees)
  const koru = makeLockedFibonacciKoruAsset({
    blueThickness: input.blueThickness,
    turns: input.turns,
    radiusStabilisation: 0,
    direction: input.direction,
    rotationDegrees: 0,
  })
  return makeArrowCompositionRegionsFrom(frame, koru, input)
}

function makeArrowCompositionRegionsFrom(
  frame: ReturnType<typeof makeArrowHeadFrame>,
  koru: LockedFibonacciKoruAsset,
  input: ArrowCompositionInput,
): readonly string[] {
  const leftKoru = placeLockedKoru(
    koru,
    frame.leftEnd,
    frame.leftTangent,
    input.blueThickness,
    input.rotationDegrees,
  )
  return [
    segmentRegion(frame.apex, frame.stemEnd, input.blueThickness, false),
    attachedSegmentRegion(
      frame.apex,
      frame.leftEnd,
      input.blueThickness,
      leftKoru.attachment.widthVector,
    ),
    attachedSegmentRegion(
      frame.apex,
      frame.rightEnd,
      input.blueThickness,
      {
        x: -leftKoru.attachment.widthVector.x,
        y: leftKoru.attachment.widthVector.y,
      },
    ),
    apexRegion(
      frame.apex,
      frame.leftTangent,
      frame.rightTangent,
      input.blueThickness,
    ),
    leftKoru.path,
    mirrorAcrossCenter(leftKoru.path),
  ]
}
