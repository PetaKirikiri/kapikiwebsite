import type { presentSentence } from './engine'
import { CONNECTOR_RAIL_LAYOUT } from './layout'
import type { ConnectorFacePlan } from './presentation'

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
  return { width, height, color, slotWidth: layout.slotWidth, overhang: face / 2, artwork }
}
