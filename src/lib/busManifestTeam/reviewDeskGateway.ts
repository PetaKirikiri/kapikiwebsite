import { z } from 'zod'
import {
  assertBusManifestSheetUsesPosCatalog,
  parseBusManifestPosCatalog,
  busManifestSheetSchema,
  busManifestSourceAddressSchema,
  parseBusManifestSheet,
  parseOpenBusManifestInput,
  parseSubmitBusManifestSheetInput,
  parseTryAutomaticCheckInInput,
  parsePreviewSystemTagInput,
  type BusManifestSheet,
  type BusManifestSourceAddress,
  type BusManifestWriter,
  type OpenBusManifestInput,
  type SubmitBusManifestSheetInput,
  type TryAutomaticCheckInInput,
  type PreviewSystemTagInput,
  guestPatternCategorySnapshotSchema,
  parseSetGuestPatternCategoryInput,
  type GuestPatternCategorySnapshot,
  type SetGuestPatternCategoryInput,
  learnedWordConditionSchema,
  wordConditionShapeSchema,
} from '../busManifestContract'
import {
  busManifestAddressKey,
  type AutomaticCheckInResult,
  posTypeByCode as findPosTypeByCode,
  type BusManifestPosCatalog,
  type BusManifestPosGroup,
  type BusManifestPosType,
  type BusManifestSaveReceipt,
  type SavedBusManifest,
  type SystemTagPreviewResult,
  type SavedBusManifestSubmission as BusManifestSubmission,
} from './busManifestDomain'
import {
  investigationDatabaseSchemaSchema,
  parseInvestigationDatabaseLayout,
  parseInvestigationLearnedWords,
  type InvestigationDatabaseLayout,
  type InvestigationDatabaseSchema,
  type InvestigationLearnedWord,
} from './investigationContract'
import {
  parseDeleteSentenceStructureInput,
  parseEditSentenceStructureInput,
  parseSetSentenceStructureCurriculumLevelInput,
  parseSentenceStructureMutationResult,
  sentenceStructureRosterSchema,
  type DeleteSentenceStructureInput,
  type EditSentenceStructureInput,
  type SetSentenceStructureCurriculumLevelInput,
  type SentenceStructureMutationResult,
  type SentenceStructureRosterItem,
} from '../sentenceStructureContract'
import {
  adoptLocalFirstData,
  LOCAL_FIRST_QUERY_KEYS,
  localFirstRead,
  updateLocalFirstData,
} from '../localFirstData'

/**
 * The Review Desk's one delivery window. It may validate, display, and submit
 * a complete proposed sheet, but it never talks to database tables or applies
 * slips. Every request crosses the same door to the Shift Coordinator.
 */

export type {
  OpenBusManifestInput,
  SubmitBusManifestSheetInput,
}

export type BusManifestErrorKind =
  | 'conflict'
  | 'validation'
  | 'permission'
  | 'unavailable'
  | 'server'

type BusManifestErrorBody = {
  readonly code?: BusManifestErrorKind
  readonly message?: string
  readonly retryable?: boolean
}

export class BusManifestRequestError extends Error {
  readonly kind: BusManifestErrorKind
  readonly retryable: boolean
  readonly status: number | null

  constructor(input: {
    readonly kind: BusManifestErrorKind
    readonly message: string
    readonly retryable: boolean
    readonly status: number | null
  }) {
    super(input.message)
    this.name = 'BusManifestRequestError'
    this.kind = input.kind
    this.retryable = input.retryable
    this.status = input.status
  }
}

async function callBusManifestDoor<T>(body: Record<string, unknown>): Promise<T> {
  const operation = typeof body.operation === 'string' ? body.operation : ''
  const timeoutMs = operation === 'open-bus-manifest' ||
    operation === 'try-automatic-check-in' || operation === 'step-recursion-path'
    ? 240_000
    : operation === 'fetch-all'
      ? 120_000
    : operation === 'submit-bus-manifest' ||
        operation === 'edit-sentence-structure' ||
        operation === 'delete-sentence-structure'
      ? 35_000
      : 20_000
  const controller = new AbortController()
  const timeout = globalThis.setTimeout(() => controller.abort(), timeoutMs)
  try {
    let response: Response
    try {
      response = await fetch('/__bus_manifest', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      })
    } catch (error) {
      throw new BusManifestRequestError({
        kind: 'unavailable',
        message: controller.signal.aborted
          ? 'The Bus Manifest door did not answer in time.'
          : error instanceof Error
            ? error.message
            : 'The Bus Manifest door is unavailable.',
        retryable: true,
        status: null,
      })
    }

    let value: T & { error?: string | BusManifestErrorBody }
    try {
      value = await response.json() as T & { error?: string | BusManifestErrorBody }
    } catch {
      throw new BusManifestRequestError({
        kind: 'server',
        message: controller.signal.aborted
          ? 'The Bus Manifest door did not answer in time.'
          : 'The Bus Manifest door returned an unreadable response.',
        retryable: true,
        status: response.status,
      })
    }
    if (!response.ok) {
      const error = value.error
      throw new BusManifestRequestError({
        kind: typeof error === 'object' && error?.code != null ? error.code : 'server',
        message: typeof error === 'string'
          ? error
          : error?.message ?? `Bus Manifest request failed (${response.status}).`,
        retryable: typeof error === 'object' && error?.retryable === true,
        status: response.status,
      })
    }
    return value
  } finally {
    globalThis.clearTimeout(timeout)
  }
}

export type ReviewDeskPosGroup = BusManifestPosGroup
export type ReviewDeskPosType = BusManifestPosType
export type ReviewDeskPosCatalog = BusManifestPosCatalog

export type ReviewDeskToken = BusManifestSheet['tokens'][number]
export type ReviewDeskSheet = BusManifestSheet
export type ReviewDeskWriter = BusManifestWriter
export type {
  AutomaticCheckInResult,
  BusManifestSaveReceipt,
  SavedBusManifest,
}
export type SavedBusManifestSubmission = BusManifestSubmission
export type { InvestigationDatabaseLayout, InvestigationDatabaseSchema }
export type DatabaseLayout = InvestigationDatabaseLayout
export type { SentenceStructureRosterItem }

export const BUS_MANIFEST_CHANGED_EVENT = 'bus-manifest:changed'
export const SENTENCE_STRUCTURE_ROSTER_CHANGED_EVENT =
  'sentence-structure-roster:changed'

const savedBusManifestSchema = z.object({
  savedAt: z.string().min(1),
  stateFingerprint: z.string().trim().min(1),
  sourceOrderIndex: z.number().int().nonnegative(),
  paragraphText: z.string().trim().min(1),
  sourceAddress: busManifestSourceAddressSchema,
  state: busManifestSheetSchema,
}).strict()
const savedBusManifestArraySchema = z.array(savedBusManifestSchema).readonly()

const automaticCheckInResultSchema = z.object({
  status: z.enum(['no_change', 'sheet_updated']),
  manifest: savedBusManifestSchema,
}).strict()

const systemTagPreviewFloorSchema = z.object({
  sourceOrderIndex: z.number().int().nonnegative(),
  paragraphText: z.string().trim().min(1),
  sourceAddress: busManifestSourceAddressSchema,
  state: busManifestSheetSchema,
}).strict()

const recursionConditionSchema = wordConditionShapeSchema
const recursionCandidateSchema = learnedWordConditionSchema
const potentialDiagnosticSchema = z.object({
  learnedWordFound: z.boolean(),
  learnedConditionCount: z.number().int().nonnegative(),
  teAkaCandidatePosCodes: z.array(z.string().min(1)).readonly(),
  relationshipLibraryWordCount: z.number().int().nonnegative(),
  relationshipLibraryConditionCount: z.number().int().nonnegative(),
  candidatesBeforeLocks: z.number().int().nonnegative(),
  candidatesAfterLocks: z.number().int().nonnegative(),
  emptyReason: z.enum(['no_learned_word_or_te_aka_candidates',
    'te_aka_candidates_have_no_relationship_shapes',
    'all_candidates_conflict_with_locked_fields']).nullable(),
}).strict()
const matchDiagnosticSchema = z.object({
  mismatchedFields: z.array(z.enum(['ours', 'family', 'teAka', 'categories', 'dot',
    'leftRail', 'rightRail', 'leftConnectorEnd', 'leftConnectorFamily',
    'rightConnectorEnd', 'rightConnectorFamily',
    'blockColor', 'blockType'])).readonly(),
  railStatus: z.enum(['not_checked', 'missing', 'different', 'matched']),
  requiredTouchingRail: z.enum(['off', 'yellow', 'green']).nullable(),
  actualTouchingRail: z.enum(['off', 'yellow', 'green']).nullable(),
}).strict()
const recursionTicketSchema = z.object({
  originTokenIndex: z.number().int().nonnegative(),
  originSurfaceText: z.string().min(1),
  originCondition: recursionCandidateSchema,
  direction: z.enum(['left', 'right']),
  targetCondition: recursionConditionSchema.nullable(),
  currentTokenIndex: z.number().int().nonnegative(),
  path: z.array(z.object({ tokenIndex: z.number().int().nonnegative(),
    surfaceText: z.string().min(1), condition: recursionCandidateSchema }).strict()).min(1).readonly(),
  returnPoint: z.number().int().nonnegative(),
}).strict()
const recursionPathStepSchema = z.discriminatedUnion('kind', [
    z.object({ kind: z.literal('potentials_opened'), tokenIndex: z.number().int().nonnegative(),
      surfaceText: z.string().min(1), potentials: z.array(recursionCandidateSchema).readonly(),
      ticket: recursionTicketSchema.nullable(), diagnostic: potentialDiagnosticSchema }).strict(),
    z.object({ kind: z.literal('path_started'), ticket: recursionTicketSchema }).strict(),
    z.object({ kind: z.literal('path_advanced'), ticket: recursionTicketSchema,
      nextTokenIndex: z.number().int().nonnegative(), nextSurfaceText: z.string().min(1),
      nextCondition: recursionCandidateSchema, supported: z.boolean(),
      rail: z.enum(['off', 'yellow', 'green']).nullable(),
      diagnostic: matchDiagnosticSchema }).strict(),
    z.object({ kind: z.literal('path_returned'), ticket: recursionTicketSchema,
      status: z.enum(['supported', 'rejected']),
      closure: z.enum(['sentence_edge', 'off', 'resolved_word', 'child_return',
        'no_compatible_condition']),
      rail: z.enum(['off', 'yellow', 'green']).nullable() }).strict(),
    z.object({ kind: z.literal('origin_condition_finished'),
      tokenIndex: z.number().int().nonnegative(), surfaceText: z.string().min(1),
      condition: recursionCandidateSchema, supported: z.boolean() }).strict(),
    z.object({ kind: z.literal('field_resolved'), decision: z.discriminatedUnion('field', [
      z.object({ tokenIndex: z.number().int().nonnegative(), field: z.literal('acceptedPosCode'), value: z.string().min(1) }).strict(),
      z.object({ tokenIndex: z.number().int().nonnegative(), field: z.literal('checkpointState'), value: z.enum(['must_continue', 'may_end']) }).strict(),
      z.object({ tokenIndex: z.number().int().nonnegative(), field: z.literal('rightConnectorEnd'), value: z.enum(['send', 'accept', 'cap']) }).strict(),
      z.object({ tokenIndex: z.number().int().nonnegative(), field: z.literal('rightRail'), value: z.enum(['off', 'yellow', 'green']) }).strict(),
    ]) }).strict(),
  ])

const systemTagPreviewResultSchema = z.object({
  sessionId: z.string().uuid(),
  floor: systemTagPreviewFloorSchema,
  step: recursionPathStepSchema.nullable(),
  complete: z.boolean(),
  receipt: z.object({
    floorReads: z.literal(0),
    floorWrites: z.literal(0),
    guestRecordsFrozenOnce: z.literal(true),
    sentenceCount: z.literal(1),
  }).strict(),
}).strict()

/** Accept only one complete Manifest-clerk database read-back from the live channel. */
export function parseBusManifestChangePayload(value: unknown): SavedBusManifest {
  return parseLocalSavedBusManifest(savedBusManifestSchema.parse(value))
}

/**
 * Listen on Vite's existing local live-update connection. The payload is the
 * same complete database-reread sheet used by every pull response.
 */
export function subscribeToBusManifestChanges(input: {
  readonly onManifestChanged: (manifest: SavedBusManifest) => void
  readonly onError?: (error: unknown) => void
}): () => void {
  const hot = import.meta.hot
  if (hot == null) return () => undefined

  const receive = (payload: unknown): void => {
    try {
      const manifest = parseBusManifestChangePayload(payload)
      adoptSavedFloorLocally(manifest)
      input.onManifestChanged(manifest)
    } catch (error) {
      input.onError?.(error)
    }
  }
  hot.on(BUS_MANIFEST_CHANGED_EVENT, receive)
  return () => hot.off(BUS_MANIFEST_CHANGED_EVENT, receive)
}

/** Accept only a complete, current canonical roster from the live channel. */
export function parseSentenceStructureRosterChangePayload(
  value: unknown,
): readonly SentenceStructureRosterItem[] {
  return sentenceStructureRosterSchema.parse(value)
}

/** Keep every open Levels tab on the same complete database-reread roster. */
export function subscribeToSentenceStructureRosterChanges(input: {
  readonly onRosterChanged: (
    roster: readonly SentenceStructureRosterItem[],
  ) => void
  readonly onError?: (error: unknown) => void
}): () => void {
  const hot = import.meta.hot
  if (hot == null) return () => undefined

  const receive = (payload: unknown): void => {
    try {
      const roster = parseSentenceStructureRosterChangePayload(payload)
      inFlightSharedReads.delete('sentence-structure-roster')
      adoptLocalFirstData(LOCAL_FIRST_QUERY_KEYS.roster, roster)
      input.onRosterChanged(roster)
    } catch (error) {
      input.onError?.(error)
    }
  }
  hot.on(SENTENCE_STRUCTURE_ROSTER_CHANGED_EVENT, receive)
  return () => hot.off(SENTENCE_STRUCTURE_ROSTER_CHANGED_EVENT, receive)
}

export function parseReviewDeskPosCatalog(value: unknown): ReviewDeskPosCatalog {
  return parseBusManifestPosCatalog(value)
}

export function parseReviewDeskSheet(value: unknown): ReviewDeskSheet {
  return parseBusManifestSheet(value)
}

export function assertReviewDeskSheetUsesPosCatalog(
  state: ReviewDeskSheet,
  catalog: ReviewDeskPosCatalog,
): ReviewDeskSheet {
  return assertBusManifestSheetUsesPosCatalog(
    state,
    new Set(catalog.posTypes.map((posType) => posType.posCode)),
  )
}

/** Stable identity for review state. Text, chunk order, and node IDs are not identity. */
export function reviewDeskAddressKey(address: BusManifestSourceAddress): string {
  return busManifestAddressKey(address)
}

/** Deterministic equality key for the one current state; it is not a weight. */
export function reviewDeskSheetKey(state: ReviewDeskSheet): string {
  return JSON.stringify({
    schemaVersion: 9,
    tokens: state.tokens.map((token) => [
      token.tokenIndex,
      token.surfaceText,
      token.acceptedPosCode,
      token.checkpointState,
      token.rightConnectorEnd,
      token.leftRail,
      token.rightRail,
    ]),
  })
}

export function posTypeByCode(
  catalog: ReviewDeskPosCatalog,
  posCode: string | null,
): ReviewDeskPosType | null {
  return findPosTypeByCode(catalog, posCode)
}

/** Cycle one physical rail and mirror the result onto its two guest rows. */
export function cycleRailBetweenGuests(
  state: ReviewDeskSheet,
  firstGuestIndex: number,
): ReviewDeskSheet {
  const current = state.tokens[firstGuestIndex]?.rightRail
  const next = current === 'green'
    ? 'yellow'
    : current === 'yellow'
      ? 'off'
      : 'green'
  return setRailBetweenGuests(state, firstGuestIndex, next)
}

/** Set the one physical rail on both guests' touching sides. */
export function setRailBetweenGuests(
  state: ReviewDeskSheet,
  firstGuestIndex: number,
  next: 'off' | 'green' | 'yellow' | null,
): ReviewDeskSheet {
  const tokens = state.tokens.map((token) => ({ ...token }))
  const first = tokens[firstGuestIndex]
  const second = tokens[firstGuestIndex + 1]
  if (first == null || second == null) {
    throw new Error(`Two guests are required at seats ${firstGuestIndex} and ${firstGuestIndex + 1}.`)
  }

  tokens[firstGuestIndex] = { ...first, rightRail: next }
  tokens[firstGuestIndex + 1] = { ...second, leftRail: next }
  return { ...state, tokens }
}

const inFlightSharedReads = new Map<string, Promise<unknown>>()

function sharedRead<T>(key: string, load: () => Promise<T>): Promise<T> {
  const existing = inFlightSharedReads.get(key)
  if (existing != null) return existing as Promise<T>
  const request = load()
  inFlightSharedReads.set(key, request)
  const release = () => {
    if (inFlightSharedReads.get(key) === request) inFlightSharedReads.delete(key)
  }
  void request.then(release, release)
  return request
}

export function fetchReviewDeskPosCatalog(): Promise<ReviewDeskPosCatalog> {
  return localFirstRead(LOCAL_FIRST_QUERY_KEYS.posCatalog, () => (
    sharedRead('pos-catalog', async () => parseReviewDeskPosCatalog(
      await callBusManifestDoor<unknown>({ operation: 'pos-catalog' }),
    ))
  ))
}

function parseLocalSavedBusManifest(value: unknown): SavedBusManifest {
  const review = savedBusManifestSchema.parse(value)
  return {
    ...review,
    state: parseReviewDeskSheet(review.state),
  }
}

function adoptSavedFloorLocally(manifest: SavedBusManifest): void {
  updateLocalFirstData<readonly SavedBusManifest[]>(
    LOCAL_FIRST_QUERY_KEYS.savedFloors,
    (current) => [
      ...(current ?? []).filter((item) => (
        item.sourceAddress.structureId !== manifest.sourceAddress.structureId
      )),
      manifest,
    ].sort((left, right) => left.sourceOrderIndex - right.sourceOrderIndex),
  )
}

function readSentenceStructureRoster(): Promise<readonly SentenceStructureRosterItem[]> {
  return sharedRead('sentence-structure-roster', async () => sentenceStructureRosterSchema.parse(
    await callBusManifestDoor<unknown>({ operation: 'sentence-structure-roster' }),
  ))
}

export function fetchSentenceStructureRoster(): Promise<readonly SentenceStructureRosterItem[]> {
  return localFirstRead(LOCAL_FIRST_QUERY_KEYS.roster, readSentenceStructureRoster)
}

/** Bypass the display cache so direct database edits replace stale roster wording. */
export async function refreshSentenceStructureRoster(): Promise<readonly SentenceStructureRosterItem[]> {
  const roster = await readSentenceStructureRoster()
  adoptLocalFirstData(LOCAL_FIRST_QUERY_KEYS.roster, roster)
  return roster
}

export async function editSentenceStructure(
  input: EditSentenceStructureInput,
): Promise<SentenceStructureMutationResult> {
  const parsed = parseEditSentenceStructureInput(input)
  const result = parseSentenceStructureMutationResult(await callBusManifestDoor<unknown>({
    operation: 'edit-sentence-structure',
    input: parsed,
  }))
  adoptLocalFirstData(LOCAL_FIRST_QUERY_KEYS.roster, result.roster)
  return result
}

export async function deleteSentenceStructure(
  input: DeleteSentenceStructureInput,
): Promise<SentenceStructureMutationResult> {
  const parsed = parseDeleteSentenceStructureInput(input)
  const result = parseSentenceStructureMutationResult(await callBusManifestDoor<unknown>({
    operation: 'delete-sentence-structure',
    input: parsed,
  }))
  adoptLocalFirstData(LOCAL_FIRST_QUERY_KEYS.roster, result.roster)
  return result
}

export async function setSentenceStructureCurriculumLevel(
  input: SetSentenceStructureCurriculumLevelInput,
): Promise<SentenceStructureMutationResult> {
  const parsed = parseSetSentenceStructureCurriculumLevelInput(input)
  const result = parseSentenceStructureMutationResult(await callBusManifestDoor<unknown>({
    operation: 'set-sentence-structure-level',
    input: parsed,
  }))
  adoptLocalFirstData(LOCAL_FIRST_QUERY_KEYS.roster, result.roster)
  return result
}

const inFlightDatabaseLayouts = new Map<
  InvestigationDatabaseSchema,
  Promise<InvestigationDatabaseLayout>
>()

export function fetchDatabaseLayout(
  schema: InvestigationDatabaseSchema,
): Promise<InvestigationDatabaseLayout> {
  const requestedSchema = investigationDatabaseSchemaSchema.parse(schema)
  const existing = inFlightDatabaseLayouts.get(requestedSchema)
  if (existing != null) return existing

  return localFirstRead(LOCAL_FIRST_QUERY_KEYS.databaseLayout(requestedSchema), async () => {
  const request = callBusManifestDoor<unknown>({
      operation: 'database-layout',
      schema: requestedSchema,
    })
    .then((value) => {
      const layout = parseInvestigationDatabaseLayout(value)
      if (layout.schema !== requestedSchema) {
        throw new Error(
          `The database layout response returned ${layout.schema}, not ${requestedSchema}.`,
        )
      }
      return layout
    })
  inFlightDatabaseLayouts.set(requestedSchema, request)
  const release = () => {
    if (inFlightDatabaseLayouts.get(requestedSchema) === request) {
      inFlightDatabaseLayouts.delete(requestedSchema)
    }
  }
  void request.then(release, release)
  return request
  })
}

export async function fetchInvestigationLearnedWords(): Promise<
  readonly InvestigationLearnedWord[]
> {
  return localFirstRead(LOCAL_FIRST_QUERY_KEYS.learnedWords, async () => (
    parseInvestigationLearnedWords(
      await callBusManifestDoor<unknown>({ operation: 'learned-words' }),
    )
  ))
}

export function fetchGuestPatternCategories(): Promise<GuestPatternCategorySnapshot> {
  return localFirstRead(LOCAL_FIRST_QUERY_KEYS.guestPatternCategories, async () => (
    guestPatternCategorySnapshotSchema.parse(
      await callBusManifestDoor<unknown>({ operation: 'guest-pattern-categories' }),
    )
  ))
}

export async function setGuestPatternCategory(
  input: SetGuestPatternCategoryInput,
): Promise<GuestPatternCategorySnapshot> {
  const result = guestPatternCategorySnapshotSchema.parse(
    await callBusManifestDoor<unknown>({
      operation: 'set-guest-pattern-category',
      input: parseSetGuestPatternCategoryInput(input),
    }),
  )
  adoptLocalFirstData(LOCAL_FIRST_QUERY_KEYS.guestPatternCategories, result)
  return result
}

export function fetchSavedBusManifests(): Promise<readonly SavedBusManifest[]> {
  return localFirstRead(LOCAL_FIRST_QUERY_KEYS.savedFloors, () => sharedRead('fetch-all', async () => {
    const reviews = savedBusManifestArraySchema.parse(
      await callBusManifestDoor<unknown>({ operation: 'fetch-all' }),
    )
    return reviews.map(parseLocalSavedBusManifest)
  }))
}

export async function fetchSavedBusManifest(
  sourceAddress: BusManifestSourceAddress,
): Promise<SavedBusManifest | null> {
  const review = await callBusManifestDoor<SavedBusManifest | null>({
    operation: 'fetch',
    sourceAddress,
  })
  if (review == null) return null
  const parsed = parseLocalSavedBusManifest(review)
  adoptSavedFloorLocally(parsed)
  return parsed
}

export async function openBusManifest(
  input: OpenBusManifestInput,
): Promise<SavedBusManifest> {
  const parsedInput = parseOpenBusManifestInput(input)
  const manifest = parseLocalSavedBusManifest(
    await callBusManifestDoor<SavedBusManifest>({
      operation: 'open-bus-manifest',
      input: parsedInput,
    }),
  )
  adoptSavedFloorLocally(manifest)
  return manifest
}

export async function tryAutomaticCheckIn(
  input: TryAutomaticCheckInInput,
): Promise<AutomaticCheckInResult> {
  const parsedInput = parseTryAutomaticCheckInInput(input)
  const result = automaticCheckInResultSchema.parse(
    await callBusManifestDoor<unknown>({
      operation: 'try-automatic-check-in',
      input: parsedInput,
    }),
  )
  const manifest = parseLocalSavedBusManifest(result.manifest)
  adoptSavedFloorLocally(manifest)
  return {
    status: result.status,
    manifest,
  }
}

export async function previewSystemTag(
  input: PreviewSystemTagInput,
): Promise<SystemTagPreviewResult> {
  const parsedInput = parsePreviewSystemTagInput(input)
  return systemTagPreviewResultSchema.parse(
    await callBusManifestDoor<unknown>({
      operation: 'step-recursion-path',
      input: parsedInput,
    }),
  )
}

export async function submitBusManifestSheet(
  input: SubmitBusManifestSheetInput,
  catalog: ReviewDeskPosCatalog,
): Promise<SavedBusManifestSubmission> {
  const parsedInput = parseSubmitBusManifestSheetInput(input)
  const state = assertReviewDeskSheetUsesPosCatalog(
    parsedInput.state,
    catalog,
  )
  const saved = await callBusManifestDoor<SavedBusManifestSubmission>({
    operation: 'submit-bus-manifest',
    input: {
      ...parsedInput,
      state,
    },
  })
  const manifest = parseLocalSavedBusManifest(saved.manifest)
  adoptSavedFloorLocally(manifest)
  return {
    receipt: saved.receipt,
    manifest,
  }
}
