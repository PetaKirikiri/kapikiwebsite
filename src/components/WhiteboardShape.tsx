import { useEffect, useRef, useState } from 'react'
import { requestRails } from '../lib/connectorPresentation/engine'
import type { compileSentenceMaterial } from '../lib/connectorPresentation/sentenceMaterialGrowth'
import type { SentenceWordPlan } from '../lib/connectorPresentation/sentenceMaterialGrowth'

const compiled = new Map<string, ReturnType<typeof compileSentenceMaterial>>()
export default function WhiteboardShape({ plan, filled = false, growthId, grownAt }: { plan: SentenceWordPlan | null; filled?: boolean; growthId?: string; grownAt?: number }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const [error, setError] = useState('')
  const key = JSON.stringify(plan)
  useEffect(() => {
    const element = canvas.current
    if (!element || !plan) return
    let frame = 0
    try {
      let shape = compiled.get(key)
      if (!shape) { shape = requestRails({ kind: 'material', word: plan }); if (compiled.size > 64) compiled.clear(); compiled.set(key, shape) }
      setError('')
      element.width = shape.width; element.height = shape.height
      const ctx = element.getContext('2d')!
      const full = shape.frame(1)
      const animate = filled && Boolean(growthId) && Date.now() - (grownAt ?? 0) < 10000 && !matchMedia('(prefers-reduced-motion: reduce)').matches
      const start = performance.now()
      const draw = (now: number) => {
        const progress = filled ? animate ? Math.min(1, (now - start) / 2600) : 1 : 0
        const image = shape!.frame(progress)
        for (let i = 3; i < image.data.length; i += 4) image.data[i] = Math.max(full.data[i] * .13, image.data[i])
        ctx.putImageData(image, 0, 0); element.dataset.growthProgress = String(progress)
        if (animate && progress < 1) frame = requestAnimationFrame(draw)
      }
      draw(start)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Shape unavailable') }
    return () => cancelAnimationFrame(frame)
    // Serialized immutable sentence plan owns the complete artwork.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, filled, growthId])
  return <>{error && <span role="alert" className="board-shape-unavailable">{error}</span>}<canvas ref={canvas} className="board-shape-art" role="img" aria-label={filled ? 'Germinated connector shape' : 'Empty connector shape'} data-material-color={plan?.presentation.materialColor} /></>
}
