import type { CourseVocabularyEntry } from './courseVocabularyEntries'
import { vocabularyNumberValue } from './vocabularyNumberOrder'
import { LEVEL_ONE_CONTENT } from './levelOneContent'

// Course browsing and sourced teaching guidance only. Never engine categories or POS.
export const AO_SOURCE = 'https://kupu.maori.nz/possession/the-a-o-categories'
const jobs = new Set([
  ...LEVEL_ONE_CONTENT.vocabulary.filter(group => group.title === 'Mahi — optional personalisation').flatMap(group => group.words.map(word => word.label)),
  'kaiako', 'kaimahi',
])

export function isJob(entry: CourseVocabularyEntry): boolean {
  return entry.kind === 'word' && (entry.functionType === 'Job title' || jobs.has(entry.text))
}
const groups: readonly [string, string][] = [
  ['Whānau / Family', 'whānau whanaunga pāpā matua mātua whaea kuia koroua tūpuna whakapapa tamaiti tamariki tama tamāhine mokopuna tuakana tuākana teina tungāne tuahine'],
  ['Body', 'ringa waewae kanohi upoko waha karu taringa'],
  ['Clothing', 'kākahu hū pōtae'],
  ['Transport', 'waka motokā pahi pahikara'],
  ['Food & drink', 'ika miraka hēki parāoa tina heihei mīti parakuihi āporo kūmara huawhenua kaihapa kawhe raihi wai'],
  ['Places & nature', 'whare kura wāhi whenua kāinga moana awa maunga marae rohe tari ngahere rākau kākano taiao māra'],
  ['Technology', 'waea rorohiko mīhini hangarau'],
  ['Work & roles', 'ākonga kaiako kaimahi kaiwhakahaere kaitātari kaitohutohu kaitiaki'],
  ['Objects', 'pepa pouaka taputapu pēke tēpu tūru ipu kūaha maripi pereti pukapuka kēmu'],
]

export function courseCategories(entry: CourseVocabularyEntry): string[] {
  if (isJob(entry)) return ['Jobs']
  if (vocabularyNumberValue(entry.text) !== undefined) return ['Numbers']
  const matched = groups.filter(([, words]) => words.split(' ').includes(entry.text)).map(([label]) => label)
  if (matched.length) return matched
  return entry.category ? [entry.category] : entry.topics?.length ? entry.topics : entry.functionType ? [entry.functionType] : []
}

export type PossessionGuide = { category: 'A' | 'O'; context: string }
const possessionGroups: readonly [PossessionGuide['category'], string, string][] = [
  ['A', 'Your children or grandchildren', 'tamaiti tamariki tama tamāhine mokopuna'],
  ['O', 'Your parents or grandparents', 'pāpā matua mātua whaea kuia koroua tūpuna'],
  ['O', 'Your siblings', 'tuakana tuākana teina tungāne tuahine'],
  ['O', 'Clothes you wear', 'kākahu hū pōtae'],
  ['O', 'Your body parts', 'ringa waewae kanohi upoko waha karu taringa'],
  ['O', 'Transport you use', 'waka motokā pahi pahikara'],
  ['O', 'Your home or shelter', 'whare kāinga'],
  ['O', 'Drinking water or medicine', 'wai rongoā'],
  ['A', 'Food or drink for you', 'miraka hēki parāoa tina mīti parakuihi āporo kūmara huawhenua kaihapa kawhe raihi'],
  ['A', 'Objects you own', 'pepa pouaka taputapu pēke ipu maripi pereti pukapuka'],
  ['A', 'Technology you own', 'waea rorohiko'],
  ['A', 'Your money', 'moni pūtea'],
]

export function possessionGuide(entry: CourseVocabularyEntry): PossessionGuide | undefined {
  // Avoid assigning a noun's guidance to a different reading, e.g. kai = eat.
  if (entry.kind !== 'word') return undefined
  if (entry.text === 'kai' && entry.english.startsWith('food')) return { category: 'A', context: 'Food for you' }
  const found = possessionGroups.find(([, , words]) => words.split(' ').includes(entry.text))
  return found ? { category: found[0], context: found[1] } : undefined
}
