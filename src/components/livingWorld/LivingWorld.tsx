import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { CompanionActionsContext, CompanionStateContext, type CompanionAction, type CompanionCue } from './companionContext'
export { default as ForestCompanion } from './ForestCompanion'
import './LivingWorld.css'
import './SkyWorld.css'

/** Shared atmosphere and motion preference for the student-facing application. */
export default function LivingWorld({ children }: { children: ReactNode }) {
  const [paused, setPaused] = useState(() => {
    try { return localStorage.getItem('ka-piki:motion:v1') === 'paused' } catch { return false }
  })
  const [hidden, setHidden] = useState(document.hidden)
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  const [cue, setCue] = useState<CompanionCue | null>(null)
  const respond = useCallback((action: CompanionAction) => {
    setCue(previous => ({ action, sequence: (previous?.sequence ?? 0) + 1, createdAt: Date.now() }))
  }, [])
  const companionState = useMemo(() => ({ cue, motionAllowed: !paused && !hidden && !reducedMotion }), [cue, paused, hidden, reducedMotion])
  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReducedMotion(preference.matches)
    preference.addEventListener('change', update)
    return () => preference.removeEventListener('change', update)
  }, [])
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
  return <CompanionActionsContext.Provider value={respond}><CompanionStateContext.Provider value={companionState}><div className="ka-living-world ka-sky-world" data-motion={paused ? 'paused' : 'playing'} data-hidden={hidden}>
    {children}
    <button className="ka-motion-toggle" type="button" aria-label={paused ? 'Resume ambient motion' : 'Pause ambient motion'} title={paused ? 'Resume ambient motion' : 'Pause ambient motion'} aria-pressed={paused} onClick={toggleMotion}>
      <svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">{paused ? <path d="m7 4 8 6-8 6Z" /> : <><path d="M7 4v12M13 4v12"/><circle cx="10" cy="10" r="9" strokeOpacity=".25" /></>}</svg>
    </button>
  </div></CompanionStateContext.Provider></CompanionActionsContext.Provider>
}
