import type { BusManifestPosCatalog } from '../busManifestContract'
import type { ConnectorLibrary } from './blueprints'
import type { PatternRule } from './patterns'
import { planPatternPiece, projectSentenceConnectors } from './presentation'
import { WORD_CLASS_VISUAL_PALETTE } from '../../components/railVisualPalette'

export type PosLegendKind = 'dictionary' | 'broad' | 'specific'

/** A catalog legend, not an annotation or a learned claim about a word.
 * Dictionary labels use their approved mapping only when it is unambiguous;
 * otherwise their catalog family supplies the broad visual.
 */
export function posLegend(code: string, kind: PosLegendKind, catalog: BusManifestPosCatalog,
  library: ConnectorLibrary, rules: readonly PatternRule[]) {
  let pos: string | null = null
  let family: string | undefined
  if (kind === 'specific') {
    const type = catalog.posTypes.find(type => type.posCode === code)
    pos = type?.posCode ?? null
    family = type?.groupCode
  } else if (kind === 'broad') {
    family = catalog.groups.find(group => group.groupCode === code)?.groupCode
  } else {
    family = catalog.dictionaryPosLabels.find(label => label.labelCode === code)?.groupCode
    const mappings = catalog.dictionaryPosMappings.filter(mapping => mapping.labelCode === code)
    if (mappings.length === 1) {
      const type = catalog.posTypes.find(type => type.posCode === mappings[0]!.posCode)
      pos = type?.posCode ?? null
      family = type?.groupCode ?? family
    }
  }
  if (!family) return null
  // One isolated type sample through the shared presentation resolver. Nothing
  // is tagged, inferred, persisted, or added to the word's POS possibilities.
  const previewCode = pos ?? family
  const plan = projectSentenceConnectors([{
    surfaceText: 'POS', tokenIndex: 0, acceptedPosCode: previewCode,
    checkpointState: 'may_end', rightConnectorEnd: 'cap', leftRail: null, rightRail: null,
  }], new Map([[previewCode, family]]), library, rules)[0]!
  const color = plan.materialColor ?? (family === 'particle' ? WORD_CLASS_VISUAL_PALETTE.relationMarker : undefined)
  return color ? { color, face: plan.rightFace
    ? planPatternPiece(library, { blueprintId: plan.rightFace.blueprintId, role: plan.rightFace.role === 'accept' ? 'accept' : 'send' }, 'right', color)
    : null } : null
}
