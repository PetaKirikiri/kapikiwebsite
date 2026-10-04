import { z } from 'zod'
import { learnedWordSchema, normalizeGuestSurfaceIdentity } from './busManifestContract'

export const wordReferenceRequestSchema = z.object({
  word: z.string().trim().min(1).max(100)
    .transform(normalizeGuestSurfaceIdentity).pipe(z.string().min(1)),
}).strict()

export const wordReferencesRequestSchema = z.object({
  words: z.array(z.string().trim().min(1).max(100)).min(1).max(256)
    .transform(words => [...new Set(words.map(normalizeGuestSurfaceIdentity).filter(Boolean))])
    .pipe(z.array(z.string().min(1)).min(1)),
}).strict()

const addressSchema = z.object({
  table: z.enum(['lexeme', 'lexeme_alias', 'dictionary_entry', 'dictionary_sense',
    'dictionary_example', 'dictionary_pos_mapping', 'pos_type', 'lexeme_category',
    'learned_maori_word', 'lexeme_audio', 'lexeme_pos_capability',
    'dictionary_synonym', 'dictionary_sense_passive_suffix', 'dictionary_sense_passive_form',
    'words_clean.maori_word']),
  key: z.record(z.string()),
}).strict()

const exampleSchema = z.object({
  reference: addressSchema,
  kind: z.string(),
  text: z.string(),
  issues: z.array(z.literal('possible_import_markup')),
}).strict()

export const wordReferenceSchema = z.object({
  schemaVersion: z.literal(1),
  word: z.string().min(1),
  // A read fingerprint, not a confidence score or persisted learning revision.
  contentFingerprint: z.string().regex(/^[a-f0-9]{64}$/u),
  identities: z.array(z.object({
    reference: addressSchema,
    lemma: z.string(),
    matchedBy: z.enum(['lemma', 'alias']),
    aliasReference: addressSchema.nullable(),
  }).strict()),
  dictionary: z.object({
    status: z.enum(['available', 'entry_without_senses', 'no_local_entry']),
    entries: z.array(z.object({
      reference: addressSchema,
      lexemeReference: addressSchema,
      source: z.literal('te_aka'),
      headword: z.string(),
      sourceUrl: z.string().nullable(),
      sourceWordId: z.string().nullable(),
      fetchedAt: z.string().nullable(),
      httpStatus: z.number().int().nullable(),
      issues: z.array(z.enum(['missing_fetch_provenance', 'missing_source_url'])),
      senses: z.array(z.object({
        reference: addressSchema,
        label: z.string().nullable(),
        qualifier: z.string().nullable(),
        definition: z.string().nullable(),
        possibilities: z.array(z.object({
          specificPos: z.string(),
          broadPos: z.string(),
          mappingReference: addressSchema,
          posReference: addressSchema,
        }).strict()),
        examples: z.array(exampleSchema),
        related: z.array(z.object({
          reference: addressSchema,
          kind: z.enum(['synonym', 'passive_suffix', 'passive_form']),
          text: z.string(),
        }).strict()),
      }).strict()),
    }).strict()),
  }).strict(),
  learned: z.object({
    reference: addressSchema,
    status: z.enum(['unseen', 'confirmed']),
    record: learnedWordSchema.nullable(),
  }).strict(),
  sourceCategories: z.array(z.object({
    reference: addressSchema,
    code: z.string(),
    label: z.string(),
    scope: z.literal('word_not_sense'),
  }).strict()),
  audio: z.array(z.object({ reference: addressSchema, source: z.string(), url: z.string() }).strict()),
  aliases: z.array(z.object({ reference: addressSchema, text: z.string() }).strict()),
  priorAssociations: z.array(z.object({
    reference: addressSchema,
    specificPos: z.string(),
    broadPos: z.string(),
    status: z.literal('legacy_unreviewed'),
    eligibleForAutomaticTagging: z.literal(false),
  }).strict()),
  stagingReferences: z.array(z.object({
    reference: addressSchema,
    status: z.literal('staging_copy_not_learning'),
    eligibleForAutomaticTagging: z.literal(false),
  }).strict()),
  receipt: z.object({
    readOnly: z.literal(true),
    floorReads: z.literal(0),
    floorWrites: z.literal(0),
    externalLookupPerformed: z.literal(false),
  }).strict(),
}).strict().superRefine((value, context) => {
  if ((value.learned.status === 'confirmed') !== (value.learned.record !== null) ||
      (value.learned.record && value.learned.record.word !== value.word)) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: 'Learned identity and status must match the actual record.' })
  }
})

export type WordReference = z.infer<typeof wordReferenceSchema>
export type WordReferenceAddress = z.infer<typeof addressSchema>

/** Fresh read only. No browser knowledge store and no automatic teaching. */
export async function fetchWordReference(word: string): Promise<WordReference> {
  const input = wordReferenceRequestSchema.parse({ word })
  const response = await fetch('/__word_reference', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input), cache: 'no-store',
  })
  if (!response.ok) throw new Error(`Word reference lookup failed (${response.status}).`)
  const result = wordReferenceSchema.parse(await response.json())
  if (result.word !== input.word) throw new Error('Word reference returned a different word.')
  return result
}

/** One frozen read for all distinct words; repetitions do not become extra evidence. */
export async function fetchWordReferences(words: readonly string[]): Promise<WordReference[]> {
  const input = wordReferencesRequestSchema.parse({ words })
  const response = await fetch('/__word_reference', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input), cache: 'no-store',
  })
  if (!response.ok) throw new Error(`Word reference lookup failed (${response.status}).`)
  const result = z.array(wordReferenceSchema).parse(await response.json())
  if (result.length !== input.words.length || result.some((ref, index) => ref.word !== input.words[index])) {
    throw new Error('Word reference returned different words.')
  }
  return result
}
