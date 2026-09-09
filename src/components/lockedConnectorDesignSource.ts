import { CONNECTOR_GEOMETRY_STANDARD } from './connectorGeometryStandard'
import { ARROW_OUTER_TRIANGLE_PATH, ARROW_INNER_TRIANGLE_PATH, ARROW_CONNECTOR_RIGHT_VIEW_LEFT } from './arrowConnectorGeometry'
import { mapLinearPath } from './linearPath'

/** Preserve the original midpoint subdivision while correcting the outer body
 * to the width of a sideways equilateral triangle. */
export function makeOriginalFullSizeTriangleDrawing(): LockedPatternDrawing {
  // The original used even-odd fill. Reverse the inner contour to preserve that
  // exact opening under the shared drawer's nonzero fill, without changing points.
  const innerPoints = [...ARROW_INNER_TRIANGLE_PATH.matchAll(/[ML]([\d.]+) ([\d.]+)/g)].reverse()
  const opening = innerPoints.map((point, index) => `${index ? 'L' : 'M'}${point[1]} ${point[2]}`).join(' ') + ' Z'
  const equilateralWidthRatio = Math.sqrt(3) / 2
  return sealLockedPatternDrawing('connector.equilateral-midpoint-triangle.v1', {
    path: mapLinearPath(`${ARROW_OUTER_TRIANGLE_PATH} ${opening}`, (x, y) => {
      const translatedX = x - ARROW_CONNECTOR_RIGHT_VIEW_LEFT
      return [48 + (translatedX - 48) * equilateralWidthRatio, y]
    }),
    viewBox: '0 0 96 96', drawing: { fill: '#9aa7ea', stroke: 'none' },
  })
}
import {
  type FibonacciGrowthDirection,
} from './equationOwnedKoruGeometry'
import {
  makeLockedFibonacciKoruAsset,
} from './lockedFibonacciKoruSource'
import {
  sealLockedPatternDrawing,
  type LockedPatternDrawing,
} from './patternDrawingContract'

const FRAME_SIZE = CONNECTOR_GEOMETRY_STANDARD.frameHeight

/**
 * Source-owned Wave calibration.
 *
 * Each value keeps its original equation meaning:
 * - blueThickness controls only the swept material width and centre nub;
 * - radiusStabilisation controls only the global exponential radial growth;
 * - turns chooses the endpoint on that same uninterrupted equation;
 * - rotationDegrees orients the complete equation before the fixed frame transform.
 *
 * The fixed scale and origin place that equation in the connector frame. They
 * never refit an individual result to its measured bounds, so the equation's
 * proportions cannot be normalised away by the Design Space component.
 */
const KORU_WAVE_EQUATION_INPUT = Object.freeze({
  blueThickness: 7,
  radiusStabilisation: 0,
  turns: 1.6,
  rotationDegrees: 90,
  direction: 'clockwise' as const,
})
const KORU_WAVE_FRAME_SCALE = 1.4
const KORU_WAVE_FRAME_ORIGIN = Object.freeze({ x: 50, y: 64 })

export type KoruWaveDesignInput = Readonly<{
  innerWidthRatio?: number
  blueThickness: number
  radiusStabilisation: number
  turns: number
  rotationDegrees: number
  growthDirection: FibonacciGrowthDirection
  size: number
  direction: 'left' | 'right'
  verticalPosition: number
}>

export type TriangleDesignInput = Readonly<{
  size: number
  direction: 'right' | 'down' | 'left' | 'up'
}>

export { KORU_WAVE_DESIGN_CONTROLS } from './designInputControls'
import { KORU_WAVE_DESIGN_CONTROLS } from './designInputControls'


export { TRIANGLE_DESIGN_CONTROLS } from './designInputControls'
import { TRIANGLE_DESIGN_CONTROLS } from './designInputControls'


export const KORU_WAVE_DESIGN_DEFAULT_INPUT: KoruWaveDesignInput = Object.freeze({
  ...KORU_WAVE_EQUATION_INPUT,
  growthDirection: KORU_WAVE_EQUATION_INPUT.direction,
  size: KORU_WAVE_DESIGN_CONTROLS.size.defaultValue,
  direction: 'right',
  verticalPosition: KORU_WAVE_DESIGN_CONTROLS.verticalPosition.defaultValue,
})

export const TRIANGLE_DESIGN_DEFAULT_INPUT: TriangleDesignInput = Object.freeze({
  size: TRIANGLE_DESIGN_CONTROLS.size.defaultValue,
  direction: 'up',
})

function clean(value: number): string {
  return Number(value.toFixed(6)).toString()
}

function transformLinePath(
  path: string,
  transform: (x: number, y: number) => readonly [number, number],
): string {
  const tokens = path.match(/[MLZ]|-?\d+(?:\.\d+)?/gu)
  if (tokens == null) throw new Error('Accepted connector source path is empty.')
  const output: string[] = []
  let index = 0
  let command: 'M' | 'L' | null = null
  while (index < tokens.length) {
    const token = tokens[index]
    if (token === 'Z') {
      output.push(token)
      command = null
      index += 1
      continue
    }
    if (token === 'M' || token === 'L') {
      command = token
      index += 1
      continue
    }
    if (command == null) throw new Error('Accepted connector source path has no point command.')
    const rawY = tokens[index + 1]
    if (rawY == null || rawY === 'M' || rawY === 'L' || rawY === 'Z') {
      throw new Error('Accepted connector source path has an incomplete point.')
    }
    const [x, y] = transform(Number(token), Number(rawY))
    output.push(`${command}${clean(x)} ${clean(y)}`)
    if (command === 'M') command = 'L'
    index += 2
  }
  return output.join(' ')
}

function assertRange(
  label: string,
  value: number,
  range: Readonly<{ min: number; max: number }>,
): void {
  if (!Number.isFinite(value) || value < range.min || value > range.max) {
    throw new Error(`${label} is outside its Design Space range.`)
  }
}

function transformCanonicalPath(
  path: string,
  transform: (x: number, y: number) => readonly [number, number],
): string {
  return transformLinePath(path, transform)
}

type FramePoint = Readonly<{ x: number; y: number }>

/** Approved-source-derived: close only the exterior pocket adjoining the top-left corner.
 * Uses the final silhouette's exact line intersections; never moves its curl.
 */
export function fillWaveTopLeftCorner(drawing: LockedPatternDrawing): LockedPatternDrawing {
  const points = [...drawing.path.matchAll(/[ML](-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/gu)]
    .map((match) => ({ x: Number(match[1]), y: Number(match[2]) }))
  const levels = new Set<number>([0])
  const segments = points.map((point, index) => [point, points[(index + 1) % points.length]] as const)
  for (const [a, b] of segments) {
    if (a.y > 0 && a.y < FRAME_SIZE) levels.add(a.y)
    if ((a.x < 0) !== (b.x < 0)) {
      const y = a.y + (b.y - a.y) * -a.x / (b.x - a.x)
      if (y > 0 && y < FRAME_SIZE) levels.add(y)
    }
  }
  const edge: FramePoint[] = []
  const orderedSegments = [...segments].sort((a, b) => Math.min(a[0].y, a[1].y) - Math.min(b[0].y, b[1].y))
  let segmentIndex = 0
  let activeSegments: typeof segments = []
  for (const y of [...levels].sort((a, b) => a - b)) {
    while (segmentIndex < orderedSegments.length
      && Math.min(orderedSegments[segmentIndex][0].y, orderedSegments[segmentIndex][1].y) <= y) {
      activeSegments.push(orderedSegments[segmentIndex++])
    }
    activeSegments = activeSegments.filter(([a, b]) => Math.max(a.y, b.y) >= y)
    let x = Infinity
    for (const [a, b] of activeSegments) {
      if (y < Math.min(a.y, b.y) || y > Math.max(a.y, b.y)) continue
      x = Math.min(x, a.y === b.y ? Math.min(a.x, b.x)
        : a.x + (b.x - a.x) * (y - a.y) / (b.y - a.y))
    }
    if (!Number.isFinite(x) || x >= FRAME_SIZE) return drawing
    edge.push({ x: Math.max(0, x), y })
    if (x <= 1e-6) break
  }
  if (edge.length < 2 || edge.at(-1)!.x > 1e-6) return drawing
  const corner = `M0 0 ${edge.map(({ x, y }) => `L${clean(x)} ${clean(y)}`).join(' ')} Z`
  return sealLockedPatternDrawing('connector.wave4-corner.v1', {
    path: `${drawing.path} ${corner}`, viewBox: drawing.viewBox, drawing: drawing.drawing,
  })
}

function makeRailSideExteriorPath(
  boundaryPoints: readonly FramePoint[],
): string {
  const scanStep = 0.25
  const minX = Math.min(...boundaryPoints.map(({ x }) => x))
  const maxX = Math.max(...boundaryPoints.map(({ x }) => x))
  const fillLeftSide = (FRAME_SIZE / 2 - minX) > (maxX - FRAME_SIZE / 2)
  const exteriorBoundary: FramePoint[] = []
  for (let y = 0; y <= FRAME_SIZE; y += scanStep) {
    let edgeX = fillLeftSide ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY
    for (let index = 0; index < boundaryPoints.length; index += 1) {
      const first = boundaryPoints[index]
      const second = boundaryPoints[(index + 1) % boundaryPoints.length]
      if ((y < first.y && y < second.y) || (y > first.y && y > second.y)) continue
      const dy = second.y - first.y
      if (Math.abs(dy) < 1e-9) {
        if (Math.abs(y - first.y) < scanStep / 2) {
          edgeX = fillLeftSide
            ? Math.min(edgeX, first.x, second.x)
            : Math.max(edgeX, first.x, second.x)
        }
        continue
      }
      const progress = (y - first.y) / dy
      if (progress < 0 || progress > 1) continue
      const intersectionX = first.x + (second.x - first.x) * progress
      edgeX = fillLeftSide ? Math.min(edgeX, intersectionX) : Math.max(edgeX, intersectionX)
    }
    if (Number.isFinite(edgeX)) {
      exteriorBoundary.push(Object.freeze({ x: edgeX, y }))
    }
  }
  if (exteriorBoundary.length < 2) {
    throw new Error('Koru wave does not cross enough of the connector frame.')
  }
  const frameEdgeX = fillLeftSide ? 0 : FRAME_SIZE
  return [
    `M${clean(frameEdgeX)} ${clean(exteriorBoundary[0].y)}`,
    ...exteriorBoundary.map(({ x, y }) => `L${clean(x)} ${clean(y)}`),
    `L${clean(frameEdgeX)} ${clean(exteriorBoundary.at(-1)!.y)}`,
    'Z',
  ].join(' ')
}

/** Accepted-source-derived drawing gateway for the Verb family's complete wave silhouette. */
export function makeAcceptedKoruWaveDrawing(
  input: KoruWaveDesignInput = KORU_WAVE_DESIGN_DEFAULT_INPUT,
  options: Readonly<{ extendToRailSide?: boolean }> = Object.freeze({}),
): LockedPatternDrawing {
  assertRange('Koru wave size', input.size, KORU_WAVE_DESIGN_CONTROLS.size)
  assertRange(
    'Koru wave blue thickness',
    input.blueThickness,
    KORU_WAVE_DESIGN_CONTROLS.blueThickness,
  )
  assertRange(
    'Koru wave radius stabilisation',
    input.radiusStabilisation,
    KORU_WAVE_DESIGN_CONTROLS.radiusStabilisation,
  )
  assertRange('Koru wave turns', input.turns, KORU_WAVE_DESIGN_CONTROLS.turns)
  assertRange(
    'Koru wave equation rotation',
    input.rotationDegrees,
    KORU_WAVE_DESIGN_CONTROLS.rotationDegrees,
  )
  assertRange(
    'Koru wave vertical position',
    input.verticalPosition,
    KORU_WAVE_DESIGN_CONTROLS.verticalPosition,
  )
  const center = FRAME_SIZE / 2
  const equationAsset = makeLockedFibonacciKoruAsset({
    innerWidthRatio: input.innerWidthRatio,
    blueThickness: input.blueThickness,
    radiusStabilisation: input.radiusStabilisation,
    turns: input.turns,
    rotationDegrees: input.rotationDegrees,
    direction: input.growthDirection,
  })
  const transformPoint = (sourceX: number, sourceY: number): readonly [number, number] => {
    const framedX = KORU_WAVE_FRAME_ORIGIN.x + sourceX * KORU_WAVE_FRAME_SCALE
    const framedY = KORU_WAVE_FRAME_ORIGIN.y + sourceY * KORU_WAVE_FRAME_SCALE
    const sizedX = center + (framedX - center) * input.size
    const sizedY = center + (framedY - center) * input.size
      + input.verticalPosition
    return [
      input.direction === 'right' ? sizedX : FRAME_SIZE - sizedX,
      sizedY,
    ]
  }
  const path = transformCanonicalPath(equationAsset.drawing.path, transformPoint)
  const transformedTrackedEdge = equationAsset.trackedEdgePoints.map(({ x, y }) => {
    const [transformedX, transformedY] = transformPoint(x, y)
    return Object.freeze({ x: transformedX, y: transformedY })
  })
  const transformedOuterEdge = [...equationAsset.outerEdgePoints].reverse().map(({ x, y }) => {
    const [transformedX, transformedY] = transformPoint(x, y)
    return Object.freeze({ x: transformedX, y: transformedY })
  })
  const railSideExteriorPath = options.extendToRailSide === false
    ? ''
    : makeRailSideExteriorPath([
      ...transformedTrackedEdge,
      ...transformedOuterEdge,
    ])
  return sealLockedPatternDrawing('connector.verb-koru.v1', {
    path: railSideExteriorPath ? `${path} ${railSideExteriorPath}` : path,
    viewBox: `0 0 ${FRAME_SIZE} ${FRAME_SIZE}`,
    drawing: Object.freeze({ fill: '#398aa6', stroke: 'none' }),
  })
}

/** Accepted-source-derived drawing gateway for the Noun family's triangle boundary. */
export function makeAcceptedFourTriangleDrawing(
  input: TriangleDesignInput = TRIANGLE_DESIGN_DEFAULT_INPUT,
): LockedPatternDrawing {
  assertRange('Triangle size', input.size, TRIANGLE_DESIGN_CONTROLS.size)
  const center = FRAME_SIZE / 2
  const halfStem = CONNECTOR_GEOMETRY_STANDARD.stemThickness / 2
  const bodyBaseY = 74
  const bodyHalfWidth = 44 * input.size
  const bodyHeight = 72.75 * input.size
  const stemBottomY = CONNECTOR_GEOMETRY_STANDARD.verticalStemBottomY
  const canonicalPath = [
    `M${clean(center - halfStem)} ${clean(stemBottomY)}`,
    `L${clean(center - halfStem)} ${clean(bodyBaseY)}`,
    `L${clean(center - bodyHalfWidth)} ${clean(bodyBaseY)}`,
    `L${clean(center)} ${clean(bodyBaseY - bodyHeight)}`,
    `L${clean(center + bodyHalfWidth)} ${clean(bodyBaseY)}`,
    `L${clean(center + halfStem)} ${clean(bodyBaseY)}`,
    `L${clean(center + halfStem)} ${clean(stemBottomY)}`,
    'Z',
  ].join(' ')
  const quarterTurns = ['up', 'right', 'down', 'left'].indexOf(input.direction)
  if (quarterTurns < 0) throw new Error('Triangle direction is not supported.')
  const angle = quarterTurns * Math.PI / 2
  const cosine = Math.cos(angle)
  const sine = Math.sin(angle)
  const path = transformCanonicalPath(canonicalPath, (x, y) => {
    const centeredX = x - center
    const centeredY = y - center
    return [
      center + centeredX * cosine - centeredY * sine,
      center + centeredX * sine + centeredY * cosine,
    ]
  })
  return sealLockedPatternDrawing('connector.noun-triangle.v1', {
    path,
    viewBox: `0 0 ${FRAME_SIZE} ${FRAME_SIZE}`,
    drawing: Object.freeze({ fill: '#398aa6', stroke: 'none' }),
  })
}

/** Original filled stemmed triangle with one large triangular centre cut-out. */
export function makeAcceptedCentreTriangleDrawing(
  input: TriangleDesignInput = TRIANGLE_DESIGN_DEFAULT_INPUT,
): LockedPatternDrawing {
  assertRange('Triangle size', input.size, TRIANGLE_DESIGN_CONTROLS.size)
  const center = FRAME_SIZE / 2
  const halfStem = CONNECTOR_GEOMETRY_STANDARD.stemThickness / 2
  const bodyBaseY = 74
  const bodyHalfWidth = 44 * input.size
  const bodyHeight = 72.75 * input.size
  const stemBottomY = CONNECTOR_GEOMETRY_STANDARD.verticalStemBottomY
  // The reverse centre triangle is the medial triangle of the outer body:
  // every corner is the exact midpoint of one outer edge. That single
  // construction leaves three balanced blue triangles without overlap,
  // overshoot, or separately guessed corner positions.
  const openingHalfWidth = bodyHalfWidth / 2
  const openingHeight = bodyHeight / 2
  const openingBaseY = bodyBaseY - openingHeight

  const canonicalPath = [
    `M${clean(center - halfStem)} ${clean(stemBottomY)}`,
    `L${clean(center - halfStem)} ${clean(bodyBaseY)}`,
    `L${clean(center - bodyHalfWidth)} ${clean(bodyBaseY)}`,
    `L${clean(center)} ${clean(bodyBaseY - bodyHeight)}`,
    `L${clean(center + bodyHalfWidth)} ${clean(bodyBaseY)}`,
    `L${clean(center + halfStem)} ${clean(bodyBaseY)}`,
    `L${clean(center + halfStem)} ${clean(stemBottomY)}`,
    'Z',
    `M${clean(center - openingHalfWidth)} ${clean(openingBaseY)}`,
    `L${clean(center)} ${clean(bodyBaseY)}`,
    `L${clean(center + openingHalfWidth)} ${clean(openingBaseY)}`,
    'Z',
  ].join(' ')
  const quarterTurns = ['up', 'right', 'down', 'left'].indexOf(input.direction)
  if (quarterTurns < 0) throw new Error('Triangle direction is not supported.')
  const angle = quarterTurns * Math.PI / 2
  const cosine = Math.cos(angle)
  const sine = Math.sin(angle)
  const path = transformCanonicalPath(canonicalPath, (x, y) => {
    const centeredX = x - center
    const centeredY = y - center
    return [
      center + centeredX * cosine - centeredY * sine,
      center + centeredX * sine + centeredY * cosine,
    ]
  })
  return sealLockedPatternDrawing('connector.noun-triangle-centre.v1', {
    path,
    viewBox: `0 0 ${FRAME_SIZE} ${FRAME_SIZE}`,
    drawing: Object.freeze({ fill: '#398aa6', stroke: 'none' }),
  })
}
