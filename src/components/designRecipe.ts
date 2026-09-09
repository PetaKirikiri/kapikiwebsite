import { mapLinearPath } from './linearPath'
import { fitWaveContacts } from './lockedPatternTransform'
import { makeAcceptedKoruWaveDrawing, makeAcceptedCentreTriangleDrawing, makeAcceptedFourTriangleDrawing, fillWaveTopLeftCorner } from './lockedConnectorDesignSource'
import { makeLockedArrowDrawing, makeLockedArrowBiteDrawing } from './lockedArrowSource'
import { makeLockedArrowFourFrondDrawing } from './lockedArrowFourFrondSource'
import { makeMangopareVersionDrawing } from './mangopareDesignVersions'
import { flipLockedPatternDrawing, flipLockedPatternDrawingVertically, rotateLockedPatternDrawing, moveLockedPatternDrawing } from './lockedPatternTransform'

export { designRecipeSchema, type DesignRecipe } from './designRecipeSchema'
import type { DesignRecipe } from './designRecipeSchema'

export function renderDesignRecipe(recipe: DesignRecipe) {
  const { source, transform } = recipe
  const base = source.kind === 'arrow' ? makeLockedArrowDrawing(source.input)
    : source.kind === 'arrowBite' ? makeLockedArrowBiteDrawing(source.input)
    : source.kind === 'arrow4' ? makeLockedArrowFourFrondDrawing(source.input)
    : source.kind === 'mangopare' ? makeMangopareVersionDrawing(source.variant, source.input)
    : source.kind === 'wave' ? makeAcceptedKoruWaveDrawing(source.input, { extendToRailSide: source.extendToRailSide })
    : source.centre ? makeAcceptedCentreTriangleDrawing(source.input) : makeAcceptedFourTriangleDrawing(source.input)
  const positioned = moveLockedPatternDrawing(rotateLockedPatternDrawing(
    flipLockedPatternDrawingVertically(flipLockedPatternDrawing(base, transform.flipX), transform.flipY),
    transform.rotation,
  ), transform.x, transform.y)
  const contactFit = (recipe.fitWaveContacts || recipe.uniformWaveContacts) && source.kind === 'wave'
    ? fitWaveContacts(positioned, recipe.uniformWaveContacts ?? false) : positioned
  const fitted = source.kind === 'wave' && recipe.waveFillScale ? {
    ...contactFit,
    path: mapLinearPath(contactFit.path, (x, y) => [
      Number((96 + (x - 96) * recipe.waveFillScale!).toFixed(3)),
      Number((y * recipe.waveFillScale!).toFixed(3)),
    ]),
  } : contactFit
  const dropped = source.kind === 'wave' && (recipe.waveDrop || recipe.waveHeadLeft) ? {
    ...fitted,
    path: mapLinearPath(fitted.path, (x, y) => {
      const weight = x > 0 && x < 96 && y > 0 && y < 96
        ? Math.sin(Math.PI * x / 96) * Math.sin(Math.PI * y / 96) : 0
      if (recipe.waveHeadLeft === undefined) return [x, y + (recipe.waveDrop ?? 0) * weight]
      return [Number((x - recipe.waveHeadLeft * weight).toFixed(3)),
        Number((y + (recipe.waveDrop ?? 0) * weight).toFixed(3))]
    }),
  } : fitted
  const topFinished = recipe.finish === 'wave-top-left-v1' ? fillWaveTopLeftCorner(dropped) : dropped
  const finished = recipe.waveBottomLeftFill && source.kind === 'wave'
    ? flipLockedPatternDrawingVertically(fillWaveTopLeftCorner(flipLockedPatternDrawingVertically(topFinished, true)), true)
    : topFinished
  return flipLockedPatternDrawingVertically(
    flipLockedPatternDrawing(finished, recipe.outputFlip?.x ?? false), recipe.outputFlip?.y ?? false,
  )
}

export const WAVE_FAMILY_FLIPS = Object.freeze({
  koruWave: { x: true, y: true },
  koruWave2: { x: false, y: true },
  koruWave3: { x: true, y: false },
  koruWave4: { x: false, y: false },
})

/** Reverse is a transform of the complete rendered snapshot, including its finish. */
export function reverseDesignDrawing(drawing: ReturnType<typeof renderDesignRecipe>) {
  return rotateLockedPatternDrawing(drawing, 180)
}
