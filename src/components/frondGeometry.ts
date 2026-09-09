export type FrondDirection = 'up' | 'down'

export const FROND_GEOMETRY_PROVENANCE = 'parametric' as const

export type FrondPoint = Readonly<{
  x: number
  y: number
}>

export type FrondGeometry = Readonly<{
  origin: FrondPoint
  shoulder: FrondPoint
  outerCurve: readonly [FrondPoint, FrondPoint, FrondPoint]
  turnCurve: readonly [FrondPoint, FrondPoint, FrondPoint]
  innerCurve: readonly [FrondPoint, FrondPoint, FrondPoint]
  curlCurve: readonly [FrondPoint, FrondPoint, FrondPoint]
}>

/**
 * One accepted koru-frond equation, expressed above its origin.
 * The downward frond is its exact reflection across the origin's horizontal axis.
 */
export const KORU_FROND_GEOMETRY: FrondGeometry = Object.freeze({
  origin: { x: 72, y: 48 },
  shoulder: { x: 92, y: 17 },
  outerCurve: [{ x: 100, y: 7 }, { x: 116, y: 6 }, { x: 124, y: 14 }],
  turnCurve: [{ x: 132, y: 22 }, { x: 127, y: 33 }, { x: 118, y: 33 }],
  innerCurve: [{ x: 112, y: 33 }, { x: 108, y: 29 }, { x: 110, y: 25 }],
  curlCurve: [{ x: 112, y: 22 }, { x: 110, y: 22 }, { x: 108, y: 25 }],
})

function continueTangentWithReferenceLength(
  origin: FrondPoint,
  joint: FrondPoint,
  referenceControl: FrondPoint,
): FrondPoint {
  const tangentX = joint.x - origin.x
  const tangentY = joint.y - origin.y
  const tangentLength = Math.hypot(tangentX, tangentY)
  const handleLength = Math.hypot(
    referenceControl.x - joint.x,
    referenceControl.y - joint.y,
  )
  return {
    x: joint.x + (tangentX / tangentLength) * handleLength,
    y: joint.y + (tangentY / tangentLength) * handleLength,
  }
}

// Grounded variants expose the shoulder-to-curve join more strongly. Preserve
// the accepted handle length but project that handle onto the incoming shoulder
// tangent, giving exact C1 continuity instead of a coordinate tweak.
export const KORU_FROND_C1_GEOMETRY: FrondGeometry = Object.freeze({
  ...KORU_FROND_GEOMETRY,
  outerCurve: [
    continueTangentWithReferenceLength(
      KORU_FROND_GEOMETRY.origin,
      KORU_FROND_GEOMETRY.shoulder,
      KORU_FROND_GEOMETRY.outerCurve[0],
    ),
    KORU_FROND_GEOMETRY.outerCurve[1],
    KORU_FROND_GEOMETRY.outerCurve[2],
  ],
})

function reflectY(point: FrondPoint, originY: number, direction: FrondDirection): FrondPoint {
  return direction === 'up'
    ? point
    : { x: point.x, y: originY + (originY - point.y) }
}

function pointText(point: FrondPoint): string {
  return `${point.x} ${point.y}`
}

/** Builds the same frond at either vertical orientation from one control-point record. */
export function createKoruFrondPath(
  direction: FrondDirection,
  geometry: FrondGeometry = KORU_FROND_GEOMETRY,
): string {
  const mirror = (point: FrondPoint) => reflectY(point, geometry.origin.y, direction)
  const shoulder = mirror(geometry.shoulder)
  const outer = geometry.outerCurve.map(mirror)
  const turn = geometry.turnCurve.map(mirror)
  const inner = geometry.innerCurve.map(mirror)
  const curl = geometry.curlCurve.map(mirror)

  return [
    `M${pointText(geometry.origin)}`,
    `L${pointText(shoulder)}`,
    `C${outer.map(pointText).join(' ')}`,
    `C${turn.map(pointText).join(' ')}`,
    `C${inner.map(pointText).join(' ')}`,
    `C${curl.map(pointText).join(' ')}`,
  ].join(' ')
}

/** The unchanged straight root shared by the accepted frond and later endings. */
export function createKoruFrondShoulderPath(
  direction: FrondDirection,
  geometry: FrondGeometry = KORU_FROND_GEOMETRY,
): string {
  const shoulder = reflectY(geometry.shoulder, geometry.origin.y, direction)
  return `M${pointText(geometry.origin)} L${pointText(shoulder)}`
}

/** Affine scaling about the frond's fixed stem junction. */
export function scaleFrondFromOrigin(
  scaleX: number,
  scaleY: number,
  geometry: FrondGeometry = KORU_FROND_GEOMETRY,
): string {
  return [
    `translate(${geometry.origin.x} ${geometry.origin.y})`,
    `scale(${scaleX} ${scaleY})`,
    `translate(${-geometry.origin.x} ${-geometry.origin.y})`,
  ].join(' ')
}

/** Places a canonical frond without changing its control-point relationships. */
export function placeFrondAt({
  targetX,
  targetY,
  rotationDegrees = 0,
  scaleX = 1,
  scaleY = scaleX,
  geometry = KORU_FROND_GEOMETRY,
}: Readonly<{
  targetX: number
  targetY: number
  rotationDegrees?: number
  scaleX?: number
  scaleY?: number
  geometry?: FrondGeometry
}>): string {
  return [
    `translate(${targetX} ${targetY})`,
    `rotate(${rotationDegrees})`,
    `scale(${scaleX} ${scaleY})`,
    `translate(${-geometry.origin.x} ${-geometry.origin.y})`,
  ].join(' ')
}
