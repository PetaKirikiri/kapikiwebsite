import { CONNECTOR_GEOMETRY_STANDARD } from './connectorGeometryStandard'
import {
  KORU_FROND_GEOMETRY,
} from './frondGeometry'

export const ARROW_HEAD_GEOMETRY_PROVENANCE = 'parametric' as const
export const ARROW_HEAD_VIEW_BOX = `0 0 ${CONNECTOR_GEOMETRY_STANDARD.faceWidth} ${CONNECTOR_GEOMETRY_STANDARD.frameHeight}`
export const ARROW_HEAD_STROKE_WIDTH = CONNECTOR_GEOMETRY_STANDARD.stemThickness
export const ARROW_HEAD_CANONICAL_TRANSFORM = 'matrix(0.9795918 0 0 0.9795918 -63.673467 0.979592)'
export const ARROW_HEAD_MIRROR_TRANSFORM = `translate(${CONNECTOR_GEOMETRY_STANDARD.faceWidth} 0) scale(-1 1)`
export const ARROW_HEAD_VERTICAL_TRANSFORM = 'rotate(-90 48 48)'
export const ARROW_HEAD_STEM_PATH = `M${KORU_FROND_GEOMETRY.origin.x} ${KORU_FROND_GEOMETRY.origin.y} H163`
export { ARROW_HEAD_DEFAULT_ARM_ANGLE_DEGREES } from './designInputControls'

export { ARROW_HEAD_CONTROLS } from './designInputControls'
import { ARROW_HEAD_CONTROLS } from './designInputControls'


export type ArrowHeadPoint = Readonly<{ x: number; y: number }>
export type ArrowHeadFrame = Readonly<{
  apex: ArrowHeadPoint
  leftEnd: ArrowHeadPoint
  rightEnd: ArrowHeadPoint
  stemEnd: ArrowHeadPoint
  leftTangent: ArrowHeadPoint
  rightTangent: ArrowHeadPoint
}>

function clean(value: number): number {
  return Number(value.toFixed(3))
}

export function makeArrowHeadArmPath(
  direction: 'left' | 'right',
  armLength: number,
): string {
  const limits = ARROW_HEAD_CONTROLS.armLength
  if (!Number.isFinite(armLength) || armLength < limits.min || armLength > limits.max) {
    throw new Error('Arrow-head arm length is outside its equation range.')
  }
  const { origin, shoulder } = KORU_FROND_GEOMETRY
  const x = origin.x + (shoulder.x - origin.x) * armLength
  const signedY = (shoulder.y - origin.y) * armLength
  const y = direction === 'left'
    ? origin.y + signedY
    : origin.y - signedY
  return `M${origin.x} ${origin.y} L${clean(x)} ${clean(y)}`
}

const CANONICAL_SCALE = 0.9795918
const CANONICAL_TRANSLATE_X = -63.673467
const CANONICAL_TRANSLATE_Y = 0.979592

function displayedPoint(point: ArrowHeadPoint): ArrowHeadPoint {
  return Object.freeze({
    x: clean(CANONICAL_SCALE * point.y + CANONICAL_TRANSLATE_Y),
    y: clean(CANONICAL_SCALE * point.x + CANONICAL_TRANSLATE_X),
  })
}

function unitVector(from: ArrowHeadPoint, to: ArrowHeadPoint): ArrowHeadPoint {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const length = Math.hypot(dx, dy) || 1
  return Object.freeze({ x: dx / length, y: dy / length })
}

/** Exact displayed attachment frame derived from the original double-frond controls. */
export function makeArrowHeadFrame(
  armLength: number,
  armAngleDegrees: number = ARROW_HEAD_CONTROLS.armAngleDegrees.defaultValue,
): ArrowHeadFrame {
  const limits = ARROW_HEAD_CONTROLS.armLength
  if (!Number.isFinite(armLength) || armLength < limits.min || armLength > limits.max) {
    throw new Error('Arrow-head arm length is outside its equation range.')
  }
  const angleLimits = ARROW_HEAD_CONTROLS.armAngleDegrees
  if (!Number.isFinite(armAngleDegrees)
    || armAngleDegrees < angleLimits.min
    || armAngleDegrees > angleLimits.max) {
    throw new Error('Arrow-head arm angle is outside its equation range.')
  }
  const origin = KORU_FROND_GEOMETRY.origin
  const shoulder = KORU_FROND_GEOMETRY.shoulder
  const leftCanonical = {
    x: origin.x + (shoulder.x - origin.x) * armLength,
    y: origin.y + (shoulder.y - origin.y) * armLength,
  }
  const apex = displayedPoint(origin)
  const originalLeftEnd = displayedPoint(leftCanonical)
  const armLengthDisplayed = Math.hypot(
    originalLeftEnd.x - apex.x,
    originalLeftEnd.y - apex.y,
  )
  const armAngle = armAngleDegrees * Math.PI / 180
  const horizontalReach = Math.sin(armAngle) * armLengthDisplayed
  const verticalDrop = Math.cos(armAngle) * armLengthDisplayed
  const leftEnd = Object.freeze({
    x: clean(apex.x - horizontalReach),
    y: clean(apex.y + verticalDrop),
  })
  const rightEnd = Object.freeze({
    x: clean(apex.x + horizontalReach),
    y: clean(apex.y + verticalDrop),
  })
  const stemEnd = Object.freeze({
    x: CONNECTOR_GEOMETRY_STANDARD.faceWidth / 2,
    y: CONNECTOR_GEOMETRY_STANDARD.verticalStemBottomY,
  })
  return Object.freeze({
    apex,
    leftEnd,
    rightEnd,
    stemEnd,
    leftTangent: unitVector(apex, leftEnd),
    rightTangent: unitVector(apex, rightEnd),
  })
}
