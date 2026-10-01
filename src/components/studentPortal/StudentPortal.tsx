import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { interestRegistrationAvailable, submitCourseInterest } from '../../lib/studentPortal/interestSubmission'
import { LANGUAGE_SKILLS, interestRequest, type SkillRatings } from '../../lib/studentPortal/join'
import ministryLogo from '../../assets/ministry-of-education-logo-white.svg'
import { MOE_CLASSES, MOE_COURSE_PRICE, MOE_COURSE_INCLUSIONS } from '../../lib/moeOffer'
import '../SiteIdentity.css'
import './StudentPortal.css'

type Props = { context?: string; level: number; open: boolean; onClose: () => void }
export default function StudentPortal({ context = '', level, open, onClose }: Props) {
  const classDay = context.startsWith('MOE ·') ? MOE_CLASSES.find(day => day.sessions.some(session => session.level === level)) : undefined
  const selectedClass = classDay?.sessions.find(session => session.level === level)
  const dialog = useRef<HTMLDialogElement>(null)
  const submitting = useRef(false)
  const [ratings, setRatings] = useState<SkillRatings>({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  useEffect(() => {
    if (open && !dialog.current?.open) dialog.current?.showModal()
    if (!open && dialog.current?.open) dialog.current.close()
  }, [open])
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting.current || notice) return
    if (!interestRegistrationAvailable) { setError('Interest registration is not available yet. Please try again later.'); return }
    const form = new FormData(event.currentTarget)
    let request: ReturnType<typeof interestRequest>
    try { request = interestRequest(form, ratings, level, context) }
    catch (error) { setError(error instanceof Error ? error.message : 'Please check your details.'); return }
    submitting.current = true
    setBusy(true); setError(''); setNotice('')
    try {
      await submitCourseInterest(request)
      setNotice('Thanks—your interest has been registered. We’ll be in touch about the course.')
    } catch { setError('We couldn’t confirm your registration. Your details are still here. Please try again.') }
    finally { submitting.current = false; setBusy(false) }
  }
  return <dialog ref={dialog} className="student-portal portal-auth-dialog" onCancel={onClose} onClose={onClose} aria-labelledby="portal-title">
    <header className="portal-header site-card-cover">
      <div className="portal-header-content">
        {selectedClass ? <img className="portal-ministry-logo" src={ministryLogo} width={200} height={58} alt="Te Tāhuhu o te Mātauranga | Ministry of Education" /> : <span className="portal-brand">KA PIKI</span>}
        <h2 id="portal-title">{selectedClass?.title ?? `Level ${level}`}</h2>
        {selectedClass && classDay ? <div className="portal-class-details">
          <strong>{classDay.day} · {selectedClass.time}</strong>
          <span>Starts {classDay.startDate} 2026</span>
          <span className="portal-class-meta">Live online · New Zealand time</span>
          <strong className="portal-course-price">{MOE_COURSE_PRICE}</strong>
          <span>Same price for every course.</span>
          <span className="portal-class-meta">{MOE_COURSE_INCLUSIONS}</span>
        </div> : context ? <p>{context}</p> : null}
      </div>
      <button type="button" className="portal-close" onClick={onClose} aria-label="Close interest form">✕</button>
    </header>
    <div className="portal-auth">
      {notice ? <div role="status" className="portal-message"><p>{notice}</p><p>This records your interest; your class place is not yet confirmed.</p><button type="button" onClick={onClose}>Done</button></div> : <form onSubmit={submit} className="portal-form" aria-busy={busy}>
        <label><span className="portal-field-heading">Your name<small>Required</small></span><input name="name" autoComplete="name" required maxLength={160} /></label>
        <label><span className="portal-field-heading">Email<small>Required</small></span><input name="email" type="email" autoComplete="email" required maxLength={320} /></label>
        {selectedClass && <label><span className="portal-field-heading">Department / group<small>Required</small></span><input name="department_group" required maxLength={160} /></label>}
        <details className="portal-join-optional"><summary>Your learning <span>Optional</span></summary>
          <label>What would you like to learn?<textarea name="goals" maxLength={3000 - (context ? context.length + 2 : 0)} rows={2} /></label>
          <div className="portal-rating-heading"><span>Your confidence</span><small>1 · Starting out &nbsp; 5 · Confident</small></div>
          <div className="portal-skill-ratings">{LANGUAGE_SKILLS.map(skill => <div className="portal-skill-row" key={skill} role="group" aria-label={`${skill} self-rating, optional`}>
            <span>{skill}</span><div className="portal-rating-options">{[1, 2, 3, 4, 5].map(score => <button key={score} type="button" aria-label={`${skill}: ${score} out of 5`} aria-pressed={ratings[skill] === score} onClick={() => setRatings(current => { const next = { ...current }; if (next[skill] === score) delete next[skill]; else next[skill] = score; return next })}>{score}</button>)}</div>
          </div>)}</div><small>Leave any blank. Tap a selected score to clear it.</small>
        </details>
        <button className="portal-primary" disabled={busy || !!notice || !interestRegistrationAvailable}>{busy ? 'Sending…' : 'Register interest'}</button>
        {!interestRegistrationAvailable && <p role="alert" className="portal-error">Interest registration is temporarily unavailable. Please try again later.</p>}
      </form>}
    </div>
    {error && <p role="alert" className="portal-error">{error}</p>}
  </dialog>
}
