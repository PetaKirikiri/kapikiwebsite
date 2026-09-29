import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { createClient } from '@supabase/supabase-js'
import type { Session } from '@supabase/supabase-js'
import authConfig from '../../../signup-auth-config.json'
import { MOE_CLASSES } from '../../lib/moeOffer'
import ministryLogo from '../../assets/ministry-of-education-logo-white.svg'
import '../SiteIdentity.css'
import './SignupAdmin.css'

const auth = createClient(authConfig.url, authConfig.publishableKey, {
  auth: { storageKey: 'ka-piki-signup-admin', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
})
export type Registration = { id: string; name: string; email: string; selected_level: number; created_at: string; goals: string; self_ratings: Record<string, number> }
const classes = MOE_CLASSES.flatMap(day => day.sessions.map(session => ({ ...session, day: day.day }))).sort((a, b) => a.level - b.level)
const date = new Intl.DateTimeFormat('en-NZ', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Pacific/Auckland' })
const learningNotes = (row: Registration) => row.goals.split('\n\n').slice(1).join('\n\n').trim()

export default function SignupAdmin() {
  const [session, setSession] = useState<Session | null>(null)
  const [ready, setReady] = useState(false)
  const [rows, setRows] = useState<Registration[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [refresh, setRefresh] = useState(0)
  const [loadedAt, setLoadedAt] = useState<Date | null>(null)
  useEffect(() => {
    let active = true
    void auth.auth.getSession().then(({ data, error }) => { if (active) { setSession(data.session); setReady(true); if (error) setError('Please sign in again.'); } })
    const { data } = auth.auth.onAuthStateChange((_event, next) => { setSession(next); setRows([]); setLoadedAt(null); setError(''); setReady(true) })
    return () => { active = false; data.subscription.unsubscribe() }
  }, [])
  useEffect(() => {
    if (!session) return
    const controller = new AbortController()
    setLoading(true); setError('')
    void fetch('/__signup_admin', { headers: { Authorization: `Bearer ${session.access_token}` }, cache: 'no-store', signal: controller.signal })
      .then(async response => {
        const result = await response.json()
        if (!response.ok) throw new Error(result.error || 'Registrations could not be loaded.')
        if (!controller.signal.aborted) { setRows(result.registrations); setLoadedAt(new Date()) }
      }).catch(error => { if (!controller.signal.aborted) { setRows([]); setLoadedAt(null); setError(error instanceof Error ? error.message : 'Registrations could not be loaded.') } })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [session, refresh])
  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSending(true); setError(''); setMessage('')
    const email = String(new FormData(event.currentTarget).get('email') || '').trim()
    try {
      const { error } = await auth.auth.signInWithOtp({ email, options: { emailRedirectTo: `${window.location.origin}/admin.html` } })
      if (error) throw error
      setMessage('Check your email for your sign-in link. Open it to view registrations.')
    } catch { setError('The sign-in email could not be sent. Please try again shortly.') }
    finally { setSending(false) }
  }
  return <main className="signup-admin">
    <a className="signup-admin-back" href="/#moe">← MOE classes</a>
    <section className="site-card">
      <header className="site-card-cover signup-admin-cover">
        <img src={ministryLogo} width="200" height="58" alt="Ministry of Education" />
        <div className="signup-admin-heading"><div><h1>Class signups</h1><p>October 2026 intake</p></div>{session && <button type="button" onClick={() => { setRows([]); setLoadedAt(null); void auth.auth.signOut({ scope: 'local' }) }}>Sign out</button>}</div>
      </header>
      {!ready ? <p className="signup-admin-notice" role="status">Loading…</p> : !session ? <form className="signup-admin-login" onSubmit={signIn}>
        <h2>Admin sign in</h2><p>Sign in with your authorised email to view registrations.</p>
        <label>Email<input type="email" name="email" autoComplete="email" required /></label>
        <button className="signup-admin-primary" disabled={sending}>{sending ? 'Sending…' : 'Email me a sign-in link'}</button>
        {message && <p role="status">{message}</p>}
      </form> : <SignupRoster rows={rows} loading={loading} loadedAt={loadedAt} onRefresh={() => setRefresh(value => value + 1)} />}
      {error && <p className="signup-admin-error" role="alert">{error}</p>}
    </section>
  </main>
}

export function SignupRoster({ rows, loading, loadedAt, onRefresh }: { rows: Registration[]; loading: boolean; loadedAt: Date | null; onRefresh: () => void }) {
  const [search, setSearch] = useState('')
  const [level, setLevel] = useState(0)
  const filtered = useMemo(() => rows.filter(row => (!level || row.selected_level === level) && `${row.name} ${row.email}`.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase())), [rows, level, search])
  const duplicateEmails = useMemo(() => { const counts = new Map<string, number>(); rows.forEach(row => counts.set(row.email.toLowerCase(), (counts.get(row.email.toLowerCase()) || 0) + 1)); return counts }, [rows])
  return <>
        <div className="signup-admin-counts" aria-label="Filter registrations by class">
          <button aria-pressed={level === 0} onClick={() => setLevel(0)}><strong>{loadedAt ? rows.length : '—'}</strong><span>All signups</span></button>
          {classes.map(item => <button key={item.level} aria-pressed={level === item.level} onClick={() => setLevel(item.level)}><strong>{loadedAt ? rows.filter(row => row.selected_level === item.level).length : '—'}</strong><span>{item.title}</span></button>)}
        </div>
        <div className="signup-admin-toolbar"><label>Search signups<input type="search" placeholder="Name or email" value={search} onChange={event => setSearch(event.target.value)} /></label><button onClick={onRefresh} disabled={loading}>{loading ? 'Refreshing…' : 'Refresh'}</button></div>
        <div className="signup-admin-results" aria-live="polite">{loading ? 'Loading registrations…' : loadedAt ? `${filtered.length} ${filtered.length === 1 ? 'signup' : 'signups'} · Updated ${loadedAt.toLocaleTimeString('en-NZ', { hour: 'numeric', minute: '2-digit' })}` : ''}</div>
        {loadedAt && !filtered.length ? <p className="signup-admin-notice">{search ? 'No signups match your search.' : 'No signups for this class yet.'}</p> : classes.filter(item => !level || item.level === level).map(item => {
          const people = filtered.filter(row => row.selected_level === item.level)
          return !people.length ? null : <section key={item.level} className="signup-admin-class" aria-labelledby={`signup-class-${item.level}`}>
            <header><h2 id={`signup-class-${item.level}`}>{item.title} <span>{people.length}</span></h2><p>{item.day} · {item.time} · NZ time</p></header>
            <div className="signup-admin-table"><table><thead><tr><th scope="col">Name</th><th scope="col">Email</th><th scope="col">Signed up</th><th scope="col">Learning details</th></tr></thead><tbody>{people.map(row => <tr key={row.id}>
              <th scope="row">{row.name}{(duplicateEmails.get(row.email.toLowerCase()) || 0) > 1 && <small>Repeat email</small>}</th>
              <td><a href={`mailto:${row.email}`}>{row.email}</a></td><td><time dateTime={row.created_at}>{date.format(new Date(row.created_at))}</time></td>
              <td>{learningNotes(row) || Object.keys(row.self_ratings).length ? <details><summary>View details</summary>{learningNotes(row) && <p>{learningNotes(row)}</p>}{Object.entries(row.self_ratings).map(([skill, rating]) => <p key={skill}>{skill}: {rating}/5</p>)}</details> : '—'}</td>
            </tr>)}</tbody></table></div>
          </section>
        })}
        {loadedAt && <p className="signup-admin-footnote">Registrations of interest. Class places are not yet confirmed.</p>}
  </>
}
