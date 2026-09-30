import { z } from 'zod'

const internalPos = z.object({ code: z.string(), label: z.string(), status: z.enum(['unreviewed', 'confirmed']) })
export const vocabularyPosSchema = z.object({
  word: z.string(),
  teAka: z.array(z.object({ code: z.string(), label: z.string(), url: z.string().nullable() })),
  broadPos: z.array(internalPos),
  specificPos: z.array(internalPos),
})
export type VocabularyPos = z.infer<typeof vocabularyPosSchema>

export async function fetchVocabularyPos(words: string[], signal?: AbortSignal): Promise<VocabularyPos[]> {
  const query = new URLSearchParams()
  words.forEach(word => query.append('words', word))
  const response = await fetch(`/__word_support?${query}`, { signal })
  if (!response.ok) throw new Error('POS information could not be loaded.')
  const result = z.object({ words: z.array(vocabularyPosSchema) }).parse(await response.json())
  if (result.words.length !== words.length || result.words.some((item, i) => item.word !== words[i])) {
    throw new Error('POS information did not match the vocabulary.')
  }
  return result.words
}
