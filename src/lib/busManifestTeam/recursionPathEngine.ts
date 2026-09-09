import {
  normalizeGuestSurfaceIdentity,
  parseBookingDecisionBatch,
  parseLearnedWord,
  type BookingDecision,
  type BusManifestCheckpointState,
  type BusManifestRailSetting,
  type RightConnectorEnd,
  type LearnedWord,
  type LearnedWordCondition,
  type WordConditionShape,
} from '../busManifestContract'
import { applyPatternToCondition, effectivePatternFor, effectiveRightRoleFor, patternFacesMate, type PatternRule } from '../connectorPresentation/patterns'
import { connectorBlueprintFor } from '../connectorPresentation/blueprints'

export type RecursionPathGuest = {
  readonly surfaceText: string
  readonly currentCheckIn: {
    readonly acceptedPosCode: string | null
    readonly checkpointState: BusManifestCheckpointState | null
    readonly rightConnectorEnd: RightConnectorEnd | null
    readonly rightRail: BusManifestRailSetting | null
  }
  readonly learnedWord: LearnedWord | null
  readonly teAkaCandidatePosCodes: readonly string[]
}

export type RecursionPathCandidate = LearnedWordCondition
export type RecursionPathCondition = WordConditionShape
export type RecursionPathDirection = 'left' | 'right'

export type RecursionPathTicket = {
  readonly originTokenIndex: number
  readonly originSurfaceText: string
  readonly originCondition: RecursionPathCandidate
  readonly direction: RecursionPathDirection
  readonly targetCondition: RecursionPathCondition | null
  readonly currentTokenIndex: number
  readonly path: readonly {
    readonly tokenIndex: number
    readonly surfaceText: string
    readonly condition: RecursionPathCandidate
  }[]
  readonly returnPoint: number
}

export type RecursionPathStep =
  | { readonly kind: 'potentials_opened'; readonly tokenIndex: number;
      readonly surfaceText: string; readonly potentials: readonly RecursionPathCandidate[];
      readonly ticket: RecursionPathTicket | null;
      readonly diagnostic: RecursionPotentialDiagnostic }
  | { readonly kind: 'path_started'; readonly ticket: RecursionPathTicket }
  | { readonly kind: 'path_advanced'; readonly ticket: RecursionPathTicket;
      readonly nextTokenIndex: number; readonly nextSurfaceText: string;
      readonly nextCondition: RecursionPathCandidate; readonly supported: boolean;
      readonly rail: BusManifestRailSetting | null;
      readonly diagnostic: RecursionMatchDiagnostic }
  | { readonly kind: 'path_returned'; readonly ticket: RecursionPathTicket;
      readonly status: 'supported' | 'rejected';
      readonly closure: 'sentence_edge' | 'off' | 'resolved_word'
        | 'child_return' | 'no_compatible_condition';
      readonly rail: BusManifestRailSetting | null }
  | { readonly kind: 'origin_condition_finished'; readonly tokenIndex: number;
      readonly surfaceText: string; readonly condition: RecursionPathCandidate;
      readonly supported: boolean }
  | { readonly kind: 'field_resolved'; readonly decision: BookingDecision }

export type RecursionPathResult = {
  readonly status: 'resolved_fields' | 'no_valid_path'
  readonly decisions: readonly BookingDecision[]
  readonly supportedPathCount: number
  readonly trace: readonly RecursionPathStep[]
}

export type RecursionPotentialDiagnostic = {
  readonly learnedWordFound: boolean
  readonly learnedConditionCount: number
  readonly teAkaCandidatePosCodes: readonly string[]
  readonly relationshipLibraryWordCount: number
  readonly relationshipLibraryConditionCount: number
  readonly candidatesBeforeLocks: number
  readonly candidatesAfterLocks: number
  readonly emptyReason: 'no_learned_word_or_te_aka_candidates'
    | 'te_aka_candidates_have_no_relationship_shapes'
    | 'all_candidates_conflict_with_locked_fields'
    | null
}

type ShapeKey = 'ours' | 'family' | 'teAka' | 'categories' | 'dot' | 'leftRail'
  | 'rightRail' | 'leftConnectorEnd' | 'leftConnectorFamily'
  | 'rightConnectorEnd' | 'rightConnectorFamily'
  | 'blockColor' | 'blockType'

export type RecursionMatchDiagnostic = {
  readonly mismatchedFields: readonly ShapeKey[]
  readonly railStatus: 'not_checked' | 'missing' | 'different' | 'matched'
  readonly requiredTouchingRail: BusManifestRailSetting | null
  readonly actualTouchingRail: BusManifestRailSetting | null
}

type PathRail = { readonly boundaryIndex: number; readonly rail: BusManifestRailSetting }
type PathOutcome = {
  readonly visits: readonly { readonly tokenIndex: number;
    readonly condition: RecursionPathCandidate }[]
  readonly rails: readonly PathRail[]
}

function conditionKey(value: RecursionPathCandidate): string {
  return JSON.stringify({ local: value.local, left: value.left, right: value.right })
}

function shapeMismatches(required: WordConditionShape, actual: WordConditionShape): ShapeKey[] {
  const scalarKeys = ['ours', 'family', 'teAka', 'dot', 'leftRail', 'rightRail',
    'leftConnectorEnd', 'leftConnectorFamily', 'rightConnectorEnd',
    'rightConnectorFamily', 'blockColor', 'blockType'] as const
  const mismatches: ShapeKey[] = scalarKeys.filter((key) => (
    required[key] != null && required[key] !== actual[key]
  ))
  const actualCategories = new Set(actual.categories)
  if (!required.categories.every((category) => actualCategories.has(category))) {
    mismatches.push('categories')
  }
  return mismatches
}

function candidates(input: {
  readonly guest: RecursionPathGuest
  readonly library: readonly LearnedWord[]
  readonly patternRules: readonly PatternRule[]
}): { readonly candidates: readonly RecursionPathCandidate[];
  readonly diagnostic: RecursionPotentialDiagnostic } {
  const own = input.guest.learnedWord?.conditions ?? []
  const borrowed = input.guest.learnedWord != null ? [] : input.library.flatMap((word) =>
    word.conditions.filter(({ local }) => local.ours != null
      && input.guest.teAkaCandidatePosCodes.includes(local.ours)))
  const beforeLocks = [...own, ...borrowed]
  const byKey = new Map<string, RecursionPathCandidate>()
  for (const original of beforeLocks) {
    const condition = { ...original, local: applyPatternToCondition(original.local, input.patternRules),
      left: original.left.map((shape) => applyPatternToCondition(shape, input.patternRules)),
      right: original.right.map((shape) => applyPatternToCondition(shape, input.patternRules)) }
    const local = condition.local
    if (input.guest.currentCheckIn.acceptedPosCode != null
      && local.ours !== input.guest.currentCheckIn.acceptedPosCode) continue
    if (input.guest.currentCheckIn.checkpointState != null
      && local.dot !== input.guest.currentCheckIn.checkpointState) continue
    const rightRole = effectiveRightRoleFor(input.guest.currentCheckIn.acceptedPosCode, local.family, input.patternRules)
    const originalEnd = input.guest.currentCheckIn.rightConnectorEnd
    const lockedEnd = rightRole && (originalEnd === 'send' || originalEnd === 'accept') ? rightRole : originalEnd
    if (lockedEnd != null && local.rightConnectorEnd !== lockedEnd) continue
    if (input.guest.currentCheckIn.rightRail != null
      && local.rightRail !== input.guest.currentCheckIn.rightRail) continue
    byKey.set(conditionKey(condition), condition)
  }
  const available = [...byKey.values()]
  const emptyReason = available.length > 0 ? null
    : beforeLocks.length > 0 ? 'all_candidates_conflict_with_locked_fields' as const
      : input.guest.teAkaCandidatePosCodes.length > 0
        ? 'te_aka_candidates_have_no_relationship_shapes' as const
        : 'no_learned_word_or_te_aka_candidates' as const
  return { candidates: available, diagnostic: {
    learnedWordFound: input.guest.learnedWord != null,
    learnedConditionCount: own.length,
    teAkaCandidatePosCodes: [...input.guest.teAkaCandidatePosCodes],
    relationshipLibraryWordCount: input.library.length,
    relationshipLibraryConditionCount: input.library.reduce(
      (count, word) => count + word.conditions.length, 0),
    candidatesBeforeLocks: beforeLocks.length,
    candidatesAfterLocks: available.length,
    emptyReason,
  } }
}

function touchingRail(direction: RecursionPathDirection, shape: WordConditionShape) {
  return direction === 'right' ? shape.rightRail : shape.leftRail
}

function reverseTouchingRail(direction: RecursionPathDirection, shape: WordConditionShape) {
  return direction === 'right' ? shape.leftRail : shape.rightRail
}

function compatibility(input: {
  readonly direction: RecursionPathDirection
  readonly previous: RecursionPathCandidate
  readonly current: RecursionPathCandidate
  readonly target: WordConditionShape
  readonly patternRules: readonly PatternRule[]
}): { readonly rail: BusManifestRailSetting | null;
  readonly diagnostic: RecursionMatchDiagnostic } {
  const mismatchedFields = shapeMismatches(input.target, input.current.local)
  if (mismatchedFields.length > 0) return { rail: null, diagnostic: {
    mismatchedFields, railStatus: 'not_checked', requiredTouchingRail: null,
    actualTouchingRail: null,
  } }
  const outgoing = touchingRail(input.direction, input.previous.local)
  const incoming = reverseTouchingRail(input.direction, input.current.local)
  if (outgoing == null || incoming == null) return { rail: null, diagnostic: {
    mismatchedFields: [], railStatus: 'missing', requiredTouchingRail: outgoing,
    actualTouchingRail: incoming,
  } }
  if (outgoing !== incoming) return { rail: null, diagnostic: {
    mismatchedFields: [], railStatus: 'different', requiredTouchingRail: outgoing,
    actualTouchingRail: incoming,
  } }
  if (outgoing !== 'off') {
    const left = input.direction === 'right' ? input.previous.local : input.current.local
    const right = input.direction === 'right' ? input.current.local : input.previous.local
    const leftRule = effectivePatternFor(left.ours, left.family, input.patternRules)
    const rightRule = effectivePatternFor(right.ours, right.family, input.patternRules)
    const blueprint = leftRule?.right.blueprintId ?? connectorBlueprintFor(left.ours, left.family)?.id
    if ((leftRule || rightRule) && blueprint && rightRule
      && (left.rightConnectorEnd !== 'send' && left.rightConnectorEnd !== 'accept'
        || !patternFacesMate({ blueprintId: blueprint, role: left.rightConnectorEnd as 'send' | 'accept' }, rightRule.left))) {
      return { rail: null, diagnostic: { mismatchedFields: ['rightConnectorEnd', 'leftConnectorEnd'],
        railStatus: 'not_checked', requiredTouchingRail: outgoing, actualTouchingRail: incoming } }
    }
  }
  return { rail: outgoing, diagnostic: { mismatchedFields: [], railStatus: 'matched',
    requiredTouchingRail: outgoing, actualTouchingRail: incoming } }
}

function appendVisit(ticket: RecursionPathTicket, tokenIndex: number,
  guest: RecursionPathGuest, condition: RecursionPathCandidate): RecursionPathTicket {
  return { ...ticket, currentTokenIndex: tokenIndex,
    path: [...ticket.path, { tokenIndex, surfaceText: guest.surfaceText, condition }] }
}

export function findNextRecursionPathOrigin(
  currentCheckIns: readonly RecursionPathGuest['currentCheckIn'][],
  attemptedOrigins: ReadonlySet<number> = new Set(),
): number | null {
  const tokenIndex = currentCheckIns.findIndex((current, index) =>
    !attemptedOrigins.has(index)
    && (current.acceptedPosCode == null || current.checkpointState == null
      || current.rightConnectorEnd == null
      || (index < currentCheckIns.length - 1 && current.rightRail == null)))
  return tokenIndex < 0 ? null : tokenIndex
}

/** One recursive procedure carrying one unchanged purpose ticket. */
export function* stepRecursionPath(input: {
  readonly guests: readonly RecursionPathGuest[]
  readonly originTokenIndex: number
  readonly relationshipLibrary?: readonly LearnedWord[]
  readonly patternRules?: readonly PatternRule[]
}): Generator<RecursionPathStep, Omit<RecursionPathResult, 'trace'>, void> {
  if (input.guests.length === 0) throw new Error('Recursion Path requires at least one word.')
  if (!Number.isInteger(input.originTokenIndex) || input.originTokenIndex < 0
    || input.originTokenIndex >= input.guests.length) {
    throw new Error('Recursion Path requires one addressed origin word.')
  }
  const guests = input.guests.map((guest) => {
    const learnedWord = guest.learnedWord == null ? null : parseLearnedWord(guest.learnedWord)
    if (learnedWord != null
      && learnedWord.word !== normalizeGuestSurfaceIdentity(guest.surfaceText)) {
      throw new Error(`Learned word ${learnedWord.word} does not belong to ${guest.surfaceText}.`)
    }
    if (learnedWord != null && guest.teAkaCandidatePosCodes.length > 0) {
      throw new Error('Te Aka fallback is allowed only when no learned word exists.')
    }
    return { ...guest, learnedWord }
  })
  const library = (input.relationshipLibrary ?? []).map(parseLearnedWord)
  const patternRules = input.patternRules ?? []
  const candidateSets = guests.map((guest) => candidates({ guest, library, patternRules }))
  const originIndex = input.originTokenIndex
  const completion: { value: { condition: RecursionPathCandidate;
    left: PathOutcome; right: PathOutcome } | null } = { value: null }

  const isResolved = (index: number) => {
    const current = guests[index]!.currentCheckIn
    return current.acceptedPosCode != null && current.checkpointState != null
      && current.rightConnectorEnd != null
      && (index === guests.length - 1 || current.rightRail != null)
  }

  const visit = function* (currentIndex: number, ticket: RecursionPathTicket | null):
  Generator<RecursionPathStep, PathOutcome | null, void> {
    const guest = guests[currentIndex]!
    const candidateSet = candidateSets[currentIndex]!
    const available = candidateSet.candidates
    yield { kind: 'potentials_opened', tokenIndex: currentIndex,
      surfaceText: guest.surfaceText, potentials: available, ticket,
      diagnostic: candidateSet.diagnostic }

    if (ticket == null) {
      for (const condition of available) {
        const root = {
          originTokenIndex: currentIndex,
          originSurfaceText: guest.surfaceText,
          originCondition: condition,
          currentTokenIndex: currentIndex,
          path: [{ tokenIndex: currentIndex, surfaceText: guest.surfaceText, condition }],
          returnPoint: currentIndex,
        }
        const outcomes: Partial<Record<RecursionPathDirection, PathOutcome>> = {}
        for (const direction of ['left', 'right'] as const) {
          const nextIndex = currentIndex + (direction === 'right' ? 1 : -1)
          if (nextIndex < 0 || nextIndex >= guests.length) {
            const edgeTicket: RecursionPathTicket = { ...root, direction,
              targetCondition: null }
            yield { kind: 'path_started', ticket: edgeTicket }
            yield { kind: 'path_returned', ticket: edgeTicket, status: 'supported',
              closure: 'sentence_edge', rail: null }
            outcomes[direction] = { visits: [], rails: [] }
            continue
          }
          const targets = direction === 'left' ? condition.left : condition.right
          for (const targetCondition of targets) {
            const pathTicket: RecursionPathTicket = { ...root, direction, targetCondition }
            yield { kind: 'path_started', ticket: pathTicket }
            const outcome = yield* visit(nextIndex, pathTicket)
            if (outcome != null) { outcomes[direction] = outcome; break }
          }
          if (outcomes[direction] == null) break
        }
        const left = outcomes.left ?? null
        const right = outcomes.right ?? null
        const supported = left != null && right != null
        yield { kind: 'origin_condition_finished', tokenIndex: currentIndex,
          surfaceText: guest.surfaceText, condition, supported }
        if (supported) { completion.value = { condition, left, right }; return {
          visits: [{ tokenIndex: currentIndex, condition }], rails: [] } }
      }
      return null
    }

    const previous = ticket.path[ticket.path.length - 1]!
    if (ticket.targetCondition == null) {
      throw new Error('A travelling ticket requires one selected target condition.')
    }
    for (const condition of available) {
      const match = compatibility({ patternRules, direction: ticket.direction,
        previous: previous.condition, current: condition, target: ticket.targetCondition })
      yield { kind: 'path_advanced', ticket, nextTokenIndex: currentIndex,
        nextSurfaceText: guest.surfaceText, nextCondition: condition,
        supported: match.rail != null, rail: match.rail, diagnostic: match.diagnostic }
      const rail = match.rail
      if (rail == null) continue
      const currentTicket = appendVisit(ticket, currentIndex, guest, condition)
      const boundaryIndex = Math.min(previous.tokenIndex, currentIndex)
      if (rail === 'off' || isResolved(currentIndex)) {
        yield { kind: 'path_returned', ticket: currentTicket, status: 'supported',
          closure: rail === 'off' ? 'off' : 'resolved_word', rail }
        return { visits: [{ tokenIndex: currentIndex, condition }],
          rails: [{ boundaryIndex, rail }] }
      }
      const nextIndex = currentIndex + (ticket.direction === 'right' ? 1 : -1)
      if (nextIndex < 0 || nextIndex >= guests.length) {
        yield { kind: 'path_returned', ticket: currentTicket, status: 'supported',
          closure: 'sentence_edge', rail }
        return { visits: [{ tokenIndex: currentIndex, condition }],
          rails: [{ boundaryIndex, rail }] }
      }
      const targets = ticket.direction === 'left' ? condition.left : condition.right
      for (const targetCondition of targets) {
        const onward = { ...currentTicket, targetCondition, returnPoint: currentIndex }
        const child = yield* visit(nextIndex, onward)
        yield { kind: 'path_returned', ticket: onward,
          status: child == null ? 'rejected' : 'supported',
          closure: 'child_return', rail }
        if (child != null) return { visits: [{ tokenIndex: currentIndex, condition },
          ...child.visits], rails: [{ boundaryIndex, rail }, ...child.rails] }
      }
    }
    yield { kind: 'path_returned', ticket, status: 'rejected',
      closure: 'no_compatible_condition', rail: null }
    return null
  }

  yield* visit(originIndex, null)
  const completed = completion.value
  if (completed == null) return { status: 'no_valid_path', decisions: [], supportedPathCount: 0 }
  const chosen = new Map<number, RecursionPathCandidate>([
    [originIndex, completed.condition],
    ...completed.left.visits.map(({ tokenIndex, condition }) => [tokenIndex, condition] as const),
    ...completed.right.visits.map(({ tokenIndex, condition }) => [tokenIndex, condition] as const),
  ])
  const rails = new Map<number, BusManifestRailSetting>()
  for (const item of [...completed.left.rails, ...completed.right.rails]) {
    rails.set(item.boundaryIndex, item.rail)
  }
  const proposed: unknown[] = []
  for (const [index, condition] of chosen) {
    const current = guests[index]!.currentCheckIn
    if (current.acceptedPosCode == null && condition.local.ours != null) {
      proposed.push({ tokenIndex: index, field: 'acceptedPosCode', value: condition.local.ours })
    }
    if (current.checkpointState == null && condition.local.dot != null) {
      proposed.push({ tokenIndex: index, field: 'checkpointState', value: condition.local.dot })
    }
    if (current.rightConnectorEnd == null && condition.local.rightConnectorEnd != null) {
      proposed.push({ tokenIndex: index, field: 'rightConnectorEnd',
        value: condition.local.rightConnectorEnd })
    }
  }
  for (const [index, rail] of rails) if (guests[index]!.currentCheckIn.rightRail == null) {
    proposed.push({ tokenIndex: index, field: 'rightRail', value: rail })
  }
  const decisions = parseBookingDecisionBatch(proposed)
  for (const decision of decisions) yield { kind: 'field_resolved', decision }
  return { status: 'resolved_fields', decisions, supportedPathCount: 1 }
}

export function runRecursionPath(input: {
  readonly guests: readonly RecursionPathGuest[]
  readonly originTokenIndex: number
  readonly relationshipLibrary?: readonly LearnedWord[]
  readonly patternRules?: readonly PatternRule[]
}): RecursionPathResult {
  const iterator = stepRecursionPath(input)
  const trace: RecursionPathStep[] = []
  for (;;) {
    const next = iterator.next()
    if (next.done) return { ...next.value, trace }
    trace.push(next.value)
  }
}
