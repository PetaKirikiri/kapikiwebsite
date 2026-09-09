import type { LockedPatternDrawing } from './patternDrawingContract'
import { mapLinearPath } from './linearPath'

export const GLOBAL_DESIGN_ROTATION_CONTROL = Object.freeze({
  defaultValue: 0,
  min: -180,
  max: 180,
  step: 5,
})

export const GLOBAL_DESIGN_MOVE_CONTROL = Object.freeze({
  defaultValue: 0,
  min: -48,
  max: 48,
  step: 1,
})

function clean(value: number): number {
  return Number(value.toFixed(3))
}

/** Fit the visible frond's turning points, not its off-frame stem endpoint.
 * The affine fit preserves continuity and maps the arm, crown and shoulder
 * to the left, top and right contacts together. The bottom stays anchored.
 */
export function fitWaveContacts(drawing: LockedPatternDrawing, uniform = false): LockedPatternDrawing {
  const points: number[][] = []
  mapLinearPath(drawing.path, (x, y) => { points.push([x, y]); return [x, y] })
  const [, , width, height] = parseViewBox(drawing.viewBox)
  const left: number[] = [], right: number[] = [], top: number[] = []
  for (let i = 1; i < points.length - 1; i++) {
    const [x, y] = points[i], before = points[i - 1], after = points[i + 1]
    if (y >= 0 && y <= height && x >= -1 && x <= width + 1) {
      if (x <= before[0] && x <= after[0] && (x < before[0] || x < after[0])) left.push(x)
      if (x >= before[0] && x >= after[0] && (x > before[0] || x > after[0])) right.push(x)
    }
    if (x >= 0 && x <= width && y <= before[1] && y <= after[1]
      && (y < before[1] || y < after[1])) top.push(y)
  }
  if (!left.length || !right.length || !top.length) return drawing
  const x0 = Math.min(...left), x1 = Math.max(...right), y0 = Math.min(...top)
  if (x1 <= x0 || y0 >= height) return drawing
  return Object.freeze({ ...drawing, path: mapLinearPath(drawing.path, (x, y) => [
    clean((x - x0) * width / (x1 - x0)),
    clean((y - y0) * (uniform ? width / (x1 - x0) : height / (height - y0))),
  ]) })
}

function parseViewBox(viewBox: string): readonly [number, number, number, number] {
  const values = viewBox.trim().split(/\s+/u).map(Number)
  if (values.length !== 4 || values.some((value) => !Number.isFinite(value))) {
    throw new Error('Global design rotation requires a four-number viewBox.')
  }
  return values as unknown as readonly [number, number, number, number]
}

/** Applies one global equation transform to any locked Design Space source. */
export function rotateLockedPatternDrawing(
  drawing: LockedPatternDrawing,
  rotationDegrees: number,
): LockedPatternDrawing {
  const range = GLOBAL_DESIGN_ROTATION_CONTROL
  if (!Number.isFinite(rotationDegrees)
    || rotationDegrees < range.min
    || rotationDegrees > range.max) {
    throw new Error('Global design rotation is outside its accepted range.')
  }
  if (rotationDegrees === 0) return drawing
  const [x, y, width, height] = parseViewBox(drawing.viewBox)
  const centerX = x + width / 2
  const centerY = y + height / 2
  const radians = rotationDegrees * Math.PI / 180
  const cosine = Math.cos(radians)
  const sine = Math.sin(radians)
  const path = mapLinearPath(drawing.path,
    (rawX, rawY) => {
      const localX = rawX - centerX
      const localY = rawY - centerY
      return [clean(centerX + localX * cosine - localY * sine),
        clean(centerY + localX * sine + localY * cosine)]
    },
  )
  return Object.freeze({ ...drawing, path })
}

/** Mirrors any locked Design Space source across the shared canvas centre line. */
export function flipLockedPatternDrawing(
  drawing: LockedPatternDrawing,
  flipped: boolean,
): LockedPatternDrawing {
  if (!flipped) return drawing
  const [x, , width] = parseViewBox(drawing.viewBox)
  const centerX = x + width / 2
  const path = mapLinearPath(drawing.path, (x, y) => [clean(2 * centerX - x), y])
  return Object.freeze({ ...drawing, path })
}

/** Mirrors any locked Design Space source across the shared horizontal centre line. */
export function flipLockedPatternDrawingVertically(
  drawing: LockedPatternDrawing,
  flipped: boolean,
): LockedPatternDrawing {
  if (!flipped) return drawing
  const [, y, , height] = parseViewBox(drawing.viewBox)
  const centerY = y + height / 2
  const path = mapLinearPath(drawing.path, (x, y) => [x, clean(2 * centerY - y)])
  return Object.freeze({ ...drawing, path })
}

/** Moves the complete locked drawing without changing its source equation or proportions. */
export function moveLockedPatternDrawing(
  drawing: LockedPatternDrawing,
  moveX: number,
  moveY: number,
): LockedPatternDrawing {
  const range = GLOBAL_DESIGN_MOVE_CONTROL
  if (![moveX, moveY].every((value) => Number.isFinite(value)
    && value >= range.min
    && value <= range.max)) {
    throw new Error('Global design movement is outside its accepted range.')
  }
  if (moveX === 0 && moveY === 0) return drawing
  const path = mapLinearPath(drawing.path, (x, y) => [clean(x + moveX), clean(y + moveY)])
  return Object.freeze({ ...drawing, path })
}
