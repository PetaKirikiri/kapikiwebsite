import {
  Fragment,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react'
import type {
  BusManifestDisplayToken as EngineRenderToken,
} from '../lib/busManifestTeam/reviewDeskDisplay'
import {
  cycleRailBetweenGuests,
  posTypeByCode,
  reviewDeskAddressKey,
  type ReviewDeskPosCatalog,
  type ReviewDeskSheet,
  type SavedBusManifest,
} from '../lib/busManifestTeam/reviewDeskGateway'
import { compileConnectorLibrary } from '../lib/connectorPresentation/blueprints'
import { presentSentence } from '../lib/connectorPresentation/engine'
import structureNotes from '../lib/connectorPresentation/structureNotes.json'
import './SentenceStructureNotes.css'
import type {
  BusManifestSourceAddress,
  GuestPatternCategoryMatch,
} from '../lib/busManifestContract'
import SavedConnectorCheckpoint from './SavedConnectorCheckpoint'
import { useDesignSpaceCollection } from './useDesignSpaceCollection'
import { useConnectorPatterns } from '../hooks/useConnectorPatterns'
import { CONNECTOR_RAIL_LAYOUT, planRailSpan, type RailSpan } from '../lib/connectorPresentation/layout'

const TEST_PASSAGE_SEARCH_STORAGE_KEY = 'connectors.testPassageSearch.v1'
const APPROVED_PASSAGES_STORAGE_KEY = 'connectors.approvedSentenceStructures.v1'
const RAIL_CENTER_OFFSET_PX = CONNECTOR_RAIL_LAYOUT.centerOffset
type RailVisual = RailSpan

export type BusManifestUserWrite = {
  readonly sourceAddress: BusManifestSourceAddress
  readonly baseState: ReviewDeskSheet
  readonly state: ReviewDeskSheet
  readonly writer: 'user'
}

type UnsavedBusManifestControlAction = {
  readonly tokenIndex: number
} & (
  | { readonly kind: 'edit_pos' }
  | {
      readonly kind: 'set_checkpoint'
      readonly value: 'must_continue'
    }
  | {
      readonly kind: 'set_right_rail'
      readonly value: 'green'
    }
)

export type UnsavedBusManifestControlIntent = {
  readonly sourceAddress: BusManifestSourceAddress
} & UnsavedBusManifestControlAction

export type AutomaticCheckInControl = {
  readonly passageIndex: number
  readonly status: 'idle' | 'running' | 'no_change' | 'sheet_updated' | 'error'
  readonly disabled: boolean
  readonly message: string | null
  readonly onTry: () => void
}

export type PosPickerHierarchy = readonly {
  readonly groupCode: string
  readonly teAkaLabels: readonly {
    readonly labelCode: string
    readonly label: string
    readonly rawLabel: string
    readonly mappedHotelRoomCodes: readonly string[]
  }[]
  readonly hotelRooms: readonly {
    readonly roomCode: string
    readonly categories?: readonly {
      readonly categoryCode: string
      readonly label: string
      readonly description: string
    }[]
  }[]
}[]

type PosPickerCategory = NonNullable<
  PosPickerHierarchy[number]['hotelRooms'][number]['categories']
>[number]

export type BusManifestReviewViewProps = {
  readonly loading: boolean
  readonly paragraphs: readonly (readonly EngineRenderToken[])[]
  readonly savedBusManifests: readonly SavedBusManifest[]
  readonly posCatalog: ReviewDeskPosCatalog
  readonly passageAddresses: readonly BusManifestSourceAddress[]
  readonly onBusManifestWrite: (write: BusManifestUserWrite) => void
  readonly onUnsavedControlIntent?: (
    intent: UnsavedBusManifestControlIntent,
  ) => Promise<void>
  readonly automaticCheckIns?: readonly AutomaticCheckInControl[]
  readonly showPassageSearch?: boolean
  readonly showPassageLabel?: boolean
  readonly showStructureNotes?: boolean
  readonly showPosTags?: boolean
  readonly enablePassageApproval?: boolean
  readonly passageGroups?: readonly {
    readonly label: string
    readonly paragraphIndexes: readonly number[]
  }[]
  readonly posPickerHierarchy?: PosPickerHierarchy
  readonly readOnly?: boolean
  readonly continuousParagraph?: boolean
  readonly renderPassageSupplement?: (index: number, materials: readonly (string | undefined)[], joins: readonly boolean[]) => ReactNode
  readonly guestPatternCategoryMatches?: readonly GuestPatternCategoryMatch[]
  readonly onGuestPatternCategoryToggle?: (input: {
    readonly sourceAddress: BusManifestSourceAddress
    readonly tokenIndex: number
    readonly categoryCode: string
    readonly selected: boolean
  }) => Promise<void>
}

function sourceKeyOrNull(address: BusManifestSourceAddress | undefined): string | null {
  if (address == null) return null
  return reviewDeskAddressKey(address)
}

function reviewForAddress(
  reviews: readonly SavedBusManifest[],
  address: BusManifestSourceAddress | undefined,
): SavedBusManifest | null {
  const key = sourceKeyOrNull(address)
  if (key == null) return null
  return reviews.find((review) => reviewDeskAddressKey(review.sourceAddress) === key) ?? null
}

function PosPickerCategoryToggles({
  roomCode,
  roomLabel,
  categories,
  selectedCategoryCodes,
  onToggle,
}: {
  readonly roomCode: string
  readonly roomLabel: string
  readonly categories: readonly PosPickerCategory[]
  readonly selectedCategoryCodes: ReadonlySet<string>
  readonly onToggle?: (categoryCode: string, selected: boolean) => Promise<void>
}) {
  const [busyCode, setBusyCode] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [localCodes, setLocalCodes] = useState<ReadonlySet<string>>(() => new Set())
  const effectiveCodes = onToggle == null ? localCodes : selectedCategoryCodes

  return (
    <ul
      aria-label={`Categories for ${roomLabel}`}
      data-testid={`pos-picker-categories-${roomCode}`}
      className="flex min-w-0 flex-wrap gap-1"
    >
      {categories.map((category) => {
        const selected = effectiveCodes.has(category.categoryCode)
        return (
          <li key={category.categoryCode}>
            <button
              type="button"
              data-testid={`pos-picker-semantic-category-${category.categoryCode}`}
              aria-pressed={selected}
              disabled={busyCode != null}
              title={category.description}
              onClick={() => {
                if (onToggle == null) {
                  setLocalCodes((current) => {
                    const next = new Set(current)
                    if (selected) next.delete(category.categoryCode)
                    else next.add(category.categoryCode)
                    return next
                  })
                  return
                }
                setBusyCode(category.categoryCode)
                setError(null)
                void onToggle(category.categoryCode, !selected)
                  .catch((cause: unknown) => setError(
                    cause instanceof Error ? cause.message : 'Could not save this Category pattern.',
                  ))
                  .finally(() => setBusyCode(null))
              }}
              className={`shrink-0 rounded-lg border px-2.5 py-1.5 text-[10px] font-bold ${
                selected
                  ? 'border-amber-300 bg-amber-400 text-slate-950'
                  : 'border-amber-600 bg-amber-950 text-amber-200 hover:border-amber-400 hover:bg-amber-900'
              }`}
            >
              {category.label}
            </button>
          </li>
        )
      })}
      {error != null ? <li className="w-full text-xs text-red-300" role="alert">{error}</li> : null}
    </ul>
  )
}

function PosPicker({
  catalog,
  hierarchy,
  selectedPosCode,
  onChoose,
  onClose,
  selectedCategoryCodes,
  onCategoryToggle,
}: {
  readonly catalog: ReviewDeskPosCatalog
  readonly hierarchy?: PosPickerHierarchy
  readonly selectedPosCode: string | null
  readonly onChoose: (posCode: string | null) => void
  readonly onClose: () => void
  readonly selectedCategoryCodes: ReadonlySet<string>
  readonly onCategoryToggle?: (categoryCode: string, selected: boolean) => Promise<void>
}) {
  const compactInitialFamilyRef = useRef<HTMLButtonElement>(null)
  const selected = posTypeByCode(catalog, selectedPosCode)
  const hierarchyPresentationByRoomCode = new Map(
    hierarchy?.flatMap((hierarchyRoot) => hierarchyRoot.hotelRooms.map((room) => {
      const mappedLabel = hierarchyRoot.teAkaLabels.find((labelEntry) => (
        labelEntry.mappedHotelRoomCodes.includes(room.roomCode)
      ))
      return [
        room.roomCode,
        {
          groupCode: hierarchyRoot.groupCode,
          labelCode: mappedLabel?.labelCode ?? null,
          label: mappedLabel?.label ?? null,
          categories: room.categories ?? [],
        },
      ] as const
    })) ?? [],
  )
  const selectedPresentation = selectedPosCode == null
    ? undefined
    : hierarchyPresentationByRoomCode.get(selectedPosCode)
  const [groupCode, setGroupCode] = useState(
    selected?.groupCode ?? selectedPresentation?.groupCode ?? catalog.groups[0]?.groupCode ?? '',
  )
  const [labelCode, setLabelCode] = useState<string | null>(
    selectedPresentation?.labelCode ?? null,
  )
  useEffect(() => {
    compactInitialFamilyRef.current?.focus()
  }, [])

  const group = catalog.groups.find((candidate) => candidate.groupCode === groupCode) ??
    catalog.groups[0]
  const allMatchingOptions = catalog.posTypes.filter((posType) =>
    posType.groupCode === group?.groupCode)
  const hierarchyGroup = hierarchy?.find((candidate) => candidate.groupCode === group?.groupCode)
  const teAkaLabels = hierarchyGroup?.teAkaLabels ?? []
  const activeLabel = teAkaLabels.find((labelEntry) =>
    labelEntry.labelCode === labelCode)
  const activeMappedRoomCodes = new Set(activeLabel?.mappedHotelRoomCodes ?? [])
  const activeMappedRoomOptions = allMatchingOptions.filter((option) =>
    activeMappedRoomCodes.has(option.posCode))
  const categoryContextOption = selected?.groupCode === group?.groupCode
    ? selected
    : activeMappedRoomOptions.length === 1
      ? activeMappedRoomOptions[0]
      : undefined
  const categoryContextPresentation = categoryContextOption == null
    ? undefined
    : hierarchyPresentationByRoomCode.get(categoryContextOption.posCode)
  const visibleCategories = categoryContextPresentation?.categories ?? []

  const chooseGroup = (nextGroupCode: string): void => {
    const nextHierarchyGroup = hierarchy?.find((candidate) =>
      candidate.groupCode === nextGroupCode)
    setGroupCode(nextGroupCode)
    setLabelCode(nextHierarchyGroup?.teAkaLabels[0]?.labelCode ?? null)
  }

  const chooseLabel = (nextLabelCode: string): void => {
    setLabelCode(nextLabelCode)
  }

  if (hierarchy == null) {
    return (
      <div
        className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-950/30 p-4"
        onMouseDown={onClose}
      >
        <section
          role="dialog"
          aria-modal="true"
          aria-label="Choose POS"
          data-testid="compact-pos-picker"
          className="flex max-h-[calc(100vh-2rem)] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-slate-300 bg-slate-950 shadow-2xl"
          onMouseDown={(event) => event.stopPropagation()}
          onKeyDown={(event) => {
            if (event.key !== 'Escape') return
            event.preventDefault()
            event.stopPropagation()
            onClose()
          }}
        >
          <div
            data-testid="compact-pos-picker-controls"
            className="flex items-start gap-2 border-b border-slate-800 bg-slate-900 p-2"
          >
            <nav
              className="flex min-w-0 flex-1 flex-wrap gap-1"
              aria-label="POS families"
            >
              {catalog.groups.map((candidate) => {
                const current = candidate.groupCode === group?.groupCode
                return (
                  <button
                    key={candidate.groupCode}
                    ref={current ? compactInitialFamilyRef : undefined}
                    type="button"
                    data-testid={`pos-picker-family-${candidate.groupCode}`}
                    aria-pressed={current}
                    onClick={() => chooseGroup(candidate.groupCode)}
                    className={`shrink-0 rounded-lg border px-2.5 py-1.5 font-mono text-[10px] font-bold ${
                      current
                        ? 'border-cyan-400 bg-cyan-400 text-slate-950'
                        : 'border-slate-700 bg-slate-800 text-slate-300 hover:border-slate-500 hover:text-white'
                    }`}
                  >
                    {candidate.displayLabel}
                  </button>
                )
              })}
            </nav>
            <div className="flex shrink-0 items-center gap-1">
              {selectedPosCode != null ? (
                <button
                  type="button"
                  aria-label="Clear POS"
                  title="Clear POS"
                  onClick={() => onChoose(null)}
                  className="grid size-8 place-items-center rounded-lg border border-slate-600 text-slate-300 hover:border-red-400 hover:bg-red-950 hover:text-red-200"
                >
                  <svg aria-hidden="true" viewBox="0 0 24 24" className="size-4 fill-none stroke-current" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m7 19-4-4 9-9 6 6-7 7H7Z" />
                    <path d="m14 19 5 0" />
                  </svg>
                </button>
              ) : null}
              <button
                type="button"
                onClick={onClose}
                className="grid size-8 place-items-center rounded-lg text-lg leading-none text-slate-300 hover:bg-slate-800 hover:text-white"
                aria-label="Close POS picker"
              >
                ×
              </button>
            </div>
          </div>

          <div
            data-testid="compact-pos-picker-rooms"
            className="flex flex-wrap gap-1.5 overflow-y-auto bg-slate-950 p-2"
            aria-live="polite"
          >
            {allMatchingOptions.length > 0 ? (
              allMatchingOptions.map((option) => {
                const current = option.posCode === selectedPosCode
                return (
                  <button
                    key={option.posCode}
                    type="button"
                    data-testid={`pos-picker-room-${option.posCode}`}
                    aria-label={`${option.abbreviation}, ${option.label}${current ? ', current POS' : ''}`}
                    aria-pressed={current}
                    onClick={() => onChoose(option.posCode)}
                    className={`inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-lg border px-2.5 py-1.5 text-[10px] font-bold ${
                      current
                        ? 'border-cyan-400 bg-cyan-400 text-slate-950'
                        : 'border-slate-700 bg-slate-800 text-slate-300 hover:border-slate-500 hover:text-white'
                    }`}
                  >
                    <span className="font-mono font-black">{option.abbreviation}</span>
                    <span className="font-semibold">{option.label}</span>
                    {current ? (
                      <span
                        data-testid={`pos-picker-current-${option.posCode}`}
                        aria-hidden="true"
                        className="text-[9px] font-black"
                      >
                        ✓
                      </span>
                    ) : null}
                  </button>
                )
              })
            ) : (
              <p className="px-2 py-1.5 text-xs font-semibold text-slate-400">No rooms</p>
            )}
          </div>
        </section>
      </div>
    )
  }

  return (
    <div
      className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-950/30 p-4"
      onMouseDown={onClose}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label="Choose POS"
        data-testid="compact-pos-picker"
        className="flex max-h-[calc(100vh-2rem)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-300 bg-slate-950 shadow-2xl"
        onMouseDown={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          if (event.key !== 'Escape') return
          event.preventDefault()
          event.stopPropagation()
          onClose()
        }}
      >
        <div
          className="overflow-y-auto"
          data-testid="pos-picker-four-tier-directory"
        >
          <section
            data-testid="pos-picker-tier-1"
            aria-labelledby="pos-picker-tier-1-heading"
            className="grid grid-cols-[5.5rem_minmax(0,1fr)] gap-2 border-b border-indigo-900/70 bg-indigo-950/50 p-2"
          >
            <h3 id="pos-picker-tier-1-heading" className="py-1.5 text-[10px] font-black uppercase tracking-wide text-indigo-300">
              1 Family
            </h3>
            <div className="flex min-w-0 items-start gap-2">
              <nav className="flex min-w-0 flex-1 flex-wrap gap-1" aria-label="POS families">
                {catalog.groups.map((candidate) => {
                  const current = candidate.groupCode === group?.groupCode
                  return (
                    <button
                      key={candidate.groupCode}
                      ref={current ? compactInitialFamilyRef : undefined}
                      type="button"
                      data-testid={`pos-picker-family-${candidate.groupCode}`}
                      aria-pressed={current}
                      onClick={() => chooseGroup(candidate.groupCode)}
                      className={`shrink-0 rounded-lg border px-2.5 py-1.5 font-mono text-[10px] font-bold ${
                        current
                          ? 'border-indigo-400 bg-indigo-400 text-slate-950'
                          : 'border-slate-700 bg-slate-800 text-slate-300 hover:border-indigo-400 hover:text-white'
                      }`}
                    >
                      {candidate.displayLabel}
                    </button>
                  )
                })}
              </nav>
              <div className="flex shrink-0 items-center gap-1">
                {selectedPosCode != null ? (
                  <button
                    type="button"
                    aria-label="Clear POS"
                    title="Clear POS"
                    onClick={() => onChoose(null)}
                    className="grid size-8 place-items-center rounded-lg border border-slate-600 text-slate-300 hover:border-red-400 hover:bg-red-950 hover:text-red-200"
                  >
                    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-4 fill-none stroke-current" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m7 19-4-4 9-9 6 6-7 7H7Z" />
                      <path d="m14 19 5 0" />
                    </svg>
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={onClose}
                  className="grid size-8 place-items-center rounded-lg text-lg leading-none text-slate-300 hover:bg-slate-800 hover:text-white"
                  aria-label="Close POS picker"
                >
                  ×
                </button>
              </div>
            </div>
          </section>

          <section
            data-testid="pos-picker-tier-2"
            aria-labelledby="pos-picker-tier-2-heading"
            className="grid grid-cols-[5.5rem_minmax(0,1fr)] gap-2 border-b border-sky-900/70 bg-sky-950/30 p-2"
          >
            <h3 id="pos-picker-tier-2-heading" className="py-1.5 text-[10px] font-black uppercase tracking-wide text-sky-300">
              2 Te Aka
            </h3>
            <div className="flex min-w-0 flex-wrap gap-1" aria-live="polite">
              {teAkaLabels.length > 0 ? teAkaLabels.map((labelEntry) => {
                const current = labelEntry.labelCode === activeLabel?.labelCode
                return (
                  <button
                    key={labelEntry.labelCode}
                    type="button"
                    data-testid={`pos-picker-label-${labelEntry.labelCode}`}
                    aria-label={`Te Aka: ${labelEntry.label}`}
                    aria-pressed={current}
                    onClick={() => chooseLabel(labelEntry.labelCode)}
                    className={`shrink-0 rounded-lg border px-2.5 py-1.5 text-[10px] font-bold ${
                      current
                        ? 'border-sky-400 bg-sky-400 text-slate-950'
                        : 'border-slate-700 bg-slate-800 text-slate-300 hover:border-sky-400 hover:text-white'
                    }`}
                  >
                    {labelEntry.label}
                  </button>
                )
              }) : (
                <p className="px-2 py-1.5 text-xs font-semibold text-slate-500">No Te Aka labels</p>
              )}
            </div>
          </section>

          <section
            data-testid="pos-picker-tier-3"
            aria-labelledby="pos-picker-tier-3-heading"
            className="grid grid-cols-[5.5rem_minmax(0,1fr)] gap-2 border-b border-emerald-900/70 bg-emerald-950/30 p-2"
          >
            <h3 id="pos-picker-tier-3-heading" className="py-1.5 text-[10px] font-black uppercase tracking-wide text-emerald-300">
              3 Ours
            </h3>
            <div className="flex min-w-0 flex-wrap gap-1" aria-live="polite">
              {allMatchingOptions.length > 0 ? allMatchingOptions.map((option) => {
                const current = option.posCode === selectedPosCode
                const mappedFromActiveLabel = activeMappedRoomCodes.has(option.posCode)
                return (
                  <button
                    key={option.posCode}
                    type="button"
                    data-testid={`pos-picker-room-${option.posCode}`}
                    data-te-aka-match={mappedFromActiveLabel ? 'true' : 'false'}
                    aria-label={`${option.abbreviation}, ${option.label}${mappedFromActiveLabel ? ', matches selected Te Aka label' : ''}${current ? ', current POS' : ''}`}
                    aria-pressed={current}
                    onClick={() => onChoose(option.posCode)}
                    className={`inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-lg border px-2.5 py-1.5 text-[10px] font-bold ${
                      current
                        ? 'border-emerald-400 bg-emerald-400 text-slate-950'
                        : mappedFromActiveLabel
                          ? 'border-sky-500 bg-sky-950 text-sky-200 hover:bg-sky-900'
                          : 'border-slate-700 bg-slate-800 text-slate-300 hover:border-emerald-400 hover:text-white'
                    }`}
                  >
                    <span className="font-mono font-black">{option.abbreviation}</span>
                    <span className="font-semibold">{option.label}</span>
                    {mappedFromActiveLabel ? (
                      <span
                        data-testid={`pos-picker-room-te-aka-match-${option.posCode}`}
                        aria-hidden="true"
                        className="rounded bg-sky-700/70 px-1 text-[8px] font-black uppercase"
                      >
                        Te Aka
                      </span>
                    ) : null}
                    {current ? (
                      <span
                        data-testid={`pos-picker-current-${option.posCode}`}
                        aria-hidden="true"
                        className="text-[9px] font-black"
                      >
                        ✓
                      </span>
                    ) : null}
                  </button>
                )
              }) : (
                <p className="px-2 py-1.5 text-xs font-semibold text-slate-500">No rooms</p>
              )}
            </div>
          </section>

          <section
            data-testid="pos-picker-tier-4"
            aria-labelledby="pos-picker-tier-4-heading"
            className="grid grid-cols-[5.5rem_minmax(0,1fr)] gap-2 bg-amber-950/30 p-2"
          >
            <h3 id="pos-picker-tier-4-heading" className="py-1.5 text-[10px] font-black uppercase tracking-wide text-amber-300">
              4 Categories
            </h3>
            {visibleCategories.length > 0 && categoryContextOption != null ? (
              <PosPickerCategoryToggles
                key={categoryContextOption.posCode}
                roomCode={categoryContextOption.posCode}
                roomLabel={categoryContextOption.label}
                categories={visibleCategories}
                selectedCategoryCodes={selectedCategoryCodes}
                onToggle={onCategoryToggle}
              />
            ) : (
              <p className="px-2 py-1.5 text-xs font-semibold text-slate-500">No categories</p>
            )}
          </section>
        </div>
      </section>
    </div>
  )
}

function PosChip({
  label,
  description,
  enabled,
  opening,
  canOpenFloor,
  testId,
  topClassName,
  onClick,
}: {
  readonly label: string | null
  readonly description: string
  readonly enabled: boolean
  readonly opening: boolean
  readonly canOpenFloor: boolean
  readonly testId: string
  readonly topClassName?: string
  readonly onClick: (trigger: HTMLButtonElement) => void
}) {
  const title = opening
    ? 'Opening this Floor…'
    : label != null
      ? description || label
      : canOpenFloor
        ? 'Open this Floor and set POS'
        : enabled
          ? 'Set POS'
          : 'POS undecided — ring the service bell to open this Floor'
  const ariaLabel = opening
    ? 'Opening this Floor to set POS'
    : label != null
      ? `${label}: set POS`
      : canOpenFloor
        ? 'Open this Floor and set POS'
        : enabled
          ? 'Set POS'
          : 'POS undecided'
  return (
    <button
      type="button"
      data-testid={testId}
      disabled={!enabled}
      title={title}
      aria-label={ariaLabel}
      onClick={(event) => {
        event.stopPropagation()
        onClick(event.currentTarget)
      }}
      className={`absolute left-1/2 ${topClassName ?? 'top-5'} z-30 min-w-5 -translate-x-1/2 rounded-full px-1 py-0.5 font-mono text-[8px] font-bold ${
        label == null
          ? 'border border-dashed border-slate-400 bg-white text-slate-500'
          : 'bg-teal-700 text-white'
      } ${enabled
        ? 'cursor-pointer hover:bg-teal-600'
        : 'cursor-default'}`}
    >
      {label ?? '+'}
    </button>
  )
}

const KORU_STORY_HEIGHT_PX = CONNECTOR_RAIL_LAYOUT.storyHeight
const KORU_STORY_CONNECTION_WIDTH_PX = CONNECTOR_RAIL_LAYOUT.connectionWidth
const KORU_STORY_END_WIDTH_PX = CONNECTOR_RAIL_LAYOUT.connectionWidth
export default function BusManifestReviewView({
  loading,
  paragraphs,
  savedBusManifests,
  posCatalog,
  passageAddresses,
  onBusManifestWrite,
  onUnsavedControlIntent,
  automaticCheckIns,
  showPassageSearch = true,
  showPassageLabel = true,
  showStructureNotes = false,
  showPosTags = false,
  enablePassageApproval = false,
  passageGroups,
  posPickerHierarchy,
  readOnly = false,
  continuousParagraph = false,
  renderPassageSupplement,
  guestPatternCategoryMatches = [],
  onGuestPatternCategoryToggle,
}: BusManifestReviewViewProps) {
  const patternSettings = useConnectorPatterns()
  const {
    collection: connectorDrawings,
    loading: connectorDrawingsLoading,
    error: connectorDrawingsError,
  } = useDesignSpaceCollection({ production: true })
  const connectorLibrary = useMemo(() => compileConnectorLibrary(connectorDrawings), [connectorDrawings])
  const [searchQuery, setSearchQuery] = useState(() =>
    typeof window === 'undefined'
      ? '' : window.localStorage.getItem(TEST_PASSAGE_SEARCH_STORAGE_KEY) ?? '',
  )
  const [activeSearchMatch, setActiveSearchMatch] = useState(0)
  const [approvedPassageKeys, setApprovedPassageKeys] = useState<ReadonlySet<string>>(() => {
    if (typeof window === 'undefined') return new Set()
    try {
      const stored = JSON.parse(window.localStorage.getItem(APPROVED_PASSAGES_STORAGE_KEY) ?? '[]')
      return new Set(Array.isArray(stored) ? stored.filter((value): value is string => typeof value === 'string') : [])
    } catch {
      return new Set()
    }
  })
  const [editingGuest, setEditingGuest] = useState<{
    readonly paragraphIndex: number
    readonly tokenIndex: number
  } | null>(null)
  const posPickerReturnFocus = useRef<HTMLButtonElement | null>(null)
  const openingAddressKeys = useRef(new Set<string>())
  const [openingPassages, setOpeningPassages] = useState<ReadonlySet<string>>(
    new Set(),
  )
  const [unsavedControlErrors, setUnsavedControlErrors] = useState<
    ReadonlyMap<string, string>
  >(new Map())
  const tokenElements = useRef(new Map<string, HTMLSpanElement>())
  const paragraphElements = useRef(new Map<number, HTMLParagraphElement>())
  const [wordEnds, setWordEnds] = useState<ReadonlyMap<string, number>>(new Map())
  const [railVisuals, setRailVisuals] = useState<ReadonlyMap<string, RailVisual>>(
    new Map(),
  )
  const categoryMatchesByAddress = useMemo(() => new Map(
    guestPatternCategoryMatches.map((match) => [
      `${match.sourceAddress.structureId}:${match.tokenIndex}`,
      match.categoryCodes,
    ]),
  ), [guestPatternCategoryMatches])
  const familyByPosCode = useMemo(() => new Map(
    posCatalog.posTypes.map((posType) => [posType.posCode, posType.groupCode]),
  ), [posCatalog.posTypes])

  useEffect(() => {
    if (showPassageSearch) {
      window.localStorage.setItem(TEST_PASSAGE_SEARCH_STORAGE_KEY, searchQuery)
    }
  }, [searchQuery, showPassageSearch])

  useEffect(() => {
    if (!enablePassageApproval) return
    window.localStorage.setItem(
      APPROVED_PASSAGES_STORAGE_KEY,
      JSON.stringify([...approvedPassageKeys]),
    )
  }, [approvedPassageKeys, enablePassageApproval])

  useLayoutEffect(() => {
    let active = true
    const measure = () => {
      if (!active) return
      const next = new Map<string, RailVisual>()
      const nextWordEnds = new Map<string, number>()
      paragraphs.forEach((tokens, paragraphIndex) => {
        const paragraph = paragraphElements.current.get(paragraphIndex)
        if (paragraph == null) return
        const paragraphRect = paragraph.getBoundingClientRect()
        const paragraphStyle = window.getComputedStyle(paragraph)
        const contentLeft = paragraphRect.left + (Number.parseFloat(paragraphStyle.paddingLeft) || 0)
        const contentRight = paragraphRect.right - (Number.parseFloat(paragraphStyle.paddingRight) || 0)
        tokens.forEach((_, index) => {
          const element = tokenElements.current.get(`${paragraphIndex}:${index}`)
          const text = element?.querySelector('[data-word-text]')
          if (element != null && text != null) nextWordEnds.set(`${paragraphIndex}:${index}`, text.getBoundingClientRect().width)
        })
        for (let index = 0; index < tokens.length - 1; index++) {
          const left = tokenElements.current.get(`${paragraphIndex}:${index}`)
          const right = tokenElements.current.get(`${paragraphIndex}:${index + 1}`)
          if (left == null || right == null) continue
          const leftRect = left.getBoundingClientRect()
          const rightRect = right.getBoundingClientRect()
          next.set(`${paragraphIndex}:${index}`, planRailSpan(
            { left: leftRect.left, top: leftRect.top, textWidth: nextWordEnds.get(`${paragraphIndex}:${index}`) ?? 0 },
            { left: rightRect.left, top: rightRect.top, textWidth: nextWordEnds.get(`${paragraphIndex}:${index + 1}`) ?? 0 },
            contentLeft, contentRight,
          ))
        }
      })
      setRailVisuals((previous) => JSON.stringify([...previous]) === JSON.stringify([...next]) ? previous : next)
      setWordEnds((previous) => JSON.stringify([...previous]) === JSON.stringify([...nextWordEnds]) ? previous : nextWordEnds)
    }
    measure()
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure)
    paragraphElements.current.forEach((element) => observer?.observe(element))
    void document.fonts?.ready.then(measure)
    document.fonts?.addEventListener('loadingdone', measure)
    window.addEventListener('resize', measure)
    return () => {
      active = false
      observer?.disconnect()
      document.fonts?.removeEventListener('loadingdone', measure)
      window.removeEventListener('resize', measure)
    }
  }, [loading, paragraphs, savedBusManifests, passageAddresses, continuousParagraph, showPosTags])

  const searchMatches = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase('mi').replace(/\s+/gu, ' ')
    if (!query) return [] as number[]
    return paragraphs.flatMap((tokens, paragraphIndex) =>
      tokens.map((token) => token.text).join(' ').toLocaleLowerCase('mi')
        .replace(/\s+/gu, ' ').includes(query) ? [paragraphIndex] : [],
    )
  }, [paragraphs, searchQuery])

  const passageApprovalKey = (paragraphIndex: number): string =>
    sourceKeyOrNull(passageAddresses[paragraphIndex]) ?? `paragraph:${paragraphIndex}`
  const orderedPassageRows = useMemo(() => {
    const approved = (paragraphIndex: number) =>
      approvedPassageKeys.has(sourceKeyOrNull(passageAddresses[paragraphIndex]) ?? `paragraph:${paragraphIndex}`)
    if (!enablePassageApproval) {
      return passageGroups == null
        ? paragraphs.map((_, paragraphIndex) => ({ paragraphIndex, heading: null as string | null }))
        : passageGroups.flatMap((group) => group.paragraphIndexes.map((paragraphIndex, index) => ({
          paragraphIndex,
          heading: index === 0 ? `${group.label} (${group.paragraphIndexes.length})` : null,
        })))
    }
    const remainingRows = passageGroups == null
      ? paragraphs
        .map((_, paragraphIndex) => paragraphIndex)
        .filter((index) => !approved(index))
        .map((paragraphIndex) => ({ paragraphIndex, heading: null as string | null }))
      : passageGroups.flatMap((group) => {
        const indexes = group.paragraphIndexes.filter((index) => !approved(index))
        return indexes.map((paragraphIndex, index) => ({
          paragraphIndex,
          heading: index === 0 ? `${group.label} (${indexes.length})` : null,
        }))
      })
    const approvedIndexes = paragraphs
      .map((_, paragraphIndex) => paragraphIndex)
      .filter(approved)
    return [
      ...remainingRows,
      ...approvedIndexes.map((paragraphIndex, index) => ({
        paragraphIndex,
        heading: index === 0 ? `Happy with (${approvedIndexes.length})` : null,
      })),
    ]
  }, [approvedPassageKeys, enablePassageApproval, paragraphs, passageAddresses, passageGroups])

  function togglePassageApproval(paragraphIndex: number): void {
    const key = passageApprovalKey(paragraphIndex)
    setApprovedPassageKeys((current) => {
      const next = new Set(current)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  function goToSearchMatch(direction: 1 | -1) {
    if (searchMatches.length === 0) return
    const current = activeSearchMatch > 0 ? activeSearchMatch - 1 : -1
    const next = (current + direction + searchMatches.length) % searchMatches.length
    setActiveSearchMatch(next + 1)
    paragraphElements.current.get(searchMatches[next]!)?.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    })
  }

  function writeSavedState(
    paragraphIndex: number,
    updater: (state: ReviewDeskSheet) => ReviewDeskSheet,
  ) {
    const sourceAddress = passageAddresses[paragraphIndex]
    const savedReview = reviewForAddress(savedBusManifests, sourceAddress)
    if (sourceAddress == null || savedReview == null) return
    onBusManifestWrite({
      sourceAddress,
      baseState: savedReview.state,
      state: updater(savedReview.state),
      writer: 'user',
    })
  }

  function runUnsavedControlIntent(
    paragraphIndex: number,
    intent: UnsavedBusManifestControlAction,
  ): void {
    const sourceAddress = passageAddresses[paragraphIndex]
    if (sourceAddress == null || onUnsavedControlIntent == null) return
    const addressKey = reviewDeskAddressKey(sourceAddress)
    if (openingAddressKeys.current.has(addressKey)) return

    openingAddressKeys.current.add(addressKey)
    setOpeningPassages((current) => new Set(current).add(addressKey))
    setUnsavedControlErrors((current) => {
      if (!current.has(addressKey)) return current
      const next = new Map(current)
      next.delete(addressKey)
      return next
    })

    void Promise.resolve()
      .then(() => onUnsavedControlIntent({ sourceAddress, ...intent }))
      .then(() => {
        if (intent.kind === 'edit_pos') {
          setEditingGuest({ paragraphIndex, tokenIndex: intent.tokenIndex })
        }
      })
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : String(error)
        setUnsavedControlErrors((current) => new Map(current).set(addressKey, message))
      })
      .finally(() => {
        openingAddressKeys.current.delete(addressKey)
        setOpeningPassages((current) => {
          if (!current.has(addressKey)) return current
          const next = new Set(current)
          next.delete(addressKey)
          return next
        })
      })
  }

  function closePosPicker(): void {
    setEditingGuest(null)
    const returnTarget = posPickerReturnFocus.current
    posPickerReturnFocus.current = null
    queueMicrotask(() => {
      if (returnTarget?.isConnected && !returnTarget.disabled) returnTarget.focus()
    })
  }

  const hasText = paragraphs.some((paragraph) => paragraph.length > 0)
  if (loading) {
    return <p className="rounded border border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-600">Loading passages…</p>
  }
  if (connectorDrawings.length === 0) {
    return <p role={connectorDrawingsError ? 'alert' : undefined}
      className="rounded border border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-600">
      {connectorDrawingsLoading ? 'Loading connector shapes…' : connectorDrawingsError ?? 'The complete connector shape pack is unavailable.'}
    </p>
  }
  if (!hasText) {
    return <p className="rounded border border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-600">No passage text is available.</p>
  }

  return (
    <section aria-label="POS review reader" className="min-w-0">
      {showPassageSearch ? (
        <form
          role="search"
          className="sticky top-0 z-[90] mb-3 flex items-center justify-end gap-1 border-b border-slate-200 bg-neutral-50/95 py-2 backdrop-blur"
          onSubmit={(event: FormEvent) => {
            event.preventDefault()
            goToSearchMatch(1)
          }}
        >
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => {
              setSearchQuery(event.target.value)
              setActiveSearchMatch(0)
            }}
            placeholder="Find text"
            aria-label="Find text in passages"
            className="w-44 rounded border border-slate-300 bg-white px-2 py-1 text-xs outline-none focus:border-blue-500"
          />
          <span className="w-12 text-center font-mono text-[9px] text-slate-500">
            {searchQuery.trim() ? `${Math.min(activeSearchMatch, searchMatches.length)}/${searchMatches.length}` : ''}
          </span>
          <button type="button" disabled={searchMatches.length === 0} onClick={() => goToSearchMatch(-1)} className="rounded px-2 py-1 text-xs hover:bg-slate-100 disabled:opacity-30" aria-label="Previous search result">↑</button>
          <button type="submit" disabled={searchMatches.length === 0} className="rounded bg-slate-800 px-2 py-1 text-xs text-white disabled:opacity-30" aria-label="Next search result">↓</button>
        </form>
      ) : null}

      <article className={continuousParagraph ? '' : 'space-y-4'} lang="mi" translate="no">
        {orderedPassageRows
          .map(({ paragraphIndex, heading }) => {
          const tokens = paragraphs[paragraphIndex]
          const address = passageAddresses[paragraphIndex]
          const saved = reviewForAddress(savedBusManifests, address)
          const visibleState = saved?.state ?? null
          const controlsEditable = saved != null && !readOnly
          const addressKey = sourceKeyOrNull(address)
          const canOpenUnsavedFloor = !readOnly && saved == null && address != null &&
            onUnsavedControlIntent != null
          const openingUnsavedFloor = addressKey != null && openingPassages.has(addressKey)
          const controlsEnabled = !openingUnsavedFloor &&
            (controlsEditable || canOpenUnsavedFloor)
          const unsavedControlError = addressKey == null
            ? null
            : unsavedControlErrors.get(addressKey) ?? null
          const displayPassageNumber = saved == null
            ? paragraphIndex + 1
            : saved.sourceOrderIndex + 1
          const isSearchMatch = activeSearchMatch > 0 &&
            searchMatches[activeSearchMatch - 1] === paragraphIndex
          const checkInControl = automaticCheckIns?.find((control) =>
            control.passageIndex === paragraphIndex,
          ) ?? null
          const sentencePlan = presentSentence({
            text: tokens.map(token => token.text).join(' '), state: visibleState,
            families: familyByPosCode, library: connectorLibrary, rules: patternSettings.rules,
            textWidths: tokens.map((_, index) => wordEnds.get(`${paragraphIndex}:${index}`) ?? 0),
          })
          const connectorTopology = sentencePlan.words.map(word => word.presentation)
          const structureNote = showStructureNotes && address != null
            ? (structureNotes as Record<string, readonly string[]>)[String(address.structureId)]
            : undefined
          return (
            <Fragment key={sourceKeyOrNull(address) ?? paragraphIndex}>
            {heading != null ? <h2 lang="en" className="border-b border-slate-300 pb-2 pt-6 text-xl font-bold text-slate-900">{heading}</h2> : null}
            {structureNote ? <header className="structure-note-heading" lang="en">
              <span className="structure-note-number" aria-label={`Structure ${displayPassageNumber}`}>{String(displayPassageNumber).padStart(2, '0')}</span>
              <h3>{structureNote[0]}</h3>
            </header> : null}
            <p
              data-testid={`passage-${paragraphIndex + 1}`}
              data-state-fingerprint={saved?.stateFingerprint}
              ref={(element) => {
                if (element == null) paragraphElements.current.delete(paragraphIndex)
                else paragraphElements.current.set(paragraphIndex, element)
              }}
              className={continuousParagraph
                ? 'relative m-0 inline text-base font-medium leading-normal tracking-[-0.015em]'
                : `relative m-0 rounded-lg border px-3 pb-4 ${showPassageLabel ? 'pt-10' : 'pt-3'} text-base font-medium leading-normal tracking-[-0.015em] ${
                isSearchMatch
                  ? 'border-amber-400 bg-amber-50 ring-2 ring-amber-200'
                  : 'border-transparent border-b-slate-100 bg-transparent'
              }`}
            >
              {!continuousParagraph && (showPassageLabel || checkInControl != null || enablePassageApproval) ? <span className="absolute right-2 top-2 z-[60] flex items-center gap-2 font-mono text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                {enablePassageApproval ? (
                  <button
                    type="button"
                    data-testid={`approve-passage-${paragraphIndex + 1}`}
                    aria-label={`Mark Passage ${displayPassageNumber} ${approvedPassageKeys.has(passageApprovalKey(paragraphIndex)) ? 'not approved' : 'approved'}`}
                    aria-pressed={approvedPassageKeys.has(passageApprovalKey(paragraphIndex))}
                    title={approvedPassageKeys.has(passageApprovalKey(paragraphIndex)) ? 'Move back to sentences to review' : 'I’m happy with this sentence'}
                    onClick={(event) => {
                      event.stopPropagation()
                      togglePassageApproval(paragraphIndex)
                    }}
                    className={`grid size-7 place-items-center rounded-full border text-base font-black transition-colors ${
                      approvedPassageKeys.has(passageApprovalKey(paragraphIndex))
                        ? 'border-emerald-700 bg-emerald-600 text-white'
                        : 'border-slate-300 bg-white text-slate-400 hover:border-emerald-500 hover:text-emerald-600'
                    }`}
                  >
                    ✓
                  </button>
                ) : null}
                {showPassageLabel && !structureNote ? <span>Passage {displayPassageNumber}</span> : null}
                {checkInControl != null ? (
                  <>
                    <button
                      type="button"
                      data-testid={`try-automatic-check-in-${paragraphIndex + 1}`}
                      aria-label={openingUnsavedFloor
                        ? 'Opening this Floor for your edit'
                        : checkInControl.status === 'running'
                        ? 'Checking possibilities'
                        : 'Try check-in'}
                      title={openingUnsavedFloor
                        ? 'Opening this Floor for your edit…'
                        : checkInControl.status === 'running'
                        ? 'Checking possibilities…'
                        : 'Try check-in'}
                      disabled={checkInControl.disabled || openingUnsavedFloor}
                      onClick={(event) => {
                        event.stopPropagation()
                        checkInControl.onTry()
                      }}
                      className="grid size-7 place-items-center rounded-full border border-teal-600 bg-teal-700 text-white hover:bg-teal-600 disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-200 disabled:text-slate-500"
                    >
                      {checkInControl.status === 'running' ? (
                        <svg aria-hidden="true" viewBox="0 0 24 24" className="size-4 animate-spin fill-none stroke-current" strokeWidth="2">
                          <path d="M20 12a8 8 0 1 1-2.34-5.66" strokeLinecap="round" />
                        </svg>
                      ) : (
                        <svg aria-hidden="true" viewBox="0 0 24 24" className="size-4 fill-current">
                          <path d="M8 5.5v13l10-6.5z" />
                        </svg>
                      )}
                    </button>
                  </>
                ) : null}
                {checkInControl?.message != null ? (
                  <span
                    aria-live="polite"
                    className={checkInControl.status === 'error'
                      ? 'normal-case tracking-normal text-red-600'
                      : 'normal-case tracking-normal text-slate-500'}
                  >
                    {checkInControl.message}
                  </span>
                ) : null}
              </span> : null}

              {tokens.map((token, tokenIndex) => {
                const savedToken = visibleState?.tokens[tokenIndex]
                const acceptedPosCode = savedToken?.acceptedPosCode ?? null
                const wordLayout = sentencePlan.words[tokenIndex]!.layout
                const blockWidth = wordLayout.blockWidth
                const connectorAnchor = wordLayout.connectorCenter
                const posType = posTypeByCode(posCatalog, acceptedPosCode)
                const topology = connectorTopology[tokenIndex]
                const leftConnectorEnd = topology == null
                  ? tokenIndex === 0 ? 'none' : null
                  : topology.leftConnectorEnd
                const leftConnectorFamily = topology?.leftConnectorFamily ?? null
                const rightConnectorEnd = topology?.rightConnectorEnd ?? null
                const rightConnectorFamily = topology?.rightConnectorFamily ?? null
                const connectorDesign = topology?.blueprint ?? null
                const label = posType?.abbreviation ?? null
                const checkpointState = savedToken?.checkpointState ?? null
                const dotMayEnd = checkpointState === 'may_end'
                const railState = savedToken?.rightRail ?? null
                const hasNextGuest = tokenIndex < tokens.length - 1
                const railVisual = railVisuals.get(`${paragraphIndex}:${tokenIndex}`)
                const outgoingWidth = Math.max(16, railVisual?.outgoingWidth ?? 16)
                const checkpointConnectorDesign = connectorDesign
                const currentCheckpointWidth = checkpointConnectorDesign != null
                  ? KORU_STORY_CONNECTION_WIDTH_PX
                  : checkpointState === 'must_continue'
                    ? KORU_STORY_CONNECTION_WIDTH_PX
                    : KORU_STORY_END_WIDTH_PX
                const railCycleAriaLabel = readOnly
                  ? railState == null
                    ? `Rail unknown after ${token.text}`
                    : railState === 'off'
                      ? `Rail off after ${token.text}`
                      : `${railState} rail after ${token.text}`
                  : openingUnsavedFloor
                  ? `Opening this Floor to set the rail after ${token.text}`
                  : canOpenUnsavedFloor
                    ? `Open this Floor and set the rail after ${token.text} to green`
                    : !controlsEditable
                      ? `Rail undecided after ${token.text}`
                  : railState === 'green'
                  ? `Change green rail after ${token.text} to a yellow rail`
                  : railState === 'yellow'
                    ? `Turn off yellow rail after ${token.text}`
                    : railState === 'off'
                      ? `Change off rail after ${token.text} to a green rail`
                      : `Set undecided rail after ${token.text} to green`
                const railCycleTitle = readOnly
                  ? railState == null ? 'Rail unknown' : railState === 'off' ? 'Rail off' : `${railState} rail`
                  : openingUnsavedFloor
                  ? 'Opening this Floor…'
                  : canOpenUnsavedFloor
                    ? 'Open this Floor and set the rail to green'
                    : !controlsEditable
                      ? 'Rail undecided — ring the service bell to open this Floor'
                  : railState === 'green'
                  ? 'Green rail — click for yellow rail'
                  : railState === 'yellow'
                    ? 'Yellow rail — click to turn off'
                    : railState === 'off'
                      ? 'Rail off — click for green'
                      : 'Rail undecided — click for green'
                const cycleRail = () => {
                  writeSavedState(paragraphIndex, (state) =>
                    cycleRailBetweenGuests(state, tokenIndex))
                }
                return (
                  <span
                    key={`${paragraphIndex}:${tokenIndex}`}
                    data-testid={`token-${paragraphIndex}-${tokenIndex}`}
                    data-left-connector-end={leftConnectorEnd ?? 'unresolved'}
                    data-left-connector-family={leftConnectorFamily ?? 'none'}
                    data-right-connector-end={rightConnectorEnd ?? 'unresolved'}
                    data-right-connector-family={rightConnectorFamily ?? 'none'}
                    data-connector-design-id={connectorDesign?.id ?? 'none'}
                    ref={(element) => {
                      const key = `${paragraphIndex}:${tokenIndex}`
                      if (element == null) tokenElements.current.delete(key)
                      else tokenElements.current.set(key, element)
                    }}
                    className={`relative inline-block ${showPosTags ? 'pt-11' : 'pt-6'} align-baseline`}
                    style={{ minWidth: wordLayout.minimumWidth, paddingLeft: wordLayout.textPadding, paddingRight: wordLayout.textPadding, marginRight: wordLayout.gapAfter, textAlign: wordLayout.textAlign }}
                  >
                    {topology?.paintMaterial && topology.materialColor != null ? (
                      <span aria-hidden data-testid={`word-material-${paragraphIndex}-${tokenIndex}`}
                        className="pointer-events-none absolute z-10"
                        style={{
                          top: RAIL_CENTER_OFFSET_PX - KORU_STORY_HEIGHT_PX / 2,
                          height: KORU_STORY_HEIGHT_PX,
                          left: wordLayout.blockLeft,
                          width: blockWidth,
                          backgroundColor: topology.materialColor,
                        }} />
                    ) : null}
                    {topology?.internalMaterial ? <>
                      <span aria-hidden className="pointer-events-none absolute z-20" style={{ top: RAIL_CENTER_OFFSET_PX - KORU_STORY_HEIGHT_PX / 2, height: KORU_STORY_HEIGHT_PX, left: blockWidth * topology.internalMaterial.fraction, width: blockWidth * (1 - topology.internalMaterial.fraction), backgroundColor: topology.internalMaterial.color }} />
                      <span className="pointer-events-none absolute z-50 -translate-x-1/2" style={{ top: RAIL_CENTER_OFFSET_PX - KORU_STORY_HEIGHT_PX / 2, left: blockWidth * topology.internalMaterial.fraction }}><SavedConnectorCheckpoint plan={topology.internalMaterial.face} displayHeight={KORU_STORY_HEIGHT_PX} /></span>
                    </> : null}
                    {topology?.incomingJoin != null && railVisuals.get(`${paragraphIndex}:${tokenIndex - 1}`)?.continuation != null ? (
                      <span data-testid={`left-face-${paragraphIndex}-${tokenIndex}`}
                        className="pointer-events-none absolute z-50 -translate-x-1/2"
                        style={{ left: wordLayout.leftConnectorCenter, top: RAIL_CENTER_OFFSET_PX - KORU_STORY_HEIGHT_PX / 2 }}>
                        <SavedConnectorCheckpoint plan={topology.incomingJoin} displayHeight={KORU_STORY_HEIGHT_PX} />
                      </span>
                    ) : null}
                    <button
                      type="button"
                      data-testid={`checkpoint-${paragraphIndex}-${tokenIndex}`}
                      data-checkpoint-state={checkpointState ?? 'undecided'}
                      data-checkpoint-connector-design-id={checkpointConnectorDesign?.id ?? 'none'}
                      disabled={!controlsEnabled}
                      aria-label={readOnly
                        ? checkpointState == null
                          ? `Checkpoint unknown after ${token.text}`
                          : dotMayEnd
                            ? `May end after ${token.text}`
                            : `Must continue after ${token.text}`
                        : openingUnsavedFloor
                        ? `Opening this Floor to set the checkpoint after ${token.text}`
                        : canOpenUnsavedFloor
                          ? `Open this Floor and set the checkpoint after ${token.text} to must continue`
                          : controlsEditable
                            ? `Toggle checkpoint after ${token.text}`
                            : `Checkpoint undecided after ${token.text}`}
                      aria-pressed={checkpointState == null ? undefined : dotMayEnd}
                      title={readOnly
                        ? checkpointState == null
                          ? 'Checkpoint unknown'
                          : dotMayEnd ? 'May end here' : 'Must continue'
                        : openingUnsavedFloor
                        ? 'Opening this Floor…'
                        : canOpenUnsavedFloor
                          ? 'Open this Floor and set the checkpoint to must continue'
                          : !controlsEditable
                            ? 'Checkpoint undecided — ring the service bell to open this Floor'
                        : checkpointState == null
                          ? 'Checkpoint undecided — click for must continue'
                          : dotMayEnd ? 'May end here' : 'Must continue'}
                      onClick={(event) => {
                        event.stopPropagation()
                        if (!controlsEditable) {
                          runUnsavedControlIntent(paragraphIndex, {
                            kind: 'set_checkpoint',
                            tokenIndex,
                            value: 'must_continue',
                          })
                          return
                        }
                        writeSavedState(paragraphIndex, (state) => ({
                          ...state,
                          tokens: state.tokens.map((item) => item.tokenIndex === tokenIndex
                            ? {
                                ...item,
                                checkpointState: checkpointState == null || dotMayEnd
                                  ? 'must_continue'
                                  : 'may_end',
                                rightConnectorEnd: checkpointState == null || dotMayEnd
                                  ? 'send'
                                  : 'cap',
                              }
                            : item),
                        }))
                      }}
                      className={`absolute z-50 m-0 -translate-x-1/2 box-border appearance-none border-0 bg-transparent p-0 leading-none ${
                        checkpointState == null
                          ? 'border-0 bg-transparent'
                          : 'bg-transparent'
                      } ${controlsEnabled ? 'cursor-pointer' : 'cursor-default'}`}
                      style={{
                        top: RAIL_CENTER_OFFSET_PX - KORU_STORY_HEIGHT_PX / 2,
                        left: connectorAnchor,
                        width: currentCheckpointWidth,
                        height: KORU_STORY_HEIGHT_PX,
                      }}
                    >
                      {patternSettings.error ? <span role="img" aria-label={`Pattern settings unavailable: ${patternSettings.error}`} title={patternSettings.error}>!</span> : topology?.face ? (
                        <SavedConnectorCheckpoint plan={topology.face} displayHeight={KORU_STORY_HEIGHT_PX} />
                      ) : null}
                    </button>
                    {hasNextGuest ? (
                      <>
                        <button
                          type="button"
                          data-testid={`rail-control-${paragraphIndex}-${tokenIndex}`}
                          disabled={!controlsEnabled}
                          aria-label={railCycleAriaLabel}
                          title={railCycleTitle}
                          onClick={(event) => {
                            event.stopPropagation()
                            if (!controlsEditable) {
                              runUnsavedControlIntent(paragraphIndex, {
                                kind: 'set_right_rail',
                                tokenIndex,
                                value: 'green',
                              })
                              return
                            }
                            cycleRail()
                          }}
                          className={`absolute top-2 z-40 h-4 bg-transparent ${
                            controlsEnabled ? 'cursor-pointer' : 'cursor-default'
                          }`}
                          style={{ left: connectorAnchor, width: `${outgoingWidth}px` }}
                        />
                        {railVisual?.continuation != null ? (
                          <button
                            type="button"
                            data-testid={`rail-control-continuation-${paragraphIndex}-${tokenIndex}`}
                            disabled={!controlsEnabled}
                            aria-label={railCycleAriaLabel}
                            title={railCycleTitle}
                            onClick={(event) => {
                              event.stopPropagation()
                              if (!controlsEditable) {
                                runUnsavedControlIntent(paragraphIndex, {
                                  kind: 'set_right_rail',
                                  tokenIndex,
                                  value: 'green',
                                })
                                return
                              }
                              cycleRail()
                            }}
                            className={`absolute z-40 h-4 bg-transparent ${
                              controlsEnabled ? 'cursor-pointer' : 'cursor-default'
                            }`}
                            style={{
                              left: `${railVisual.continuation.left}px`,
                              top: `${railVisual.continuation.top - RAIL_CENTER_OFFSET_PX}px`,
                              width: `${railVisual.continuation.width}px`,
                            }}
                          />
                        ) : null}
                      </>
                    ) : null}
                    {showPosTags ? <PosChip
                      label={label}
                      description={posType?.description ?? ''}
                      enabled={controlsEnabled}
                      opening={openingUnsavedFloor}
                      canOpenFloor={canOpenUnsavedFloor}
                      testId={`pos-${paragraphIndex}-${tokenIndex}`}
                      topClassName="top-6"
                      onClick={(trigger) => {
                        posPickerReturnFocus.current = trigger
                        if (controlsEditable) {
                          setEditingGuest({ paragraphIndex, tokenIndex })
                          return
                        }
                        runUnsavedControlIntent(paragraphIndex, {
                          kind: 'edit_pos',
                          tokenIndex,
                        })
                      }}
                    /> : null}
                    <span data-word-text className={label == null ? 'text-slate-800' : 'text-slate-900'}>
                      {token.text}
                    </span>
                  </span>
                )
              })}
              {continuousParagraph ? (
                <span aria-hidden="true">
                  {/[.!?…]$/u.test(tokens[tokens.length - 1]?.text ?? '') ? '' : '.'}{' '}
                </span>
              ) : null}
            </p>
            {renderPassageSupplement?.(paragraphIndex, connectorTopology.map(word => word.materialColor), sentencePlan.words.map(word => word.layout.joinsNext))}
            {structureNote ? <aside className="structure-note-detail" lang="en" aria-label="Learning note">
              <span>What’s tricky</span>
              <p>{structureNote[1]}</p>
            </aside> : null}
            {unsavedControlError != null ? (
              <p
                role="alert"
                data-testid={`unsaved-control-error-${paragraphIndex + 1}`}
                className="mx-3 mt-1 rounded bg-red-50 px-3 py-2 text-xs text-red-700"
              >
                Could not apply this Floor edit: {unsavedControlError}
              </p>
            ) : null}
            </Fragment>
          )
        })}
      </article>

      {editingGuest != null && reviewForAddress(
        savedBusManifests,
        passageAddresses[editingGuest.paragraphIndex],
      ) != null ? (
        <PosPicker
          catalog={posCatalog}
          hierarchy={posPickerHierarchy}
          selectedPosCode={
            reviewForAddress(
              savedBusManifests,
              passageAddresses[editingGuest.paragraphIndex],
            )?.state.tokens[editingGuest.tokenIndex]?.acceptedPosCode ?? null
          }
          selectedCategoryCodes={new Set(
            categoryMatchesByAddress.get(`${passageAddresses[editingGuest.paragraphIndex]?.structureId}:${editingGuest.tokenIndex}`) ?? [],
          )}
          onCategoryToggle={onGuestPatternCategoryToggle == null ? undefined : (categoryCode, selected) => {
            const sourceAddress = passageAddresses[editingGuest.paragraphIndex]
            if (sourceAddress == null) return Promise.reject(new Error('This Guest has no Floor address.'))
            return onGuestPatternCategoryToggle({
              sourceAddress,
              tokenIndex: editingGuest.tokenIndex,
              categoryCode,
              selected,
            })
          }}
          onChoose={(posCode) => {
            writeSavedState(editingGuest.paragraphIndex, (state) => ({
              ...state,
              tokens: state.tokens.map((token) => token.tokenIndex === editingGuest.tokenIndex
                ? {
                    ...token,
                    acceptedPosCode: posCode,
                  }
                : token),
            }))
            closePosPicker()
          }}
          onClose={closePosPicker}
        />
      ) : null}
    </section>
  )
}
