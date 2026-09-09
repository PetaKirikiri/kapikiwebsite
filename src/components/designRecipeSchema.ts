import { z } from 'zod'
import { ARROW_COMPOSITION_CONTROLS, ARROW_FOUR_FROND_CONTROLS, MANGOPARE_CONTROLS, KORU_WAVE_DESIGN_CONTROLS, TRIANGLE_DESIGN_CONTROLS } from './designInputControls'

const range = ({ min, max }: { min: number; max: number }) => z.number().finite().min(min).max(max)
const direction = z.enum(['clockwise', 'counterclockwise'])
const arrow = z.object({
  armLength: range(ARROW_COMPOSITION_CONTROLS.armLength),
  armAngleDegrees: range(ARROW_COMPOSITION_CONTROLS.armAngleDegrees),
  blueThickness: range(ARROW_COMPOSITION_CONTROLS.blueThickness),
  turns: range(ARROW_COMPOSITION_CONTROLS.turns),
  rotationDegrees: range(ARROW_COMPOSITION_CONTROLS.rotationDegrees),
  wholeShapeRotationDegrees: z.literal(0), direction,
}).strict()
const wave = z.object({
  innerWidthRatio: z.number().min(0.3).max(1).optional(),
  size: range(KORU_WAVE_DESIGN_CONTROLS.size),
  blueThickness: range(KORU_WAVE_DESIGN_CONTROLS.blueThickness),
  radiusStabilisation: range(KORU_WAVE_DESIGN_CONTROLS.radiusStabilisation),
  turns: range(KORU_WAVE_DESIGN_CONTROLS.turns),
  rotationDegrees: range(KORU_WAVE_DESIGN_CONTROLS.rotationDegrees),
  verticalPosition: range(KORU_WAVE_DESIGN_CONTROLS.verticalPosition),
  growthDirection: direction, direction: z.enum(['left', 'right']),
}).strict()

/** A recipe owns all inputs needed to reproduce one design, independently of editor defaults. */
export const designRecipeSchema = z.object({
  version: z.literal(1),
  source: z.discriminatedUnion('kind', [
    z.object({ kind: z.literal('arrow'), input: arrow }).strict(),
    z.object({ kind: z.literal('arrowBite'), input: arrow.extend({ armLength: z.number().min(0.75).max(2.5) }) }).strict(),
    z.object({ kind: z.literal('arrow4'), input: arrow.extend({
      leftSmallFrondRotationDegrees: range(ARROW_FOUR_FROND_CONTROLS.leftSmallFrondRotationDegrees),
      leftSmallFrondMoveX: range(ARROW_FOUR_FROND_CONTROLS.leftSmallFrondMoveX),
      leftSmallFrondMoveY: range(ARROW_FOUR_FROND_CONTROLS.leftSmallFrondMoveY),
      rightSmallFrondRotationDegrees: range(ARROW_FOUR_FROND_CONTROLS.rightSmallFrondRotationDegrees),
      rightSmallFrondMoveX: range(ARROW_FOUR_FROND_CONTROLS.rightSmallFrondMoveX),
      rightSmallFrondMoveY: range(ARROW_FOUR_FROND_CONTROLS.rightSmallFrondMoveY),
    }).strict() }).strict(),
    z.object({ kind: z.literal('mangopare'), variant: z.string().refine((id) => ['two-fronds-v1', 'two-fronds-reverse-v1', 'four-fronds-v1', 'four-fronds-reverse-v1'].includes(id)), input: arrow.extend({
      armLength: range(MANGOPARE_CONTROLS.umbrellaReach),
      armAngleDegrees: range(MANGOPARE_CONTROLS.umbrellaCurve),
      radiusStabilisation: range(MANGOPARE_CONTROLS.radiusStabilisation),
    }).strict() }).strict(),
    z.object({ kind: z.literal('wave'), input: wave, extendToRailSide: z.boolean() }).strict(),
    z.object({ kind: z.literal('triangle'), centre: z.boolean(), input: z.object({ size: range(TRIANGLE_DESIGN_CONTROLS.size), direction: z.enum(['left', 'right', 'up', 'down']) }).strict() }).strict(),
  ]),
  transform: z.object({
    rotation: z.number().finite().min(-180).max(180),
    x: z.number().finite().min(-48).max(48), y: z.number().finite().min(-48).max(48),
    flipX: z.boolean(), flipY: z.boolean(),
  }).strict(),
  finish: z.enum(['none', 'wave-top-left-v1']),
  outputFlip: z.object({ x: z.boolean(), y: z.boolean() }).strict().optional(),
  fitWaveContacts: z.boolean().optional(),
  uniformWaveContacts: z.boolean().optional(),
  waveFillScale: z.number().min(1).max(1.2).optional(),
  waveDrop: z.number().min(0).max(12).optional(),
  waveHeadLeft: z.number().min(0).max(10).optional(),
  waveBottomLeftFill: z.boolean().optional(),
}).strict()
export type DesignRecipe = z.infer<typeof designRecipeSchema>
