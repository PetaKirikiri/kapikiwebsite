import {
  ARROW_COMPOSITION_DEFAULT_INPUT,
  ARROW_FOUR_FROND_DEFAULT_INPUT,
  makeArrowFourFrondCompositionGeometry,
  type ArrowFourFrondCompositionInput,
} from './arrowCompositionGeometry'
import { sealLockedPatternDrawing, type LockedPatternDrawing } from './patternDrawingContract'

export const LOCKED_ARROW_FOUR_FROND_SOURCE_KEY = 'arrow.four-fronds.experimental.v1' as const

/** Approved Arrow settings shared by Design Space and sentence presentation. */
export const ACCEPTED_ARROW_FOUR_FROND_INPUT: ArrowFourFrondCompositionInput = Object.freeze({
  ...ARROW_FOUR_FROND_DEFAULT_INPUT,
  ...ARROW_COMPOSITION_DEFAULT_INPUT,
  armLength: 1.35,
  armAngleDegrees: 46,
  blueThickness: 8.5,
  turns: 1.25,
  rotationDegrees: -5,
})

/** The only drawing gateway for the separate four-frond Arrow variation. */
export function makeLockedArrowFourFrondDrawing(
  input: ArrowFourFrondCompositionInput = ARROW_FOUR_FROND_DEFAULT_INPUT,
): LockedPatternDrawing {
  return sealLockedPatternDrawing(
    LOCKED_ARROW_FOUR_FROND_SOURCE_KEY,
    makeArrowFourFrondCompositionGeometry(input),
  )
}

export function makeAcceptedArrowFourFrondDrawing(): LockedPatternDrawing {
  return makeLockedArrowFourFrondDrawing(ACCEPTED_ARROW_FOUR_FROND_INPUT)
}
