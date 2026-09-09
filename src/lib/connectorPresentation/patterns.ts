import { z } from 'zod'
import type { WordConditionShape, BusManifestSheet } from '../busManifestContract'

export const PATTERN_GROUPS = [
  { key: 'verb', label: 'Verbs' },
  { key: 'tam', label: 'Tense / aspect (TAM)' },
  { key: 'noun', label: 'Nouns & names' },
  { key: 'nominal', label: 'Determiners & nominal markers' },
  { key: 'particle', label: 'Other particles' },
  { key: 'adjective', label: 'Adjectives & modifiers' },
  { key: 'other', label: 'Other word types' },
] as const
export const patternKeySchema = z.enum(['verb', 'tam', 'noun', 'nominal', 'particle', 'adjective', 'other'])
export type PatternKey = z.infer<typeof patternKeySchema>
export const patternFaceSchema = z.object({
  blueprintId: z.enum(['nominal-bite', 'two-frond-arrow', 'negative-triangle', 'skinny-wave', 'fat-wave', 'four-frond-arrow', 'two-frond-mangopare', 'four-frond-mangopare', 'object-triangle', 'agent-triangle']),
  role: z.enum(['send', 'accept']),
}).strict()
export const patternValueSchema = z.object({ left: patternFaceSchema, right: patternFaceSchema }).strict()
export type PatternFace = z.infer<typeof patternFaceSchema>
export type PatternValue = z.infer<typeof patternValueSchema>
export const patternRuleSchema = patternValueSchema.extend({
  key: patternKeySchema, revision: z.number().int().positive().safe(),
}).strict()
export type PatternRule = z.infer<typeof patternRuleSchema>
export const patternRulesSchema = z.array(patternRuleSchema).max(PATTERN_GROUPS.length)
  .refine((rules) => new Set(rules.map((rule) => rule.key)).size === rules.length, 'Duplicate pattern group.')
export const patternRequestSchema = z.discriminatedUnion('operation', [
  z.object({ operation: z.literal('read') }).strict(),
  z.object({ operation: z.literal('save'), key: patternKeySchema,
    expectedRevision: z.number().int().positive().safe().nullable(), value: patternValueSchema }).strict(),
])

export function patternKeyFor(pos: string | null, family: string | null | undefined): PatternKey | null {
  if (family === 'particle') return pos === 'tam' ? 'tam'
    : ['determiner', 'nominal_marker', 'nominal_predicate'].includes(pos ?? '') ? 'nominal' : 'particle'
  return family === 'verb' || family === 'noun' || family === 'adjective' || family === 'other' ? family : null
}
export function patternRuleFor(pos: string | null, family: string | null | undefined, rules: readonly PatternRule[]) {
  return rules.find((rule) => rule.key === patternKeyFor(pos, family))
}
/** Owner-approved baseline for verbal chains. These are engine defaults, not
 * saved settings or inferred grammar. Explicit saved group settings override. */
export const VERBAL_PATTERN: Readonly<PatternValue> = Object.freeze({
  left: { blueprintId: 'skinny-wave', role: 'send' },
  right: { blueprintId: 'skinny-wave', role: 'send' },
})
/** Passive verbs keep the approved Skinny Wave material, but both exposed
 * fronds face left. The left side therefore remains a Send while the right
 * side uses the separately saved Receive orientation. */
export const PASSIVE_VERB_PATTERN: Readonly<PatternValue> = Object.freeze({
  left: { blueprintId: 'skinny-wave', role: 'send' },
  right: { blueprintId: 'skinny-wave', role: 'accept' },
})
/** Stative verbs are the directional counterpart to passive verbs: both
 * exposed Skinny Wave fronds face right. */
export const STATIVE_VERB_PATTERN: Readonly<PatternValue> = Object.freeze({
  left: { blueprintId: 'skinny-wave', role: 'accept' },
  right: { blueprintId: 'skinny-wave', role: 'send' },
})
export const TAM_PATTERN: Readonly<PatternValue> = Object.freeze({
  left: { blueprintId: 'skinny-wave', role: 'send' },
  right: { blueprintId: 'skinny-wave', role: 'send' },
})
export const NOUN_PATTERN: Readonly<PatternValue> = Object.freeze({
  left: { blueprintId: 'fat-wave', role: 'send' },
  right: { blueprintId: 'fat-wave', role: 'send' },
})
export const NOMINAL_PREDICATE_PATTERN: Readonly<PatternValue> = Object.freeze({
  left: { blueprintId: 'fat-wave', role: 'send' },
  right: { blueprintId: 'fat-wave', role: 'send' },
})
export function effectivePatternFor(pos: string | null, family: string | null | undefined, rules: readonly PatternRule[]) {
  const key = patternKeyFor(pos, family)
  return pos === 'passive_verb' ? PASSIVE_VERB_PATTERN
    : pos === 'stative_verb' ? STATIVE_VERB_PATTERN
    : patternRuleFor(pos, family, rules)
    ?? (pos === 'nominal_marker' || pos === 'nominal_predicate' ? NOMINAL_PREDICATE_PATTERN
      : key === 'verb' ? VERBAL_PATTERN
        : key === 'tam' ? TAM_PATTERN
          : key === 'noun' || key === 'adjective' ? NOUN_PATTERN : undefined)
}
function boundaryPriority(pos: string | null, family: string | null | undefined): number {
  if (pos === 'nominal_marker' || pos === 'nominal_predicate') return 4
  const key = patternKeyFor(pos, family)
  return key === 'verb' || key === 'noun' ? 3 : key === 'tam' ? 2 : 1
}
export function effectiveBoundaryPattern(
  leftPos: string | null, leftFamily: string | null | undefined,
  rightPos: string | null, rightFamily: string | null | undefined,
  rules: readonly PatternRule[],
): Readonly<{ owner: 'left' | 'right'; face: PatternFace }> | null {
  const left = effectivePatternFor(leftPos, leftFamily, rules)
  const right = effectivePatternFor(rightPos, rightFamily, rules)
  if (!left) return right ? { owner: 'right', face: right.left } : null
  if (!right) return { owner: 'left', face: left.right }
  return boundaryPriority(leftPos, leftFamily) > boundaryPriority(rightPos, rightFamily)
    ? { owner: 'left', face: left.right }
    : { owner: 'right', face: right.left }
}
export function effectiveRightRoleFor(pos: string | null, family: string | null | undefined, rules: readonly PatternRule[]) {
  return effectivePatternFor(pos, family, rules)?.right.role ?? (patternKeyFor(pos, family) === 'tam' ? 'send' : undefined)
}
export const oppositeRole = (role: PatternFace['role']): PatternFace['role'] => role === 'send' ? 'accept' : 'send'
export function patternFacesMate(right: PatternFace, left: PatternFace) {
  return right.blueprintId === left.blueprintId && right.role === oppositeRole(left.role)
}

/** Policy replaces orientation, not POS, linguistic rails, or closure facts. */
export function applyPatternToCondition(shape: WordConditionShape, rules: readonly PatternRule[]): WordConditionShape {
  const rule = effectivePatternFor(shape.ours, shape.family, rules)
  const rightRole = effectiveRightRoleFor(shape.ours, shape.family, rules)
  if (!rule && !rightRole && shape.leftConnectorFamily !== 'verb') return shape
  return { ...shape,
    leftConnectorEnd: shape.leftConnectorEnd === 'send' || shape.leftConnectorEnd === 'accept'
      ? rule?.left.role ?? (shape.leftConnectorFamily === 'verb' ? oppositeRole(effectivePatternFor(null, 'verb', rules)!.right.role) : shape.leftConnectorEnd)
      : shape.leftConnectorEnd,
    rightConnectorEnd: rightRole && (shape.rightConnectorEnd === 'send' || shape.rightConnectorEnd === 'accept') ? rightRole : shape.rightConnectorEnd,
  }
}

export function applyPatternsToTokens(tokens: BusManifestSheet['tokens'], families: ReadonlyMap<string, string>, rules: readonly PatternRule[]): BusManifestSheet['tokens'] {
  return tokens.map((token, index) => {
    const next = tokens[index + 1]
    const boundary = next && effectiveBoundaryPattern(
      token.acceptedPosCode, families.get(token.acceptedPosCode ?? ''),
      next.acceptedPosCode, families.get(next.acceptedPosCode ?? ''), rules)
    const rightRole = boundary
      ? boundary.owner === 'right' ? oppositeRole(boundary.face.role) : boundary.face.role
      : effectiveRightRoleFor(token.acceptedPosCode, families.get(token.acceptedPosCode ?? ''), rules)
    return rightRole && (token.rightConnectorEnd === 'send' || token.rightConnectorEnd === 'accept')
      ? { ...token, rightConnectorEnd: rightRole } : token
  })
}
