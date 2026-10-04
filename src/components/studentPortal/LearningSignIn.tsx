import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { studentClient, errorMessage } from '../../lib/studentPortal/client'
import './LearningSignIn.css'

export default function LearningSignIn() {
  const [mode, setMode] = useState<'password' | 'email'>('password')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const pending = useRef(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!studentClient || pending.current) return
    const fields = new FormData(event.currentTarget)
    const email = String(fields.get('email') ?? '').trim()
    pending.current = true
    setBusy(true); setError('')
    try {
      if (mode === 'password') {
        const result = await studentClient.auth.signInWithPassword({ email, password: String(fields.get('password') ?? '') })
        if (result.error) {
          if (result.error.code === 'email_not_confirmed') throw new Error('Confirm your email first. Choose “Email me a sign-in link” below.')
          throw result.error
        }
        // A successful password login proves the learner already knows their password.
        if (result.data.user && result.data.user.user_metadata?.password_setup_complete !== true) {
          const saved = await studentClient.auth.updateUser({ data: { password_setup_complete: true } })
          if (saved.error) throw saved.error
        }
      } else {
        const redirect = new URL('/', window.location.origin)
        redirect.searchParams.set('studentPortal', window.location.hash.startsWith('#moe') ? 'moe' : '1')
        const result = await studentClient.auth.signInWithOtp({ email, options: { emailRedirectTo: redirect.href, shouldCreateUser: false } })
        if (result.error) throw result.error
        setSent(true)
      }
    } catch (cause) { setError(errorMessage(cause)) }
    finally { pending.current = false; setBusy(false) }
  }

  return <section className="learning-login site-card" aria-labelledby="learning-login-heading">
    <header className="site-card-cover"><h1 id="learning-login-heading">My learning</h1><p>Your courses. Your classroom.</p></header>
    <div className="learning-login-body">
      {!studentClient ? <p role="alert">Sign-in is unavailable. Please try again shortly.</p> : sent ? <div role="status"><h2>Check your email</h2><p>Use the sign-in link to open My Learning.</p><button type="button" onClick={() => { setSent(false); setError('') }}>Back to sign in</button></div> : <form onSubmit={submit}>
        <label htmlFor="learning-email">Email</label>
        <input id="learning-email" name="email" type="email" autoComplete="email" required />
        {mode === 'password' && <><label htmlFor="learning-password">Password</label><input id="learning-password" name="password" type="password" autoComplete="current-password" required /></>}
        {error && <p className="portal-error" role="alert">{error}</p>}
        <button className="learning-login-primary" disabled={busy}>{busy ? (mode === 'password' ? 'Signing in…' : 'Sending…') : mode === 'password' ? 'Sign in' : 'Send sign-in link'}</button>
        <button className="learning-login-alternative" type="button" disabled={busy} onClick={() => { setMode(mode === 'password' ? 'email' : 'password'); setError('') }}>{mode === 'password' ? 'Email me a sign-in link' : 'Use my password'}</button>
      </form>}
    </div>
  </section>
}
