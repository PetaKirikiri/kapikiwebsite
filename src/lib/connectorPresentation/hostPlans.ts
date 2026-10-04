import { CONNECTOR_BLUEPRINTS, connectorBlueprintFor, type ConnectorLibrary } from './blueprints'
import { effectivePatternFor, type PatternRule, type PatternValue } from './patterns'
import { planConnectorPiece, planPatternPiece } from './presentation'
import { WORD_CLASS_VISUAL_PALETTE } from '../../components/railVisualPalette'
import { composeWholeAnchor } from './wholeAnchorGrowth'
import { compileLeftWordGrowth } from './leftWordGermination'

export type PatternRequest = { library: ConnectorLibrary; rules: readonly PatternRule[]; pos: string | null; family?: string | null; draft?: PatternValue | null }
export function patternPlan(input: PatternRequest) {
  const pattern = effectivePatternFor(input.pos, input.family, input.rules)
  const blueprint = connectorBlueprintFor(input.pos, input.family ?? null)
  const initial = pattern ?? (blueprint ? { left: { blueprintId: blueprint.id, role: 'accept' as const }, right: { blueprintId: blueprint.id, role: 'send' as const } } : null)
  const draft = input.draft === undefined ? initial : input.draft
  return {
    initial, configured: Boolean(pattern),
    label: pattern ? (['left', 'right'] as const).map(side => `${side === 'left' ? 'Left' : 'Right'}: ${pattern[side].role === 'send' ? 'Sends' : 'Receives'} ${CONNECTOR_BLUEPRINTS.find(item => item.id === pattern[side].blueprintId)?.label}`).join(' · ') : blueprint?.label ?? 'Not designed yet',
    pieces: draft ? (['left', 'right'] as const).map(side => ({ side, plan: planPatternPiece(input.library, draft[side], side) })) : [],
  }
}
export function catalogPlan(library: ConnectorLibrary) {
  return CONNECTOR_BLUEPRINTS.map(blueprint => ({ ...blueprint,
    pieces: (['send', 'accept'] as const).map(role => ({ role, plan: planConnectorPiece(library, blueprint, role) })),
  }))
}

export type NavigationRequest = { library: ConnectorLibrary; rules: readonly PatternRule[]; noun: boolean; width: number; prefixWidth: number }
/** Decorative header specimen; never a grammatical claim about its English label. */
export function navigationPlan(input: NavigationRequest) {
  const color = input.noun ? WORD_CLASS_VISUAL_PALETTE.noun : WORD_CLASS_VISUAL_PALETTE.verb
  const prefixColor = input.noun ? '#49a078' : WORD_CLASS_VISUAL_PALETTE.tam
  const pattern = effectivePatternFor(input.noun ? 'common_noun' : 'intransitive_verb', input.noun ? 'noun' : 'verb', input.rules)
  if (!pattern) return null
  const left = planPatternPiece(input.library, pattern.left, 'left', color)
  const right = planPatternPiece(input.library, pattern.right, 'right', color)
  if (left.status !== 'ready' || right.status !== 'ready') return null
  const plate = composeWholeAnchor(left, right, color, true, Math.max(1, Math.round(input.width * 40 / 14 - 80)))
  const prefix = input.prefixWidth ? compileLeftWordGrowth({ anchorLeft: left, anchorColor: color, color: prefixColor, bodyWidth: input.prefixWidth * 40 / 14 }) : null
  return { width: plate.width, height: plate.height, displayHeight: 14,
    prefix: prefix ? { width: prefix.width, height: prefix.height, style: { width: `${prefix.width / 3 * 14 / 40}px`, left: `${-input.prefixWidth}px` } } : null,
    frame(elapsed: number, reduced: boolean) {
      const progress = reduced ? 1 : Math.max(0, Math.min(1, elapsed / 1000))
      const prefixProgress = reduced ? 1 : Math.max(0, Math.min(1, (elapsed - 1000) / 850))
      return { image: plate.frame(progress), prefixImage: prefix?.frame(prefixProgress), anchorComplete: progress >= 1,
        complete: progress >= 1 && (!prefix || prefixProgress >= 1),
        reveal: prefix ? Math.min(100, prefix.textLeft(prefixProgress) * 14 / 40 / input.prefixWidth * 100) : 0 }
    },
  }
}
