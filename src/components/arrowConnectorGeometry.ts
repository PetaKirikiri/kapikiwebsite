import { CONNECTOR_GEOMETRY_STANDARD } from './connectorGeometryStandard'

export const ARROW_GEOMETRY_PROVENANCE = 'parametric' as const
export const ARROW_OUTER_TRIANGLE_PATH = 'M32 0 L128 48 L32 96 Z'
export const ARROW_INNER_TRIANGLE_PATH = 'M32 48 L80 24 L80 72 Z'
export const ARROW_BOUNDARY_PATH = `${ARROW_OUTER_TRIANGLE_PATH} ${ARROW_INNER_TRIANGLE_PATH}`
export const ARROW_BACK_CAP_PATH = 'M32 0 V96'

export const ARROW_CONNECTOR_WIDTH = 160
export const ARROW_CONNECTOR_HEIGHT = CONNECTOR_GEOMETRY_STANDARD.frameHeight
export const ARROW_CONNECTOR_NUB_WIDTH = CONNECTOR_GEOMETRY_STANDARD.faceWidth
// The base triangle occupies the complete square: x 32..128 inside the
// 160-unit mirror space. Both directions therefore share the same viewport.
export const ARROW_CONNECTOR_RIGHT_VIEW_LEFT = 32
export const ARROW_CONNECTOR_LEFT_VIEW_LEFT = 32

export type ArrowConnectorPieceKind = 'positive' | 'inverse'
export type ArrowConnectorFace = 'right' | 'left'

export function arrowGeometryMirrored(
  kind: ArrowConnectorPieceKind,
  face: ArrowConnectorFace,
): boolean {
  return kind === 'positive' ? face === 'left' : face === 'right'
}

export function arrowConnectorWidth(displayHeight: number): number {
  return ARROW_CONNECTOR_NUB_WIDTH / ARROW_CONNECTOR_HEIGHT * displayHeight
}

/** Mirroring reverses the point, so the turn must reverse to keep it facing up. */
export function arrowUpRotation(mirrored: boolean, centerX: number): string {
  return `rotate(${mirrored ? 90 : -90} ${centerX} ${ARROW_CONNECTOR_HEIGHT / 2})`
}
