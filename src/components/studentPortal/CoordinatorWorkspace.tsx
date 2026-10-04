import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { studentClient, errorMessage, latestAssessments } from '../../lib/studentPortal/client'
import type { Department, Membership, Profile, Affiliation, Standard, Training, Assessment } from '../../lib/studentPortal/client'
const db = studentClient!
type Snapshot = { members: Membership[]; profiles: Profile[]; affiliations: Affiliation[]; standards: Standard[]; training: Training[]; assessments: Assessment[]; contacts: { user_id: string; email: string }[] }
export default function CoordinatorWorkspace({ department }: { department: Department }) {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null)
  const [revision, setRevision] = useState(0)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [filter, setFilter] = useState('')
  useEffect(() => {
    let active = true
    async function load() {
      try {
        const results = await Promise.all([
          db.from('kp_memberships').select('*').eq('department_id', department.id),
          db.from('kp_standards').select('*').eq('department_id', department.id),
          db.from('kp_training').select('*').eq('department_id', department.id),
          db.from('kp_assessments').select('*').eq('department_id', department.id),
          db.rpc('kp_department_contacts', { dept: department.id }),
        ])
        for (const result of results) if (result.error) throw result.error
        const members: Membership[] = results[0].data ?? []
        const ids = members.map(m => m.user_id)
        const details = ids.length ? await Promise.all([db.from('kp_profiles').select('*').in('user_id', ids), db.from('kp_affiliations').select('*').in('user_id', ids)]) : []
        for (const detail of details) if (detail.error) throw detail.error
        if (active) setSnapshot({ members, profiles: details[0]?.data ?? [], affiliations: details[1]?.data ?? [], standards: results[1].data ?? [], training: results[2].data ?? [], assessments: results[3].data ?? [], contacts: results[4].data ?? [] })
      } catch (error) { if (active) { setSnapshot(null); setError(errorMessage(error)) } }
    }
    void load(); return () => { active = false }
  }, [department.id, revision])
  async function mutate(work: () => PromiseLike<{ error: unknown }>, message: string, form?: HTMLFormElement) {
    setBusy(true); setError(''); setNotice('')
    try { const { error } = await work(); if (error) throw error; setNotice(message); form?.reset(); setRevision(n => n + 1) } catch (error) { setError(errorMessage(error)) } finally { setBusy(false) }
  }
  function addRecord(event: FormEvent<HTMLFormElement>, kind: 'standard' | 'training' | 'assessment' | 'coordinator') {
    event.preventDefault(); const form = event.currentTarget; const data = new FormData(form)
    const value = (key: string) => String(data.get(key) ?? '').trim()
    if (kind === 'coordinator') { void mutate(() => db.rpc('kp_add_coordinator', { dept: department.id, email_address: value('email') }), 'Coordinator connected to this department.', form); return }
    const payload: Record<string, string | number | null> = kind === 'standard' ? { department_id: department.id, title: value('title'), description: value('description') }
      : kind === 'training' ? { department_id: department.id, user_id: value('user_id'), title: value('title'), status: value('status'), recorded_on: value('date') }
      : { department_id: department.id, user_id: value('user_id'), standard_id: value('standard_id'), outcome: value('outcome'), assessed_level: value('level') ? Number(value('level')) : null, assessed_on: value('date'), evidence: value('evidence') }
    void mutate(() => db.from(kind === 'standard' ? 'kp_standards' : kind === 'training' ? 'kp_training' : 'kp_assessments').insert(payload), 'Record saved.', form)
  }
  const students = snapshot?.members.filter(m => m.role === 'student') ?? []
  const activeStudents = students.filter(m => m.status === 'active')
  const activeIds = new Set(activeStudents.map(m => m.user_id))
  const currentAssessments = latestAssessments(snapshot?.assessments ?? []).filter(a => activeIds.has(a.user_id))
  const completed = new Set(snapshot?.training.filter(t => t.status === 'completed' && activeIds.has(t.user_id)).map(t => t.user_id)).size
  const person = (id: string) => snapshot?.profiles.find(p => p.user_id === id)
  const contact = (id: string) => snapshot?.contacts.find(p => p.user_id === id)?.email ?? ''
  const availability = new Map<string, string[]>()
  for (const student of students) {
    const profile = person(student.user_id)
    for (const slot of profile?.availability ?? []) {
      const key = `${slot} · ${profile!.timezone}`
      availability.set(key, [...(availability.get(key) ?? []), profile!.name])
    }
  }
  const joinLink = new URL(window.location.href); joinLink.search = ''; joinLink.searchParams.set('department', department.join_code); joinLink.hash = 'level-finder'
  const studentSelect = <label>Student<select name="user_id" required defaultValue=""><option value="" disabled>Choose a student</option>{activeStudents.map(m => <option key={m.user_id} value={m.user_id}>{person(m.user_id)?.name ?? contact(m.user_id)}</option>)}</select></label>
  const today = new Date().toLocaleDateString('en-CA')
  return <section className="coordinator-workspace">
    <div className="portal-section-heading"><div><span className="portal-eyebrow">DEPARTMENT OVERVIEW</span><h3>{department.name}</h3><p>People, availability and the next steps in your department’s learning.</p></div><button disabled={busy} onClick={() => { setError(''); setRevision(n => n + 1) }}>Refresh</button></div>
    {error && <p role="alert" className="portal-error">{error}</p>}{notice && <p role="status" className="portal-message">{notice}</p>}
    {!snapshot ? <p role="status">{error ? 'Department data could not load.' : 'Loading department…'}</p> : <>
      <div className="portal-stats"><div><strong>{students.length}</strong><span>Student sign-ups</span></div><div><strong>{students.length - activeStudents.length}</strong><span>Awaiting approval</span></div><div><strong>{completed} / {activeStudents.length}</strong><span>Have completed training</span></div><div><strong>{new Set(currentAssessments.map(a => a.user_id)).size} / {activeStudents.length}</strong><span>Have an assessment</span></div></div>
      <p className="portal-muted">Training and assessment figures cover approved students registered here, not the whole department workforce. Missing assessments mean “not yet assessed”.</p>
      <section className="portal-section"><h3>Invite your department</h3><p>Share this link so students can explore the levels before signing up. New students await your approval.</p><label>Department sign-up link<input readOnly value={joinLink.toString()} onFocus={e => e.target.select()} /></label></section>
      <section className="portal-section"><h3>Students</h3><label>Find a student<input type="search" value={filter} onChange={e => setFilter(e.target.value)} placeholder="Name or email" /></label>
        {!students.length ? <p>No students have signed up yet.</p> : <div className="portal-table-wrap"><table><thead><tr><th>Student</th><th>Starting level</th><th>Availability</th><th>Learning & connections</th><th>Membership</th></tr></thead><tbody>{students.filter(m => `${person(m.user_id)?.name} ${contact(m.user_id)}`.toLowerCase().includes(filter.toLowerCase())).map(m => {
          const p = person(m.user_id); const a = snapshot.affiliations.find(a => a.user_id === m.user_id && a.share_with_coordinators)
          return <tr key={m.user_id}><td><strong>{p?.name ?? 'Profile incomplete'}</strong><br /><a href={`mailto:${contact(m.user_id)}`}>{contact(m.user_id)}</a><small>Signed up {new Date(m.created_at).toLocaleDateString()}</small></td><td>{p ? `Level ${p.selected_level}` : 'Not selected'}<small>Self-selected</small></td><td>{p?.availability.join(', ') || 'Not provided'}<small>{p?.timezone}</small>{p?.availability_notes}</td><td>{p?.goals || 'No goals added'}{a?.affiliation && <p>Iwi / hapū: {a.affiliation}</p>}</td><td>{m.status === 'pending' ? <button disabled={busy} onClick={() => { void mutate(() => db.rpc('kp_approve_student', { dept: department.id, student: m.user_id }), 'Student approved.') }}>Approve student</button> : <span className="portal-badge">Approved</span>}</td></tr>
        })}</tbody></table></div>}
      </section>
      <section className="portal-section"><h3>Potential class times</h3><p className="portal-muted">Includes pending and approved sign-ups. Times are grouped by time zone; these are preferences, not bookings.</p><div className="portal-time-list">{[...availability].sort((a, b) => b[1].length - a[1].length).map(([slot, names]) => <details key={slot}><summary>{slot}<strong>{names.length} available</strong></summary><p>{names.join(', ')}</p></details>)}</div>{!availability.size && <p>No availability has been provided yet.</p>}</section>
      <section className="portal-section"><h3>Department standards</h3><p>Define your department’s expectations for te reo Māori, tikanga or workplace practice. Each result needs a dated assessment and supporting evidence.</p>
        {snapshot.standards.map(s => { const assessed = currentAssessments.filter(a => a.standard_id === s.id); const met = assessed.filter(a => a.outcome === 'met').length; return <div className="portal-standard" key={s.id}><h4>{s.title}</h4><p>{s.description}</p><div className="portal-standard-counts"><span>{met} meeting standard</span><span>{assessed.length - met} developing</span><span>{activeStudents.length - assessed.length} not yet assessed</span></div></div> })}
        {!snapshot.standards.length && <p>No standards have been defined yet.</p>}
        <details className="portal-editor"><summary>Add a department standard</summary><form className="portal-form" onSubmit={e => addRecord(e, 'standard')}><label>Standard name<input name="title" required maxLength={200} /></label><label>What meets this standard?<textarea name="description" maxLength={3000} required /></label><button className="portal-primary" disabled={busy}>Save standard</button></form></details>
      </section>
      <section className="portal-section"><h3>Training & assessment history</h3>{snapshot.training.map(t => <p key={t.id}>{person(t.user_id)?.name ?? contact(t.user_id)} · {t.title} · {t.status} · {t.recorded_on}</p>)}{[...snapshot.assessments].sort((a, b) => b.assessed_on.localeCompare(a.assessed_on)).map(a => <details key={a.id}><summary>{person(a.user_id)?.name ?? contact(a.user_id)} · {snapshot.standards.find(s => s.id === a.standard_id)?.title} · {a.outcome} · {a.assessed_on}</summary><p>{a.assessed_level ? `Assessed Level ${a.assessed_level}. ` : ''}{a.evidence}</p></details>)}{!snapshot.training.length && !snapshot.assessments.length && <p>No training or assessments recorded yet.</p>}
        <details className="portal-editor"><summary>Record training</summary><form className="portal-form" onSubmit={e => addRecord(e, 'training')}>{studentSelect}<label>Course or training name<input name="title" required maxLength={200} /></label><div className="portal-grid"><label>Status<select name="status"><option value="enrolled">Enrolled</option><option value="attending">Attending</option><option value="completed">Completed</option></select></label><label>Record date<input type="date" name="date" required defaultValue={today} max={today} /></label></div><button disabled={busy || !activeStudents.length} className="portal-primary">Save training record</button></form></details>
        <details className="portal-editor"><summary>Record an assessment</summary><form className="portal-form" onSubmit={e => addRecord(e, 'assessment')}>{studentSelect}<label>Department standard<select name="standard_id" required defaultValue=""><option value="" disabled>Choose a standard</option>{snapshot.standards.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}</select></label><div className="portal-grid"><label>Outcome<select name="outcome"><option value="developing">Developing</option><option value="met">Meets standard</option></select></label><label>Assessed language level · optional<select name="level"><option value="">Not assessed / not applicable</option>{[1, 2, 3, 4, 5, 6].map(n => <option key={n} value={n}>Level {n}</option>)}</select></label></div><label>Assessment date<input type="date" name="date" defaultValue={today} max={today} required /></label><label>Evidence and assessor details<textarea name="evidence" required maxLength={3000} /></label><button className="portal-primary" disabled={busy || !activeStudents.length || !snapshot.standards.length}>Save assessment</button></form></details>
      </section>
      <section className="portal-section"><h3>Coordinators</h3>{snapshot.members.filter(m => m.role === 'coordinator').map(m => <p key={m.user_id}>{person(m.user_id)?.name ?? contact(m.user_id)} <span className="portal-muted">{person(m.user_id)?.name ? contact(m.user_id) : ''}</span></p>)}<details className="portal-editor"><summary>Connect another coordinator</summary><p>They must first create and confirm their account. This grants access to this department’s student records, including affiliations students have chosen to share.</p><form className="portal-form" onSubmit={e => addRecord(e, 'coordinator')}><label>Coordinator email<input name="email" type="email" required /></label><button className="portal-primary" disabled={busy}>Grant coordinator access</button></form></details></section>
    </>}
  </section>
}
