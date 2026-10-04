import { sentenceSlots } from './phraseSlots'
import type { BusManifestSheet } from '../busManifestContract'
import { projectedBlockBounds } from '../busManifestTeam/connectorTopology'
import { railVisualPair, WORD_CLASS_VISUAL_PALETTE } from '../../components/railVisualPalette'
import { TRAFFIC_PALETTE } from './trafficPalette'

type Tone = 'marker' | 'body' | 'modifier'
type Family = keyof typeof TRAFFIC_PALETTE
type Ink = readonly [Family, Tone]
export type ColorInterpretation = Readonly<{
 palette: Readonly<Record<Family, Readonly<Record<Tone, string>>>>
 pos: Readonly<Record<string, Ink>>
 families: Readonly<Record<string, Ink>>
 unknown: string
}>
export const COOL_INTERPRETATION: ColorInterpretation = {
 palette: TRAFFIC_PALETTE,
 pos: {
  tam: ['B', 'marker'], determiner: ['G', 'marker'],
  nominal_marker: ['B', 'marker'], nominal_predicate: ['B', 'marker'],
  location_marker: ['B', 'marker'], negative: ['N', 'marker'],
  postposed_predicate_particle: ['N', 'marker'],
  conjunction: ['C', 'marker'], adverb: ['A', 'marker'],
  proper_name: ['G', 'body'], personal_pronoun: ['G', 'body'], pronoun: ['G', 'body'],
  object_marker: ['B', 'marker'], target_marker: ['B', 'marker'], agent_marker: ['B', 'marker'],
 },
 families: { noun: ['G', 'body'], verb: ['B', 'body'], adjective: ['G', 'modifier'], particle: ['B', 'marker'] },
 unknown: '#94a3b8',
}
export type PresentationProfileId = 'original' | 'cool'
export const PRESENTATION_PROFILES = {
 original: { label: 'Original', interpretation: 'legacy' as const, markerBackground: 'next' as const,
  compound: [WORD_CLASS_VISUAL_PALETTE.nominalPredicate, WORD_CLASS_VISUAL_PALETTE.nominalNoun] },
 cool: { label: 'Cool', interpretation: COOL_INTERPRETATION, markerBackground: 'previous' as const,
  compound: [TRAFFIC_PALETTE.B.marker, TRAFFIC_PALETTE.B.body] },
}
export function resolveConfiguredColor(pos: string | null, family: string | undefined, config: ColorInterpretation): string {
 if (pos == null) return config.unknown
 const ink = config.pos[pos] ?? config.families[family ?? '']
 return ink ? config.palette[ink[0]][ink[1]] : config.unknown
}
export const SECTION_PALETTES = {
 original: {
  nonverbal: { marker: WORD_CLASS_VISUAL_PALETTE.nominalPredicate, body: WORD_CLASS_VISUAL_PALETTE.nominalNoun, modifier: '#f0c9dc' },
  verbal: { marker: WORD_CLASS_VISUAL_PALETTE.tam, body: WORD_CLASS_VISUAL_PALETTE.verb, modifier: '#b7dbe5' },
 },
 cool: {
  nonverbal: { marker: WORD_CLASS_VISUAL_PALETTE.nominalPredicate, body: WORD_CLASS_VISUAL_PALETTE.nominalNoun, modifier: '#f0c9dc' },
  verbal: TRAFFIC_PALETTE.B,
 },
} as const
export function resolveSentenceColors(tokens: BusManifestSheet['tokens'], families: ReadonlyMap<string,string>, profile: PresentationProfileId) {
 const interpretation = PRESENTATION_PROFILES[profile].interpretation
 const { sections } = sentenceSlots(tokens, families)
 return tokens.map((token,index) => {
  const section = sections.find(section => index >= section.start && index <= section.end)
  if (section) {
    const tones = SECTION_PALETTES[profile][section.kind]
    const pos = token.acceptedPosCode ?? ''
    const tone = index === section.start || pos === 'determiner' || pos === 'tam' || pos === 'nominal_marker' ? 'marker'
      : families.get(pos) === 'adjective' ? 'modifier' : 'body'
    return tones[tone]
  }
  return interpretation === 'legacy' ? originalColor(tokens,index,families)
    : resolveConfiguredColor(token.acceptedPosCode, families.get(token.acceptedPosCode ?? ''), interpretation)
 })
}

function interpolate(start: string, end: string, progress: number): string {
  const ratio = Math.max(0, Math.min(1, progress))
  const channel = (offset: number) => Math.round(parseInt(start.slice(offset, offset + 2), 16)
    + (parseInt(end.slice(offset, offset + 2), 16) - parseInt(start.slice(offset, offset + 2), 16)) * ratio)
    .toString(16).padStart(2, '0')
  return `#${channel(1)}${channel(3)}${channel(5)}`
}

function originalColor(tokens: BusManifestSheet['tokens'], index: number, families: ReadonlyMap<string, string>): string | undefined {
  const token = tokens[index]
  if (!token) return undefined
  const isAbilityDoerMarker = token.acceptedPosCode === 'agent_marker'
    && tokens.some((item) => item.acceptedPosCode === 'tam'
      && item.surfaceText.toLocaleLowerCase('mi-NZ') === 'taea')
  const isHeAhaQuestionLead = (
    (index === 0 && token.surfaceText.toLocaleLowerCase('mi-NZ') === 'he'
      && tokens[1]?.surfaceText.toLocaleLowerCase('mi-NZ') === 'aha')
    || (index === 1 && token.surfaceText.toLocaleLowerCase('mi-NZ') === 'aha'
      && tokens[0]?.surfaceText.toLocaleLowerCase('mi-NZ') === 'he')
  )
  if (isHeAhaQuestionLead) return WORD_CLASS_VISUAL_PALETTE.tam
  if (isAbilityDoerMarker) return WORD_CLASS_VISUAL_PALETTE.verb
  if (token.surfaceText.toLocaleLowerCase('mi-NZ') === 'ake') {
    return WORD_CLASS_VISUAL_PALETTE.nominalPredicate
  }
  if (token.acceptedPosCode === 'stative_verb') return WORD_CLASS_VISUAL_PALETTE.adjective
  if (token.acceptedPosCode === 'agent_marker'
    && tokens.some((item) => item.acceptedPosCode === 'stative_verb')) {
    return WORD_CLASS_VISUAL_PALETTE.verb
  }
  const family = token.acceptedPosCode == null ? null : families.get(token.acceptedPosCode)
  if (family === 'verb') return WORD_CLASS_VISUAL_PALETTE.verb
  if (family === 'adjective') return WORD_CLASS_VISUAL_PALETTE.adjective
  if (family === 'noun') {
    const followsNominalLead = ['nominal_marker', 'nominal_predicate']
      .includes(tokens[index - 1]?.acceptedPosCode ?? '')
    return token.acceptedPosCode === 'proper_name' ? WORD_CLASS_VISUAL_PALETTE.properName
      : followsNominalLead ? WORD_CLASS_VISUAL_PALETTE.nominalNoun
        : WORD_CLASS_VISUAL_PALETTE.noun
  }
  if (family === 'particle' && token.acceptedPosCode === 'tam') return WORD_CLASS_VISUAL_PALETTE.tam
  if (family === 'particle' && ['negative', 'postposed_predicate_particle'].includes(token.acceptedPosCode ?? '')) {
    return WORD_CLASS_VISUAL_PALETTE.negative
  }
  if (family === 'particle' && ['nominal_marker', 'nominal_predicate'].includes(token.acceptedPosCode ?? '')) {
    return WORD_CLASS_VISUAL_PALETTE.nominalPredicate
  }
  if (family === 'particle' && token.acceptedPosCode === 'location_marker') {
    return WORD_CLASS_VISUAL_PALETTE.nominalPredicate
  }
  if (family === 'particle' && token.acceptedPosCode === 'determiner') {
    return WORD_CLASS_VISUAL_PALETTE.determiner
  }
  if (family === 'particle' && token.acceptedPosCode === 'object_marker') {
    const followsNominalPredicate = tokens.slice(0, index).some((item) =>
      ['nominal_predicate', 'location_marker'].includes(item.acceptedPosCode ?? ''))
      && !tokens.slice(0, index).some((item) => item.acceptedPosCode != null
        && families.get(item.acceptedPosCode) === 'verb')
    if (followsNominalPredicate) return WORD_CLASS_VISUAL_PALETTE.nominalPredicate
    return WORD_CLASS_VISUAL_PALETTE.objectMarker
  }
  if (family === 'particle' && token.acceptedPosCode === 'target_marker') {
    return WORD_CLASS_VISUAL_PALETTE.verb
  }
  if (family === 'particle' && token.acceptedPosCode === 'agent_marker') return WORD_CLASS_VISUAL_PALETTE.agentMarker
  if (family === 'particle' && [
    'directional_particle', 'genitive_linker',
    'preposition', 'role_marker',
  ].includes(token.acceptedPosCode ?? '')) return WORD_CLASS_VISUAL_PALETTE.relationMarker
  const rail = token.rightRail === 'yellow' || token.rightRail === 'green' ? token.rightRail : token.leftRail
  if (rail !== 'yellow' && rail !== 'green') return undefined
  const pair = railVisualPair(rail)
  const { start, end } = projectedBlockBounds(tokens, index, rail)
  return interpolate(pair[0], pair[1], (index - start) / Math.max(1, end - start))
}

