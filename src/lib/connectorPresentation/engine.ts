import { busManifestSheetSchema, type BusManifestSheet } from '../busManifestContract'
import type { ConnectorLibrary } from './blueprints'
import type { PatternRule } from './patterns'
import { projectSentenceConnectors } from './presentation'
import { planWordLayout } from './layout'

export function unresolvedSentence(text: string): BusManifestSheet {
  return { schemaVersion: 9, tokens: text.trim().split(/\s+/u).filter(Boolean).map((surfaceText, tokenIndex) => ({
    surfaceText, tokenIndex, acceptedPosCode: null, checkpointState: null,
    rightConnectorEnd: null, leftRail: null, rightRail: null,
  })) }
}

/** Public, framework-independent rendering contract. Measurements are supplied
 * by the host; every material, face and word-slot decision comes from here. */
export function presentSentence(input: {
  text: string
  state?: BusManifestSheet | null
  families: ReadonlyMap<string, string>
  library: ConnectorLibrary
  rules?: readonly PatternRule[]
  textWidths?: readonly number[]
}) {
  const state = busManifestSheetSchema.parse(input.state ?? unresolvedSentence(input.text))
  const words = unresolvedSentence(input.text).tokens
  if (state.tokens.length !== words.length || state.tokens.some((token, i) => token.surfaceText !== words[i]?.surfaceText)) {
    throw new Error('Sentence text and tagging state do not match.')
  }
  const plans = projectSentenceConnectors(state.tokens, input.families, input.library, input.rules)
  return { version: 1 as const, state, words: plans.map((presentation, index) => ({
    text: state.tokens[index]!.surfaceText,
    presentation,
    layout: planWordLayout(input.textWidths?.[index] ?? 0, index < words.length - 1,
      presentation.rightConnectorEnd, state.tokens[index]!.rightRail, presentation),
  })) }
}

/** Uses the existing read-only Recursion Path service, never a component word list. */
export async function tagText(text: string, signal?: AbortSignal): Promise<BusManifestSheet> {
  const response = await fetch('/__website_sentence', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ textMi: text.trim().replace(/\s+/gu, ' ') }), signal,
  })
  const body = await response.json()
  if (!response.ok) throw new Error(body.error ?? 'Sentence analysis failed.')
  return busManifestSheetSchema.parse(body.state)
}

/** One-call text-to-layout entrypoint; hosts supply their approved shape pack
 * and measured word widths, but no grammatical or visual rules of their own. */
export async function presentText(
  input: Omit<Parameters<typeof presentSentence>[0], 'state'>,
  signal?: AbortSignal,
) {
  return presentSentence({ ...input, state: await tagText(input.text, signal) })
}
