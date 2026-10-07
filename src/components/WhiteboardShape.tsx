import { useEffect, useRef, useState } from 'react'
import { requestRails } from '../lib/connectorPresentation/engine'
import type { SentenceWordPlan } from '../lib/connectorPresentation/sentenceMaterialGrowth'

export default function WhiteboardShape({ plan, filled = false, growthId, onComplete }: { plan: SentenceWordPlan | null; filled?: boolean; growthId?: string; grownAt?: number; onComplete?: () => void }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const [error, setError] = useState('')
  const complete = useRef(onComplete)
  complete.current = onComplete
  const key = JSON.stringify(plan)
  useEffect(() => {
    const element = canvas.current
    if (!element || !plan) return
    let frame = 0
    try {
      const playback = requestRails({ kind: 'germination', sentence: { words: [plan], groups: [[0]] } })
      setError('')
      element.width = playback.groups[0].width; element.height = playback.groups[0].height
      const ctx = element.getContext('2d')!
      const reduced = !growthId || matchMedia('(prefers-reduced-motion: reduce)').matches
      const start = performance.now()
      const draw = (now: number) => {
        const state = playback.frame(now - start, reduced, !filled)
        ctx.putImageData(state.groups[0].image, 0, 0)
        if (state.complete) complete.current?.()
        if (filled && !state.complete) frame = requestAnimationFrame(draw)
      }
      draw(start)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Shape unavailable') }
    return () => cancelAnimationFrame(frame)
    // Serialized immutable sentence plan owns the complete artwork.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, filled, growthId])
  return <>{error && <span role="alert" className="board-shape-unavailable">{error}</span>}<canvas ref={canvas} className="board-shape-art" role="img" aria-label={filled ? 'Germinated connector shape' : 'Empty connector shape'} data-material-color={plan?.presentation.materialColor} /></>
}
