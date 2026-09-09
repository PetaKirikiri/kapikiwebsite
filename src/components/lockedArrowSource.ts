import {
  ARROW_COMPOSITION_DEFAULT_INPUT,
  makeArrowCompositionGeometry,
  makeArrowBiteGeometry,
  type ArrowCompositionInput,
} from './arrowCompositionGeometry'
import { sealLockedPatternDrawing, type LockedPatternDrawing } from './patternDrawingContract'

export const LOCKED_ARROW_SOURCE_KEY = 'arrow.composition.experimental.v1' as const

export function makeLockedArrowBiteDrawing(input: ArrowCompositionInput): LockedPatternDrawing {
  return sealLockedPatternDrawing('arrow.bite.experimental.v1', makeArrowBiteGeometry(input))
}

export const ACCEPTED_ARROW_INPUT: ArrowCompositionInput = Object.freeze({
  armLength: 1.3,
  armAngleDegrees: ARROW_COMPOSITION_DEFAULT_INPUT.armAngleDegrees,
  blueThickness: 10,
  turns: 1.25,
  rotationDegrees: -10,
  wholeShapeRotationDegrees: 0,
  direction: 'clockwise',
})

/** The only drawing gateway for the Arrow attachment experiment. */
export function makeLockedArrowDrawing(
  input: ArrowCompositionInput = ARROW_COMPOSITION_DEFAULT_INPUT,
): LockedPatternDrawing {
  return sealLockedPatternDrawing(
    LOCKED_ARROW_SOURCE_KEY,
    makeArrowCompositionGeometry(input),
  )
}


/** The accepted Connectors specimen is pinned to the approved equation inputs. */
export function makeAcceptedArrowDrawing(): LockedPatternDrawing {
  return sealLockedPatternDrawing(
    'arrow.v1',
    makeArrowCompositionGeometry(ACCEPTED_ARROW_INPUT),
  )
}
