import draft from '../../docs/curriculum/vocabulary-progression.draft.json'
import type { CurriculumLevel } from './sentenceStructureLevels'

// Functions describe the taught expression as a whole, not its component words' POS.
const expressionFunctions: Record<string, string> = {
  'kiwaha-draft-1': 'Interjection',
  'kiwaha-draft-3': 'Interjection',
}

// Only explicitly allocated expressions are exposed. The remaining proposals
// stay in the editorial draft; course allocation does not approve POS evidence.
export const COURSE_KIWAHA = draft.kiwaha.flatMap(entry => {
  if (!('courseLevel' in entry) || !('english' in entry)) return []
  return [{
    id: entry.id, level: entry.courseLevel as CurriculumLevel,
    kind: 'kiwaha' as const,
    components: entry.text.replace(/[!?.]/g, '').split(/\s+/),
    functionType: expressionFunctions[entry.id], category: entry.conversationUse,
    text: entry.text, english: entry.english as string, sourceUrl: entry.sourceUrl,
  }]
})

export function courseKiwaha(level: CurriculumLevel) {
  return COURSE_KIWAHA.filter(entry => entry.level === level)
}

export function readingKiwaha(id?: string) {
  return COURSE_KIWAHA.find(entry => entry.id === id)
}
