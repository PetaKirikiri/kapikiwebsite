import { z } from 'zod'

const nonNegativeInteger = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER)
const positiveInteger = z.number().int().positive().max(Number.MAX_SAFE_INTEGER)
const directoryCodeSchema = z.string()
  .trim()
  .min(1)
  .regex(/^[a-z][a-z0-9_]*$/u)

export const busManifestRailSettingSchema = z.enum(['off', 'yellow', 'green'])
export const busManifestCheckpointStateSchema = z.enum(['must_continue', 'may_end'])

export const busManifestSourceAddressSchema = z.object({
  structureId: positiveInteger,
}).strict()

/** The one canonical WORDS sentence-structure address. */
export const busManifestStableSourceKeySchema = busManifestSourceAddressSchema

const wordCategoryStylePosCode = /_noun$/u

export const busManifestPosCodeSchema = z.string()
  .trim()
  .min(1)
  .regex(/^[a-z][a-z0-9_]*$/u)
  .refine((posCode) => !wordCategoryStylePosCode.test(posCode), {
    message: 'Word-category labels cannot be installed as POS codes.',
  })

export const APPROVED_LINGUISTIC_POS_PARENT_CODES: ReadonlySet<string> = new Set([
  'verb',
])

export const LOCKED_PROPER_NAME_POS_CODE = 'proper_name'
export const LOCKED_PRE_NAME_HONORIFIC_POS_CODE = 'pre_name_honorific'

const lockedNameDirectory = [
  {
    posCode: LOCKED_PROPER_NAME_POS_CODE,
    label: 'Proper name',
    abbreviation: 'PNAME',
  },
  {
    posCode: LOCKED_PRE_NAME_HONORIFIC_POS_CODE,
    label: 'Pre-name honorific',
    abbreviation: 'HON',
  },
] as const

const reservedNameConvention = /(^|_)(name|honorific|title|proper)($|_)/u

const busManifestPosGroupSchema = z.object({
  groupCode: busManifestPosCodeSchema,
  displayLabel: z.string().min(1),
  description: z.string(),
  sortOrder: z.number().int(),
}).strict()

const busManifestPosTypeSchema = z.object({
  posCode: busManifestPosCodeSchema,
  label: z.string().min(1),
  abbreviation: z.string().trim().min(1),
  description: z.string(),
  groupCode: busManifestPosCodeSchema,
  parentCode: busManifestPosCodeSchema.nullable(),
}).strict()

const busManifestDictionaryPosLabelSchema = z.object({
  labelCode: directoryCodeSchema,
  rawLabel: z.string().trim().min(1),
  displayLabel: z.string().trim().min(1),
  groupCode: busManifestPosCodeSchema,
}).strict()

const busManifestDictionaryPosMappingSchema = z.object({
  labelCode: directoryCodeSchema,
  posCode: busManifestPosCodeSchema,
}).strict()

const busManifestWordCategorySchema = z.object({
  categoryCode: directoryCodeSchema,
  label: z.string().trim().min(1),
  description: z.string().trim().min(1),
}).strict()

/** The one closed POS directory, including its approved substitution hierarchy. */
export const busManifestPosCatalogSchema = z.object({
  groups: z.array(busManifestPosGroupSchema),
  posTypes: z.array(busManifestPosTypeSchema),
  dictionaryPosLabels: z.array(busManifestDictionaryPosLabelSchema),
  dictionaryPosMappings: z.array(busManifestDictionaryPosMappingSchema),
  wordCategories: z.array(busManifestWordCategorySchema),
}).strict().superRefine((catalog, context) => {
  const groupCodes = new Set(catalog.groups.map((group) => group.groupCode))
  const posCodes = new Set(catalog.posTypes.map((posType) => posType.posCode))
  const labelByCode = new Map(catalog.dictionaryPosLabels.map((label) => [
    label.labelCode,
    label,
  ]))
  const posTypeByCode = new Map(catalog.posTypes.map((posType) => [
    posType.posCode,
    posType,
  ]))
  const seenCodes = new Set<string>()
  const seenAbbreviations = new Set<string>()
  const parentByCode = new Map(catalog.posTypes.map((posType) => [
    posType.posCode,
    posType.parentCode,
  ]))

  const seenGroupCodes = new Set<string>()
  catalog.groups.forEach((group, index) => {
    if (seenGroupCodes.has(group.groupCode)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['groups', index, 'groupCode'],
        message: `Duplicate canonical POS group ${group.groupCode}.`,
      })
    }
    seenGroupCodes.add(group.groupCode)
  })

  catalog.posTypes.forEach((posType, index) => {
    if (!groupCodes.has(posType.groupCode)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['posTypes', index, 'groupCode'],
        message: `Unknown POS group ${posType.groupCode}.`,
      })
    }
    if (posType.parentCode != null) {
      if (!posCodes.has(posType.parentCode)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['posTypes', index, 'parentCode'],
          message: `Unknown POS parent ${posType.parentCode}.`,
        })
      }
      if (!APPROVED_LINGUISTIC_POS_PARENT_CODES.has(posType.parentCode)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['posTypes', index, 'parentCode'],
          message: `Unapproved linguistic POS parent ${posType.parentCode}.`,
        })
      }
    }
    for (const [value, seen, field] of [
      [posType.posCode, seenCodes, 'posCode'],
      [posType.abbreviation, seenAbbreviations, 'abbreviation'],
    ] as const) {
      if (seen.has(value as never)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['posTypes', index, field],
          message: `Duplicate canonical POS ${field}.`,
        })
      }
      ;(seen as Set<unknown>).add(value)
    }

    const visited = new Set<string>([posType.posCode])
    let parent = posType.parentCode
    while (parent != null) {
      if (visited.has(parent)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['posTypes', index, 'parentCode'],
          message: `POS parent cycle at ${parent}.`,
        })
        break
      }
      visited.add(parent)
      parent = parentByCode.get(parent) ?? null
    }
  })

  const seenLabelCodes = new Set<string>()
  const seenRawLabels = new Set<string>()
  catalog.dictionaryPosLabels.forEach((label, index) => {
    if (seenLabelCodes.has(label.labelCode)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['dictionaryPosLabels', index, 'labelCode'],
        message: `Duplicate dictionary POS label code ${label.labelCode}.`,
      })
    }
    seenLabelCodes.add(label.labelCode)
    if (seenRawLabels.has(label.rawLabel)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['dictionaryPosLabels', index, 'rawLabel'],
        message: `Duplicate dictionary POS raw label ${label.rawLabel}.`,
      })
    }
    seenRawLabels.add(label.rawLabel)
    if (!groupCodes.has(label.groupCode)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['dictionaryPosLabels', index, 'groupCode'],
        message: `Unknown dictionary POS group ${label.groupCode}.`,
      })
    }
  })

  const seenMappings = new Set<string>()
  catalog.dictionaryPosMappings.forEach((mapping, index) => {
    const mappingKey = `${mapping.labelCode}:${mapping.posCode}`
    if (seenMappings.has(mappingKey)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['dictionaryPosMappings', index],
        message: `Duplicate dictionary POS mapping ${mappingKey}.`,
      })
    }
    seenMappings.add(mappingKey)
    const label = labelByCode.get(mapping.labelCode)
    const posType = posTypeByCode.get(mapping.posCode)
    if (label == null) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['dictionaryPosMappings', index, 'labelCode'],
        message: `Unknown dictionary POS label ${mapping.labelCode}.`,
      })
    }
    if (posType == null) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['dictionaryPosMappings', index, 'posCode'],
        message: `Unknown mapped Hotel POS room ${mapping.posCode}.`,
      })
    }
    if (label != null && posType != null && label.groupCode !== posType.groupCode) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['dictionaryPosMappings', index],
        message: `Dictionary POS mapping ${mappingKey} crosses from ${label.groupCode} to ${posType.groupCode}.`,
      })
    }
  })

  const seenCategoryCodes = new Set<string>()
  const seenCategoryLabels = new Set<string>()
  catalog.wordCategories.forEach((category, index) => {
    if (seenCategoryCodes.has(category.categoryCode)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['wordCategories', index, 'categoryCode'],
        message: `Duplicate word category code ${category.categoryCode}.`,
      })
    }
    seenCategoryCodes.add(category.categoryCode)
    if (seenCategoryLabels.has(category.label)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['wordCategories', index, 'label'],
        message: `Duplicate word category label ${category.label}.`,
      })
    }
    seenCategoryLabels.add(category.label)
  })

  const lockedCodes = new Set<string>(lockedNameDirectory.map((entry) => entry.posCode))
  catalog.posTypes.forEach((posType, index) => {
    if (reservedNameConvention.test(posType.posCode) && !lockedCodes.has(posType.posCode)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['posTypes', index, 'posCode'],
        message: 'Only the locked proper-name and pre-name-honorific POS codes may use name/title terminology.',
      })
    }
  })

  lockedNameDirectory.forEach((expected) => {
    const matches = catalog.posTypes.filter((posType) => posType.posCode === expected.posCode)
    const posType = matches[0]
    if (
      matches.length !== 1
      || posType?.label !== expected.label
      || posType?.abbreviation !== expected.abbreviation
      || posType?.groupCode !== 'noun'
      || posType?.parentCode !== null
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['posTypes'],
        message: `The closed catalog requires exactly one locked ${expected.posCode} row.`,
      })
    }
  })
})

/** One recurring Māori guest identity, independent of passage and room. */
export function normalizeGuestSurfaceIdentity(surface: string): string {
  return surface
    .normalize('NFC')
    .toLowerCase()
    .trim()
    .replace(/^[^a-zāēīōū]+|[^a-zāēīōū]+$/gu, '')
}

export const guestSurfaceIdentitySchema = z.string()
  .transform(normalizeGuestSurfaceIdentity)
  .pipe(z.string().regex(/^[a-zāēīōū]+(?:[-'][a-zāēīōū]+)*$/u))

const uniqueDirectoryCodesSchema = z.array(directoryCodeSchema).superRefine((codes, context) => {
  if (new Set(codes).size !== codes.length) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Directory codes must be unique.',
    })
  }
})

/** Abstract connector topology only. Family artwork is never persisted here. */
export const leftConnectorEndSchema = z.enum(['send', 'accept', 'none'])
export const rightConnectorEndSchema = z.enum(['send', 'accept', 'cap'])

/** The one approved reusable comparison shape. No persistence metadata belongs here. */
export const wordConditionShapeSchema = z.object({
  ours: busManifestPosCodeSchema.nullable(),
  family: directoryCodeSchema.nullable(),
  teAka: directoryCodeSchema.nullable(),
  categories: uniqueDirectoryCodesSchema,
  dot: busManifestCheckpointStateSchema.nullable(),
  leftRail: busManifestRailSettingSchema.nullable(),
  rightRail: busManifestRailSettingSchema.nullable(),
  leftConnectorEnd: leftConnectorEndSchema.nullable(),
  leftConnectorFamily: directoryCodeSchema.nullable(),
  rightConnectorEnd: rightConnectorEndSchema.nullable(),
  rightConnectorFamily: directoryCodeSchema.nullable(),
  blockColor: z.enum(['yellow', 'green']).nullable(),
  blockType: guestSurfaceIdentitySchema.nullable(),
}).strict().superRefine((shape, context) => {
  const expectedBlockColor = shape.rightRail === 'yellow' || shape.rightRail === 'green'
    ? shape.rightRail
    : shape.leftRail === 'yellow' || shape.leftRail === 'green' ? shape.leftRail : null
  if (shape.blockColor !== expectedBlockColor) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['blockColor'],
      message: 'blockColor must be this word’s own block colour from its rails.' })
  }
  if ((shape.blockColor == null) !== (shape.blockType == null)) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['blockType'],
      message: 'blockType must be the starting word when this word belongs to a coloured block.' })
  }
  const allowedRightConnectorEnds: readonly ('send' | 'accept' | 'cap' | null)[] =
    shape.dot === 'must_continue' ? ['send', 'accept']
      : shape.dot === 'may_end' ? ['cap'] : [null]
  if (!allowedRightConnectorEnds.includes(shape.rightConnectorEnd)) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['rightConnectorEnd'],
      message: 'rightConnectorEnd must be send or accept for must_continue, cap for may_end, and null while unresolved.' })
  }
  const leftHasConnector = shape.leftConnectorEnd === 'send' || shape.leftConnectorEnd === 'accept'
  if (leftHasConnector !== (shape.leftConnectorFamily != null)) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['leftConnectorFamily'],
      message: 'A left send or accept requires its owning Family; none or unresolved requires null.' })
  }
  const rightHasConnector = shape.rightConnectorEnd != null
  if (rightHasConnector !== (shape.rightConnectorFamily != null)) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['rightConnectorFamily'],
      message: 'A resolved right ending requires its owning Family; an unresolved ending requires null.' })
  }
  if (shape.rightConnectorEnd != null && shape.rightConnectorFamily !== shape.family) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['rightConnectorFamily'],
      message: 'Every resolved right ending is owned by this word’s own Family.' })
  }
})

export const learnedWordConditionSchema = z.object({
  local: wordConditionShapeSchema,
  left: z.array(wordConditionShapeSchema),
  right: z.array(wordConditionShapeSchema),
  sources: z.array(z.object({
    structureId: positiveInteger,
    floorFingerprint: z.string().trim().min(1),
  }).strict()).min(1).superRefine((sources, context) => {
    const keys = sources.map(({ structureId, floorFingerprint }) => (
      `${structureId}:${floorFingerprint}`
    ))
    if (new Set(keys).size !== keys.length) context.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Condition Floor addresses must be unique.',
    })
  }),
}).strict()

export const learnedWordSchema = z.object({
  word: guestSurfaceIdentitySchema,
  conditions: z.array(learnedWordConditionSchema).min(1),
}).strict()

export type WordConditionShape = z.infer<typeof wordConditionShapeSchema>
export type LeftConnectorEnd = z.infer<typeof leftConnectorEndSchema>
export type RightConnectorEnd = z.infer<typeof rightConnectorEndSchema>
export type LearnedWordCondition = z.infer<typeof learnedWordConditionSchema>
export type LearnedWord = z.infer<typeof learnedWordSchema>

export function parseLearnedWord(value: unknown): LearnedWord {
  return learnedWordSchema.parse(value)
}

const guestRecordProofAddressSchema = z.object({
  structureId: positiveInteger,
}).strict()

const uniqueGuestRecordProofAddressesSchema = z.array(guestRecordProofAddressSchema)
  .superRefine((addresses, context) => {
    const identities = addresses.map(({ structureId }) => String(structureId))
    if (new Set(identities).size !== identities.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Guest Record proof addresses must be unique.',
      })
    }
  })

export const guestRelationshipMessageSchema = z.object({
  direction: z.enum(['left', 'right']),
  ownSpecificPosCode: busManifestPosCodeSchema,
  neighbourSpecificPosCode: busManifestPosCodeSchema,
  neighbourFamilyCodes: uniqueDirectoryCodesSchema.default([]),
  neighbourTeAkaPosCodes: uniqueDirectoryCodesSchema.default([]),
  neighbourSpecificPosCodes: uniqueDirectoryCodesSchema.default([]),
  neighbourCheckpointStates: z.array(busManifestCheckpointStateSchema)
    .refine((values) => new Set(values).size === values.length,
      'Neighbour checkpoint possibilities must be unique.')
    .default([]),
  neighbourLeftRails: z.array(busManifestRailSettingSchema)
    .refine((values) => new Set(values).size === values.length,
      'Neighbour left-rail possibilities must be unique.')
    .default([]),
  neighbourRightRails: z.array(busManifestRailSettingSchema)
    .refine((values) => new Set(values).size === values.length,
      'Neighbour right-rail possibilities must be unique.')
    .default([]),
  checkpointState: busManifestCheckpointStateSchema.nullable(),
  rail: busManifestRailSettingSchema.nullable(),
  ownCategoryCodes: uniqueDirectoryCodesSchema,
  neighbourCategoryCodes: uniqueDirectoryCodesSchema,
  continuesChain: z.boolean(),
  supportingProofs: uniqueGuestRecordProofAddressesSchema,
  contradictingProofs: uniqueGuestRecordProofAddressesSchema,
  hiddenTestPasses: uniqueGuestRecordProofAddressesSchema,
}).strict().superRefine((message, context) => {
  const support = new Set(message.supportingProofs.map(({ structureId }) => String(structureId)))
  message.contradictingProofs.forEach(({ structureId }, index) => {
    if (support.has(String(structureId))) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['contradictingProofs', index],
        message: 'One source cannot both support and contradict the same Guest message.',
      })
    }
  })
})

export const guestSpecificPosEvidenceSchema = z.object({
  posCode: busManifestPosCodeSchema,
  supportingProofs: uniqueGuestRecordProofAddressesSchema,
  hiddenTestPasses: uniqueGuestRecordProofAddressesSchema,
}).strict().superRefine((evidence, context) => {
  if (evidence.supportingProofs.length === 0) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['supportingProofs'],
      message: 'Confirmed Ours POS evidence requires at least one source proof.',
    })
  }
})

/** All durable learned knowledge owned by one normalized Māori word. */
export const guestRecordSchema = z.object({
  schemaVersion: z.literal(1),
  surfaceIdentity: guestSurfaceIdentitySchema,
  possibleFamilyCodes: uniqueDirectoryCodesSchema,
  confirmedFamilyCodes: uniqueDirectoryCodesSchema,
  teAkaPosCodes: uniqueDirectoryCodesSchema,
  sourcePossibleSpecificPosCodes: uniqueDirectoryCodesSchema,
  confirmedSpecificPosCodes: uniqueDirectoryCodesSchema,
  confirmedSpecificPosEvidence: z.array(guestSpecificPosEvidenceSchema),
  categoryCodes: uniqueDirectoryCodesSchema,
  messages: z.array(guestRelationshipMessageSchema),
  knowledgeRevision: nonNegativeInteger,
}).strict().superRefine((record, context) => {
  const possibleFamilies = new Set(record.possibleFamilyCodes)
  record.confirmedFamilyCodes.forEach((code, index) => {
    if (!possibleFamilies.has(code)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['confirmedFamilyCodes', index],
        message: 'A confirmed Family must also remain a possible Family.',
      })
    }
  })
  const evidenceCodes = record.confirmedSpecificPosEvidence.map(({ posCode }) => posCode)
  if (new Set(evidenceCodes).size !== evidenceCodes.length) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['confirmedSpecificPosEvidence'],
      message: 'Each confirmed Ours POS has exactly one evidence collection.',
    })
  }
  record.confirmedSpecificPosCodes.forEach((code, index) => {
    if (!evidenceCodes.includes(code)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['confirmedSpecificPosCodes', index],
        message: 'A confirmed Ours POS requires source-addressed evidence.',
      })
    }
  })
  evidenceCodes.forEach((code, index) => {
    if (!record.confirmedSpecificPosCodes.includes(code)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['confirmedSpecificPosEvidence', index, 'posCode'],
        message: 'Ours POS evidence must name a confirmed Ours POS.',
      })
    }
  })
  const messageKeys = record.messages.map((message) => JSON.stringify({
    direction: message.direction,
    ownSpecificPosCode: message.ownSpecificPosCode,
    neighbourSpecificPosCode: message.neighbourSpecificPosCode,
    neighbourFamilyCodes: [...message.neighbourFamilyCodes].sort(),
    neighbourTeAkaPosCodes: [...message.neighbourTeAkaPosCodes].sort(),
    neighbourSpecificPosCodes: [...message.neighbourSpecificPosCodes].sort(),
    neighbourCheckpointStates: [...message.neighbourCheckpointStates].sort(),
    neighbourLeftRails: [...message.neighbourLeftRails].sort(),
    neighbourRightRails: [...message.neighbourRightRails].sort(),
    checkpointState: message.checkpointState,
    rail: message.rail,
    ownCategoryCodes: [...message.ownCategoryCodes].sort(),
    neighbourCategoryCodes: [...message.neighbourCategoryCodes].sort(),
    continuesChain: message.continuesChain,
  }))
  if (new Set(messageKeys).size !== messageKeys.length) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['messages'],
      message: 'A Guest Record cannot contain duplicate relationship messages.',
    })
  }
})

export type GuestRecordProofAddress = z.infer<typeof guestRecordProofAddressSchema>
export type GuestRelationshipMessage = z.infer<typeof guestRelationshipMessageSchema>
export type GuestSpecificPosEvidence = z.infer<typeof guestSpecificPosEvidenceSchema>
export type GuestRecord = z.infer<typeof guestRecordSchema>

export function parseGuestRecord(value: unknown): GuestRecord {
  return guestRecordSchema.parse(value)
}

export type BusManifestSourceAddress = z.infer<typeof busManifestSourceAddressSchema>
export type BusManifestStableSourceKey = BusManifestSourceAddress
export type BusManifestPosGroup = z.infer<typeof busManifestPosGroupSchema>
export type BusManifestPosType = z.infer<typeof busManifestPosTypeSchema>
export type BusManifestDictionaryPosLabel = z.infer<
  typeof busManifestDictionaryPosLabelSchema
>
export type BusManifestDictionaryPosMapping = z.infer<
  typeof busManifestDictionaryPosMappingSchema
>
export type BusManifestWordCategory = z.infer<typeof busManifestWordCategorySchema>
export type BusManifestPosCatalog = z.infer<typeof busManifestPosCatalogSchema>

export function parseBusManifestPosCatalog(value: unknown): BusManifestPosCatalog {
  return busManifestPosCatalogSchema.parse(value)
}

const bookingSlipControlFields = [
  'acceptedPosCode',
  'checkpointState',
  'rightConnectorEnd',
  'leftRail',
  'rightRail',
] as const

export const bookingSlipSchema = z.object({
  tokenIndex: nonNegativeInteger,
  acceptedPosCode: busManifestPosCodeSchema.optional(),
  checkpointState: busManifestCheckpointStateSchema.optional(),
  rightConnectorEnd: rightConnectorEndSchema.optional(),
  leftRail: busManifestRailSettingSchema.optional(),
  rightRail: busManifestRailSettingSchema.optional(),
}).strict().superRefine((slip, context) => {
  bookingSlipControlFields.forEach((field) => {
    if (Object.hasOwn(slip, field) && slip[field] === undefined) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: [field],
        message: `Omit ${field} when the Booking Slip supplies no value for it.`,
      })
    }
  })

  if (bookingSlipControlFields.some((field) => slip[field] !== undefined)) return

  context.addIssue({
    code: z.ZodIssueCode.custom,
    message: 'A Booking Slip must contain at least one supplied value.',
  })
}).readonly()

export const bookingSlipBatchSchema = z.array(bookingSlipSchema).superRefine((slips, context) => {
  const seenTokenIndexes = new Set<number>()
  slips.forEach((slip, index) => {
    if (seenTokenIndexes.has(slip.tokenIndex)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: [index, 'tokenIndex'],
        message: `Reception received more than one slip for token ${slip.tokenIndex}.`,
      })
    }
    seenTokenIndexes.add(slip.tokenIndex)
  })
})

export type BookingSlip = z.infer<typeof bookingSlipSchema>
export type BusManifestCheckpointState = z.infer<typeof busManifestCheckpointStateSchema>
export type BusManifestRailSetting = z.infer<typeof busManifestRailSettingSchema>

export function parseBookingSlip(value: unknown): BookingSlip {
  return bookingSlipSchema.parse(value)
}

export function parseBookingSlipBatch(value: unknown): readonly BookingSlip[] {
  return bookingSlipBatchSchema.parse(value)
}

const bookingDecisionBaseSchema = z.object({
  tokenIndex: nonNegativeInteger,
})

export const bookingDecisionSchema = z.discriminatedUnion('field', [
  bookingDecisionBaseSchema.extend({
    field: z.literal('acceptedPosCode'),
    value: busManifestPosCodeSchema,
  }).strict(),
  bookingDecisionBaseSchema.extend({
    field: z.literal('checkpointState'),
    value: busManifestCheckpointStateSchema,
  }).strict(),
  bookingDecisionBaseSchema.extend({
    field: z.literal('rightConnectorEnd'),
    value: rightConnectorEndSchema,
  }).strict(),
  bookingDecisionBaseSchema.extend({
    field: z.literal('rightRail'),
    value: busManifestRailSettingSchema,
  }).strict(),
]).readonly()

export const bookingDecisionBatchSchema = z.array(bookingDecisionSchema)
  .superRefine((decisions, context) => {
    const seen = new Set<string>()
    decisions.forEach((decision, index) => {
      const target = `${decision.tokenIndex}:${decision.field}`
      if (seen.has(target)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: [index],
          message: `The decision maker returned target ${target} more than once.`,
        })
      }
      seen.add(target)
    })
  })

export type BookingDecision = z.infer<typeof bookingDecisionSchema>

export function parseBookingDecisionBatch(value: unknown): readonly BookingDecision[] {
  return bookingDecisionBatchSchema.parse(value)
}

const busManifestTokenSchema = z.object({
  tokenIndex: nonNegativeInteger,
  surfaceText: z.string().refine((value) => value.trim().length > 0, {
    message: 'A guest surface must contain visible text.',
  }),
  acceptedPosCode: busManifestPosCodeSchema.nullable(),
  checkpointState: busManifestCheckpointStateSchema.nullable(),
  rightConnectorEnd: rightConnectorEndSchema.nullable(),
  leftRail: busManifestRailSettingSchema.nullable(),
  rightRail: busManifestRailSettingSchema.nullable(),
}).strict()

export const busManifestSheetSchema = z.object({
  schemaVersion: z.literal(9),
  tokens: z.array(busManifestTokenSchema).min(1),
}).strict().superRefine((sheet, context) => {
  sheet.tokens.forEach((token, index) => {
    if (token.tokenIndex !== index) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['tokens', index, 'tokenIndex'],
        message: `Expected token address ${index}.`,
      })
    }
    if (index === 0 && token.leftRail != null) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['tokens', index, 'leftRail'],
        message: 'The first guest has no rail to its left, so leftRail must be null.',
      })
    }
    if (index === sheet.tokens.length - 1 && token.rightRail != null) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['tokens', index, 'rightRail'],
        message: 'The final guest has no rail to its right, so rightRail must be null.',
      })
    }
    const nextToken = sheet.tokens[index + 1]
    if (nextToken != null && token.rightRail !== nextToken.leftRail) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['tokens', index, 'rightRail'],
        message: 'Adjacent guests must store the same physical rail on their touching sides.',
      })
    }
    const allowedRightConnectorEnds: readonly ('send' | 'accept' | 'cap' | null)[] =
      token.checkpointState === 'must_continue'
        ? ['send', 'accept']
        : token.checkpointState === 'may_end' ? ['cap'] : [null]
    if (!allowedRightConnectorEnds.includes(token.rightConnectorEnd)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['tokens', index, 'rightConnectorEnd'],
        message: 'rightConnectorEnd must be send or accept for must_continue, cap for may_end, and null while unresolved.',
      })
    }
  })
})

export const busManifestWriterSchema = z.enum(['system', 'user', 'ai'])

export const openBusManifestInputSchema = z.object({
  sourceAddress: busManifestSourceAddressSchema,
}).strict()

export const submitBusManifestSheetInputSchema = z.object({
  sourceAddress: busManifestSourceAddressSchema,
  state: busManifestSheetSchema,
  writer: busManifestWriterSchema,
  expectedFingerprint: z.string().trim().min(1).nullable(),
}).strict()

export const tryAutomaticCheckInInputSchema = z.object({
  sourceAddress: busManifestStableSourceKeySchema,
  expectedFingerprint: z.string().trim().min(1),
}).strict()

export const previewSystemTagInputSchema = z.object({
  textMi: z.string().trim().min(1).refine((text) => !/\s{2,}/u.test(text),
    'System Tag Test text must be single-spaced.'),
  sessionId: z.string().uuid().nullable(),
}).strict()

export const setGuestPatternCategoryInputSchema = z.object({
  sourceAddress: busManifestStableSourceKeySchema,
  tokenIndex: nonNegativeInteger,
  categoryCode: directoryCodeSchema,
  selected: z.boolean(),
  expectedFingerprint: z.string().trim().min(1),
}).strict()

export const guestPatternCategoryMatchSchema = z.object({
  sourceAddress: busManifestStableSourceKeySchema,
  tokenIndex: nonNegativeInteger,
  surfaceIdentity: guestSurfaceIdentitySchema,
  categoryCodes: uniqueDirectoryCodesSchema,
}).strict()

export const guestPatternCategorySnapshotSchema = z.array(
  guestPatternCategoryMatchSchema,
).readonly()

export type BusManifestSheet = z.infer<typeof busManifestSheetSchema>
export type BusManifestWriter = z.infer<typeof busManifestWriterSchema>
export type OpenBusManifestInput = z.infer<typeof openBusManifestInputSchema>
export type SubmitBusManifestSheetInput = z.infer<typeof submitBusManifestSheetInputSchema>
export type TryAutomaticCheckInInput = z.infer<typeof tryAutomaticCheckInInputSchema>
export type PreviewSystemTagInput = z.infer<typeof previewSystemTagInputSchema>
export type SetGuestPatternCategoryInput = z.infer<typeof setGuestPatternCategoryInputSchema>
export type GuestPatternCategoryMatch = z.infer<typeof guestPatternCategoryMatchSchema>
export type GuestPatternCategorySnapshot = z.infer<typeof guestPatternCategorySnapshotSchema>

export function parseBusManifestSheet(value: unknown): BusManifestSheet {
  return busManifestSheetSchema.parse(value)
}

export function parseSubmitBusManifestSheetInput(value: unknown): SubmitBusManifestSheetInput {
  return submitBusManifestSheetInputSchema.parse(value)
}

export function parseOpenBusManifestInput(
  value: unknown,
): OpenBusManifestInput {
  return openBusManifestInputSchema.parse(value)
}

export function parseTryAutomaticCheckInInput(
  value: unknown,
): TryAutomaticCheckInInput {
  return tryAutomaticCheckInInputSchema.parse(value)
}

export function parsePreviewSystemTagInput(value: unknown): PreviewSystemTagInput {
  return previewSystemTagInputSchema.parse(value)
}

export function parseSetGuestPatternCategoryInput(
  value: unknown,
): SetGuestPatternCategoryInput {
  return setGuestPatternCategoryInputSchema.parse(value)
}

export function assertBusManifestSheetUsesPosCatalog(
  sheet: BusManifestSheet,
  allowedPosCodes: ReadonlySet<string>,
): BusManifestSheet {
  const invalid = sheet.tokens.find((token) =>
    token.acceptedPosCode != null && !allowedPosCodes.has(token.acceptedPosCode),
  )
  if (invalid != null) {
    throw new Error(
      `POS code ${invalid.acceptedPosCode} at token ${invalid.tokenIndex} is outside the canonical POS catalog.`,
    )
  }
  return sheet
}
