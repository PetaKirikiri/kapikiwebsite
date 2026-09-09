import {
  type MangopareEquationInput,
} from './mangopareGeometry'
import {
  makeMangopareFourFrondDrawing,
  MANGOPARE_FOUR_FROND_DEFAULT_INPUT,
} from './mangopareFourFrondGeometry'
import { makeMangopareFourToTwoDrawing } from './mangopareFourToTwoGeometry'
import type { LockedPatternDrawing, LockedPatternSourceKey } from './patternDrawingContract'

type MangopareDesignVersion = Readonly<{
  id: string
  label: string
  sourceContractKey: LockedPatternSourceKey
  defaultInput: MangopareEquationInput
  makeDrawing: (input: MangopareEquationInput) => LockedPatternDrawing
}>

export const MANGOPARE_DESIGN_VERSIONS = Object.freeze({
  twoFrondsV1: Object.freeze({
    id: 'two-fronds-v1',
    label: '2 fronds',
    sourceContractKey: 'mangopare.four-to-two.experimental.v1',
    defaultInput: MANGOPARE_FOUR_FROND_DEFAULT_INPUT,
    makeDrawing: makeMangopareFourToTwoDrawing,
  } satisfies MangopareDesignVersion),
  twoFrondsReverseV1: Object.freeze({
    id: 'two-fronds-reverse-v1',
    label: '2 fronds · reverse',
    sourceContractKey: 'mangopare.four-to-two.experimental.v1',
    defaultInput: MANGOPARE_FOUR_FROND_DEFAULT_INPUT,
    makeDrawing: makeMangopareFourToTwoDrawing,
  } satisfies MangopareDesignVersion),
  fourFrondsV1: Object.freeze({
    id: 'four-fronds-v1',
    label: '4 fronds',
    sourceContractKey: 'mangopare.four-fronds.experimental.v1',
    defaultInput: MANGOPARE_FOUR_FROND_DEFAULT_INPUT,
    makeDrawing: makeMangopareFourFrondDrawing,
  } satisfies MangopareDesignVersion),
  fourFrondsReverseV1: Object.freeze({
    id: 'four-fronds-reverse-v1',
    label: '4 fronds · reverse',
    sourceContractKey: 'mangopare.four-fronds.experimental.v1',
    defaultInput: MANGOPARE_FOUR_FROND_DEFAULT_INPUT,
    makeDrawing: makeMangopareFourFrondDrawing,
  } satisfies MangopareDesignVersion),
})

export type MangopareDesignVersionId =
  (typeof MANGOPARE_DESIGN_VERSIONS)[keyof typeof MANGOPARE_DESIGN_VERSIONS]['id']

export const MANGOPARE_DESIGN_VERSION_LIST = Object.freeze(
  Object.values(MANGOPARE_DESIGN_VERSIONS),
)

export const DEFAULT_MANGOPARE_DESIGN_VERSION_ID: MangopareDesignVersionId = 'two-fronds-v1'

export function getMangopareDesignVersion(
  id: MangopareDesignVersionId,
): MangopareDesignVersion {
  const version = MANGOPARE_DESIGN_VERSION_LIST.find((candidate) => candidate.id === id)
  if (version == null) throw new Error(`Unknown Mangopare design version: ${id}`)
  return version
}

export function makeMangopareVersionDrawing(
  id: MangopareDesignVersionId,
  input: MangopareEquationInput,
): LockedPatternDrawing {
  const version = getMangopareDesignVersion(id)
  const drawing = version.makeDrawing(input)
  if (drawing.sourceContractKey !== version.sourceContractKey) {
    throw new Error(`Mangopare version ${id} returned the wrong source contract.`)
  }
  return drawing
}
