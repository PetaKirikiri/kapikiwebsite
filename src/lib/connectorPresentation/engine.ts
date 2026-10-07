import { floorLightPlan } from './floorLight'
import { compileSectionPlayback } from './sectionPlayback'
import { sentenceWordGlosses } from './wordGlosses'
import { sentenceSlots, nounSlotCatalog } from './phraseSlots'
import { navigationPlan, patternPlan, catalogPlan, type NavigationRequest, type PatternRequest } from './hostPlans'
import { posLegend } from './posLegend'
import { busManifestPosCatalogSchema } from '../busManifestContract'
import { readWebsiteJson } from '../websiteData'
import type { PresentationProfileId } from './colorInterpretation'
import { wordSupportTarget } from './wordSupport'
import { busManifestSheetSchema, type BusManifestSheet } from '../busManifestContract'
import { CONNECTOR_BLUEPRINTS, type ConnectorLibrary } from './blueprints'
import { effectivePatternFor, oppositeRole, type PatternRule } from './patterns'
import { planConnectorFace, planPatternPiece, projectSentenceConnectors } from './presentation'

import { CONNECTOR_RAIL_LAYOUT, planWordLayout, planRailSpan } from './layout'

/** Labels for the existing sentence-building exercise; never tagging evidence. */
function exerciseRole(pos: string | null): 'predicate' | 'subject' | 'name' | 'determiner' | null {
  if (pos === 'nominal_marker' || pos === 'nominal_predicate') return 'predicate'
  if (pos === 'proper_name') return 'name'
  if (pos === 'determiner') return 'determiner'
  if (pos === 'noun' || pos === 'common_noun') return 'subject'
  return null
}

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
  continuousRail?: boolean
  colorProfile?: PresentationProfileId
  textWidths?: readonly number[]
  displayMode?: 'maori' | 'english-above'
  measureEnglish?: (text: string) => number
}) {
  const state = busManifestSheetSchema.parse(input.state ?? unresolvedSentence(input.text))
  const words = unresolvedSentence(input.text).tokens
  if (state.tokens.length !== words.length || state.tokens.some((token, i) => token.surfaceText !== words[i]?.surfaceText)) {
    throw new Error('Sentence text and tagging state do not match.')
  }
  const displayMode = input.displayMode ?? 'maori'
  const glosses = displayMode === 'english-above' ? sentenceWordGlosses(input.text, words.length) : null
  const plans = projectSentenceConnectors(state.tokens, input.families, input.library, input.rules, input.continuousRail, input.colorProfile)
  const renderedWords = plans.map((presentation, index) => ({
    text: state.tokens[index]!.surfaceText,
    gloss: glosses ? { text: glosses[index], language: 'en' as const, placement: 'above-maori' as const } : null,
    presentation,
    exerciseRole: exerciseRole(state.tokens[index]!.acceptedPosCode),
    support: wordSupportTarget(state.tokens[index]!.surfaceText, state.tokens[index]!.acceptedPosCode, { sentence: input.text, state, tokenIndex: index, color: presentation.materialColor }),
    layout: planWordLayout(Math.max(input.textWidths?.[index] ?? 0, glosses ? input.measureEnglish?.(glosses[index]) ?? 0 : 0), index < words.length - 1,
      presentation.rightConnectorEnd, state.tokens[index]!.rightRail, presentation, input.continuousRail),
  }))
  // A short TAM between a noun section and its verb cannot hold two full
  // faces. Give the verbal section one shared entrance at its left boundary;
  // retain the TAM/verb colour transition inside, with no second overlaid curl.
  if (input.continuousRail && input.textWidths) {
    for (let index = 1; index < renderedWords.length - 1; index++) {
      const token = state.tokens[index]!
      const next = state.tokens[index + 1]!
      const word = renderedWords[index]!
      const previous = renderedWords[index - 1]!
      if (token.acceptedPosCode !== 'tam'
        || input.families.get(next.acceptedPosCode ?? '') !== 'verb'
        || word.layout.slotWidth >= CONNECTOR_RAIL_LAYOUT.connectionWidth
        || !previous.presentation.face) continue
      const rule = effectivePatternFor(token.acceptedPosCode, input.families.get(token.acceptedPosCode), input.rules ?? [])
      const blueprint = CONNECTOR_BLUEPRINTS.find(item => item.id === rule?.left.blueprintId)
      if (!rule || !blueprint || !previous.presentation.materialColor || !word.presentation.materialColor) continue
      previous.presentation.face = planConnectorFace(input.library, blueprint, oppositeRole(rule.left.role),
        previous.presentation.materialColor, word.presentation.materialColor)
      word.presentation.face = null
    }
  }
  const groups: number[][] = []
  renderedWords.forEach((_, index) => {
    if (index === 0 || !renderedWords[index - 1]!.layout.joinsNext) groups.push([])
    groups[groups.length - 1]!.push(index)
  })
  const ready = renderedWords.length > 0 && renderedWords.every(word => word.presentation.materialColor
    && word.presentation.face?.status !== 'unavailable' && word.presentation.incomingJoin?.status !== 'unavailable'
    && word.presentation.internalMaterial?.face.status !== 'unavailable' && !word.presentation.conflict)
  return { version: 1 as const, displayMode, glossStatus: displayMode === 'maori' ? 'off' as const : glosses ? 'available' as const : 'unavailable' as const, state, ...sentenceSlots(state.tokens, input.families), words: renderedWords.map(word => ({ ...word,
    canvasStyle: { width: word.layout.slotWidth + CONNECTOR_RAIL_LAYOUT.connectionWidth, marginLeft: -CONNECTOR_RAIL_LAYOUT.connectionWidth / 2 },
  })), groups, ready }
}

const pendingAnalyses = new Map<string, Promise<BusManifestSheet>>()
function forCaller<T>(work: Promise<T>, signal?: AbortSignal): Promise<T> {
  if (!signal) return work
  if (signal.aborted) return Promise.reject(signal.reason)
  return new Promise((resolve, reject) => {
    const abort = () => reject(signal.reason)
    signal.addEventListener('abort', abort, { once: true })
    work.then(resolve, reject).finally(() => signal.removeEventListener('abort', abort))
  })
}
/** One in-flight engine request per text. A component unmount cannot cancel
 * another reader's request. Results are not retained as stale tagging evidence. */
export function tagText(text: string, signal?: AbortSignal): Promise<BusManifestSheet> {
  const textMi = text.trim().replace(/\s+/gu, ' ')
  let work = pendingAnalyses.get(textMi)
  if (!work) {
    work = (async () => {
      for (let attempt = 0; ; attempt++) {
        let response: Response
        try {
          response = await fetch('/__website_sentence', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ textMi }), signal: AbortSignal.timeout(45000),
          })
        } catch (error) { if (attempt < 2) continue; throw error }
        const body = await response.json()
        if (response.ok) return busManifestSheetSchema.parse(body.state)
        if (attempt < 2 && (response.status >= 500 || response.status === 429)) continue
        throw new Error(body.error ?? 'Sentence analysis failed.')
      }
    })().finally(() => pendingAnalyses.delete(textMi))
    pendingAnalyses.set(textMi, work)
  }
  return forCaller(work, signal)
}

/** One-call text-to-layout entrypoint; hosts supply their approved shape pack
 * and measured word widths, but no grammatical or visual rules of their own. */
export async function presentText(
  input: Omit<Parameters<typeof presentSentence>[0], 'state'>,
  signal?: AbortSignal,
) {
  return presentSentence({ ...input, state: await tagText(input.text, signal) })
}


type SentenceRequest = { kind: 'sentence' } & Parameters<typeof presentSentence>[0]
type SpecimenRequest = { kind: 'specimen'; after?: BusManifestSheet['tokens']; indices: readonly number[]; label: string; withText?: boolean; state?: Pick<BusManifestSheet, 'tokens'> | null } & Omit<Parameters<typeof presentSentence>[0], 'state'>
type LegendRequest = { kind: 'legend'; args: Parameters<typeof posLegend> }
type SpanRequest = { kind: 'span'; args: Parameters<typeof planRailSpan> }
type NounCatalogRequest = { kind: 'noun-catalog'; sources: Parameters<typeof nounSlotCatalog>[0]; families: ReadonlyMap<string, string> }
type GerminationRequest = { kind: 'germination'; sentence: Pick<ReturnType<typeof presentSentence>, 'words' | 'groups'> }
type RailRequest = { kind: 'floor-light' } | GerminationRequest | NounCatalogRequest |  SpanRequest | SentenceRequest | SpecimenRequest | LegendRequest | ({ kind: 'navigation' } & NavigationRequest) | ({ kind: 'pattern' } & PatternRequest) | { kind: 'catalog'; library: ConnectorLibrary }
function specimenPlan(input: SpecimenRequest) {
  const source = presentSentence({ ...input, state: input.state ? { ...input.state, schemaVersion: 9 } : null })
  // A contextual catalogue specimen is a view over accepted fragments, not
  // a new accepted sentence. Validate its full source above; use the same
  // projection for its visual context without manufacturing a saved sheet.
  const contextualTokens = input.after ? [...input.after, ...input.indices.map(index => source.state.tokens[index])]
    .map((token, tokenIndex) => ({ ...token, tokenIndex })) : null
  const contextPlans = contextualTokens ? projectSentenceConnectors(contextualTokens, input.families, input.library, input.rules, input.continuousRail, input.colorProfile) : null
  return input.indices.flatMap((index, position) => {
    const word = source.words[index]
    if (!word) return []
    const presentation = contextPlans?.[(input.after?.length ?? 0) + position] ?? word.presentation
    const prefixOnly = input.label.endsWith('-') && input.indices.length === 1
    const prefixFace = prefixOnly && presentation.internalMaterial && presentation.rightFace && presentation.materialColor
      ? planPatternPiece(input.library, { blueprintId: presentation.rightFace.blueprintId, role: presentation.rightFace.role === 'cap' ? 'send' : presentation.rightFace.role }, 'right', presentation.materialColor)
      : presentation.rightFace
    return [{ ...presentation, text: prefixOnly ? input.label : word.text,
      specimenLeftFace: position === 0 || input.indices[position - 1] !== index - 1 ? presentation.leftFace : null,
      specimenFace: input.withText && position < input.indices.length - 1 ? presentation.face : prefixFace,
      internalMaterial: prefixOnly ? undefined : presentation.internalMaterial }]
  })
}
export type RailSpecimenWord = ReturnType<typeof specimenPlan>[number]
/** The only host-facing rail request boundary. Hosts supply data/measurements;
 * interpretation, specimen selection, artwork and readiness stay here. */
export function requestRails(input: { kind: 'floor-light' }): ReturnType<typeof floorLightPlan>
export function requestRails(input: GerminationRequest): ReturnType<typeof compileSectionPlayback>
export function requestRails(input: NounCatalogRequest): ReturnType<typeof nounSlotCatalog>
export function requestRails(input: SpanRequest): ReturnType<typeof planRailSpan>
export function requestRails(input: SentenceRequest): ReturnType<typeof presentSentence>
export function requestRails(input: SpecimenRequest): ReturnType<typeof specimenPlan>
export function requestRails(input: LegendRequest): ReturnType<typeof posLegend>
export function requestRails(input: { kind: 'navigation' } & NavigationRequest): ReturnType<typeof navigationPlan>
export function requestRails(input: { kind: 'pattern' } & PatternRequest): ReturnType<typeof patternPlan>
export function requestRails(input: { kind: 'catalog'; library: ConnectorLibrary }): ReturnType<typeof catalogPlan>
export function requestRails(input: RailRequest) {
  switch (input.kind) {
    case 'floor-light': return floorLightPlan()
    case 'germination': return compileSectionPlayback(input.sentence)
    case 'noun-catalog': return nounSlotCatalog(input.sources, input.families)
    case 'span': return planRailSpan(...input.args)
    case 'sentence': return presentSentence(input)
    case 'specimen': return specimenPlan(input)
    case 'legend': return posLegend(...input.args)
    case 'navigation': return navigationPlan(input)
    case 'pattern': return patternPlan(input)
    case 'catalog': return catalogPlan(input.library)
  }
}

let pendingCatalog: Promise<ReturnType<typeof busManifestPosCatalogSchema.parse>> | undefined
/** A sentence does not depend on loading the entire course or saved Floors. */
export async function readSentenceAnalysis(text: string, signal: AbortSignal) {
  pendingCatalog ??= readWebsiteJson('/__word_catalog', AbortSignal.timeout(45000))
    .then(value => busManifestPosCatalogSchema.parse(value)).finally(() => { pendingCatalog = undefined })
  const [state, catalog] = await Promise.all([tagText(text, signal), forCaller(pendingCatalog, signal)])
  return { state, catalog }
}
