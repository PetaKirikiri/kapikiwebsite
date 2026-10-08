// Exclusive browsing groups for the selected course use, not engine POS inference.
export const COURSE_VERB_TYPES = [
  'Transitive verb',
  'Intransitive verb',
  'Stative verb',
  'Passive verb',
  'Experience verb',
] as const

export function isCourseVerbType(type: string): boolean {
  return COURSE_VERB_TYPES.some(verbType => verbType === type)
}

export function matchesCourseVocabularyType(entry: { type: string }, type: string): boolean {
  return type === 'all' || entry.type === type
}
