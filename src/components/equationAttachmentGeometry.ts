import { mapLinearPath } from './linearPath'
export type EquationPoint = Readonly<{ x: number; y: number }>

export const EQUATION_ATTACHMENT_GEOMETRY_PROVENANCE = 'parametric' as const

export type EquationAttachmentAnchor = Readonly<{
  point: EquationPoint
  tangent: EquationPoint
}>

export type EquationAttachmentTransform = Readonly<{
  scale: number
  rotationRadians: number
  source: EquationAttachmentAnchor
  target: EquationAttachmentAnchor
  transformPoint: (point: EquationPoint) => EquationPoint
  transformVector: (vector: EquationPoint) => EquationPoint
  transformPath: (path: string) => string
}>

const clean = (value: number): number => Number(value.toFixed(3))

function unit(vector: EquationPoint): EquationPoint {
  const length = Math.hypot(vector.x, vector.y)
  if (!Number.isFinite(length) || length === 0) {
    throw new Error('An equation attachment tangent must have a direction.')
  }
  return Object.freeze({ x: vector.x / length, y: vector.y / length })
}

/**
 * Builds the only transform an equation-owned shape needs in order to attach
 * to another equation-owned shape. The source endpoint is translated onto the
 * target endpoint and its tangent is rotated onto the target tangent.
 */
export function makeEquationAttachmentTransform(
  source: EquationAttachmentAnchor,
  target: EquationAttachmentAnchor,
  scale = 1,
  extraRotationDegrees = 0,
): EquationAttachmentTransform {
  if (!Number.isFinite(scale) || scale <= 0 || !Number.isFinite(extraRotationDegrees)) {
    throw new Error('Equation attachment scale and rotation must be finite.')
  }
  const sourceTangent = unit(source.tangent)
  const targetTangent = unit(target.tangent)
  const rotationRadians = Math.atan2(targetTangent.y, targetTangent.x)
    - Math.atan2(sourceTangent.y, sourceTangent.x)
    + extraRotationDegrees * Math.PI / 180
  const cosine = Math.cos(rotationRadians)
  const sine = Math.sin(rotationRadians)
  const transformPoint = (point: EquationPoint): EquationPoint => {
    const localX = point.x - source.point.x
    const localY = point.y - source.point.y
    return Object.freeze({
      x: target.point.x + scale * (localX * cosine - localY * sine),
      y: target.point.y + scale * (localX * sine + localY * cosine),
    })
  }
  const transformVector = (vector: EquationPoint): EquationPoint => Object.freeze({
    x: vector.x * cosine - vector.y * sine,
    y: vector.x * sine + vector.y * cosine,
  })
  const transformPath = (path: string): string => mapLinearPath(path,
    (x, y) => {
      const transformed = transformPoint({ x, y })
      return [clean(transformed.x), clean(transformed.y)]
    },
  )
  return Object.freeze({
    scale,
    rotationRadians,
    source: Object.freeze({ point: source.point, tangent: sourceTangent }),
    target: Object.freeze({ point: target.point, tangent: targetTangent }),
    transformPoint,
    transformVector,
    transformPath,
  })
}
