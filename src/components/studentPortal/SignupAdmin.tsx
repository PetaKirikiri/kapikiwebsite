import { useEffect, useState } from 'react'
import { MOE_CLASSES } from '../../lib/moeOffer'
import MoeBenefitIcon from '../MoeBenefitIcon'
import ministryLogo from '../../assets/ministry-of-education-logo-white.svg'
import '../SiteIdentity.css'
import './SignupAdmin.css'

export type Registration = { id: string; name: string; email: string; selected_level: number; created_at: string; department_group?: string | null }
const classes = MOE_CLASSES.flatMap(day => day.sessions.map(session => ({ ...session, day: day.day }))).sort((a, b) => a.level - b.level)

export default function SignupAdmin() {
  const [rows, setRows] = useState<Registration[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  useEffect(() => {
    const controller = new AbortController()
    void fetch('/__signup_admin', { cache: 'no-store', signal: controller.signal })
      .then(async response => {
        const result = await response.json()
        if (!response.ok) throw new Error(result.error || 'Registrations could not be loaded. Reload to try again.')
        if (!controller.signal.aborted) setRows(result.registrations)
      }).catch(error => { if (!controller.signal.aborted) setError(error instanceof Error ? error.message : 'Registrations could not be loaded. Reload to try again.') })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [])
  return <main className="signup-admin">
    <a className="signup-admin-back" href="/#moe">← MOE classes</a>
    <header className="site-card site-card-cover signup-admin-page-header">
      <img src={ministryLogo} width="200" height="58" alt="Ministry of Education" />
      <h1>Class signups</h1>
      <p>October 2026 intake</p>
    </header>
    {loading ? <p role="status">Loading…</p> : error ? <p className="signup-admin-error" role="alert">{error}</p> : <SignupRoster rows={rows} />}
  </main>
}

export function SignupRoster({ rows }: { rows: Registration[] }) {
  return <div className="signup-admin-levels">{classes.map(item => {
    const people = rows.filter(row => row.selected_level === item.level)
    return <section key={item.level} className="site-card signup-admin-class" aria-labelledby={`signup-class-${item.level}`}>
      <header className="site-card-cover signup-admin-level-header">
        <span className="signup-admin-level-icon" aria-hidden="true"><MoeBenefitIcon id={item.level === 6 ? 'conversation' : 'levels'} /></span>
        <div className="signup-admin-level-title"><h2 id={`signup-class-${item.level}`}>Level {item.level}{item.level === 6 ? ' · Kōrero Club' : ''}</h2><p>{item.day} · {item.time} NZ</p></div>
        <div className="signup-admin-student-count"><strong>{people.length}</strong><span>{people.length === 1 ? 'student' : 'students'}</span></div>
      </header>
      {people.length ? <div className="signup-admin-table"><table>
        <thead><tr><th scope="col">Name</th><th scope="col">Email</th><th scope="col">Group</th></tr></thead>
        <tbody>{people.map(row => <tr key={row.id}><th scope="row">{row.name}</th><td><a href={`mailto:${row.email}`}>{row.email}</a></td><td>{row.department_group || '—'}</td></tr>)}</tbody>
      </table></div> : null}
    </section>
  })}</div>
}
