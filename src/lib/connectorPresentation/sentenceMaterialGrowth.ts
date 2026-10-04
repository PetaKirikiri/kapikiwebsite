import type { presentSentence } from './engine'
import { CONNECTOR_RAIL_LAYOUT } from './layout'
import type { ConnectorFacePlan } from './presentation'
import { germinatePlate } from './plateGermination'
import { platePaintArrival } from './platePaintArrival'

export type SentenceWordPlan = ReturnType<typeof presentSentence>['words'][number]

/** Paint one material from the sentence engine's measured cell and saved joins.
 * Neighbour colours are omitted, leaving exactly the complementary space for
 * the neighbouring draggable material. No inspection-shape composition. */
export function compileSentenceMaterial(word: SentenceWordPlan) {
  const { presentation: p, layout } = word
  const color = p.materialColor
  if (!color) throw new Error('This word has no approved material.')
  const ownedColors = [color, p.internalMaterial?.color].filter((value): value is string => Boolean(value))
  const scale = 4, h = CONNECTOR_RAIL_LAYOUT.storyHeight, face = CONNECTOR_RAIL_LAYOUT.connectionWidth
  const width = Math.ceil((layout.slotWidth + face) * scale), height = h * scale
  const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height
  const ctx = canvas.getContext('2d')!
  ctx.scale(scale, scale); ctx.translate(face / 2, 0)
  if (p.paintMaterial) { ctx.fillStyle = p.materialBackground ?? color; ctx.fillRect(layout.blockLeft, 0, layout.blockWidth, h) }
  if (p.internalMaterial) {
    ctx.fillStyle = p.internalMaterial.color
    ctx.fillRect(layout.blockWidth * p.internalMaterial.fraction, 0, layout.blockWidth * (1 - p.internalMaterial.fraction), h)
  }
  const paint = (plan: ConnectorFacePlan | null, center: number) => {
    if (!plan) return
    if (plan.status !== 'ready') throw new Error(plan.reason)
    const x = center - face / 2
    const tile = document.createElement('canvas')
    tile.width = Math.round(face * scale); tile.height = height
    const tileContext = tile.getContext('2d')!
    if (ownedColors.includes(plan.background)) { tileContext.fillStyle = plan.background; tileContext.fillRect(0, 0, tile.width, tile.height) }
    const [vx, vy, vw, vh] = plan.drawing.viewBox.split(/\s+/).map(Number)
    tileContext.scale(tile.width / vw, tile.height / vh); tileContext.translate(-vx, -vy)
    tileContext.globalCompositeOperation = ownedColors.includes(plan.drawing.drawing.fill) ? 'source-over' : 'destination-out'
    tileContext.fillStyle = plan.drawing.drawing.fill; tileContext.fill(new Path2D(plan.drawing.path))
    ctx.clearRect(x, 0, face, h)
    ctx.drawImage(tile, x, 0, face, h)
  }
  paint(p.incomingJoin, layout.leftConnectorCenter)
  paint(p.face, layout.connectorCenter)
  if (p.internalMaterial) paint(p.internalMaterial.face, layout.blockWidth * p.internalMaterial.fraction)
  const artwork = ctx.getImageData(0, 0, width, height)
  const mask = new Uint8ClampedArray(artwork.data)
  for (let i = 3; i < mask.length; i += 4) mask[i] = mask[i] > 0 ? 255 : 0
  // Source rasterisation can leave isolated antialias pixels along a saved
  // curl. Only connected solid material drives growth; the existing paint
  // arrival pass restores those exact edge pixels without new growth seeds.
  const seen = new Uint8Array(width * height)
  let main: number[] = []
  for (let start = 0; start < seen.length; start++) {
    if (seen[start] || !mask[start * 4 + 3]) continue
    const cells = [start]; seen[start] = 1
    for (let head = 0; head < cells.length; head++) {
      const at = cells[head], x = at % width, y = Math.floor(at / width)
      for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
        const xx = x + dx, yy = y + dy, next = yy * width + xx
        if (xx < 0 || xx >= width || yy < 0 || yy >= height || seen[next] || !mask[next * 4 + 3]) continue
        seen[next] = 1; cells.push(next)
      }
    }
    if (cells.length > main.length) main = cells
  }
  for (let i = 3; i < mask.length; i += 4) mask[i] = 0
  for (const i of main) mask[i * 4 + 3] = 255
  const flow = germinatePlate(mask, width, height, { x: (face / 2 + layout.slotWidth / 2) * scale, y: height - 1 })
  const paintTime = platePaintArrival(artwork.data, width, height, flow.distances)
  return { width, height, color, slotWidth: layout.slotWidth, overhang: face / 2,
    frame(progress: number) {
      const output = new ImageData(new Uint8ClampedArray(artwork.data), width, height)
      if (progress >= 1) return output
      const reached = Math.max(0, progress) * (paintTime.maximum + 2)
      for (let i = 0; i < width * height; i++) output.data[i * 4 + 3] *= Math.max(0, Math.min(1, (reached - paintTime.distances[i]) / 2))
      return output
    },
  }
}
