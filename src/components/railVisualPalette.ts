export const RAIL_VISUAL_PALETTE = Object.freeze({
  yellow: ['#398aa6', '#7ac0d6'] as const,
  green: ['#164733', '#89c8a3'] as const,
})

const PARTICIPANT_MARKER_COLOR = '#79c8bd'

/** Stable teaching colours. These identify grammatical classes; rails must
 * never recolour one class to look like another. */
export const WORD_CLASS_VISUAL_PALETTE = Object.freeze({
  tam: '#468ca1',
  verb: '#87bfd0',
  objectMarker: '#87bfd0',
  negative: '#ab9ac7',
  agentMarker: PARTICIPANT_MARKER_COLOR,
  relationMarker: '#7196c7',
  nominalPredicate: '#c66a96',
  determiner: '#285640',
  noun: '#7cb596',
  adjective: '#a5cbb0',
  nominalNoun: '#e2a4c0',
  properName: '#e2a4c0',
})

export type VisibleRailState = keyof typeof RAIL_VISUAL_PALETTE

export function railVisualPair(state: VisibleRailState): readonly [string, string] {
  return RAIL_VISUAL_PALETTE[state]
}
