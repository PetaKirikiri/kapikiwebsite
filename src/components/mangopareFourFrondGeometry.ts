import { CONNECTOR_GEOMETRY_STANDARD } from './connectorGeometryStandard'
import {
  makeMangopareDrawing,
  makeMangopareFrondAssetPair,
  makeMangopareFrondPair,
  mergeMangopareRegions,
  type MangopareEquationInput,
} from './mangopareGeometry'
import type { PlacedKoru } from './mangopareGeometry'
import { sealLockedPatternDrawing, type LockedPatternDrawing } from './patternDrawingContract'

export const MANGOPARE_FOUR_FROND_GEOMETRY_PROVENANCE = 'parametric' as const

/**
 * The accepted v49 equation is the complete base of this version. The second
 * pair is a similarity transform of that same locked koru output: no control
 * points, frond anatomy, or Drawer-owned geometry are introduced here.
 */
const INNER_PAIR_SCALE = 0.72
const INNER_PAIR_EXTRA_TURNS = 0.12
const INNER_PAIR_ROTATION_DEGREES = 10
const INNER_PAIR_LEFT_SHIFT_X = 0.8
const INNER_PAIR_SHIFT_Y = -30.2
const CENTER_X = CONNECTOR_GEOMETRY_STANDARD.faceWidth / 2
const clean = (value: number): number => Number(value.toFixed(3))

type Bounds = Readonly<{
  minX: number
  maxX: number
  minY: number
  maxY: number
}>

function pathBounds(path: string): Bounds {
  const points = [...path.matchAll(/(?:[ML])(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/gu)]
    .map((match) => ({ x: Number(match[1]), y: Number(match[2]) }))
  if (points.length < 3) throw new Error('Mangopare four-frond source received an empty frond.')
  return Object.freeze({
    minX: Math.min(...points.map(({ x }) => x)),
    maxX: Math.max(...points.map(({ x }) => x)),
    minY: Math.min(...points.map(({ y }) => y)),
    maxY: Math.max(...points.map(({ y }) => y)),
  })
}

function makeInnerLeftFrond(path: string, placementReferencePath: string): string {
  // The reference remains the shorter accepted frond. Extending the equation
  // can therefore add material only at the loose tail; it cannot move or
  // resize the already accepted curl body.
  const bounds = pathBounds(placementReferencePath)
  const origin = Object.freeze({
    x: (bounds.minX + bounds.maxX) / 2,
    y: (bounds.minY + bounds.maxY) / 2,
  })
  const rotation = INNER_PAIR_ROTATION_DEGREES * Math.PI / 180
  const cosine = Math.cos(rotation)
  const sine = Math.sin(rotation)
  return path.replace(
    /([ML])(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/gu,
    (_, command: string, rawX: string, rawY: string) => {
      const scaledX = (Number(rawX) - origin.x) * INNER_PAIR_SCALE
      const scaledY = (Number(rawY) - origin.y) * INNER_PAIR_SCALE
      const x = origin.x + scaledX * cosine - scaledY * sine
        + INNER_PAIR_LEFT_SHIFT_X
      const y = origin.y + scaledX * sine + scaledY * cosine
        + INNER_PAIR_SHIFT_Y
      return `${command}${clean(x)} ${clean(y)}`
    },
  )
}

function transformInnerPoint(point: Readonly<{ x: number; y: number }>, placementReferencePath: string) {
  const bounds = pathBounds(placementReferencePath)
  const origin = { x: (bounds.minX + bounds.maxX) / 2, y: (bounds.minY + bounds.maxY) / 2 }
  const rotation = INNER_PAIR_ROTATION_DEGREES * Math.PI / 180
  const scaledX = (point.x - origin.x) * INNER_PAIR_SCALE
  const scaledY = (point.y - origin.y) * INNER_PAIR_SCALE
  return Object.freeze({
    x: clean(origin.x + scaledX * Math.cos(rotation) - scaledY * Math.sin(rotation) + INNER_PAIR_LEFT_SHIFT_X),
    y: clean(origin.y + scaledX * Math.sin(rotation) + scaledY * Math.cos(rotation) + INNER_PAIR_SHIFT_Y),
  })
}

function mirrorAcrossConnectorCentre(path: string): string {
  return path.replace(
    /([ML])(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/gu,
    (_, command: string, rawX: string, rawY: string) => (
      `${command}${clean(2 * CENTER_X - Number(rawX))} ${rawY}`
    ),
  )
}

export function makeMangopareInnerFrondPair(
  input: MangopareEquationInput = MANGOPARE_FOUR_FROND_DEFAULT_INPUT,
): readonly [string, string] {
  const [acceptedLeftFrond] = makeMangopareFrondPair(input)
  const [extendedInnerLeftFrond] = makeMangopareFrondPair(Object.freeze({
    ...input,
    turns: input.turns + INNER_PAIR_EXTRA_TURNS,
  }))
  const innerLeftFrond = makeInnerLeftFrond(extendedInnerLeftFrond, acceptedLeftFrond)
  return Object.freeze([innerLeftFrond, mirrorAcrossConnectorCentre(innerLeftFrond)])
}

export function makeMangopareInnerFrondAssetPair(
  input: MangopareEquationInput = MANGOPARE_FOUR_FROND_DEFAULT_INPUT,
): readonly [PlacedKoru, PlacedKoru] {
  const [acceptedLeft] = makeMangopareFrondAssetPair(input)
  const [extendedLeft] = makeMangopareFrondAssetPair(Object.freeze({
    ...input,
    turns: input.turns + INNER_PAIR_EXTRA_TURNS,
  }))
  const left = Object.freeze({
    ...extendedLeft,
    path: makeInnerLeftFrond(extendedLeft.path, acceptedLeft.path),
    endpoints: Object.freeze({
      start: transformInnerPoint(extendedLeft.endpoints.start, acceptedLeft.path),
      end: transformInnerPoint(extendedLeft.endpoints.end, acceptedLeft.path),
    }),
  })
  const right = Object.freeze({
    ...left,
    path: mirrorAcrossConnectorCentre(left.path),
    endpoints: Object.freeze({
      start: Object.freeze({ x: 2 * CENTER_X - left.endpoints.start.x, y: left.endpoints.start.y }),
      end: Object.freeze({ x: 2 * CENTER_X - left.endpoints.end.x, y: left.endpoints.end.y }),
    }),
  })
  return Object.freeze([left, right])
}

/**
 * The new version begins with the accepted two-frond defaults. Its settings
 * are stored independently by the Design Space version contract.
 */
export const MANGOPARE_FOUR_FROND_DEFAULT_INPUT: MangopareEquationInput = Object.freeze({
  armLength: 3.05,
  armAngleDegrees: 103,
  blueThickness: 8.5,
  turns: 1.05,
  radiusStabilisation: 0,
  rotationDegrees: 0,
  wholeShapeRotationDegrees: 0,
  direction: 'clockwise',
})

export function makeMangopareFourFrondDrawing(
  input: MangopareEquationInput = MANGOPARE_FOUR_FROND_DEFAULT_INPUT,
): LockedPatternDrawing {
  const acceptedTwoFrondBase = makeMangopareDrawing(input)
  const [innerLeftFrond, innerRightFrond] = makeMangopareInnerFrondPair(input)

  return sealLockedPatternDrawing('mangopare.four-fronds.experimental.v1', {
    path: mergeMangopareRegions([
      acceptedTwoFrondBase.path,
      innerLeftFrond,
      innerRightFrond,
    ]),
    viewBox: acceptedTwoFrondBase.viewBox,
    drawing: acceptedTwoFrondBase.drawing,
  })
}
