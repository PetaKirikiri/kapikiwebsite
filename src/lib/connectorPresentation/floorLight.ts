import { germinatePlate } from './plateGermination'

/** Decorative floor lighting; never used as grammatical rail germination. */
export function floorLightPlan() {
  const width = 240, height = 180
  const plate = new Uint8ClampedArray(width * height * 4)
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    if (((x - 120) / 95) ** 2 + ((y - 133) / 28) ** 2 <= 1) plate[(y * width + x) * 4 + 3] = 255
  }
  return { width, height, plate, growth: germinatePlate(plate, width, height, { x: 120, y: 133 }) }
}
