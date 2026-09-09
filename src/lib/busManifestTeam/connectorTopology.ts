import {
  normalizeGuestSurfaceIdentity,
  type BusManifestRailSetting,
  type BusManifestSheet,
  type LeftConnectorEnd,
  type RightConnectorEnd,
} from '../busManifestContract'

export type ConnectorTopology = {
  readonly leftConnectorEnd: LeftConnectorEnd | null
  readonly leftConnectorFamily: string | null
  readonly rightConnectorEnd: RightConnectorEnd | null
  readonly rightConnectorFamily: string | null
}

export type BlockKnowledge = {
  readonly blockColor: 'yellow' | 'green' | null
  readonly blockType: string | null
}

function ownBlockColor(
  leftRail: BusManifestRailSetting | null,
  rightRail: BusManifestRailSetting | null,
): 'yellow' | 'green' | null {
  if (rightRail === 'yellow' || rightRail === 'green') return rightRail
  if (leftRail === 'yellow' || leftRail === 'green') return leftRail
  return null
}

/**
 * The sole Floor-sequence projection for the connector facts persisted inside
 * learned word conditions and displayed by the sentence renderer.
 */
export function projectConnectorTopology(
  tokens: BusManifestSheet['tokens'],
  familyByOurs: ReadonlyMap<string, string>,
): readonly ConnectorTopology[] {
  return tokens.map((token, tokenIndex) => {
    const previous = tokens[tokenIndex - 1]
    const previousFamily = previous?.acceptedPosCode == null
      ? null
      : familyByOurs.get(previous.acceptedPosCode) ?? null
    const currentFamily = token.acceptedPosCode == null
      ? null
      : familyByOurs.get(token.acceptedPosCode) ?? null
    const leftConnectorEnd = tokenIndex === 0 ? 'none'
      : previous?.rightConnectorEnd === 'send' ? 'accept'
        : previous?.rightConnectorEnd === 'accept' ? 'send'
          : previous?.rightConnectorEnd === 'cap' ? 'none' : null
    const rightConnectorEnd = token.rightConnectorEnd

    return {
      leftConnectorEnd,
      leftConnectorFamily: leftConnectorEnd === 'accept' || leftConnectorEnd === 'send'
        ? previousFamily : null,
      rightConnectorEnd,
      rightConnectorFamily: rightConnectorEnd == null ? null : currentFamily,
    }
  })
}

/** The sole Floor-sequence projection for persisted block colour and type. */
export function projectBlockKnowledge(
  tokens: BusManifestSheet['tokens'],
): readonly BlockKnowledge[] {
  const colors = tokens.map((token) => ownBlockColor(token.leftRail, token.rightRail))
  return tokens.map((_, tokenIndex) => {
    const blockColor = colors[tokenIndex]!
    if (blockColor == null) return { blockColor: null, blockType: null }
    let startIndex = tokenIndex
    while (startIndex > 0 && tokens[startIndex]!.leftRail === blockColor) startIndex -= 1
    return {
      blockColor,
      blockType: normalizeGuestSurfaceIdentity(tokens[startIndex]!.surfaceText),
    }
  })
}

/** Bounds used to colour the exact same rail-defined block that is persisted. */
export function projectedBlockBounds(
  tokens: BusManifestSheet['tokens'],
  tokenIndex: number,
  blockColor: 'yellow' | 'green',
): { readonly start: number; readonly end: number } {
  let start = tokenIndex
  while (start > 0 && tokens[start]!.leftRail === blockColor) start -= 1
  let end = tokenIndex
  while (end < tokens.length - 1 && tokens[end]!.rightRail === blockColor) end += 1
  return { start, end }
}
