import { useEffect, useState, type ReactNode } from 'react'
import kakapo from '../../assets/living-world/kakapo-companion-v2.png'
import './LivingWorld.css'

/** Shared atmosphere and motion preference for the student-facing application. */
export default function LivingWorld({ children }: { children: ReactNode }) {
  const [paused, setPaused] = useState(() => {
    try { return localStorage.getItem('ka-piki:motion:v1') === 'paused' } catch { return false }
  })
  const [hidden, setHidden] = useState(document.hidden)
  useEffect(() => {
    const update = () => setHidden(document.hidden)
    document.addEventListener('visibilitychange', update)
    return () => document.removeEventListener('visibilitychange', update)
  }, [])
  function toggleMotion() {
    setPaused(current => {
      try { localStorage.setItem('ka-piki:motion:v1', current ? 'playing' : 'paused') } catch { /* Preference still works for this visit. */ }
      return !current
    })
  }
  return <div className="ka-living-world" data-motion={paused ? 'paused' : 'playing'} data-hidden={hidden}>
    {children}
    <button className="ka-motion-toggle" type="button" aria-label={paused ? 'Resume ambient motion' : 'Pause ambient motion'} title={paused ? 'Resume ambient motion' : 'Pause ambient motion'} aria-pressed={paused} onClick={toggleMotion}>
      <svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">{paused ? <path d="m7 4 8 6-8 6Z" /> : <><path d="M7 4v12M13 4v12"/><circle cx="10" cy="10" r="9" strokeOpacity=".25" /></>}</svg>
    </button>
  </div>
}

/** Shared illustrated companion; it has no role in grammatical rendering. */
export function KakapoCompanion({ className = '' }: { className?: string }) {
  const [greeting, setGreeting] = useState(false)
  useEffect(() => {
    if (!greeting) return
    const timeout = window.setTimeout(() => setGreeting(false), 1600)
    return () => window.clearTimeout(timeout)
  }, [greeting])
  return <button type="button" className={`ka-companion ${className}${greeting ? ' is-greeting' : ''}`} aria-label="Say kia ora to the kākāpō" title="Kia ora!" onClick={() => setGreeting(true)}>
    <span className="ka-companion-greeting" aria-hidden="true">Kia ora!</span>
    <span className="ka-companion-body"><img className="ka-creature" src={kakapo} alt="" width="1024" height="1024" draggable={false} /></span>
  </button>
}
