import { useEffect, useMemo, useState } from 'react'
import { MOE_CLASSES } from '../../lib/moeOffer'
import ministryLogo from '../../assets/ministry-of-education-logo-white.svg'
import '../SiteIdentity.css'
import './SignupAdmin.css'

export type Registration = { id: string; name: string; email: string; selected_level: number; created_at: string; department_group?: string | null }
const classes = MOE_CLASSES.flatMap(day => day.sessions.map(session => ({ ...session, day: day.day }))).sort((a, b) => a.level - b.level)
const date = new Intl.DateTimeFormat('en-NZ', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Pacific/Auckland' })

export default function SignupAdmin() {
  const [rows, setRows] = useState<Registration[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refresh, setRefresh] = useState(0)
  const [removed, setRemoved] = useState(false)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  async function changeRegistration(row: Registration) {
    const className = classes.find(item => item.level === row.selected_level)?.title || `Level ${row.selected_level}`
    if (!removed && !window.confirm(`Remove ${row.name} from ${className}?\n\n${row.email}\n\nYou can restore this signup from Removed.`)) return
    setBusy(true); setError(''); setNotice('')
    try {
      const response = await fetch('/__signup_admin', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: row.id, action: removed ? 'restore' : 'remove' }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'The change could not be saved.')
      setRows(current => current.filter(item => item.id !== row.id))
      setNotice(`${row.name} — ${className} ${removed ? 'restored' : 'removed'}.`)
      setRefresh(value => value + 1)
    } catch (error) { setError(error instanceof Error ? error.message : 'The change could not be saved.') }
    finally { setBusy(false) }
  }
  async function moveRegistration(row: Registration, level: number) {
    setBusy(true); setError(''); setNotice('')
    try {
      const response = await fetch('/__signup_admin', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: row.id, action: 'move', level, fromLevel: row.selected_level }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'The level could not be changed.')
      setRows(current => current.map(item => item.id === row.id ? result.registration : item))
      setNotice(`${row.name} moved from Level ${row.selected_level} to Level ${level}.`)
      setRefresh(value => value + 1)
    } catch (error) { setError(error instanceof Error ? error.message : 'The level could not be changed.') }
    finally { setBusy(false) }
  }
  const [loadedAt, setLoadedAt] = useState<Date | null>(null)
  useEffect(() => {
    const controller = new AbortController()
    setLoading(true); setError('')
    void fetch(`/__signup_admin${removed ? '?removed=true' : ''}`, { cache: 'no-store', signal: controller.signal })
      .then(async response => {
        const result = await response.json()
        if (!response.ok) throw new Error(result.error || 'Registrations could not be loaded.')
        if (!controller.signal.aborted) { setRows(result.registrations); setLoadedAt(new Date()) }
      }).catch(error => { if (!controller.signal.aborted) { setRows([]); setLoadedAt(null); setError(error instanceof Error ? error.message : 'Registrations could not be loaded.') } })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [refresh, removed])
  return <main className="signup-admin">
    <a className="signup-admin-back" href="/#moe">← MOE classes</a>
    <section className="site-card">
      <header className="site-card-cover signup-admin-cover">
        <img src={ministryLogo} width="200" height="58" alt="Ministry of Education" />
        <div className="signup-admin-heading"><div><h1>Class signups</h1><p>October 2026 intake</p></div></div>
      </header>
      <div className="signup-admin-views" aria-label="Signup status">
        <button aria-pressed={!removed} disabled={busy} onClick={() => { setRemoved(false); setNotice('') }}>Signups</button>
        <button aria-pressed={removed} disabled={busy} onClick={() => { setRemoved(true); setNotice('') }}>Removed</button>
      </div>
      {notice && <p className="signup-admin-notice" role="status">{notice}</p>}
      <SignupRoster rows={loading ? [] : rows} loading={loading || busy} loadedAt={loading ? null : loadedAt} removed={removed} onChange={changeRegistration} onMove={moveRegistration} onRefresh={() => setRefresh(value => value + 1)} />
      {error && <p className="signup-admin-error" role="alert">{error}</p>}
    </section>
  </main>
}

export function SignupRoster({ rows, loading, loadedAt, onRefresh, removed = false, onChange, onMove }: { rows: Registration[]; loading: boolean; loadedAt: Date | null; onRefresh: () => void; removed?: boolean; onChange?: (row: Registration) => void; onMove?: (row: Registration, level: number) => void }) {
  const [search, setSearch] = useState('')
  const [level, setLevel] = useState(0)
  const filtered = useMemo(() => rows.filter(row => (!level || row.selected_level === level) && `${row.name} ${row.email} ${row.department_group || ''}`.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase())), [rows, level, search])
  const duplicateEmails = useMemo(() => { const counts = new Map<string, number>(); rows.forEach(row => counts.set(row.email.toLowerCase(), (counts.get(row.email.toLowerCase()) || 0) + 1)); return counts }, [rows])
  return <>
        <div className="signup-admin-counts" aria-label="Filter registrations by class">
          <button aria-pressed={level === 0} onClick={() => setLevel(0)}><strong>{loadedAt ? rows.length : '—'}</strong><span>{removed ? 'All removed' : 'All signups'}</span></button>
          {classes.map(item => <button key={item.level} aria-pressed={level === item.level} onClick={() => setLevel(item.level)}><strong>{loadedAt ? rows.filter(row => row.selected_level === item.level).length : '—'}</strong><span>{item.title}</span></button>)}
        </div>
        <div className="signup-admin-toolbar"><label>Search signups<input type="search" placeholder="Name, email or group" value={search} onChange={event => setSearch(event.target.value)} /></label><button onClick={onRefresh} disabled={loading}>{loading ? 'Refreshing…' : 'Refresh'}</button></div>
        <div className="signup-admin-results" aria-live="polite">{loading ? 'Loading registrations…' : loadedAt ? `${filtered.length} ${filtered.length === 1 ? 'signup' : 'signups'} · Updated ${loadedAt.toLocaleTimeString('en-NZ', { hour: 'numeric', minute: '2-digit' })}` : ''}</div>
        {loadedAt && !filtered.length ? <p className="signup-admin-notice">{search ? 'No signups match your search.' : removed ? 'No removed signups for this class.' : 'No signups for this class yet.'}</p> : classes.filter(item => !level || item.level === level).map(item => {
          const people = filtered.filter(row => row.selected_level === item.level)
          return !people.length ? null : <section key={item.level} className="signup-admin-class" aria-labelledby={`signup-class-${item.level}`}>
            <header><h2 id={`signup-class-${item.level}`}>{item.title} <span>{people.length}</span></h2><p>{item.day} · {item.time} · NZ time</p></header>
            <div className="signup-admin-table"><table><thead><tr><th scope="col">Name</th><th scope="col">Email</th><th scope="col">Department / group</th><th scope="col">Signed up</th>{onChange && <th scope="col">Action</th>}</tr></thead><tbody>{people.map(row => <tr key={row.id}>
              <th scope="row">{row.name}{(duplicateEmails.get(row.email.toLowerCase()) || 0) > 1 && <small>Repeat email</small>}</th>
              <td><a href={`mailto:${row.email}`}>{row.email}</a></td><td>{row.department_group || '—'}</td><td><time dateTime={row.created_at}>{date.format(new Date(row.created_at))}</time></td>
              {onChange && <td><div className="signup-admin-actions">{!removed && onMove && <MoveLevel row={row} disabled={loading} onMove={onMove} />}<button className="signup-admin-row-action" disabled={loading} aria-label={`${removed ? 'Restore' : 'Remove'} ${row.name} — ${item.title}`} onClick={() => onChange(row)}>{removed ? 'Restore' : 'Remove'}</button></div></td>}
            </tr>)}</tbody></table></div>
          </section>
        })}
        {loadedAt && <p className="signup-admin-footnote">Registrations of interest. Class places are not yet confirmed.</p>}
  </>
}

function MoveLevel({ row, disabled, onMove }: { row: Registration; disabled: boolean; onMove: (row: Registration, level: number) => void }) {
  const [editing, setEditing] = useState(false)
  const [level, setLevel] = useState(row.selected_level)
  if (!editing) return <button className="signup-admin-row-action" disabled={disabled} onClick={() => setEditing(true)} aria-label={`Move ${row.name} to another level`}>Move level</button>
  return <form className="signup-admin-move" onSubmit={event => { event.preventDefault(); onMove(row, level) }}>
    <label>Move to<select aria-label={`New level for ${row.name}`} value={level} disabled={disabled} onChange={event => setLevel(Number(event.target.value))}>
      {classes.map(item => <option key={item.level} value={item.level}>{item.title}</option>)}
    </select></label>
    <div><button className="signup-admin-row-action" type="submit" disabled={disabled || level === row.selected_level}>Save</button>
    <button className="signup-admin-row-action" type="button" disabled={disabled} onClick={() => setEditing(false)}>Cancel</button></div>
  </form>
}
