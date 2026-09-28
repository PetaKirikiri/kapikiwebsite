import { z } from 'zod'
import { busManifestSheetSchema, busManifestPosCatalogSchema, type BusManifestSheet } from '../busManifestContract'

/** A display-support address, never a tagging candidate or learned-word record. */
export type WordSupportTarget = {
  word: string
  posCode: string | null
  sentence?: string
  tokenIndex?: number
  color?: string | null
  displayedAs?: string
  state?: BusManifestSheet
}
export function wordSupportTarget(word: string, posCode: string | null, context: Omit<WordSupportTarget, 'word' | 'posCode'> = {}): WordSupportTarget {
  return { ...context, word: word.normalize('NFC').replace(/^[\s.,!?;:…“”"()]+|[\s.,!?;:…“”"()]+$/gu, ''), posCode }
}
const example = z.object({ mi: z.string(), en: z.string() })
const related = z.object({ word: z.string(), label: z.string(), posCode: z.string().nullable() })
export const wordSupportSchema = z.object({
  word: z.string(),
  role: z.object({ code: z.string().optional(), label: z.string(), description: z.string(), visual: z.string().nullable(), family: z.string().nullable().optional() }).nullable(),
  entry: z.object({ meaning: z.string(), explanation: z.string(), note: z.string().optional(), examples: z.array(example), related: z.array(related) }).nullable(),
  definitions: z.array(z.object({ definition: z.string(), label: z.string(), url: z.string() })),
  vocabulary: z.array(z.string()),
  examples: z.array(example.extend({ structureId: z.number().optional(), state: busManifestSheetSchema.nullable().optional() })),
  pronunciations: z.array(z.object({ url: z.string(), source: z.string() })),
  types: z.array(z.object({ code: z.string(), label: z.string(), description: z.string(), sourceLabelCode: z.string(), sourceLabel: z.string() })),
  teAka: z.object({
    entries: z.array(z.object({ headword: z.string(), url: z.string().nullable(), sourceId: z.string().nullable() })),
    senses: z.array(z.object({ sense_index: z.number(), labelCode: z.string().nullable(), label: z.string(), qualifier: z.string().nullable(), definition: z.string(), passiveForms: z.array(z.string()), synonyms: z.array(z.string()) })),
  }),
  catalog: busManifestPosCatalogSchema,
})
export type WordSupportData = z.infer<typeof wordSupportSchema>
export async function loadWordSupport(target: WordSupportTarget, signal?: AbortSignal) {
  const query = new URLSearchParams({ word: target.word })
  if (target.posCode) query.set('pos', target.posCode)
  if (target.sentence) query.set('sentence', target.sentence)
  const response = await fetch(`/__word_support?${query}`, { signal })
  if (!response.ok) throw new Error('Word support could not load. Try again.')
  const parsed = wordSupportSchema.safeParse(await response.json())
  if (!parsed.success) throw new Error('This word’s explanation is unavailable. Try again.')
  return parsed.data
}
