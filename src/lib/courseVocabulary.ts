import draft from '../../docs/curriculum/vocabulary-progression.draft.json'
import glosses from '../../docs/curriculum/vocabulary-glosses.json'
import type { CurriculumLevel } from './sentenceStructureLevels'

export function courseVocabulary(level: CurriculumLevel) {
  const meanings: Record<string, string> = glosses.meanings
  const contextualMeanings: Record<string, Record<string, string>> = glosses.levelMeanings
  const groups = draft.groups.filter(group => group.level === level)
  const topics = new Map<string, string[]>()
  for (const group of groups) {
    for (const key of group.wordKeys) {
      topics.set(key, [...(topics.get(key) ?? []), group.title])
    }
  }
  return draft.vocabulary
    .filter(word => topics.has(word.key))
    .map(word => ({
      key: word.key,
      word: word.word,
      english: contextualMeanings[level]?.[word.key] ?? meanings[word.key],
      topics: topics.get(word.key)!,
    }))
    .sort((a, b) => a.word.localeCompare(b.word, 'mi'))
}
