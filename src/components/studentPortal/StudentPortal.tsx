import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import type { User } from '@supabase/supabase-js'
import { studentClient as db, errorMessage } from '../../lib/studentPortal/client'
import { LANGUAGE_SKILLS, emailJoinRequest, type SkillRatings } from '../../lib/studentPortal/join'
import StudentWorkspace from './StudentWorkspace'
import './StudentPortal.css'

type Props = { level: number; open: boolean; onClose: () => void }
export default function StudentPortal({ level, open, onClose }: Props) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [user, setUser] = useState<User | null>(null)
  const [ready, setReady] = useState(!db)
  const [mode, setMode] = useState<'signup' | 'login'>('signup')
  const [ratings, setRatings] = useState<SkillRatings>({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [department, setDepartment] = useState<{ name: string } | null>(null)
  const code = new URLSearchParams(window.location.search).get('department') ?? ''
  useEffect(() => {
    if (!db) return
    const { data } = db.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null); setReady(true)
    })
    return () => data.subscription.unsubscribe()
  }, [])
  useEffect(() => {
    if (!db || !code) return
    let active = true
    void db.rpc('kp_department_for_code', { code }).then(({ data, error }) => {
      if (!active) return
      if (error || !data?.length) setError('This department link could not be verified. Ask your coordinator for a new link.')
      else setDepartment(data[0])
    })
    return () => { active = false }
  }, [code])
  useEffect(() => {
    if (open && !dialog.current?.open) dialog.current?.showModal()
    if (!open && dialog.current?.open) dialog.current.close()
  }, [open])
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!db) return
    const form = new FormData(event.currentTarget)
    const email = String(form.get('email') ?? '').trim()
    setBusy(true); setError(''); setNotice('')
    try {
      const redirect = new URL(window.location.href); redirect.hash = 'account'
      if (mode === 'signup') {
        const { error } = await db.auth.signInWithOtp(emailJoinRequest(form, ratings, level, code, redirect.toString()))
        if (error) throw error
      } else {
        const { error } = await db.auth.signInWithOtp({ email, options: { emailRedirectTo: redirect.toString(), shouldCreateUser: false } }); if (error) throw error
      }
      setNotice('Check your email for a secure sign-in link. No password needed.')
    } catch (error) { setError(errorMessage(error)) } finally { setBusy(false) }
  }
  return <dialog ref={dialog} className={`student-portal${!user ? ' portal-auth-dialog' : ''}`} onCancel={onClose} onClose={onClose} aria-labelledby="portal-title">
    <header className="portal-header"><div><h2 id="portal-title">{user ? 'Your workspace' : mode === 'signup' ? `Join Level ${level}` : 'Welcome back'}</h2></div><button type="button" onClick={onClose} aria-label="Close account">✕</button></header>
    {!db ? <p role="status" className="portal-message">Student registration is being prepared. Accounts aren’t available yet.</p> : !ready ? <p role="status">Loading your account…</p> : user ? <StudentWorkspace key={user.id} user={user} level={level} departmentCode={code} onSignOut={async () => { const { error } = await db!.auth.signOut(); if (error) setError(error.message) }} /> : <div className="portal-auth">
      {mode === 'signup' && department && <p>{department.name}</p>}
      <form onSubmit={submit} className="portal-form">
        {mode === 'signup' && <label><span className="portal-field-heading">Your name<small>Required</small></span><input name="name" autoComplete="name" required maxLength={160} /></label>}
        <label><span className="portal-field-heading">Email<small>Required</small></span><input name="email" type="email" autoComplete="email" required /></label>
        {mode === 'signup' && <section className="portal-join-optional" aria-labelledby="portal-optional-title"><div className="portal-optional-heading"><h3 id="portal-optional-title">Your learning</h3><span>Optional</span></div>
          <label>What would you like to learn?<textarea name="goals" maxLength={3000} rows={2} /></label>
          <div className="portal-rating-heading"><span>Your confidence</span><small>1 · Starting out &nbsp; 5 · Confident</small></div>
          <div className="portal-skill-ratings">{LANGUAGE_SKILLS.map(skill => <div className="portal-skill-row" key={skill} role="group" aria-label={`${skill} self-rating, optional`}>
            <span>{skill}</span><div className="portal-rating-options">{[1, 2, 3, 4, 5].map(score => <button key={score} type="button" aria-label={`${skill}: ${score} out of 5`} aria-pressed={ratings[skill] === score} onClick={() => setRatings(current => { const next = { ...current }; if (next[skill] === score) delete next[skill]; else next[skill] = score; return next })}>{score}</button>)}</div>
          </div>)}</div><small>Leave any blank. Tap a selected score to clear it.</small>
        </section>}
        <button className="portal-primary" disabled={busy || (mode === 'signup' && !!code && !department)}>{busy ? 'Sending link…' : mode === 'signup' ? 'Join the class' : 'Email me a sign-in link'}</button>
        <small>We’ll email you a secure link. No password needed.</small>
      </form>
      <div className="portal-auth-links"><button onClick={() => { setMode(mode === 'signup' ? 'login' : 'signup'); setError(''); setNotice('') }}>{mode === 'signup' ? 'Already joined? Sign in' : 'Join the class'}</button></div>
    </div>}
    {error && <p role="alert" className="portal-error">{error}</p>}{notice && <p role="status" className="portal-message">{notice}</p>}
  </dialog>
}
