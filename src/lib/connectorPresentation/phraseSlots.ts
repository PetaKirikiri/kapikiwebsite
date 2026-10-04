import type { BusManifestSheet } from '../busManifestContract'

type Tokens = BusManifestSheet['tokens']
export type NounSlot = { kind: 'noun'; form: 'pronoun' | 'proper_name' | 'noun_phrase'; start: number; end: number; components: number[] }
export type SentenceSection = { kind: 'nonverbal' | 'verbal'; start: number; end: number; slot?: NounSlot }
const pronouns = new Set(['pronoun', 'personal_pronoun'])

/** Presentation structure from accepted POS and saved boundaries, never new
 * tagging evidence. Unknown or incomplete phrases are left unresolved. */
export function sentenceSlots(tokens: Tokens, families: ReadonlyMap<string, string>) {
  const nounSlots: NounSlot[] = []
  for (let start = 0; start < tokens.length; start++) {
    const pos = tokens[start].acceptedPosCode ?? ''
    const family = families.get(pos)
    if (!pronouns.has(pos) && pos !== 'proper_name' && pos !== 'determiner' && family !== 'noun') continue
    let end = start
    let valid = true
    while (tokens[end].rightConnectorEnd !== 'cap') {
      if (!['send', 'accept'].includes(tokens[end].rightConnectorEnd ?? '') || !tokens[end + 1]) { valid = false; break }
      const next = tokens[++end].acceptedPosCode ?? ''
      if (!['noun', 'adjective'].includes(families.get(next) ?? '') && !pronouns.has(next) && next !== 'proper_name') { valid = false; break }
    }
    if (!valid || (pos === 'determiner' && end === start)) continue
    const slot: NounSlot = { kind: 'noun', form: start === end && pronouns.has(pos) ? 'pronoun' : start === end && pos === 'proper_name' ? 'proper_name' : 'noun_phrase', start, end, components: Array.from({ length: end - start + 1 }, (_, n) => start + n) }
    nounSlots.push(slot)
    start = end
  }
  const sections: SentenceSection[] = []
  tokens.forEach((token, start) => {
    if (sections.some(section => start <= section.end && start >= section.start)) return
    if (!['nominal_marker', 'nominal_predicate', 'location_marker', 'tam'].includes(token.acceptedPosCode ?? '')) return
    if (token.surfaceText.toLocaleLowerCase('mi-NZ') === 'he' && tokens[start + 1]?.surfaceText.toLocaleLowerCase('mi-NZ') === 'aha') return
    if (token.surfaceText.toLocaleLowerCase('mi-NZ') === 'aha' && tokens[start - 1]?.surfaceText.toLocaleLowerCase('mi-NZ') === 'he') return
    const kind = token.acceptedPosCode === 'tam' ? 'verbal' : 'nonverbal'
    let end = start
    while (tokens[end + 1] && tokens[end + 1].acceptedPosCode === token.acceptedPosCode && tokens[end].rightConnectorEnd !== 'cap') end++
    const slot = kind === 'nonverbal' && tokens[end].rightConnectorEnd !== 'cap' ? nounSlots.find(item => item.start === end + 1) : undefined
    if (slot) end = slot.end
    else if (tokens[end].rightConnectorEnd !== 'cap') {
      while (tokens[end + 1] && ['verb', 'adjective'].includes(families.get(tokens[end + 1].acceptedPosCode ?? '') ?? '')) {
        end++
        if (tokens[end].rightConnectorEnd === 'cap') break
      }
    }
    sections.push({ kind, start, end, slot })
  })
  return { nounSlots, sections }
}

export type NounSpecimenSource = { structureId?: number; textMi: string; state?: Pick<BusManifestSheet, 'tokens'> | null }

/** Catalogue examples from accepted occurrences. This enumerates noun forms;
 * it neither infers a new sentence nor asserts every substitution is valid. */
export function nounSlotCatalog(sources: readonly NounSpecimenSource[], families: ReadonlyMap<string, string>) {
  const forms = [
    { form: 'proper_name', label: 'Name' },
    { form: 'noun_phrase', label: 'Noun phrase' },
    { form: 'pronoun', label: 'Pronoun' },
  ] as const
  const found = sources.flatMap(source => {
    const tokens = source.state?.tokens
    if (!tokens || tokens.map(token => token.surfaceText).join(' ') !== source.textMi) return []
    return sentenceSlots(tokens, families).nounSlots.map(slot => ({
      form: slot.form,
      example: slot.components.map(index => tokens[index].surfaceText).join(' '),
      source: { structureId: source.structureId, textMi: source.textMi, indices: slot.components },
    }))
  })
  return { heading: 'Any noun', examples: forms.flatMap(({ form, label }) => {
    const seen = new Set<string>()
    return found.filter(item => {
      if (item.form !== form || seen.has(item.example)) return false
      seen.add(item.example)
      return true
    }).slice(0, 2).map(item => ({ kind: label, example: item.example, source: item.source }))
  }) }
}
