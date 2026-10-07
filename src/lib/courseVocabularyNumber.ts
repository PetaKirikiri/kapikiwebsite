import type { CourseVocabularyEntry } from './courseVocabularyEntries'
import { isJob } from './courseVocabularyCategories'
import { PRONOUN_PROGRESSION } from './courseReferenceLanguage'

// Course reference only; these labels are not production POS or learned knowledge.
export const NUMBER_SOURCE = 'https://www.grammar.maori.nz/230/The-article'
export const NUMBER_LABELS = { singular: 'Singular', dual: 'Dual (two)', plural: 'Plural', both: 'Singular & plural' } as const
type NumberKind = keyof typeof NUMBER_LABELS
type NumberGuide = { kind: NumberKind; note: string; source: string }
const pairs = [
  ['tamaiti', 'tamariki'], ['matua', 'mātua'], ['tuakana', 'tuākana'],
  ['tangata', 'tāngata'], ['wahine', 'wāhine'],
] as const
const sameForm = new Set(('whaea pāpā kuia koroua tama tamāhine mokopuna tungāne tuahine whanaunga whānau '
  + 'ākonga kaitiaki whare kura kāinga waka motokā pahi pahikara maunga awa marae rohe '
  + 'ringa waewae kanohi upoko waha karu taringa kākahu hū pōtae '
  + 'waea rorohiko mīhini pepa pouaka taputapu pēke tēpu tūru ipu kūaha maripi pereti pukapuka kēmu').split(' '))

export function numberGuide(entry: CourseVocabularyEntry): NumberGuide | undefined {
  if (entry.kind !== 'word') return undefined
  const pronouns = PRONOUN_PROGRESSION.find(group => (group.words as readonly string[]).includes(entry.text))
  if (pronouns) return {
    kind: ['au','ahau','koe','ia'].includes(entry.text) ? 'singular' : ['māua','tāua','kōrua','rāua'].includes(entry.text) ? 'dual' : 'plural',
    note: ['au','ahau','koe','ia'].includes(entry.text) ? 'One person' : ['māua','tāua','kōrua','rāua'].includes(entry.text) ? 'Two people' : 'Three or more people',
    source: 'https://kupu.maori.nz/extra/pronouns',
  }
  const pair = pairs.find(words => (words as readonly string[]).includes(entry.text))
  if (pair) return {
    kind: entry.text === pair[0] ? 'singular' : 'plural',
    note: entry.text === pair[0] ? `Plural: ${pair[1]}` : `Singular: ${pair[0]}`,
    source: NUMBER_SOURCE,
  }
  if (entry.text === 'te' || entry.text === 'ngā') return {
    kind: entry.text === 'te' ? 'singular' : 'plural', note: entry.text === 'te' ? 'Plural: ngā' : 'Singular: te', source: NUMBER_SOURCE,
  }
  if (entry.text === 'he') return { kind: 'both', note: 'A / some', source: NUMBER_SOURCE }
  if (isJob(entry) || sameForm.has(entry.text)) return {
    kind: 'both', note: `te ${entry.text} / ngā ${entry.text}`, source: NUMBER_SOURCE,
  }
  return undefined
}
