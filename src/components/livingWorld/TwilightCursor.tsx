import { useContext, useEffect, useRef } from 'react'
import { CompanionStateContext } from './companionContext'
import feather from '../../assets/cursors/ka-piki.svg'
import './TwilightCursor.css'

type Point = { x: number; y: number; time: number }

/** One pointer wake for the whole teaching surface; no per-control animation code. */
export default function TwilightCursor() {
  const pointer = useRef<HTMLImageElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const { motionAllowed } = useContext(CompanionStateContext)
  useEffect(() => {
    const layer = canvas.current
    const surface = layer?.closest<HTMLElement>('.lesson-workspace')
    const quill = pointer.current
    const context = layer?.getContext('2d')
    if (!layer || !surface || !context || !quill) return
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)')
    const finePointer = window.matchMedia('(pointer: fine)')
    let points: Point[] = []
    let frame = 0
    let angle = 0
    let targetAngle = 0
    let lastMove = 0
    let x = 0
    let y = 0
    const clear = () => {
      cancelAnimationFrame(frame)
      frame = 0
      points = []
      angle = targetAngle = 0
      quill.style.opacity = '0'
      surface.classList.remove('has-twilight-pointer')
      context.clearRect(0, 0, window.innerWidth, window.innerHeight)
    }
    const size = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 2)
      layer.width = window.innerWidth * ratio
      layer.height = window.innerHeight * ratio
      context.setTransform(ratio, 0, 0, ratio, 0, 0)
      clear()
    }
    const draw = (now: number) => {
      frame = 0
      points = points.filter(point => now - point.time < 160)
      context.clearRect(0, 0, window.innerWidth, window.innerHeight)
      if (now - lastMove > 70) targetAngle = 0
      angle += (targetAngle - angle) * .2
      quill.style.transform = `translate3d(${x - 3}px, ${y - 2}px, 0) rotate(${angle}deg)`
      if (points.length > 2) {
        const first = points[0]
        const last = points[points.length - 1]
        const opacity = Math.max(0, 1 - (now - last.time) / 160)
        const ink = context.createLinearGradient(first.x, first.y, last.x + .01, last.y + .01)
        ink.addColorStop(0, 'rgba(168, 185, 222, 0)')
        ink.addColorStop(1, `rgba(182, 222, 233, ${opacity * .28})`)
        context.beginPath()
        context.moveTo(first.x, first.y)
        for (let i = 1; i < points.length - 1; i++) {
          const next = points[i + 1]
          context.quadraticCurveTo(points[i].x, points[i].y, (points[i].x + next.x) / 2, (points[i].y + next.y) / 2)
        }
        context.lineTo(last.x, last.y)
        context.strokeStyle = ink
        context.lineWidth = 1.2
        context.lineCap = 'round'
        context.shadowBlur = 0
        context.stroke()
      }
      if (points.length || Math.abs(angle - targetAngle) > .1) frame = requestAnimationFrame(draw)
    }

    const move = (event: PointerEvent) => {
      if (!motionAllowed || preference.matches || !finePointer.matches || event.pointerType !== 'mouse' || document.hidden || (event.target instanceof Element && event.target.closest('input,textarea,[contenteditable=true],button:disabled'))) { clear(); return }
      const now = performance.now()
      const previous = points.at(-1)
      x = event.clientX
      y = event.clientY
      lastMove = now
      quill.style.opacity = '1'
      surface.classList.add('has-twilight-pointer')
      if (previous) {
        const distance = Math.hypot(x - previous.x, y - previous.y)
        if (distance > 100) points = []
        else {
          targetAngle = Math.max(-14, Math.min(14, (x - previous.x) * .65))
          if (distance < 2) return
        }
      }
      points.push({ x, y, time: now })
      // Bound the wake by travelled distance as well as time, including fast movement.
      let length = 0
      for (let i = points.length - 1; i > 0; i--) {
        length += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y)
        if (length > 65) { points = points.slice(i); break }
      }
      points = points.slice(-14)
      if (!frame) frame = requestAnimationFrame(draw)
    }
    size()
    surface.addEventListener('pointermove', move, { passive: true })
    surface.addEventListener('pointerleave', clear)
    surface.addEventListener('pointerdown', clear)
    window.addEventListener('resize', size)
    window.addEventListener('blur', clear)
    document.addEventListener('visibilitychange', clear)
    preference.addEventListener('change', clear)
    finePointer.addEventListener('change', clear)
    return () => {
      clear()
      surface.removeEventListener('pointermove', move)
      surface.removeEventListener('pointerleave', clear)
      surface.removeEventListener('pointerdown', clear)
      window.removeEventListener('resize', size)
      window.removeEventListener('blur', clear)
      document.removeEventListener('visibilitychange', clear)
      preference.removeEventListener('change', clear)
      finePointer.removeEventListener('change', clear)
    }
  }, [motionAllowed])
  return <><canvas ref={canvas} className="ka-twilight-cursor" aria-hidden="true" /><img ref={pointer} src={feather} className="ka-twilight-feather" alt="" aria-hidden="true" /></>
}
