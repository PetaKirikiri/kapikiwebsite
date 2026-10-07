import { useContext, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import spriteAtlas from '../../assets/living-world/ruru-guardian-atlas-v1.png'
import { CompanionStateContext, useCompanionReaction } from './companionContext'
import { blink, companionFrames, companionGesture, companionOffsets, playCompanionSequence, type CompanionPose } from './companionMotion'
import './ForestCompanion.css'

/** Shared behaviour and artwork for the companion across learning surfaces. */
export default function ForestCompanion({ className = '', dockOnScroll = false }: { className?: string; dockOnScroll?: boolean }) {
  const { cue, motionAllowed } = useContext(CompanionStateContext)
  const react = useCompanionReaction()
  const home = useRef<HTMLSpanElement>(null)
  const [onScreen, setOnScreen] = useState(true)
  const [pose, setPose] = useState<CompanionPose>('rest')
  const [greeting, setGreeting] = useState(false)
  const [imageFailed, setImageFailed] = useState(false)
  const [imageReady, setImageReady] = useState(false)
  const docked = dockOnScroll && !onScreen
  const playing = motionAllowed && (onScreen || docked) && imageReady && !imageFailed

  useEffect(() => {
    const anchor = home.current
    if (!anchor || typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(([entry]) => setOnScreen(entry.isIntersecting), { threshold: .15 })
    observer.observe(anchor)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!playing) return
    let idleTimer: ReturnType<typeof setTimeout>
    let cancelSequence = () => {}
    let idleCount = 0
    const scheduleIdle = () => {
      idleTimer = setTimeout(() => {
        idleCount++
        const beats = idleCount % 3 === 0 ? companionGesture(idleCount % 2 ? 'look-left' : 'look-right') : blink
        cancelSequence = playCompanionSequence(beats, setPose, scheduleIdle)
      }, 2600 + Math.random() * 3000)
    }
    if (cue && Date.now() - cue.createdAt < 2000) {
      cancelSequence = playCompanionSequence(companionGesture(cue.action), setPose, scheduleIdle)
    } else {
      cancelSequence = playCompanionSequence([{ pose: 'rest', duration: 1 }], setPose, scheduleIdle)
    }
    return () => { clearTimeout(idleTimer); cancelSequence() }
  }, [cue, playing])

  useEffect(() => {
    if (!greeting) return
    const timer = setTimeout(() => setGreeting(false), 1800)
    return () => clearTimeout(timer)
  }, [greeting])

  const frame = companionFrames[playing ? pose : 'rest']
  const offset = companionOffsets[frame]
  // The spread wings need the full atlas region, including the margin before the last cell.
  const backgroundX = frame === 5 ? 98.05 : (frame % 3) * 50
  const companion = !imageFailed && <button type="button" className={`ka-companion ka-companion-animated${docked ? ' is-docked' : ''}${greeting ? ' is-greeting' : ''}`} aria-label="Say kia ora to the ruru" aria-hidden={docked || undefined} tabIndex={docked ? -1 : 0} title="Kia ora!" data-pose={playing ? pose : 'rest'} data-motion={playing ? 'playing' : 'paused'} onClick={() => { setGreeting(true); react('welcome') }}>
    <span className="ka-guardian-aura" aria-hidden="true" />
    <span className="ka-companion-greeting" aria-hidden="true">Kia ora!</span>
    <img className="ka-sprite-preload" src={spriteAtlas} alt="" onLoad={() => setImageReady(true)} onError={() => setImageFailed(true)} />
    <span className="ka-companion-sprite" aria-hidden="true" style={{ backgroundImage: `url(${spriteAtlas})`, backgroundPosition: `${backgroundX}% ${frame < 3 ? 0 : 100}%`, transform: `translate(${offset.x}%, ${offset.y}%)`, clipPath: frame === 4 ? 'inset(0 8% 0 0)' : undefined }} />
    <span className="ka-guardian-embers" aria-hidden="true"><i /><i /><i /></span>
  </button>

  return <span ref={home} className={`ka-companion-home ${className}`}>
    {docked ? createPortal(companion, document.body) : companion}
  </span>
}
