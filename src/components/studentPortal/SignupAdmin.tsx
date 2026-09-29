import { useEffect, useMemo, useState } from 'react'
import { MOE_CLASSES } from '../../lib/moeOffer'
import ministryLogo from '../../assets/ministry-of-education-logo-white.svg'
import '../SiteIdentity.css'
import './SignupAdmin.css'

export type Registration = { id: string; name: string; email: string; selected_level: number; created_at: string }
const classes = MOE_CLASSES.flatMap(day => day.sessions.map(session => ({ ...session, day: day.day }))).sort((a, b) => a.level - b.level)
const date = new Intl.DateTimeFormat('en-NZ', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Pacific/Auckland' })

export default function SignupAdmin() {
  const [rows, setRows] = useState<Registration[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refresh, setRefresh] = useState(0)
  const [loadedAt, setLoadedAt] = useState<Date | null>(null)
  useEffect(() => {
    const controller = new AbortController()
    setLoading(true); setError('')
    void fetch('/__signup_admin', { cache: 'no-store', signal: controller.signal })
      .then(async response => {
        const result = await response.json()
        if (!response.ok) throw new Error(result.error || 'Registrations could not be loaded.')
        if (!controller.signal.aborted) { setRows(result.registrations); setLoadedAt(new Date()) }
      }).catch(error => { if (!controller.signal.aborted) { setRows([]); setLoadedAt(null); setError(error instanceof Error ? error.message : 'Registrations could not be loaded.') } })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [refresh])
  return <main className="signup-admin">
    <a className="signup-admin-back" href="/#moe">← MOE classes</a>
    <section className="site-card">
      <header className="site-card-cover signup-admin-cover">
        <img src={ministryLogo} width="200" height="58" alt="Ministry of Education" />
        <div className="signup-admin-heading"><div><h1>Class signups</h1><p>October 2026 intake</p></div></div>
      </header>
      <SignupRoster rows={rows} loading={loading} loadedAt={loadedAt} onRefresh={() => setRefresh(value => value + 1)} />
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
            <div className="signup-admin-table"><table><thead><tr><th scope="col">Name</th><th scope="col">Email</th><th scope="col">Signed up</th></tr></thead><tbody>{people.map(row => <tr key={row.id}>
              <th scope="row">{row.name}{(duplicateEmails.get(row.email.toLowerCase()) || 0) > 1 && <small>Repeat email</small>}</th>
              <td><a href={`mailto:${row.email}`}>{row.email}</a></td><td><time dateTime={row.created_at}>{date.format(new Date(row.created_at))}</time></td>
            </tr>)}</tbody></table></div>
          </section>
        })}
        {loadedAt && <p className="signup-admin-footnote">Registrations of interest. Class places are not yet confirmed.</p>}
  </>
}
