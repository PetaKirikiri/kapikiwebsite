import polygonClipping from 'polygon-clipping'
import { CONNECTOR_GEOMETRY_STANDARD } from './connectorGeometryStandard'
import { makeArrowHeadFrame } from './arrowHeadGeometry'
import type { FibonacciGrowthDirection } from './equationOwnedKoruGeometry'
import { makeLockedFibonacciKoruAsset, type LockedFibonacciKoruAsset } from './lockedFibonacciKoruSource'
import { sealLockedPatternDrawing, type LockedPatternDrawing } from './patternDrawingContract'
import { makeEquationAttachmentTransform } from './equationAttachmentGeometry'

export const MANGOPARE_GEOMETRY_PROVENANCE = 'parametric' as const
export type MangopareEquationInput = Readonly<{
  armLength: number
  armAngleDegrees: number
  blueThickness: number
  turns: number
  radiusStabilisation: number
  rotationDegrees: number
  wholeShapeRotationDegrees: number
  direction: FibonacciGrowthDirection
}>
export { MANGOPARE_CONTROLS } from './designInputControls'

export const MANGOPARE_DEFAULT_INPUT: MangopareEquationInput = Object.freeze({
  armLength: 1.35, armAngleDegrees: 46, blueThickness: 8.5,
  turns: 1.05,
  radiusStabilisation: 0, rotationDegrees: 0, wholeShapeRotationDegrees: 0,
  direction: 'clockwise',
})

/** Exact copied baseline of the saved Arrow fronds. Umbrella inputs cannot alter it. */
export const MANGOPARE_FROZEN_ARROW_FROND = Object.freeze({
  armLength: 1.35,
  armAngleDegrees: 46,
  blueThickness: 8.5,
  turns: 1.25,
  rotationDegrees: -5,
  direction: 'clockwise' as FibonacciGrowthDirection,
})

/** Accepted loose-tail interval. The umbrella joins this fixed frond; it cannot reshape it. */
export const MANGOPARE_ACCEPTED_FROND_ENDING_TURNS = 1.05

type Point = Readonly<{ x: number; y: number }>
const WIDTH = CONNECTOR_GEOMETRY_STANDARD.faceWidth
const HEIGHT = CONNECTOR_GEOMETRY_STANDARD.frameHeight
const CENTER_X = WIDTH / 2
const VIEW_BOX = `0 0 ${WIDTH} ${HEIGHT}`
const COLOR = '#398aa6'
const TERMINAL_SPEED_RATIO = 0.4
const UMBRELLA_SAMPLE_COUNT = 384
const clean = (value: number): number => Number(value.toFixed(3))

function pathRing(path: string): [number, number][] {
  const ring = [...path.matchAll(/(?:[ML])(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/gu)]
    .map((match) => [Number(match[1]), Number(match[2])] as [number, number])
  if (ring.length < 3) throw new Error('Mangopare equation produced an empty region.')
  ring.push([...ring[0]] as [number, number])
  return ring
}

function ringTwiceArea(ring: readonly [number, number][]): number {
  return ring.reduce((sum, [x, y], index) => {
    const [nextX, nextY] = ring[(index + 1) % ring.length]
    return sum + x * nextY - nextX * y
  }, 0)
}

export function mergeMangopareRegions(regions: readonly string[]): string {
  const polygons = regions.map((path) => [pathRing(path)])
  const union = polygonClipping.union(polygons[0], ...polygons.slice(1))
  const material = union.filter(([outside]) => Math.abs(ringTwiceArea(outside)) > 0.01)
  return material.flatMap((polygon) => polygon
    .filter((ring) => Math.abs(ringTwiceArea(ring)) > 0.01)
    .map((ring) => ring.map(([x, y], index) => (
      `${index === 0 ? 'M' : 'L'}${clean(x)} ${clean(y)}`
    )).join(' ') + ' Z')).join(' ')
}

function mirror(path: string): string {
  return path.replace(
    /([ML])(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/gu,
    (_, command: string, rawX: string, rawY: string) => (
      `${command}${clean(2 * CENTER_X - Number(rawX))} ${rawY}`
    ),
  )
}

export type PlacedKoru = Readonly<{
  path: string
  endpoints: Readonly<{ start: Point; end: Point }>
  looseEnd: Readonly<{
    center: Point
    inwardTangent: Point
    trackedPoint: Point
    outerPoint: Point
    trackedInwardTangent: Point
    outerInwardTangent: Point
    trackedInwardCurvature: number
    outerInwardCurvature: number
    trackedInwardCurvatureSlope: number
    outerInwardCurvatureSlope: number
  }>
}>

function placeKoru(
  asset: LockedFibonacciKoruAsset,
  placementReference: LockedFibonacciKoruAsset,
  join: Point,
  inwardTangent: Point,
  width: number,
  extraRotationDegrees: number,
): PlacedKoru {
  const sourceInward = {
    x: -placementReference.attachment.outwardTangent.x,
    y: -placementReference.attachment.outwardTangent.y,
  }
  const scale = width / placementReference.attachment.width
  const transform = makeEquationAttachmentTransform(
    { point: placementReference.attachment.center, tangent: sourceInward },
    { point: join, tangent: inwardTangent },
    scale,
    extraRotationDegrees,
  )
  const outwardTangent = transform.transformVector(asset.attachment.outwardTangent)
  const trackedOutwardTangent = transform.transformVector(asset.attachment.trackedOutwardTangent)
  const outerOutwardTangent = transform.transformVector(asset.attachment.outerOutwardTangent)
  return Object.freeze({
    path: transform.transformPath(asset.drawing.path),
    endpoints: Object.freeze({
      start: transform.transformPoint(asset.endpoints.start),
      end: transform.transformPoint(asset.endpoints.end),
    }),
    looseEnd: Object.freeze({
      center: transform.transformPoint(asset.attachment.center),
      inwardTangent: Object.freeze({ x: -outwardTangent.x, y: -outwardTangent.y }),
      trackedPoint: transform.transformPoint(asset.attachment.trackedPoint),
      outerPoint: transform.transformPoint(asset.attachment.outerPoint),
      trackedInwardTangent: Object.freeze({
        x: -trackedOutwardTangent.x,
        y: -trackedOutwardTangent.y,
      }),
      outerInwardTangent: Object.freeze({
        x: -outerOutwardTangent.x,
        y: -outerOutwardTangent.y,
      }),
      trackedInwardCurvature: -asset.attachment.trackedOutwardCurvature / scale,
      outerInwardCurvature: -asset.attachment.outerOutwardCurvature / scale,
      trackedInwardCurvatureSlope: asset.attachment.trackedOutwardCurvatureSlope / (scale * scale),
      outerInwardCurvatureSlope: asset.attachment.outerOutwardCurvatureSlope / (scale * scale),
    }),
  })
}

function hermiteEndCorrection(
  progress: number,
  positionDelta: Point,
  derivativeDelta: Point,
  secondDerivativeDelta: Point,
  thirdDerivativeDelta: Point,
): Point {
  const squared = progress * progress
  const cubed = squared * progress
  const fourth = cubed * progress
  const fifth = fourth * progress
  const sixth = fifth * progress
  const seventh = sixth * progress
  const positionBasis = 35 * fourth - 84 * fifth + 70 * sixth - 20 * seventh
  const derivativeBasis = -15 * fourth + 39 * fifth - 34 * sixth + 10 * seventh
  const secondDerivativeBasis = 2.5 * fourth - 7 * fifth + 6.5 * sixth - 2 * seventh
  const thirdDerivativeBasis = -fourth / 6 + fifth / 2 - sixth / 2 + seventh / 6
  return Object.freeze({
    x: positionDelta.x * positionBasis
      + derivativeDelta.x * derivativeBasis
      + secondDerivativeDelta.x * secondDerivativeBasis
      + thirdDerivativeDelta.x * thirdDerivativeBasis,
    y: positionDelta.y * positionBasis
      + derivativeDelta.y * derivativeBasis
      + secondDerivativeDelta.y * secondDerivativeBasis
      + thirdDerivativeDelta.y * thirdDerivativeBasis,
  })
}

function signedCurvature(first: Point, middle: Point, last: Point): number {
  const firstLeg = { x: middle.x - first.x, y: middle.y - first.y }
  const secondLeg = { x: last.x - middle.x, y: last.y - middle.y }
  const chord = { x: last.x - first.x, y: last.y - first.y }
  const denominator = Math.hypot(firstLeg.x, firstLeg.y)
    * Math.hypot(secondLeg.x, secondLeg.y)
    * Math.hypot(chord.x, chord.y)
  if (denominator === 0) return 0
  return 2 * (firstLeg.x * secondLeg.y - firstLeg.y * secondLeg.x) / denominator
}

function curvatureSlope(points: readonly Point[]): number {
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

type UmbrellaTrajectory = Readonly<{
  path: string
  endTrackedPoint: Point
  endOuterPoint: Point
  endTrackedTangent: Point
  endOuterTangent: Point
  endTrackedCurvature: number
  endOuterCurvature: number
  endTrackedCurvatureSlope: number
  endOuterCurvatureSlope: number
}>

function makeLeftUmbrella(
  input: MangopareEquationInput,
  target: PlacedKoru['looseEnd'],
): UmbrellaTrajectory {
  const frame = makeArrowHeadFrame(
    MANGOPARE_FROZEN_ARROW_FROND.armLength,
    MANGOPARE_FROZEN_ARROW_FROND.armAngleDegrees,
  )
  const center = Object.freeze({ x: frame.apex.x, y: 48 })
  // Curve controls the ellipse radius/tightness.
  const horizontalRadius = 36 + (input.armAngleDegrees - 46) * 0.13
  const verticalRadius = center.y - frame.apex.y
  // Reach controls how far the umbrella travels along that ellipse.
  const sweepDegrees = 35 + input.armLength * 35
  const sweep = sweepDegrees * Math.PI / 180
  const basePoint = (progress: number): Point => {
    const angle = -Math.PI / 2 - sweep * progress
    return Object.freeze({
      x: center.x + horizontalRadius * Math.cos(angle),
      y: center.y + verticalRadius * Math.sin(angle),
    })
  }
  const centers = Array.from({ length: UMBRELLA_SAMPLE_COUNT }, (_, index) => (
    basePoint(index / (UMBRELLA_SAMPLE_COUNT - 1))
  ))
  const halfWidth = input.blueThickness / 2
  const offsets = centers.map((_, index) => {
    const previous = centers[Math.max(0, index - 1)]
    const next = centers[Math.min(centers.length - 1, index + 1)]
    const dx = next.x - previous.x
    const dy = next.y - previous.y
    const length = Math.hypot(dx, dy) || 1
    return Object.freeze({ x: -dy / length * halfWidth, y: dx / length * halfWidth })
  })
  const baseOutside = centers.map((point, index) => {
    const offset = offsets[index]
    return { x: point.x + offset.x, y: point.y + offset.y }
  })
  const baseInside = centers.map((point, index) => {
    const offset = offsets[index]
    return { x: point.x - offset.x, y: point.y - offset.y }
  })
  const correctBoundary = (
    points: readonly Point[],
    targetPoint: Point,
    targetTangent: Point,
    targetCurvature: number,
    targetCurvatureSlope: number,
  ): readonly Point[] => {
    const end = points.at(-1)!
    const previous = points.at(-2)!
    const sampleScale = points.length - 1
    const endDerivative = Object.freeze({
      x: (end.x - previous.x) * sampleScale,
      y: (end.y - previous.y) * sampleScale,
    })
    const speed = Math.hypot(endDerivative.x, endDerivative.y) || 1
    const desiredDerivative = Object.freeze({
      x: targetTangent.x * speed * TERMINAL_SPEED_RATIO,
      y: targetTangent.y * speed * TERMINAL_SPEED_RATIO,
    })
    const baseTangent = Object.freeze({
      x: endDerivative.x / speed,
      y: endDerivative.y / speed,
    })
    const baseNormal = Object.freeze({ x: -baseTangent.y, y: baseTangent.x })
    const baseCurvature = signedCurvature(points.at(-17)!, points.at(-9)!, end)
    const endSecondDerivative = Object.freeze({
      x: baseNormal.x * baseCurvature * speed * speed,
      y: baseNormal.y * baseCurvature * speed * speed,
    })
    const endThirdDerivative = Object.freeze({
      x: (previous.x - 3 * points.at(-3)!.x + 3 * points.at(-4)!.x - points.at(-5)!.x)
        * sampleScale ** 3,
      y: (previous.y - 3 * points.at(-3)!.y + 3 * points.at(-4)!.y - points.at(-5)!.y)
        * sampleScale ** 3,
    })
    const desiredSpeed = speed * TERMINAL_SPEED_RATIO
    const targetNormal = Object.freeze({ x: -targetTangent.y, y: targetTangent.x })
    const positionDelta = Object.freeze({
      x: targetPoint.x - end.x,
      y: targetPoint.y - end.y,
    })
    const derivativeDelta = Object.freeze({
      x: desiredDerivative.x - endDerivative.x,
      y: desiredDerivative.y - endDerivative.y,
    })
    const solveWithCurvature = (
      candidateCurvature: number,
      candidateCurvatureSlope: number,
    ): readonly Point[] => {
      const desiredSecondDerivative = Object.freeze({
        x: targetNormal.x * candidateCurvature * desiredSpeed * desiredSpeed,
        y: targetNormal.y * candidateCurvature * desiredSpeed * desiredSpeed,
      })
      const secondDerivativeDelta = Object.freeze({
        x: desiredSecondDerivative.x - endSecondDerivative.x,
        y: desiredSecondDerivative.y - endSecondDerivative.y,
      })
      const desiredThirdDerivative = Object.freeze({
        x: -targetTangent.x * desiredSpeed ** 3 * targetCurvature ** 2
          + targetNormal.x * desiredSpeed ** 3 * candidateCurvatureSlope,
        y: -targetTangent.y * desiredSpeed ** 3 * targetCurvature ** 2
          + targetNormal.y * desiredSpeed ** 3 * candidateCurvatureSlope,
      })
      const thirdDerivativeDelta = Object.freeze({
        x: desiredThirdDerivative.x - endThirdDerivative.x,
        y: desiredThirdDerivative.y - endThirdDerivative.y,
      })
      return points.map((point, index) => {
        const progress = index / sampleScale
        const correction = hermiteEndCorrection(
          progress,
          positionDelta,
          derivativeDelta,
          secondDerivativeDelta,
          thirdDerivativeDelta,
        )
        return Object.freeze({ x: point.x + correction.x, y: point.y + correction.y })
      })
    }
    const measuredCurvature = (candidate: readonly Point[]): number => signedCurvature(
      candidate.at(-17)!, candidate.at(-9)!, candidate.at(-1)!,
    )

    // Solve the source equation against the same visible terminal interval the
    // renderer uses. Analytic endpoint curvature alone can still leave a
    // one-pixel bend because the SVG is a finite polygonal sampling of the
    // equation. The inner solve changes the equation's terminal second
    // derivative; the outer rate solve changes its terminal third derivative.
    // Neither adds a seam point nor reshapes the frozen frond.
    const solveCurvatureForSlope = (candidateSlope: number): readonly Point[] => {
      let firstCandidate = targetCurvature
      let firstPoints = solveWithCurvature(firstCandidate, candidateSlope)
      let firstError = measuredCurvature(firstPoints) - targetCurvature
      let secondCandidate = targetCurvature - firstError
      let secondPoints = solveWithCurvature(secondCandidate, candidateSlope)
      let secondError = measuredCurvature(secondPoints) - targetCurvature
      for (let iteration = 0; iteration < 6 && Math.abs(secondError) > 0.000_001; iteration += 1) {
        const denominator = secondError - firstError
        if (Math.abs(denominator) < 0.000_000_001) break
        const nextCandidate = secondCandidate
          - secondError * (secondCandidate - firstCandidate) / denominator
        firstCandidate = secondCandidate
        firstPoints = secondPoints
        firstError = secondError
        secondCandidate = nextCandidate
        secondPoints = solveWithCurvature(secondCandidate, candidateSlope)
        secondError = measuredCurvature(secondPoints) - targetCurvature
      }
      return Math.abs(secondError) <= Math.abs(firstError) ? secondPoints : firstPoints
    }

    // The visible shoulder is governed by how curvature changes, not merely by
    // its value at the last point. Solve that rate after each curvature solve,
    // so the complete sampled boundary inherits the frond's evolving bend.
    let candidateSlope = targetCurvatureSlope
    let candidatePoints = solveCurvatureForSlope(candidateSlope)
    let slopeError = curvatureSlope(candidatePoints) - targetCurvatureSlope
    for (let iteration = 0; iteration < 6 && Math.abs(slopeError) > 0.000_001; iteration += 1) {
      const probeStep = 0.001
      const probePoints = solveCurvatureForSlope(candidateSlope + probeStep)
      const probeError = curvatureSlope(probePoints) - targetCurvatureSlope
      const derivative = (probeError - slopeError) / probeStep
      if (Math.abs(derivative) < 0.000_001) break
      const nextSlope = candidateSlope - slopeError / derivative
      if (!Number.isFinite(nextSlope) || Math.abs(nextSlope) > 2) break
      candidateSlope = nextSlope
      candidatePoints = solveCurvatureForSlope(candidateSlope)
      slopeError = curvatureSlope(candidatePoints) - targetCurvatureSlope
    }
    return candidatePoints
  }
  // The two visible material boundaries are separate trajectories. Each is
  // corrected across its full length to the corresponding immutable frond
  // edge. Matching only their centreline leaves a visible edge kink.
  const outside = correctBoundary(
    baseOutside,
    target.outerPoint,
    target.outerInwardTangent,
    target.outerInwardCurvature,
    target.outerInwardCurvatureSlope,
  )
  const inside = correctBoundary(
    baseInside,
    target.trackedPoint,
    target.trackedInwardTangent,
    target.trackedInwardCurvature,
    target.trackedInwardCurvatureSlope,
  )
  const path = [...outside, ...[...inside].reverse()].map((point, index) => (
    `${index === 0 ? 'M' : 'L'}${clean(point.x)} ${clean(point.y)}`
  )).join(' ') + ' Z'
  const terminalTangent = (points: readonly Point[]): Point => {
    const end = points.at(-1)!
    const previous = points.at(-2)!
    const length = Math.hypot(end.x - previous.x, end.y - previous.y) || 1
    return Object.freeze({
      x: (end.x - previous.x) / length,
      y: (end.y - previous.y) / length,
    })
  }
  return Object.freeze({
    path,
    endTrackedPoint: inside.at(-1)!,
    endOuterPoint: outside.at(-1)!,
    endTrackedTangent: terminalTangent(inside),
    endOuterTangent: terminalTangent(outside),
    endTrackedCurvature: signedCurvature(
      inside.at(-17)!,
      inside.at(-9)!,
      inside.at(-1)!,
    ),
    endOuterCurvature: signedCurvature(
      outside.at(-17)!,
      outside.at(-9)!,
      outside.at(-1)!,
    ),
    endTrackedCurvatureSlope: curvatureSlope(inside),
    endOuterCurvatureSlope: curvatureSlope(outside),
  })
}

function makePlacedLeftFrond(turns: number): PlacedKoru {
  const frame = makeArrowHeadFrame(
    MANGOPARE_FROZEN_ARROW_FROND.armLength,
    MANGOPARE_FROZEN_ARROW_FROND.armAngleDegrees,
  )
  const koru = makeLockedFibonacciKoruAsset({
    blueThickness: MANGOPARE_FROZEN_ARROW_FROND.blueThickness,
    turns,
    radiusStabilisation: 0,
    direction: MANGOPARE_FROZEN_ARROW_FROND.direction,
    rotationDegrees: 0,
  })
  const placementReference = makeLockedFibonacciKoruAsset({
    blueThickness: MANGOPARE_FROZEN_ARROW_FROND.blueThickness,
    turns: MANGOPARE_FROZEN_ARROW_FROND.turns,
    radiusStabilisation: 0,
    direction: MANGOPARE_FROZEN_ARROW_FROND.direction,
    rotationDegrees: 0,
  })
  return placeKoru(
    koru,
    placementReference,
    frame.leftEnd,
    frame.leftTangent,
    MANGOPARE_FROZEN_ARROW_FROND.blueThickness,
    MANGOPARE_FROZEN_ARROW_FROND.rotationDegrees,
  )
}

export function makeMangopareFrondAssetPair(
  input: MangopareEquationInput = MANGOPARE_DEFAULT_INPUT,
): readonly [PlacedKoru, PlacedKoru] {
  const frame = makeArrowHeadFrame(
    MANGOPARE_FROZEN_ARROW_FROND.armLength,
    MANGOPARE_FROZEN_ARROW_FROND.armAngleDegrees,
  )
  const koru = makeLockedFibonacciKoruAsset({
    blueThickness: MANGOPARE_FROZEN_ARROW_FROND.blueThickness,
    turns: input.turns,
    radiusStabilisation: input.radiusStabilisation,
    direction: input.direction,
    rotationDegrees: 0,
  })
  // Freeze placement to the accepted Arrow asset. Changing `turns` therefore
  // appends or trims only the outer equation interval; it cannot translate,
  // rotate, scale, or otherwise reshape the already accepted frond body.
  const placementReference = makeLockedFibonacciKoruAsset({
    blueThickness: MANGOPARE_FROZEN_ARROW_FROND.blueThickness,
    turns: MANGOPARE_FROZEN_ARROW_FROND.turns,
    radiusStabilisation: 0,
    direction: MANGOPARE_FROZEN_ARROW_FROND.direction,
    rotationDegrees: 0,
  })
  const leftKoru = placeKoru(
    koru,
    placementReference,
    frame.leftEnd,
    frame.leftTangent,
    MANGOPARE_FROZEN_ARROW_FROND.blueThickness,
    MANGOPARE_FROZEN_ARROW_FROND.rotationDegrees + input.rotationDegrees,
  )
  const rightKoru = Object.freeze({
    ...leftKoru,
    path: mirror(leftKoru.path),
    endpoints: Object.freeze({
      start: Object.freeze({ x: 2 * CENTER_X - leftKoru.endpoints.start.x, y: leftKoru.endpoints.start.y }),
      end: Object.freeze({ x: 2 * CENTER_X - leftKoru.endpoints.end.x, y: leftKoru.endpoints.end.y }),
    }),
  })
  return Object.freeze([leftKoru, rightKoru])
}

export function makeMangopareFrondPair(
  input: MangopareEquationInput = MANGOPARE_DEFAULT_INPUT,
): readonly [string, string] {
  const [leftKoru, rightKoru] = makeMangopareFrondAssetPair(input)
  return Object.freeze([leftKoru.path, rightKoru.path])
}

export function makeMangopareSeamDiagnostics(
  input: MangopareEquationInput = MANGOPARE_DEFAULT_INPUT,
): Readonly<{
  positionError: number
  tangentDot: number
  curvatureError: number
  trackedCurvatureError: number
  outerCurvatureError: number
  trackedUmbrellaCurvature: number
  trackedFrondCurvature: number
  outerUmbrellaCurvature: number
  outerFrondCurvature: number
  curvatureSlopeError: number
  trackedCurvatureSlopeError: number
  outerCurvatureSlopeError: number
}> {
  const fixedFrond = makePlacedLeftFrond(input.turns)
  const umbrella = makeLeftUmbrella(input, fixedFrond.looseEnd)
  const trackedPositionError = Math.hypot(
    umbrella.endTrackedPoint.x - fixedFrond.looseEnd.trackedPoint.x,
    umbrella.endTrackedPoint.y - fixedFrond.looseEnd.trackedPoint.y,
  )
  const outerPositionError = Math.hypot(
    umbrella.endOuterPoint.x - fixedFrond.looseEnd.outerPoint.x,
    umbrella.endOuterPoint.y - fixedFrond.looseEnd.outerPoint.y,
  )
  const trackedTangentDot = umbrella.endTrackedTangent.x
      * fixedFrond.looseEnd.trackedInwardTangent.x
    + umbrella.endTrackedTangent.y * fixedFrond.looseEnd.trackedInwardTangent.y
  const outerTangentDot = umbrella.endOuterTangent.x
      * fixedFrond.looseEnd.outerInwardTangent.x
    + umbrella.endOuterTangent.y * fixedFrond.looseEnd.outerInwardTangent.y
  const trackedCurvatureError = umbrella.endTrackedCurvature
    - fixedFrond.looseEnd.trackedInwardCurvature
  const outerCurvatureError = umbrella.endOuterCurvature
    - fixedFrond.looseEnd.outerInwardCurvature
  const trackedCurvatureSlopeError = umbrella.endTrackedCurvatureSlope
    - fixedFrond.looseEnd.trackedInwardCurvatureSlope
  const outerCurvatureSlopeError = umbrella.endOuterCurvatureSlope
    - fixedFrond.looseEnd.outerInwardCurvatureSlope
  return Object.freeze({
    positionError: Math.max(trackedPositionError, outerPositionError),
    tangentDot: Math.min(trackedTangentDot, outerTangentDot),
    curvatureError: Math.max(Math.abs(trackedCurvatureError), Math.abs(outerCurvatureError)),
    trackedCurvatureError,
    outerCurvatureError,
    trackedUmbrellaCurvature: umbrella.endTrackedCurvature,
    trackedFrondCurvature: fixedFrond.looseEnd.trackedInwardCurvature,
    outerUmbrellaCurvature: umbrella.endOuterCurvature,
    outerFrondCurvature: fixedFrond.looseEnd.outerInwardCurvature,
    curvatureSlopeError: Math.max(
      Math.abs(trackedCurvatureSlopeError),
      Math.abs(outerCurvatureSlopeError),
    ),
    trackedCurvatureSlopeError,
    outerCurvatureSlopeError,
  })
}

function stemRegion(width: number, startY: number): string {
  const halfWidth = width / 2
  return `M${clean(CENTER_X - halfWidth)} ${clean(startY)} L${clean(CENTER_X + halfWidth)} ${clean(startY)} L${clean(
    CENTER_X + halfWidth,
  )} ${HEIGHT} L${clean(CENTER_X - halfWidth)} ${HEIGHT} Z`
}

export function makeMangopareStructureRegions(
  input: MangopareEquationInput = MANGOPARE_DEFAULT_INPUT,
): readonly [string, string, string] {
  const frozenFrame = makeArrowHeadFrame(
    MANGOPARE_FROZEN_ARROW_FROND.armLength,
    MANGOPARE_FROZEN_ARROW_FROND.armAngleDegrees,
  )
  const fixedFrond = makePlacedLeftFrond(input.turns)
  const umbrellaRegion = makeLeftUmbrella(input, fixedFrond.looseEnd).path
  return Object.freeze([
    stemRegion(input.blueThickness, frozenFrame.apex.y),
    umbrellaRegion,
    mirror(umbrellaRegion),
  ])
}

export function makeMangopareDrawing(
  input: MangopareEquationInput = MANGOPARE_DEFAULT_INPUT,
): LockedPatternDrawing {
  const numeric = [
    input.armLength, input.armAngleDegrees, input.blueThickness,
    input.turns,
    input.radiusStabilisation, input.rotationDegrees, input.wholeShapeRotationDegrees,
  ]
  if (numeric.some((value) => !Number.isFinite(value))) {
    throw new Error('Every Mangopare equation input must be finite.')
  }
  const [leftKoru, rightKoru] = makeMangopareFrondPair(input)
  return sealLockedPatternDrawing('mangopare.composition.experimental.v49', {
    path: mergeMangopareRegions([
      ...makeMangopareStructureRegions(input),
      leftKoru,
      rightKoru,
    ]),
    viewBox: VIEW_BOX,
    drawing: Object.freeze({ fill: COLOR, stroke: 'none' as const }),
  })
}

export function makeAcceptedMangopareDrawing(): LockedPatternDrawing {
  return sealLockedPatternDrawing('mangopare.v1', makeMangopareDrawing())
}
