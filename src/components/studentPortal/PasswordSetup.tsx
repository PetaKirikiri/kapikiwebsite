import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import type { User } from '@supabase/supabase-js'
import { studentClient, errorMessage } from '../../lib/studentPortal/client'
import './LearningSignIn.css'

// Onboarding state only; never use user-editable metadata to grant permissions.
export function needsPasswordSetup(user: User) {
  return user.user_metadata?.password_setup_complete !== true
}

export default function PasswordSetup({ user, onComplete, onSignOut }: {
  user: User; onComplete: (user: User) => void; onSignOut: () => void
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const pending = useRef(false)

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending.current || !studentClient) return
    const form = event.currentTarget
    const fields = new FormData(form)
    const password = String(fields.get('password') ?? '')
    if (password.length < 8) { setError('Use at least 8 characters.'); return }
    if (password !== fields.get('confirmPassword')) { setError('Your passwords don’t match.'); return }
    pending.current = true; setBusy(true); setError('')
    try {
      const { data, error } = await studentClient.auth.updateUser({ password, data: { password_setup_complete: true } })
      if (error) throw error
      if (!data.user) throw new Error('Your session has expired. Sign in again to set your password.')
      form.reset()
      onComplete(data.user)
    } catch (cause) { setError(errorMessage(cause)) }
    finally { pending.current = false; setBusy(false) }
  }

  return <section className="learning-login site-card" aria-labelledby="password-setup-heading">
    <header className="site-card-cover"><h1 id="password-setup-heading">Set your password</h1><p>Use it next time you sign in.</p></header>
    <div className="learning-login-body"><form onSubmit={save}>
      <label htmlFor="setup-email">Email</label><input id="setup-email" type="email" autoComplete="username" value={user.email ?? ''} readOnly />
      <label htmlFor="setup-password">New password</label><input id="setup-password" name="password" type="password" autoComplete="new-password" minLength={8} aria-describedby="password-length" required disabled={busy} />
      <small id="password-length">At least 8 characters</small>
      <label htmlFor="setup-confirm">Confirm password</label><input id="setup-confirm" name="confirmPassword" type="password" autoComplete="new-password" minLength={8} required disabled={busy} />
      {error && <p className="portal-error" role="alert">{error}</p>}
      <button className="learning-login-primary" disabled={busy}>{busy ? 'Saving…' : 'Save password & continue'}</button>
      <button className="learning-login-alternative" type="button" disabled={busy} onClick={onSignOut}>Sign out</button>
    </form></div>
  </section>
}
