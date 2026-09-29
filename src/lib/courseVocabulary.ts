import draft from '../../docs/curriculum/vocabulary-progression.draft.json'
import type { CurriculumLevel } from './sentenceStructureLevels'

export function courseVocabulary(level: CurriculumLevel) {
  const groups = draft.groups.filter(group => group.level === level)
  const topics = new Map<string, string[]>()
  for (const group of groups) {
    for (const key of group.wordKeys) {
      topics.set(key, [...(topics.get(key) ?? []), group.title])
    }
  }
  return draft.vocabulary
    .filter(word => topics.has(word.key))
    .map(word => ({ key: word.key, word: word.word, topics: topics.get(word.key)! }))
    .sort((a, b) => a.word.localeCompare(b.word, 'mi'))
}
