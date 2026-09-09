import {
  makeMangopareFrondPair,
  makeMangopareStructureRegions,
  mergeMangopareRegions,
  type MangopareEquationInput,
} from './mangopareGeometry'
import {
  MANGOPARE_FOUR_FROND_DEFAULT_INPUT,
} from './mangopareFourFrondGeometry'
import { sealLockedPatternDrawing, type LockedPatternDrawing } from './patternDrawingContract'

export const MANGOPARE_FOUR_TO_TWO_GEOMETRY_PROVENANCE = 'parametric' as const

/** Full four-frond body, retaining only the pair that renders on the left at 90 degrees. */
export function makeMangopareFourToTwoDrawing(
  input: MangopareEquationInput = MANGOPARE_FOUR_FROND_DEFAULT_INPUT,
): LockedPatternDrawing {
  // At the accepted 90-degree presentation, source Y becomes displayed X.
  // The original pair has the greater source Y and therefore occupies the
  // displayed left; the raised inner pair is the displayed right-hand pair.
  const [displayLeftTopFrond, displayLeftBottomFrond] = makeMangopareFrondPair(input)
  return sealLockedPatternDrawing('mangopare.four-to-two.experimental.v1', {
    path: mergeMangopareRegions([
      ...makeMangopareStructureRegions(input),
      displayLeftTopFrond,
      displayLeftBottomFrond,
    ]),
    viewBox: '0 0 96 96',
    drawing: Object.freeze({ fill: '#398aa6', stroke: 'none' as const }),
  })
}
