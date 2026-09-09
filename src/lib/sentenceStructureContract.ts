import { z } from 'zod'

export const sentenceStructureIdSchema = z.number()
  .int()
  .positive()
  .max(Number.MAX_SAFE_INTEGER)

export const canonicalSentenceTextSchema = z.string()
  .min(1)
  .max(1_000)
  .refine((text) => text === text.trim(), 'Sentence text must be trimmed.')
  .refine(
    (text) => !/[^\S ]/u.test(text),
    'Sentence text may use spaces but no other whitespace.',
  )
  .refine((text) => !/ {2,}/u.test(text), 'Sentence text must be single-spaced.')

export const curriculumLevelSchema = z.union([
  z.literal(1), z.literal(2), z.literal(3),
  z.literal(4), z.literal(5), z.literal(6),
])

export const sentenceStructureRosterItemSchema = z.object({
  structureId: sentenceStructureIdSchema,
  sortOrder: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  textMi: canonicalSentenceTextSchema,
  curriculumLevel: curriculumLevelSchema.nullable(),
}).strict()

export const sentenceStructureRosterSchema = z.array(
  sentenceStructureRosterItemSchema,
).readonly()

export type SentenceStructureRosterItem = {
  readonly structureId: number
  readonly sortOrder: number
  readonly textMi: string
  readonly curriculumLevel?: z.infer<typeof curriculumLevelSchema> | null
}

export const editSentenceStructureInputSchema = z.object({
  structureId: sentenceStructureIdSchema,
  expectedTextMi: canonicalSentenceTextSchema,
  textMi: canonicalSentenceTextSchema,
}).strict().refine(
  (input) => input.textMi !== input.expectedTextMi,
  { message: 'The replacement sentence must be different.' },
)

export type EditSentenceStructureInput = z.infer<
  typeof editSentenceStructureInputSchema
>

export const deleteSentenceStructureInputSchema = z.object({
  structureId: sentenceStructureIdSchema,
  expectedTextMi: canonicalSentenceTextSchema,
}).strict()

export type DeleteSentenceStructureInput = z.infer<
  typeof deleteSentenceStructureInputSchema
>

export const setSentenceStructureCurriculumLevelInputSchema = z.object({
  structureId: sentenceStructureIdSchema,
  curriculumLevel: curriculumLevelSchema.nullable(),
}).strict()

export type SetSentenceStructureCurriculumLevelInput = z.infer<
  typeof setSentenceStructureCurriculumLevelInputSchema
>

export const sentenceStructureMutationResultSchema = z.object({
  operation: z.enum(['updated', 'deleted', 'level_updated']),
  structureId: sentenceStructureIdSchema,
  roster: sentenceStructureRosterSchema,
}).strict()

export type SentenceStructureMutationResult = z.infer<
  typeof sentenceStructureMutationResultSchema
>

export function parseEditSentenceStructureInput(
  value: unknown,
): EditSentenceStructureInput {
  return editSentenceStructureInputSchema.parse(value)
}

export function parseDeleteSentenceStructureInput(
  value: unknown,
): DeleteSentenceStructureInput {
  return deleteSentenceStructureInputSchema.parse(value)
}

export function parseSetSentenceStructureCurriculumLevelInput(
  value: unknown,
): SetSentenceStructureCurriculumLevelInput {
  return setSentenceStructureCurriculumLevelInputSchema.parse(value)
}

export function parseSentenceStructureMutationResult(
  value: unknown,
): SentenceStructureMutationResult {
  return sentenceStructureMutationResultSchema.parse(value)
}
