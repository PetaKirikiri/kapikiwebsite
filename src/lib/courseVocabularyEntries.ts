import { LEVEL_ONE_PHRASES } from './coursePhrases'
import { courseVocabulary } from './courseVocabulary'
import { courseKiwaha } from './courseKiwaha'
import { courseReadingLanguage } from './courseReadingLanguage'
import { pronounSupport, SHARED_POSSESSIVES } from './courseReferenceLanguage'
import type { CurriculumLevel } from './sentenceStructureLevels'

export type VocabularyEntryKind = 'word' | 'phrase' | 'kiwaha'
export type CourseVocabularyEntry = {
  id: string
  kind: VocabularyEntryKind
  key?: string
  text: string
  english: string
  components: string[]
  functionType?: string
  category?: string
  example?: readonly [string, string]
  sourceUrl?: string
}

// Curriculum browsing only. Whole-expression functions do not become word POS.
export function courseVocabularyEntries(level: CurriculumLevel): CourseVocabularyEntry[] {
  const entries: CourseVocabularyEntry[] = courseVocabulary(level).map(word => ({
    id: `word:${word.key}`, key: word.key, kind: 'word', text: word.word,
    english: word.english, components: [word.word], ...pronounSupport(word.key),
  }))
  for (const item of courseReadingLanguage(level)) {
    const word = entries.find(entry => entry.text === item.text)
    const support = { functionType: item.functionType, example: item.example, sourceUrl: item.sourceUrl }
    if (word) Object.assign(word, support)
    else {
      const components = item.text.split(/\s+/)
      entries.push({ id: `language:${item.id}`, kind: components.length > 1 ? 'phrase' : 'word',
        key: components.length === 1 ? item.text : undefined,
        text: item.text, english: item.english, components, ...support })
    }
  }
  entries.push(...courseKiwaha(level).map(item => ({ ...item, kind: 'kiwaha' as const, id: `kiwaha:${item.id}` })))
  if (level === 6) entries.push(...SHARED_POSSESSIVES)
  if (level === 1) entries.push(...LEVEL_ONE_PHRASES.map(item => ({
    ...item, id: `phrase:${item.text}`,
    kind: (item.functionType === 'Job title' ? 'word' : ['Greeting', 'Farewell'].includes(item.functionType) ? 'kiwaha' : 'phrase') as VocabularyEntryKind,
    key: item.functionType === 'Job title' ? item.text : undefined,
    components: item.text.split(/\s+/),
  })))
  return entries.sort((a, b) => a.text.localeCompare(b.text, 'mi'))
}
