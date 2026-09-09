import {
  LOCKED_FIBONACCI_KORU_SOURCE_KEY,
  makeEquationOwnedKoruGeometry,
  type EquationOwnedKoruInput,
} from './equationOwnedKoruGeometry'
import {
  sealLockedPatternDrawing,
  type LockedPatternDrawing,
} from './patternDrawingContract'

/**
 * The only public drawing gateway for the accepted Fibonacci koru v1 source.
 * Compositions may consume this sealed output; they must not reproduce its path.
 */
export function makeLockedFibonacciKoruDrawing(
  input: EquationOwnedKoruInput,
): LockedPatternDrawing {
  return sealLockedPatternDrawing(
    LOCKED_FIBONACCI_KORU_SOURCE_KEY,
    makeEquationOwnedKoruGeometry(input),
  )
}

export type LockedFibonacciKoruAsset = Readonly<{
  drawing: LockedPatternDrawing
  centerlinePoints: readonly Readonly<{ x: number; y: number }>[]
  trackedEdgePoints: readonly Readonly<{ x: number; y: number }>[]
  outerEdgePoints: readonly Readonly<{ x: number; y: number }>[]
  endpoints: Readonly<{
    start: Readonly<{ x: number; y: number }>
    end: Readonly<{ x: number; y: number }>
  }>
  attachment: Readonly<{
    center: Readonly<{ x: number; y: number }>
    trackedPoint: Readonly<{ x: number; y: number }>
    outerPoint: Readonly<{ x: number; y: number }>
    outwardTangent: Readonly<{ x: number; y: number }>
    trackedOutwardTangent: Readonly<{ x: number; y: number }>
    outerOutwardTangent: Readonly<{ x: number; y: number }>
    trackedOutwardCurvature: number
    outerOutwardCurvature: number
    trackedOutwardCurvatureSlope: number
    outerOutwardCurvatureSlope: number
    widthVector: Readonly<{ x: number; y: number }>
    width: number
  }>
}>

function unitVector(
  from: Readonly<{ x: number; y: number }>,
  to: Readonly<{ x: number; y: number }>,
): Readonly<{ x: number; y: number }> {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const length = Math.hypot(dx, dy) || 1
  return Object.freeze({ x: dx / length, y: dy / length })
}

function sealedPoint(point: Readonly<{ x: number; y: number }>): Readonly<{ x: number; y: number }> {
  return Object.freeze({
    x: Number(point.x.toFixed(3)),
    y: Number(point.y.toFixed(3)),
  })
}

function signedCurvature(
  first: Readonly<{ x: number; y: number }>,
  middle: Readonly<{ x: number; y: number }>,
  last: Readonly<{ x: number; y: number }>,
): number {
  const firstLeg = { x: middle.x - first.x, y: middle.y - first.y }
  const secondLeg = { x: last.x - middle.x, y: last.y - middle.y }
  const chord = { x: last.x - first.x, y: last.y - first.y }
  const denominator = Math.hypot(firstLeg.x, firstLeg.y)
    * Math.hypot(secondLeg.x, secondLeg.y)
    * Math.hypot(chord.x, chord.y)
  if (denominator === 0) return 0
  return 2 * (firstLeg.x * secondLeg.y - firstLeg.y * secondLeg.x) / denominator
}

function curvatureSlope(
  points: readonly Readonly<{ x: number; y: number }>[],
): number {
  const farCurvature = signedCurvature(points.at(-33)!, points.at(-25)!, points.at(-17)!)
  const nearCurvature = signedCurvature(points.at(-17)!, points.at(-9)!, points.at(-1)!)
  let distance = 0
  for (let index = points.length - 25; index < points.length - 9; index += 1) {
    const current = points[index]
    const next = points[index + 1]
    distance += Math.hypot(next.x - current.x, next.y - current.y)
  }
  return distance === 0 ? 0 : (nearCurvature - farCurvature) / distance
}

export function makeLockedFibonacciKoruAsset(
  input: EquationOwnedKoruInput,
): LockedFibonacciKoruAsset {
  const geometry = makeEquationOwnedKoruGeometry(input)
  const tracked = sealedPoint(geometry.trackedEdgePoints.at(-1)!)
  const previousTracked = sealedPoint(geometry.trackedEdgePoints.at(-2)!)
  const outer = sealedPoint(geometry.outerEdgePoints.at(-1)!)
  const previousOuter = sealedPoint(geometry.outerEdgePoints.at(-2)!)
  const center = Object.freeze({
    x: (tracked.x + outer.x) / 2,
    y: (tracked.y + outer.y) / 2,
  })
  const previousCenter = Object.freeze({
    x: (previousTracked.x + previousOuter.x) / 2,
    y: (previousTracked.y + previousOuter.y) / 2,
  })
  const widthVector = Object.freeze({
    x: outer.x - tracked.x,
    y: outer.y - tracked.y,
  })
  const centerlinePoints = Object.freeze(geometry.trackedEdgePoints.map((point, index) => (
    Object.freeze({
      x: (point.x + geometry.outerEdgePoints[index].x) / 2,
      y: (point.y + geometry.outerEdgePoints[index].y) / 2,
    })
  )))
  const start = sealedPoint(centerlinePoints[0])
  const end = sealedPoint(centerlinePoints.at(-1)!)
  return Object.freeze({
    drawing: sealLockedPatternDrawing(LOCKED_FIBONACCI_KORU_SOURCE_KEY, geometry),
    centerlinePoints,
    trackedEdgePoints: geometry.trackedEdgePoints,
    outerEdgePoints: geometry.outerEdgePoints,
    endpoints: Object.freeze({ start, end }),
    attachment: Object.freeze({
      center,
      trackedPoint: tracked,
      outerPoint: outer,
      outwardTangent: unitVector(previousCenter, center),
      trackedOutwardTangent: unitVector(previousTracked, tracked),
      outerOutwardTangent: unitVector(previousOuter, outer),
      trackedOutwardCurvature: signedCurvature(
        geometry.trackedEdgePoints.at(-17)!,
        geometry.trackedEdgePoints.at(-9)!,
        geometry.trackedEdgePoints.at(-1)!,
      ),
      outerOutwardCurvature: signedCurvature(
        geometry.outerEdgePoints.at(-17)!,
        geometry.outerEdgePoints.at(-9)!,
        geometry.outerEdgePoints.at(-1)!,
      ),
      trackedOutwardCurvatureSlope: curvatureSlope(geometry.trackedEdgePoints),
      outerOutwardCurvatureSlope: curvatureSlope(geometry.outerEdgePoints),
      widthVector,
      width: Math.hypot(widthVector.x, widthVector.y),
    }),
  })
}
