import { useEffect, useMemo, useRef } from 'react'
import { useDesignSpaceCollection } from './useDesignSpaceCollection'
import { useConnectorPatterns } from '../hooks/useConnectorPatterns'
import { compileConnectorLibrary } from '../lib/connectorPresentation/blueprints'
import { effectivePatternFor } from '../lib/connectorPresentation/patterns'
import { planPatternPiece } from '../lib/connectorPresentation/presentation'
import { WORD_CLASS_VISUAL_PALETTE } from './railVisualPalette'
import { composeWholeAnchor } from '../lib/connectorPresentation/wholeAnchorGrowth'
import { compileLeftWordGrowth } from '../lib/connectorPresentation/leftWordGermination'

export default function NavigationRail({ onComplete, leftWord, onLeftReveal, noun = false }: { onComplete?: () => void; leftWord?: string; onLeftReveal?: (left: number) => void; noun?: boolean }) {
  const anchorColor = noun ? WORD_CLASS_VISUAL_PALETTE.noun : WORD_CLASS_VISUAL_PALETTE.verb
  // Navigation-only contrast adjustment for the dark header surface.
  const prefixColor = noun ? '#49a078' : WORD_CLASS_VISUAL_PALETTE.tam
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
  const plans = useMemo(() => {
    const library = compileConnectorLibrary(collection)
    const pattern = effectivePatternFor(noun ? 'common_noun' : 'intransitive_verb', noun ? 'noun' : 'verb', rules)
    if (!pattern) return null
    return {
      left: planPatternPiece(library, pattern.left, 'left', anchorColor),
      right: planPatternPiece(library, pattern.right, 'right', anchorColor),
    }
  }, [collection, rules, noun, anchorColor])
  useEffect(() => {
    const node = canvas.current
    if (!node || !plans || plans.left.status !== 'ready' || plans.right.status !== 'ready') return
    let frame = 0
    let previousWidth = 0
    const draw = () => {
      const width = node.getBoundingClientRect().width
      if (!width || width === previousWidth) return
      previousWidth = width
      cancelAnimationFrame(frame)
      const plate = composeWholeAnchor(plans.left, plans.right, anchorColor, true, Math.max(1, Math.round(width * 40 / 14 - 80)))
      node.width = plate.width
      node.height = plate.height
      const context = node.getContext('2d')!
      const prefix = leftCanvas.current
      let leftPlan: ReturnType<typeof compileLeftWordGrowth> | null = null
      let prefixWidth = 0
      if (leftWord && prefix) {
        const label = node.closest('a')!
        const style = getComputedStyle(label)
        context.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`
        prefixWidth = Math.ceil(context.measureText(leftWord + ' ').width)
        leftPlan = compileLeftWordGrowth({ anchorLeft: plans.left, anchorColor, color: prefixColor, bodyWidth: prefixWidth * 40 / 14 })
        prefix.width = leftPlan.width; prefix.height = leftPlan.height
        prefix.style.width = `${leftPlan.width / 3 * 14 / 40}px`
        prefix.style.left = `${-prefixWidth}px`
      }
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      // Refreshes and resize redraws retain this click's progress, never replay it.
      const start = startedAt.current ?? performance.now()
      startedAt.current = start
      const tick = (now: number) => {
        const progress = reduced ? 1 : Math.min(1, (now - start) / 1000)
        context.putImageData(plate.frame(progress), 0, 0)
        if (progress >= 1 && !completed.current) { completed.current = true; completion.current?.() }
        const leftProgress = reduced ? 1 : Math.max(0, Math.min(1, (now - start - 1000) / 850))
        if (leftPlan && prefix) {
          prefix.getContext('2d')!.putImageData(leftPlan.frame(leftProgress), 0, 0)
          reveal.current?.(Math.min(100, leftPlan.textLeft(leftProgress) * 14 / 40 / prefixWidth * 100))
        }
        if (progress < 1 || (leftPlan && leftProgress < 1)) frame = requestAnimationFrame(tick)
      }
      tick(performance.now())
    }
    const observer = new ResizeObserver(draw)
    observer.observe(node)
    return () => { observer.disconnect(); cancelAnimationFrame(frame) }
  }, [plans, leftWord, anchorColor, prefixColor])
  return <span className="site-nav-rail" aria-hidden="true">
    <canvas ref={canvas} style={{ width: '100%', height: 14, display: 'block' }} />
    {leftWord ? <canvas ref={leftCanvas} style={{ position: 'absolute', top: 0, height: 14, pointerEvents: 'none' }} /> : null}
  </span>
}
