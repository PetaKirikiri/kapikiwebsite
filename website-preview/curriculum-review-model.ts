import draft from '../docs/curriculum/vocabulary-progression.draft.json'
import frequencySource from '../docs/curriculum/frequency-pdf-index.json'
import type { WordReference } from '../src/lib/wordReference'

export { frequencySource }
export function frequencyEvidence(word: string) {
  return (frequencySource.entries as Record<string, { starred: boolean; pages: number[] }>)[word.normalize('NFC').toLowerCase()] ?? null
}
export function referenceSummary(reference: WordReference) {
  const senses = reference.dictionary.entries.flatMap(entry => entry.senses)
  const local = reference.learned.record?.conditions.map(condition => condition.local) ?? []
  const unique = (values: (string | null)[]) => [...new Set(values.filter((value): value is string => !!value))]
  return {
    broad: unique(senses.flatMap(sense => sense.possibilities.map(pos => pos.broadPos))),
    teAka: unique(senses.map(sense => sense.label)),
    specific: unique(senses.flatMap(sense => sense.possibilities.map(pos => pos.specificPos))),
    confirmedBroad: unique(local.map(shape => shape.family)),
    confirmedSpecific: unique(local.map(shape => shape.ours)),
    sourceCategories: unique(reference.sourceCategories.map(category => category.label)),
    learnedCategories: unique(local.flatMap(shape => shape.categories)),
  }
}

export { draft }
export const sections = ['vocabulary', 'kiwaha', 'structures'] as const
export type Section = typeof sections[number]
export const levels = [1, 2, 3, 4, 5, 6]
export function readRoute(hash: string) {
  const match = /^#level-([1-6])(?:\/(vocabulary|kiwaha|structures))?$/.exec(hash)
  return { level: match ? Number(match[1]) : 1, section: (match?.[2] || 'vocabulary') as Section }
}
export function levelContent(level: number) {
  const groups = draft.groups.filter(group => group.level === level)
  const keys = new Set(groups.flatMap(group => group.wordKeys))
  const words = draft.vocabulary.filter(word => keys.has(word.key))
  return {
    groups, words,
    introduced: words.filter(word => word.firstProposedLevel === level).length,
    revisited: words.filter(word => word.firstProposedLevel < level).length,
    cumulative: draft.vocabulary.filter(word => word.firstProposedLevel <= level).length,
    kiwaha: draft.kiwaha.filter(item => item.proposedLevel === level),
    structures: draft.courseStructures.filter(item => item.level === level),
  }
}
