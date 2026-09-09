import {
  busManifestSourceAddressSchema,
  parseBusManifestSheet,
  type BusManifestPosCatalog as ContractPosCatalog,
  type BusManifestPosGroup as ContractPosGroup,
  type BusManifestPosType as ContractPosType,
  type BookingSlip as ContractBookingSlip,
  type BusManifestCheckpointState as ContractCheckpointState,
  type BusManifestRailSetting as ContractRailSetting,
  type BusManifestSheet,
  type BusManifestSourceAddress,
} from '../busManifestContract'
import type { RecursionPathStep } from './recursionPathEngine'

/** Shared Bus Manifest forms. */
export type BusManifestPosGroup = ContractPosGroup
export type BusManifestPosType = ContractPosType
export type BusManifestPosCatalog = ContractPosCatalog

export type CurrentBusManifestSheet = BusManifestSheet

export {
  bookingSlipBatchSchema,
  bookingSlipSchema,
  parseBookingSlip,
  parseBookingSlipBatch,
} from '../busManifestContract'

export type BusManifestCheckpointState = ContractCheckpointState
export type BusManifestRailSetting = ContractRailSetting

/**
 * One complete per-guest decision slip handed to reception.
 * Omitted properties mean "no instruction"; supplied properties are literal
 * final values. In particular, `off` is a decision and is not an omission.
 */
export type BookingSlip = ContractBookingSlip

export type SavedBusManifest = {
  readonly savedAt: string
  readonly stateFingerprint: string
  /** Canonical WORDS display ordering. It is never identity. */
  readonly sourceOrderIndex: number
  readonly paragraphText: string
  readonly sourceAddress: BusManifestSourceAddress
  readonly state: CurrentBusManifestSheet
}

function requirePositiveSafeInteger(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`Saved Bus Manifest requires a positive safe ${label}.`)
  }
  return value
}

function requireNonnegativeSafeInteger(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) {
    throw new Error(`Saved Bus Manifest requires a nonnegative safe ${label}.`)
  }
  return value
}

function requireNonemptyString(value: unknown, label: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`Saved Bus Manifest requires a nonempty ${label}.`)
  }
  return value
}

function requireTimestamp(value: unknown): string {
  if (value instanceof Date && !Number.isNaN(value.valueOf())) return value.toISOString()
  return requireNonemptyString(value, 'updated_at')
}

const savedBusManifestRowKeys = new Set([
  'structure_id',
  'sort_order',
  'text_mi',
  'state_fingerprint',
  'updated_at',
  'state',
])

/** Parse one storage row into the neutral saved-sheet form shared by readers. */
export function savedBusManifestFromDatabaseRow(
  row: Readonly<Record<string, unknown>>,
): SavedBusManifest {
  const unexpectedKey = Object.keys(row).find((key) => !savedBusManifestRowKeys.has(key))
  if (unexpectedKey != null) {
    throw new Error(`Saved Bus Manifest row has unexpected field ${unexpectedKey}.`)
  }
  const structureId = requirePositiveSafeInteger(row.structure_id, 'structure_id')
  return {
    savedAt: requireTimestamp(row.updated_at),
    stateFingerprint: requireNonemptyString(row.state_fingerprint, 'state_fingerprint'),
    sourceOrderIndex: requireNonnegativeSafeInteger(row.sort_order, 'sort_order'),
    paragraphText: requireNonemptyString(row.text_mi, 'text_mi'),
    sourceAddress: busManifestSourceAddressSchema.parse({ structureId }),
    state: parseBusManifestSheet(row.state),
  }
}

export type BusManifestSaveReceipt = {
  readonly structureId: number
  readonly savedAt: string
  readonly stateFingerprint: string
}

export type SavedBusManifestSubmission = {
  readonly receipt: BusManifestSaveReceipt
  readonly manifest: SavedBusManifest
}

export type AutomaticCheckInResult = {
  readonly status: 'no_change' | 'sheet_updated'
  readonly manifest: SavedBusManifest
}

export type SystemTagPreviewFloor = {
  readonly sourceOrderIndex: number
  readonly paragraphText: string
  readonly sourceAddress: BusManifestSourceAddress
  readonly state: CurrentBusManifestSheet
}

export type SystemTagPreviewResult = {
  readonly sessionId: string
  readonly floor: SystemTagPreviewFloor
  readonly step: RecursionPathStep | null
  readonly complete: boolean
  readonly receipt: {
    readonly floorReads: 0
    readonly floorWrites: 0
    readonly guestRecordsFrozenOnce: true
    readonly sentenceCount: 1
  }
}

export function busManifestAddressKey(address: BusManifestSourceAddress): string {
  const parsed = busManifestSourceAddressSchema.parse(address)
  return `structure:${parsed.structureId}`
}

export function createEmptyBusManifestSheet(
  surfaces: readonly string[],
): CurrentBusManifestSheet {
  return parseBusManifestSheet({
    schemaVersion: 9,
    tokens: surfaces.map((surfaceText, tokenIndex) => ({
      tokenIndex,
      surfaceText,
      acceptedPosCode: null,
      checkpointState: null,
      rightConnectorEnd: null,
      leftRail: null,
      rightRail: null,
    })),
  })
}

export function posTypeByCode(
  catalog: BusManifestPosCatalog,
  posCode: string | null,
): BusManifestPosType | null {
  if (posCode == null) return null
  return catalog.posTypes.find((posType) => posType.posCode === posCode) ?? null
}
