/**
 * One canonical physical frame for every connector motif.
 * Motifs may change inside this frame; the rail-facing crop and stem do not.
 */
export { CONNECTOR_GEOMETRY_STANDARD } from '../lib/connectorPresentation/frame'
import { CONNECTOR_GEOMETRY_STANDARD } from '../lib/connectorPresentation/frame'

export const CONNECTOR_STEM_TOP =
  CONNECTOR_GEOMETRY_STANDARD.centreY - CONNECTOR_GEOMETRY_STANDARD.stemThickness / 2
export const CONNECTOR_STEM_BOTTOM =
  CONNECTOR_GEOMETRY_STANDARD.centreY + CONNECTOR_GEOMETRY_STANDARD.stemThickness / 2

export function connectorStemPath(startX: number): string {
  return [
    `M${startX} ${CONNECTOR_STEM_TOP}`,
    `H${CONNECTOR_GEOMETRY_STANDARD.stemEndX}`,
    `V${CONNECTOR_STEM_BOTTOM}`,
    `H${startX}`,
    'Z',
  ].join(' ')
}

export function connectorStemFromLeftPath(endX: number): string {
  return [
    `M0 ${CONNECTOR_STEM_TOP}`,
    `H${endX}`,
    `V${CONNECTOR_STEM_BOTTOM}`,
    'H0',
    'Z',
  ].join(' ')
}
