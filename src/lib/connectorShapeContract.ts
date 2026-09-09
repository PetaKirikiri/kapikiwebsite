import { z } from 'zod'
import { assertLockedPatternDrawing } from '../components/patternDrawingContract'
import { designRecipeSchema } from '../components/designRecipeSchema'

const color = z.string().regex(/^#[0-9a-f]{3,8}$/i)
export const connectorShapeSchema = z.object({
  id: z.number().int().positive().safe(),
  designId: z.enum(['arrow', 'arrowBite', 'arrowBiteReverse', 'arrowReverse', 'arrow4', 'arrow4Reverse', 'mangopare',
    'koruWave', 'koruWave2', 'koruWave3', 'koruWave4', 'triangle', 'triangle2']),
  name: z.string().min(1).max(200),
  recipe: designRecipeSchema.optional(),
  fingerprint: z.string().regex(/^[a-f0-9]{64}$/).optional(),
  drawing: z.object({
    sourceContractKey: z.string(), sourceVersion: z.number().int(),
    equationRevision: z.string().max(200), locked: z.literal(true),
    path: z.string().min(1).max(4_000_000).regex(/^[MmLlHhVvCcSsQqTtAaZzEe\d\s.,+-]+$/),
    viewBox: z.literal('0 0 96 96'),
    drawing: z.union([
      z.object({ fill: color, stroke: z.literal('none') }).strict(),
      z.object({ fill: z.literal('none'), stroke: color, strokeWidth: z.number().positive() }).strict(),
    ]),
  }).strict(),
}).strict().superRefine((shape, ctx) => {
  try {
    assertLockedPatternDrawing(shape.drawing as Parameters<typeof assertLockedPatternDrawing>[0])
  } catch { ctx.addIssue({ code: 'custom', message: 'Unrecognized shape source or version.' }) }
})
export const connectorShapeListSchema = z.array(connectorShapeSchema).max(1000)
