import { useEffect, useRef } from 'react'
import { composeWholeAnchor } from '../lib/connectorPresentation/wholeAnchorGrowth'
import type { planTeachingShape } from '../lib/connectorPresentation/teachingShapes'

type Plan = ReturnType<typeof planTeachingShape>
const compiled = new Map<string, ReturnType<typeof composeWholeAnchor>>()
export default function WhiteboardShape({ plan, filled = false, growthId, grownAt }: { plan: Plan; filled?: boolean; growthId?: string; grownAt?: number }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const key = JSON.stringify(plan)
  const ready = plan?.left.status === 'ready' && plan.right.status === 'ready'
  useEffect(() => {
    const element = canvas.current
    if (!element || !plan || !ready) return
    let shape = compiled.get(key)
    try {
      if (!shape) {
        shape = composeWholeAnchor(plan.left, plan.right, plan.color, true)
        if (compiled.size > 20) compiled.clear()
        compiled.set(key, shape)
      }
    } catch {
      element.dataset.error = 'Shape unavailable'
      return
    }
    element.width = shape.width; element.height = shape.height
    const ctx = element.getContext('2d')!
    const full = new ImageData(new Uint8ClampedArray(shape.frame(1).data), shape.width, shape.height)
    const ghost = new ImageData(new Uint8ClampedArray(full.data), shape.width, shape.height)
    for (let i = 3; i < ghost.data.length; i += 4) ghost.data[i] *= .16
    const animate = filled && Boolean(growthId) && Date.now() - (grownAt ?? 0) < 10000 && !matchMedia('(prefers-reduced-motion: reduce)').matches
    let frame = 0
    const start = performance.now()
    const draw = (now: number) => {
      const progress = filled ? animate ? Math.min(1, (now - start) / 1800) : 1 : 0
      const growing = shape!.frame(progress)
      const image = new ImageData(new Uint8ClampedArray(growing.data), shape!.width, shape!.height)
      for (let i = 3; i < image.data.length; i += 4) image.data[i] = Math.max(ghost.data[i], image.data[i])
      ctx.putImageData(image, 0, 0)
      element.dataset.growthProgress = String(progress)
      if (animate && progress < 1) frame = requestAnimationFrame(draw)
    }
    draw(start)
    return () => cancelAnimationFrame(frame)
    // The immutable serialized plans own all drawing fields.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, filled, growthId, ready])
  if (!ready) return <span className="board-shape-unavailable">Shape unavailable</span>
  return <canvas ref={canvas} className="board-shape-art" role="img" aria-label={filled ? 'Germinated connector shape' : 'Empty connector shape'} />
}
