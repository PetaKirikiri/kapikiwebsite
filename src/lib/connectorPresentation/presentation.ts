import { PRESENTATION_PROFILES, resolveSentenceColors, type PresentationProfileId } from './colorInterpretation'
import type { BusManifestSheet } from '../busManifestContract'
import { projectConnectorTopology } from '../busManifestTeam/connectorTopology'
import { railVisualPair } from '../../components/railVisualPalette'
import { CONNECTOR_BLUEPRINTS, connectorBlueprintFor, type ConnectorBlueprint, type ConnectorLibrary, type ConnectorRole, type CompiledFace } from './blueprints'
import { applyPatternsToTokens, effectiveBoundaryPattern, patternFacesMate, effectivePatternFor, oppositeRole, type PatternRule, type PatternFace } from './patterns'

export const CONNECTOR_PAGE_BACKGROUND = 'var(--connector-cap-background, #fafafa)'
const UNKNOWN_MATERIAL = '#94a3b8'
const CONTINUOUS_SECTION_POS_CODES = new Set(['tam', 'negative', 'nominal_marker', 'location_marker'])

/** Repeated high-level teaching categories form one visual section. Their
 * internal token boundaries retain the saved grammatical topology, but do not
 * grow another connector face. Only the section's outside edges connect.
 */
function sharesContinuousSection(
  left: BusManifestSheet['tokens'][number] | undefined,
  right: BusManifestSheet['tokens'][number] | undefined,
): boolean {
  return left?.acceptedPosCode != null
    && left.acceptedPosCode === right?.acceptedPosCode
    && CONTINUOUS_SECTION_POS_CODES.has(left.acceptedPosCode)
}

export type ConnectorFacePlan = Readonly<{
  blueprintId: ConnectorBlueprint['id']
  role: ConnectorRole
  label: string
}> & (CompiledFace extends infer Face ? Face extends { status: 'ready' }
  ? Face & Readonly<{ background: string }> : Face : never)

/** A continuation partitions the frame into the saved silhouette and its exact
 * surround. A cap substitutes the page for the absent right material; it never
 * selects another drawing or rotates the source.
 */
export function planConnectorFace(
  library: ConnectorLibrary, blueprint: ConnectorBlueprint, role: ConnectorRole,
  leftColor: string, rightColor: string,
): ConnectorFacePlan {
  const face = library.get(blueprint.id)?.[role === 'cap' ? 'send' : role] ?? { status: 'unavailable' as const, reason: `${blueprint.label}: library not loaded.` }
  const identity = { blueprintId: blueprint.id, role, label: `${blueprint.label}: ${role}` }
  if (face.status === 'unavailable') return { ...identity, ...face }
  const right = role === 'cap' ? CONNECTOR_PAGE_BACKGROUND : rightColor
  return { ...identity, ...face,
    background: face.materialSide === 'left' ? right : leftColor,
    drawing: { ...face.drawing, drawing: {
      fill: face.materialSide === 'left' ? leftColor : right, stroke: 'none',
    } },
  }
}

/** Separate mating pieces, not a preview of an assembled two-colour boundary.
 * Both pieces use the same saved silhouette: the receiver is its exact negative.
 * This is a material partition, never a second path or a mirrored approximation.
 */
export function planConnectorPiece(
  library: ConnectorLibrary, blueprint: ConnectorBlueprint, piece: 'send' | 'accept',
): ConnectorFacePlan {
  const color = railVisualPair('yellow')[0]
  const plan = planConnectorFace(library, blueprint, 'send',
    piece === 'send' ? color : CONNECTOR_PAGE_BACKGROUND,
    piece === 'send' ? CONNECTOR_PAGE_BACKGROUND : color)
  return { ...plan, role: piece, label: `${blueprint.label}: ${piece === 'send' ? 'Sends' : 'Receives'}` }
}

/** A complete one-colour piece on its actual side, using only saved orientations. */
export function planPatternPiece(library: ConnectorLibrary, face: PatternFace, side: 'left' | 'right', color = railVisualPair('yellow')[0]): ConnectorFacePlan {
  const blueprint = CONNECTOR_BLUEPRINTS.find((item) => item.id === face.blueprintId)!
  const materialOnLeft = side === 'right'
  const boundaryRole = materialOnLeft ? face.role : face.role === 'send' ? 'accept' : 'send'
  const plan = planConnectorFace(library, blueprint, boundaryRole,
    materialOnLeft ? color : CONNECTOR_PAGE_BACKGROUND,
    materialOnLeft ? CONNECTOR_PAGE_BACKGROUND : color)
  return { ...plan, role: face.role, label: `${blueprint.label}: ${side} ${face.role === 'send' ? 'Sends' : 'Receives'}` }
}

function endsHeAhaQuestionLead(tokens: BusManifestSheet['tokens'], index: number): boolean {
  return index === 1
    && tokens[0]?.surfaceText.toLocaleLowerCase('mi-NZ') === 'he'
    && tokens[1]?.surfaceText.toLocaleLowerCase('mi-NZ') === 'aha'
}

export function projectSentenceConnectors(tokens: BusManifestSheet['tokens'], families: ReadonlyMap<string, string>, library: ConnectorLibrary, rules: readonly PatternRule[] = [], continuousRail = false, profile: PresentationProfileId = 'original') {
  const markerRoleAt = (index: number): 'send' | 'accept' | null => tokens[index]?.acceptedPosCode === 'agent_marker'
    ? 'accept' : ['object_marker', 'target_marker'].includes(tokens[index]?.acceptedPosCode ?? '') ? 'send' : null
  const markerBlueprintAt = (index: number) => markerRoleAt(index)
    ? CONNECTOR_BLUEPRINTS.find(item => item.id === 'two-frond-arrow') : undefined
  const effective = applyPatternsToTokens(tokens, families, rules)
  const topology = projectConnectorTopology(effective, families)
  const materials = resolveSentenceColors(tokens, families, profile)
  const config = PRESENTATION_PROFILES[profile]
  return tokens.map((token, index) => {
    const compoundFraction = token.acceptedPosCode === 'nominal_predicate'
      ? ({ tokorua: 4 / 7, kotahi: 2 / 6 } as Record<string, number>)[token.surfaceText.toLocaleLowerCase('mi-NZ')]
      : token.acceptedPosCode === 'negative' && token.surfaceText.toLocaleLowerCase('mi-NZ') === 'kāorekau' ? 5 / 8 : undefined
    const compoundNominal = compoundFraction != null
    const ends = topology[index]!
    const previous = tokens[index - 1]
    const rule = effectivePatternFor(token.acceptedPosCode, families.get(token.acceptedPosCode ?? ''), rules)
    const next = tokens[index + 1]
    const endsNegativeSection = token.acceptedPosCode === 'negative'
      && next?.acceptedPosCode !== 'negative'
    const detachedNegative = endsNegativeSection
      && token.surfaceText.normalize('NFC').toLocaleLowerCase('mi-NZ') === 'kāorekau'
    const attachNegative = endsNegativeSection && !detachedNegative && next != null
    const followsNegativeSection = previous?.acceptedPosCode === 'negative'
      && token.acceptedPosCode !== 'negative'
    const continuesSection = sharesContinuousSection(token, next)
    const nextRule = next && effectivePatternFor(next.acceptedPosCode, families.get(next.acceptedPosCode ?? ''), rules)
    const continuing = ends.rightConnectorEnd === 'send' || ends.rightConnectorEnd === 'accept'
    const boundary = continuing && next ? effectiveBoundaryPattern(
      token.acceptedPosCode, families.get(token.acceptedPosCode ?? ''),
      next.acceptedPosCode, families.get(next.acceptedPosCode ?? ''), rules) : null
    const endsDetachedClauseLead = ['conditional_marker', 'adverb']
      .includes(token.acceptedPosCode ?? '') && ends.rightConnectorEnd === 'cap'
    const blueprint = compoundNominal
      ? CONNECTOR_BLUEPRINTS.find(item => item.id === 'fat-wave')!
      : endsHeAhaQuestionLead(tokens, index)
      ? connectorBlueprintFor('tam', 'particle')
      : endsDetachedClauseLead
      ? connectorBlueprintFor(token.acceptedPosCode, families.get(token.acceptedPosCode ?? '') ?? null)
      : endsNegativeSection
      ? connectorBlueprintFor('negative', 'particle')
      : boundary
      ? CONNECTOR_BLUEPRINTS.find((item) => item.id === boundary.face.blueprintId)!
      : rule ? CONNECTOR_BLUEPRINTS.find((item) => item.id === rule.right.blueprintId)!
      : connectorBlueprintFor(token.acceptedPosCode, token.acceptedPosCode == null ? null : families.get(token.acceptedPosCode) ?? null)
    const left = compoundNominal
      ? config.compound[1] : materials[index] ?? UNKNOWN_MATERIAL
    const right = materials[index + 1] ?? UNKNOWN_MATERIAL
    // A closed TAM uses the approved bottom-to-up Skinny Wave receiver. This
    // keeps E-kai-ana's terminal curl consistent without changing the verb's
    // two outward sending arms or the stored checkpoint/topology.
    const followsNominalLead = ['nominal_marker', 'nominal_predicate'].includes(previous?.acceptedPosCode ?? '')
    const exposedRole = compoundNominal
      ? 'accept' : token.acceptedPosCode === 'tam' && ends.rightConnectorEnd === 'cap'
      ? 'accept' : families.get(token.acceptedPosCode ?? '') === 'noun'
        ? followsNominalLead ? 'accept' : rule?.right.role ?? 'accept'
        : endsDetachedClauseLead ? 'send' : rule?.right.role ?? 'send'
    const conflict = !endsNegativeSection && !continuesSection && continuing && nextRule && blueprint && boundary?.owner === 'right' && !patternFacesMate(
      { blueprintId: blueprint.id, role: ends.rightConnectorEnd as 'send' | 'accept' }, nextRule.left)
      ? `Pattern conflict between ${token.surfaceText} and ${next.surfaceText}: the selected left and right connectors do not mate.` : null
    const planned = blueprint && ends.rightConnectorEnd ? planConnectorFace(library, blueprint,
      endsNegativeSection ? 'accept' : ends.rightConnectorEnd === 'cap' ? exposedRole : ends.rightConnectorEnd,
      left, attachNegative || (continuousRail && next != null) ? right : ends.rightConnectorEnd === 'cap' || endsNegativeSection ? CONNECTOR_PAGE_BACKGROUND : right) : null
    const markerOwnsBoundary = continuousRail && markerRoleAt(index + 1) != null
    const face: ConnectorFacePlan | null = continuesSection || markerOwnsBoundary ? null : planned && conflict
      ? { blueprintId: planned.blueprintId, role: planned.role, label: conflict, status: 'unavailable', reason: conflict } : planned
    const continuesPreviousSection = sharesContinuousSection(previous, token)
    const previousRule = previous && effectivePatternFor(previous.acceptedPosCode, families.get(previous.acceptedPosCode ?? ''), rules)
    const previousBoundary = previous ? effectiveBoundaryPattern(
      previous.acceptedPosCode, families.get(previous.acceptedPosCode ?? ''),
      token.acceptedPosCode, families.get(token.acceptedPosCode ?? ''), rules) : null
    const previousBlueprint = previousBoundary && (ends.leftConnectorEnd === 'send' || ends.leftConnectorEnd === 'accept')
      ? CONNECTOR_BLUEPRINTS.find((item) => item.id === previousBoundary.face.blueprintId)!
      : previousRule ? CONNECTOR_BLUEPRINTS.find((item) => item.id === previousRule.right.blueprintId)!
      : previous ? connectorBlueprintFor(previous.acceptedPosCode, families.get(previous.acceptedPosCode ?? '') ?? null) : null
    const incoming = previousBlueprint && (ends.leftConnectorEnd === 'send' || ends.leftConnectorEnd === 'accept')
      ? { blueprintId: previousBlueprint.id, role: ends.leftConnectorEnd } as PatternFace : null
    const incomingConflict = incoming && rule && previousBoundary?.owner === 'right'
      && (incoming.blueprintId !== rule.left.blueprintId || incoming.role !== rule.left.role)
      ? `Pattern conflict at ${token.surfaceText}: its left connector does not match the preceding word.` : null
    const plannedLeft = incoming ? planPatternPiece(library, previousBoundary?.owner === 'right' ? rule?.left ?? incoming : incoming, 'left', left) : null
    const leftFace = continuesPreviousSection || followsNegativeSection ? null : incomingConflict && plannedLeft
      ? { ...plannedLeft, status: 'unavailable' as const, reason: incomingConflict } : plannedLeft
    const rightFace = !continuesSection && blueprint && ends.rightConnectorEnd
      ? planPatternPiece(library, { blueprintId: blueprint.id, role: endsNegativeSection ? 'accept' : ends.rightConnectorEnd === 'cap' ? exposedRole : ends.rightConnectorEnd }, 'right', left) : null
    const incomingJoin = !continuesPreviousSection && !followsNegativeSection && previousBlueprint && incoming
      ? planConnectorFace(library, previousBlueprint, effective[index - 1]!.rightConnectorEnd as 'send' | 'accept', materials[index - 1] ?? UNKNOWN_MATERIAL, left) : null
    const marker = markerBlueprintAt(index)
    const flatEnding = token.acceptedPosCode === 'tam' && ends.rightConnectorEnd === 'cap'
      && families.get(previous?.acceptedPosCode ?? '') === 'verb'
    const previousMarker = markerBlueprintAt(index - 1)
    const markerRole = markerRoleAt(index)
    const previousMarkerRole = markerRoleAt(index - 1)
    const compoundFace = compoundNominal
      ? planConnectorFace(library, CONNECTOR_BLUEPRINTS.find(item => item.id === 'fat-wave')!, 'send',
        config.compound[0], config.compound[1])
      : null
    // Participant-arrow material always belongs to the marker. The saved
    // orientation controls direction only; it must not make a receiving or
    // sending arrow borrow the following noun's colour.
    const rawMarkerJoin = marker && ends.rightConnectorEnd
      ? planConnectorFace(library, marker, markerRole ?? 'send', left, right) : null
    const markerJoin = rawMarkerJoin?.status === 'ready' ? {
      ...rawMarkerJoin,
      background: config.markerBackground === 'previous' && continuousRail ? materials[index - 1] ?? right : right,
      drawing: { ...rawMarkerJoin.drawing, drawing: {
        fill: left, stroke: 'none' as const,
      } },
    } : rawMarkerJoin
    return { ...ends, inlineMarker: marker != null, standalone: marker != null || endsNegativeSection, flatEnding, attachNext: attachNegative, separateAfter: detachedNegative, blueprint: marker ?? blueprint,
      face: flatEnding ? null : marker ? markerJoin : face, conflict: marker ? null : conflict,
      materialColor: compoundNominal ? config.compound[0] : materials[index], materialBackground: continuousRail && marker ? (config.markerBackground === 'previous' ? materials[index - 1] ?? right : right) : materials[index], paintMaterial: marker == null || continuousRail,
      internalMaterial: compoundNominal ? { fraction: compoundFraction!, color: config.compound[1], face: compoundFace! } : null,
      incomingJoin: previousMarker ? null : incomingConflict && incomingJoin ? { ...incomingJoin, status: 'unavailable' as const, reason: incomingConflict } : incomingJoin,
      leftFace: previousMarker && incoming ? planPatternPiece(library, { blueprintId: previousMarker.id, role: oppositeRole(previousMarkerRole ?? 'send') }, 'left', left) : leftFace,
      rightFace: flatEnding ? null : marker ? planPatternPiece(library, { blueprintId: marker.id, role: markerRole ?? 'send' }, 'right', left) : conflict && rightFace ? { ...rightFace, status: 'unavailable' as const, reason: conflict } : rightFace,
    }
  })
}
