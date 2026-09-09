import { CONNECTOR_GEOMETRY_STANDARD } from './frame'

const storyHeight = 18
const connectionWidth = CONNECTOR_GEOMETRY_STANDARD.faceWidth / CONNECTOR_GEOMETRY_STANDARD.frameHeight * storyHeight
const visibleBlockGap = 9

/** Shared physical layout for every consumer, independent of React and the DOM. */
export const CONNECTOR_RAIL_LAYOUT = Object.freeze({
  storyHeight,
  connectionWidth,
  seamBleed: 0.5,
  centerOffset: 14,
  // A disconnected sender occupies half a face beyond its material boundary.
  // Reserve that half-face plus an actual visible gap before the next block.
  wordGap: connectionWidth / 2 + visibleBlockGap,
  textGap: 4,
  minimumStemWidth: 2,
})

/** Adjacent words share one boundary frame. The sender's right anchor and
 * receiver's left anchor are identical in sentence coordinates. Every outgoing
 * face sits at the word cell boundary. Text is centred within its own material,
 * never within a region borrowed from the neighbouring word.
 */
export function planWordLayout(
  measuredTextWidth: number,
  hasNextWord = true,
  rightEnd?: 'send' | 'accept' | 'cap' | null,
  rightRail?: 'green' | 'yellow' | 'off' | null,
  presentation?: { standalone?: boolean; separateAfter?: boolean; flatEnding?: boolean; face?: unknown; incomingJoin?: unknown },
) {
  // Faces are centred on shared word boundaries and may extend into both
  // neighbouring materials. Do not make a short word reserve a complete face:
  // that detached the visible connector from words such as `i`.
  const minimumWidth = presentation?.standalone ? connectionWidth
    : presentation?.face && presentation?.incomingJoin ? connectionWidth + CONNECTOR_RAIL_LAYOUT.minimumStemWidth
    : CONNECTOR_RAIL_LAYOUT.minimumStemWidth
  const textWidth = Number.isFinite(measuredTextWidth) ? Math.max(0, measuredTextWidth) : 0
  const slotWidth = Math.max(minimumWidth, textWidth + CONNECTOR_RAIL_LAYOUT.textGap)
  const joinsNext = hasNextWord
    && !presentation?.separateAfter
    // Participant markers are structurally attached to the noun phrase they
    // introduce. A stale/off saved rail must not open a visual gap between the
    // fixed marker face and that following material.
    && (presentation?.standalone === true || rightRail !== 'off')
    && (rightEnd === 'send' || rightEnd === 'accept')
  // A standalone terminal already keeps its whole face inside its own word
  // slot, so it only needs the visible inter-section gap. Reserving another
  // half-face here makes negative sections look detached from what follows.
  const gapAfter = joinsNext ? 0
    : presentation?.flatEnding || (presentation?.standalone && presentation.separateAfter)
      ? visibleBlockGap
      : CONNECTOR_RAIL_LAYOUT.wordGap
  // A fixed-width participant face must end exactly at the noun-side edge of
  // its word cell. Centring it leaves a visible hole after wider markers such
  // as `Mā`, even though the two cells themselves have no margin.
  const connectorCenter = presentation?.standalone
    ? Math.max(connectionWidth / 2, slotWidth - connectionWidth / 2)
    : slotWidth
  const leftConnectorCenter = 0
  const blockLeft = 0
  // Material ownership changes at the shared anchor, underneath the complete
  // saved join. Neither material can leak beyond its side of the join frame.
  const blockWidth = connectorCenter - blockLeft
  return {
    minimumWidth, slotWidth, blockWidth, blockLeft,
    textPadding: CONNECTOR_RAIL_LAYOUT.textGap / 2,
    connectorCenter,
    leftConnectorCenter,
    joinsNext,
    textAlign: 'center' as const,
    gapAfter,
  }
}

export type MeasuredWord = Readonly<{ left: number; top: number; textWidth: number }>
export type RailSpan = Readonly<{
  outgoingWidth: number
  continuation: Readonly<{ left: number; top: number; width: number }> | null
}>

/** Receives measured browser positions; wrapping geometry remains engine-owned. */
export function planRailSpan(left: MeasuredWord, right: MeasuredWord, contentLeft: number, contentRight: number): RailSpan {
  const leftCenter = left.left + planWordLayout(left.textWidth).connectorCenter
  const rightCenter = right.left + planWordLayout(right.textWidth).connectorCenter
  const sameRow = Math.abs(left.top - right.top) < 2
  return {
    outgoingWidth: Math.max(0, sameRow ? rightCenter - leftCenter : contentRight - leftCenter),
    continuation: sameRow ? null : {
      left: contentLeft - left.left,
      top: right.top - left.top + CONNECTOR_RAIL_LAYOUT.centerOffset,
      width: Math.max(0, rightCenter - contentLeft),
    },
  }
}
