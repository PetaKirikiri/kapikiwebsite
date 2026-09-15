import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { studentClient as db, errorMessage } from '../../lib/studentPortal/client'
import { LANGUAGE_SKILLS, interestRequest, type SkillRatings } from '../../lib/studentPortal/join'
import './StudentPortal.css'

type Props = { level: number; open: boolean; onClose: () => void }
export default function StudentPortal({ level, open, onClose }: Props) {
  const dialog = useRef<HTMLDialogElement>(null)
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
    if (!db) { setError('Interest registration is not available yet. Please try again later.'); return }
    const form = new FormData(event.currentTarget)
    setBusy(true); setError(''); setNotice('')
    try {
      const { error } = await db.from('kp_course_interest').insert(interestRequest(form, ratings, level))
      if (error) throw error
      setNotice('Thanks—your interest has been registered. We’ll be in touch about the course.')
    } catch (error) { setError(errorMessage(error)) } finally { setBusy(false) }
  }
  return <dialog ref={dialog} className="student-portal portal-auth-dialog" onCancel={onClose} onClose={onClose} aria-labelledby="portal-title">
    <header className="portal-header"><div><h2 id="portal-title">{`Interest in Level ${level}`}</h2></div><button type="button" onClick={onClose} aria-label="Close interest form">✕</button></header>
    <div className="portal-auth">
      <form onSubmit={submit} className="portal-form">
        <label><span className="portal-field-heading">Your name<small>Required</small></span><input name="name" autoComplete="name" required maxLength={160} /></label>
        <label><span className="portal-field-heading">Email<small>Required</small></span><input name="email" type="email" autoComplete="email" required /></label>
        <section className="portal-join-optional" aria-labelledby="portal-optional-title"><div className="portal-optional-heading"><h3 id="portal-optional-title">Your learning</h3><span>Optional</span></div>
          <label>What would you like to learn?<textarea name="goals" maxLength={3000} rows={2} /></label>
          <div className="portal-rating-heading"><span>Your confidence</span><small>1 · Starting out &nbsp; 5 · Confident</small></div>
          <div className="portal-skill-ratings">{LANGUAGE_SKILLS.map(skill => <div className="portal-skill-row" key={skill} role="group" aria-label={`${skill} self-rating, optional`}>
            <span>{skill}</span><div className="portal-rating-options">{[1, 2, 3, 4, 5].map(score => <button key={score} type="button" aria-label={`${skill}: ${score} out of 5`} aria-pressed={ratings[skill] === score} onClick={() => setRatings(current => { const next = { ...current }; if (next[skill] === score) delete next[skill]; else next[skill] = score; return next })}>{score}</button>)}</div>
          </div>)}</div><small>Leave any blank. Tap a selected score to clear it.</small>
        </section>
        <button className="portal-primary" disabled={busy || !!notice || !db}>{busy ? 'Sending…' : 'Register interest'}</button>
        <small>An expression of interest only. No account or commitment.</small>
      </form>
    </div>
    {error && <p role="alert" className="portal-error">{error}</p>}{notice && <p role="status" className="portal-message">{notice}</p>}
  </dialog>
}
