import { effectivePatternFor, type PatternRule } from './patterns'
import { planPatternPiece, projectSentenceConnectors } from './presentation'
import type { ConnectorLibrary } from './blueprints'

// Teacher-selected tools, not word classification. Word compatibility comes
// from the server; all artwork, colours and orientations use the shared engine.
export const TEACHING_SHAPES = [
  { kind: 'predicate', label: 'Nominal predicate', pos: 'nominal_predicate', family: 'particle' },
  { kind: 'subject', label: 'Noun', pos: 'noun', family: 'noun' },
] as const
export type TeachingShapeKind = typeof TEACHING_SHAPES[number]['kind']
export function planTeachingShape(kind: TeachingShapeKind, library: ConnectorLibrary, rules: readonly PatternRule[], posCode?: string | null) {
  const tool = TEACHING_SHAPES.find(item => item.kind === kind)!
  const pos = posCode ?? tool.pos
  const families = new Map([[pos, tool.family]])
  const pattern = effectivePatternFor(pos, tool.family, rules)
  const [presentation] = projectSentenceConnectors([{ surfaceText: '', tokenIndex: 0, acceptedPosCode: pos, checkpointState: 'may_end', rightConnectorEnd: 'cap', leftRail: null, rightRail: null }], families, library, rules)
  if (!pattern || !presentation.materialColor) return null
  const color = presentation.materialColor
  return { color, left: planPatternPiece(library, pattern.left, 'left', color), right: planPatternPiece(library, pattern.right, 'right', color) }
}
