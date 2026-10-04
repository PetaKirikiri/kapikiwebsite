import { useEffect, useMemo, useRef } from 'react'
import { useDesignSpaceCollection } from './useDesignSpaceCollection'
import { useConnectorPatterns } from '../hooks/useConnectorPatterns'
import { compileConnectorLibrary } from '../lib/connectorPresentation/blueprints'
import { requestRails } from '../lib/connectorPresentation/engine'

export default function NavigationRail({ onComplete, leftWord, onLeftReveal, noun = false }: { onComplete?: () => void; leftWord?: string; onLeftReveal?: (left: number) => void; noun?: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const leftCanvas = useRef<HTMLCanvasElement>(null)
  const reveal = useRef(onLeftReveal)
  useEffect(() => { reveal.current = onLeftReveal }, [onLeftReveal])
  const completion = useRef(onComplete)
  const completed = useRef(false)
  useEffect(() => { completion.current = onComplete }, [onComplete])
  const startedAt = useRef<number | null>(null)
  const { collection } = useDesignSpaceCollection({ production: true })
  const { rules } = useConnectorPatterns()
  const library = useMemo(() => compileConnectorLibrary(collection), [collection])
  useEffect(() => {
    const node = canvas.current
    if (!node) return
    let frame = 0
    let previousWidth = 0
    const draw = () => {
      const width = node.getBoundingClientRect().width
      if (!width || width === previousWidth) return
      previousWidth = width
      cancelAnimationFrame(frame)
      const context = node.getContext('2d')!
      const prefix = leftCanvas.current
      let prefixWidth = 0
      if (leftWord && prefix) {
        const style = getComputedStyle(node.closest('a')!)
        context.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`
        prefixWidth = Math.ceil(context.measureText(leftWord + ' ').width)
      }
      const plan = requestRails({ kind: 'navigation', library, rules, noun, width, prefixWidth })
      if (!plan) return
      node.width = plan.width; node.height = plan.height
      if (prefix && plan.prefix) {
        prefix.width = plan.prefix.width; prefix.height = plan.prefix.height
        Object.assign(prefix.style, plan.prefix.style)
      }
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      // Refreshes and resize redraws retain this click's progress, never replay it.
      const start = startedAt.current ?? performance.now()
      startedAt.current = start
      const tick = (now: number) => {
        const result = plan.frame(now - start, reduced)
        context.putImageData(result.image, 0, 0)
        if (result.anchorComplete && !completed.current) { completed.current = true; completion.current?.() }
        if (result.prefixImage && prefix) {
          prefix.getContext('2d')!.putImageData(result.prefixImage, 0, 0)
          reveal.current?.(result.reveal)
        }
        if (!result.complete) frame = requestAnimationFrame(tick)
      }
      tick(performance.now())
    }
    const observer = new ResizeObserver(draw)
    observer.observe(node)
    return () => { observer.disconnect(); cancelAnimationFrame(frame) }
  }, [library, rules, noun, leftWord])
  return <span className="site-nav-rail" aria-hidden="true">
    <canvas ref={canvas} style={{ width: '100%', height: 14, display: 'block' }} />
    {leftWord ? <canvas ref={leftCanvas} style={{ position: 'absolute', top: 0, height: 14, pointerEvents: 'none' }} /> : null}
  </span>
}
