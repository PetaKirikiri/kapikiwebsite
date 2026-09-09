export const EQUATION_OWNED_KORU_GEOMETRY_PROVENANCE = 'parametric' as const
export const LOCKED_FIBONACCI_KORU_SOURCE_KEY = 'koru.fibonacci.v1' as const

export type Point = Readonly<{ x: number; y: number }>
export type FibonacciGrowthDirection = 'clockwise' | 'counterclockwise'

export { EQUATION_OWNED_KORU_CONTROLS } from './designInputControls'


export type EquationOwnedKoruGeometry = Readonly<{
  path: string
  viewBox: string
  trackedEdgePoints: readonly Point[]
  outerEdgePoints: readonly Point[]
  turns: number
  sampleCount: number
  drawing: Readonly<{ fill: string; stroke: 'none' }>
}>

export type EquationOwnedKoruInput = Readonly<{
  innerWidthRatio?: number
  blueThickness: number
  turns: number
  radiusStabilisation: number
  direction: FibonacciGrowthDirection
  rotationDegrees?: number
}>

const PHI = (1 + Math.sqrt(5)) / 2
const GOLDEN_GROWTH_PER_RADIAN = 2 * Math.log(PHI) / Math.PI
const EQUATION_RADIUS_SCALE = 37 / Math.pow(PHI, 6)
const FROND_COLOR = '#3f8eaa'
// The equation extends to negative infinity. Rendering begins only once its
// tracked radius reaches one thousandth of a viewBox unit: far below a pixel.
const SUBPIXEL_RADIUS = 0.001

function clean(value: number): number {
  return Number(value.toFixed(3))
}

/** One rotating roller equation. Neither edge changes formula at any angle. */
export function makeEquationOwnedKoruGeometry(
  input: EquationOwnedKoruInput,
): EquationOwnedKoruGeometry {
  const {
    blueThickness, turns, radiusStabilisation, direction,
    rotationDegrees = 0,
  } = input
  if (!Number.isFinite(blueThickness) || blueThickness <= 0) {
    throw new Error('blueThickness must be a positive finite number.')
  }
  if (input.innerWidthRatio !== undefined && (!Number.isFinite(input.innerWidthRatio)
    || input.innerWidthRatio < 0.3 || input.innerWidthRatio > 1)) {
    throw new Error('Inner width ratio must be between 0.3 and 1.')
  }
  if (!Number.isFinite(turns) || turns <= 0) {
    throw new Error('turns must be a positive finite number.')
  }
  if (!Number.isFinite(radiusStabilisation)
    || radiusStabilisation < 0 || radiusStabilisation > 0.5) {
    throw new Error('radiusStabilisation must be between zero and one half.')
  }
  if (!Number.isFinite(rotationDegrees)) {
    throw new Error('rotationDegrees must be finite.')
  }

  const directionSign = direction === 'clockwise' ? 1 : -1
  const rotation = rotationDegrees * Math.PI / 180
  const growthRate = GOLDEN_GROWTH_PER_RADIAN * (1 - radiusStabilisation)
  const radiusScale = EQUATION_RADIUS_SCALE
  const endAngle = 2 * Math.PI * turns
  const startAngle = Math.log(SUBPIXEL_RADIUS / radiusScale) / growthRate
  const angularRange = endAngle - startAngle
  const maximumRadius = radiusScale * Math.exp(growthRate * endAngle) + blueThickness
  const angleStep = Math.min(Math.PI / 720, 0.35 / Math.max(maximumRadius, 1))
  const sampleCount = Math.min(100_000, Math.max(2, Math.ceil(angularRange / angleStep) + 1))
  const samples = Object.freeze(Array.from({ length: sampleCount }, (_, index) => {
    const angle = startAngle + angularRange * index / (sampleCount - 1)
    const radius = radiusScale * Math.exp(growthRate * angle)
    const innerRatio = input.innerWidthRatio ?? 1
    const progress = Math.min(1, radius / (blueThickness * 3))
    const width = blueThickness * (innerRatio + (1 - innerRatio) * progress * progress * (3 - 2 * progress))
    const theta = rotation + (directionSign * angle)
    const cosine = Math.cos(theta)
    const sine = Math.sin(theta)
    return Object.freeze({
      trackedEdge: Object.freeze({ x: radius * cosine, y: radius * sine }),
      outerEdge: Object.freeze({
        x: (radius + width) * cosine,
        y: (radius + width) * sine,
      }),
    })
  }))
  const trackedEdgePoints = Object.freeze(samples.map(({ trackedEdge }) => trackedEdge))
  const outerEdgePoints = Object.freeze(samples.map(({ outerEdge }) => outerEdge))
  const trackedPath = trackedEdgePoints.map(({ x, y }, index) => (
    `${index === 0 ? 'M' : 'L'}${clean(x)} ${clean(y)}`
  )).join(' ')
  const outerPath = [...outerEdgePoints].reverse().map(({ x, y }) => (
    `L${clean(x)} ${clean(y)}`
  )).join(' ')
  return Object.freeze({
    path: `${trackedPath} ${outerPath} Z`,
    viewBox: '-55 -55 110 110',
    trackedEdgePoints,
    outerEdgePoints,
    turns,
    sampleCount,
    drawing: Object.freeze({ fill: FROND_COLOR, stroke: 'none' }),
  })
}
