import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import type { User } from '@supabase/supabase-js'
import { AVAILABILITY, studentClient, errorMessage } from '../../lib/studentPortal/client'
import type { Profile, Membership, Department, Affiliation, Assessment, Training } from '../../lib/studentPortal/client'
import CoordinatorWorkspace from './CoordinatorWorkspace'
import { readSkillRatings } from '../../lib/studentPortal/join'

const db = studentClient!
export default function StudentWorkspace({ user, level, departmentCode, onSignOut }: { user: User; level: number; departmentCode: string; onSignOut: () => Promise<void> }) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [affiliation, setAffiliation] = useState<Affiliation | null>(null)
  const [memberships, setMemberships] = useState<Membership[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [training, setTraining] = useState<Training[]>([])
  const [assessments, setAssessments] = useState<Assessment[]>([])
  const [view, setView] = useState('profile')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [revision, setRevision] = useState(0)
  useEffect(() => {
    let active = true
    async function load() {
      try {
        const results = await Promise.all([
          db.from('kp_profiles').select('*').eq('user_id', user.id).maybeSingle(),
          db.from('kp_affiliations').select('*').eq('user_id', user.id).maybeSingle(),
          db.from('kp_memberships').select('*').eq('user_id', user.id),
          db.from('kp_departments').select('*'),
          db.from('kp_training').select('*').eq('user_id', user.id).order('recorded_on', { ascending: false }),
          db.from('kp_assessments').select('*').eq('user_id', user.id).order('assessed_on', { ascending: false }),
        ])
        for (const result of results) if (result.error) throw result.error
        if (!active) return
        const selected = Number(user.user_metadata.selected_level)
        setProfile(results[0].data ?? { user_id: user.id, name: String(user.user_metadata.name ?? ''), selected_level: Number.isInteger(selected) && selected >= 1 && selected <= 6 ? selected : level, goals: String(user.user_metadata.goals ?? ''), availability: [], timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, availability_notes: '' })
        setAffiliation(results[1].data ?? { user_id: user.id, affiliation: '', share_with_coordinators: false })
        setMemberships(results[2].data ?? []); setDepartments(results[3].data ?? [])
        setTraining(results[4].data ?? []); setAssessments(results[5].data ?? [])
      } catch (error) { if (active) setError(errorMessage(error)) }
    }
    void load()
    return () => { active = false }
  }, [user, level, revision])
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!profile || !affiliation) return
    setBusy(true); setError(''); setNotice('')
    try {
      const { error } = await db.rpc('kp_save_profile', { profile_data: profile, affiliation_data: affiliation }); if (error) throw error
      setNotice('Your profile and availability have been saved.')
      const code = departmentCode || String(user.user_metadata.department_code ?? '')
      if (code) {
        const { error } = await db.rpc('kp_request_department', { code }); if (error) throw new Error(`Profile saved, but your department could not be connected: ${error.message}`)
      }
      setRevision(value => value + 1)
    } catch (error) { setError(errorMessage(error)) } finally { setBusy(false) }
  }
  const coordinated = departments.filter(dept => memberships.some(m => m.department_id === dept.id && m.role === 'coordinator' && m.status === 'active'))
  const startingRatings = Object.entries(readSkillRatings(user.user_metadata.self_ratings))
  return <>
    <div className="portal-toolbar"><div className="portal-tabs"><button aria-pressed={view === 'profile'} onClick={() => setView('profile')}>My profile</button>{coordinated.map(dept => <button key={dept.id} aria-pressed={view === dept.id} onClick={() => setView(dept.id)}>{dept.name}</button>)}</div><button onClick={() => { void onSignOut() }}>Sign out</button></div>
    {error && <p role="alert" className="portal-error">{error} <button onClick={() => { setError(''); setRevision(n => n + 1) }}>Retry loading</button></p>}
    {view !== 'profile' && coordinated.some(dept => dept.id === view) ? <CoordinatorWorkspace key={view} department={coordinated.find(dept => dept.id === view)!} /> : profile && affiliation ? <>
      <p className="portal-muted">{user.email}</p>
      {!!startingRatings.length && <details><summary>Your starting self-ratings</summary><div className="portal-skill-ratings">{startingRatings.map(([skill, score]) => <div className="portal-skill-row" key={skill}><span>{skill}</span><span>{score} / 5</span></div>)}</div><small>Your confidence when joining, not a formal assessment.</small></details>}
      <form className="portal-form" onSubmit={save}>
        <div className="portal-grid"><label>Your name<input required maxLength={160} value={profile.name} onChange={e => setProfile({ ...profile, name: e.target.value })} /></label><label>My starting level<select value={profile.selected_level} onChange={e => setProfile({ ...profile, selected_level: Number(e.target.value) })}>{[1, 2, 3, 4, 5, 6].map(n => <option key={n} value={n}>Level {n}</option>)}</select><small>Self-selected; this is not an assessed result.</small></label></div>
        <label>What would you like to learn?<textarea maxLength={3000} value={profile.goals} onChange={e => setProfile({ ...profile, goals: e.target.value })} placeholder="For example, feeling confident introducing myself at work." /></label>
        <fieldset><legend>When could you attend?</legend><p className="portal-muted">Choose all possible times. Your coordinator will confirm exact class times.</p><div className="portal-availability">{AVAILABILITY.map(slot => <label key={slot}><input type="checkbox" checked={profile.availability.includes(slot)} onChange={e => setProfile({ ...profile, availability: e.target.checked ? [...profile.availability, slot] : profile.availability.filter(s => s !== slot) })} />{slot}</label>)}</div></fieldset>
        <div className="portal-grid"><label>Time zone<input required value={profile.timezone} onChange={e => setProfile({ ...profile, timezone: e.target.value })} /><small>For example, Pacific/Auckland.</small></label><label>Other times or scheduling notes<textarea maxLength={1000} value={profile.availability_notes} onChange={e => setProfile({ ...profile, availability_notes: e.target.value })} /></label></div>
        <fieldset><legend>Your connections · optional</legend><label>Iwi / hapū affiliations<textarea maxLength={1000} value={affiliation.affiliation} onChange={e => setAffiliation({ ...affiliation, affiliation: e.target.value })} /></label><label className="portal-check"><input type="checkbox" checked={affiliation.share_with_coordinators} onChange={e => setAffiliation({ ...affiliation, share_with_coordinators: e.target.checked })} />Share these affiliations with my department coordinators.</label><small>This is separate from language capability. Leave it blank if you prefer. You can change sharing at any time.</small></fieldset>
        <p className="portal-muted">Your department coordinators can see your name, contact email, starting level, learning goals and availability to organise training.</p>
        <button className="portal-primary" disabled={busy}>{busy ? 'Saving…' : 'Save profile & availability'}</button>
        {notice && <p role="status" className="portal-message">{notice}</p>}
      </form>
      <section className="portal-section"><h3>My departments</h3>{memberships.length ? memberships.map(m => <p key={m.department_id}>{departments.find(d => d.id === m.department_id)?.name} <span className="portal-badge">{m.role === 'coordinator' ? 'Coordinator' : m.status === 'pending' ? 'Awaiting coordinator' : 'Student'}</span></p>) : <p>Your coordinator’s department link connects your profile when you save it. You can prepare your profile before joining a department.</p>}</section>
      <section className="portal-section"><h3>My training & assessments</h3>{!training.length && !assessments.length && <p>No training or assessments recorded yet.</p>}{training.map(row => <p key={row.id}>{row.title} · {row.status} · {row.recorded_on}</p>)}{assessments.map(row => <p key={row.id}>{row.assessed_on} · {row.outcome}{row.assessed_level ? ` · assessed Level ${row.assessed_level}` : ''}<br />{row.evidence}</p>)}</section>
    </> : !error && <p role="status">Loading your profile…</p>}
  </>
}
