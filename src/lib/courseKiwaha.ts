import draft from '../../docs/curriculum/vocabulary-progression.draft.json'
import type { CurriculumLevel } from './sentenceStructureLevels'

// Only explicitly allocated expressions are exposed. The remaining proposals
// stay in the editorial draft; course allocation does not approve POS evidence.
export const COURSE_KIWAHA = draft.kiwaha.flatMap(entry => {
  if (!('courseLevel' in entry) || !('english' in entry)) return []
  return [{
    id: entry.id, level: entry.courseLevel as CurriculumLevel,
    text: entry.text, english: entry.english as string, sourceUrl: entry.sourceUrl,
  }]
})

export function courseKiwaha(level: CurriculumLevel) {
  return COURSE_KIWAHA.filter(entry => entry.level === level)
}

export function readingKiwaha(id?: string) {
  return COURSE_KIWAHA.find(entry => entry.id === id)
}
