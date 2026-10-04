import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { studentClient } from '../../lib/studentPortal/client'
import LearningSignIn from './LearningSignIn'
import { attendanceSummary, loadLearning, statusLabel, meetingLink } from '../../lib/studentPortal/learning'
import type { LearningData } from '../../lib/studentPortal/learning'
import StudentWorkspace from './StudentWorkspace'
import KaPikiWordmark from '../KaPikiWordmark'
import ministryLogo from '../../assets/ministry-of-education-logo-white.svg'
import '../SiteIdentity.css'
import { LEVEL_PRESENTATION } from '../../lib/coursePresentation'
import { learningPreview } from '../../lib/studentPortal/learningPreview'
import './StudentPortal.css'
import './LearningPortal.css'
import './PortalHome.css'
import './PortalIdentity.css'

const tabs = ['Home', 'Courses', 'Attendance', 'Learning', 'Exercises & games', 'Scores', 'Notes'] as const
type Tab = typeof tabs[number]
function PortalIcon({ index }: { index: number }) {
  const paths = ['M3 10 12 3l9 7v11h-6v-7H9v7H3Z', 'M4 4h6l2 2 2-2h6v16h-6l-2 2-2-2H4ZM12 6v16', 'M4 5h16v16H4ZM4 10h16M8 3v4M16 3v4M8 14h2M14 14h2', 'M4 20v-5h4v5M10 20V9h4v11M16 20V4h4v16', 'M8 8h8l4 3 1 7-3 2-4-4h-4l-4 4-3-2 1-7ZM7 10v5M4.5 12.5h5M16 11h.01M18 14h.01', 'M8 3h8v7a4 4 0 0 1-8 0ZM8 5H4v3a4 4 0 0 0 4 4M16 5h4v3a4 4 0 0 1-4 4M12 14v5M8 21h8', 'M6 3h8l4 4v14H6ZM14 3v5h4M9 12h6M9 16h6', 'M4 4h13v10H9l-5 4ZM17 8h4v12l-4-3h-5v-3', 'M5 7h14v14H5ZM8 3h11l2 2M8 11h8M8 15h5', 'M3 6h12v12H3ZM15 10l6-4v12l-6-4'];
  return <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[index] ?? paths[1]} /></svg>
}
function date(value: string | null) { return value ? new Date(`${value.slice(0, 10)}T12:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '' }
export function LearningDashboard({ data, name }: { data: LearningData; name: string }) {
  const [tab, setTab] = useState<Tab>(() => new URLSearchParams(window.location.hash.split('?')[1]).get('tab') === 'courses' ? 'Courses' : 'Home')
  const [openNote, setOpenNote] = useState<string | null>(null)
  const attendance = attendanceSummary(data.records)
  const courses = data.records.filter(row => row.kind === 'course')
  const learned = data.records.filter(row => row.kind === 'learning')
  function emptyState(icon: number, message: string) {
    return <div className="portal-empty-state"><PortalIcon index={icon} /><p>{message}</p></div>
  }
  const courseList = <>
    <div className="portal-enrolled-grid">{courses.map((course) => <article key={course.id} className={`portal-enrolled-card site-card level-course-card-${course.level ?? 1}`}>
      <div className="portal-course-visual site-card-cover"><span className="portal-course-number">Level {course.level ?? '—'}</span><span className="level-course-sequence" aria-hidden="true">{[1, 2, 3, 4, 5, 6].map(step => <i key={step} className={step <= (course.level ?? 1) ? 'is-filled' : undefined} />)}</span><span className="portal-course-status">{statusLabel(course.status)}</span></div>
      <div className="portal-course-content"><h2>{course.level && course.level in LEVEL_PRESENTATION ? LEVEL_PRESENTATION[course.level as keyof typeof LEVEL_PRESENTATION].title : course.title}</h2>{course.detail && <p><PortalIcon index={2} />{course.detail}</p>}<a className="portal-open-course" href={`#lessons?level=${course.level ?? 1}&lesson=1`}>Open lessons <span aria-hidden="true">→</span></a></div>
    </article>)}</div>
    {!courses.length && !data.training.length && !data.interests.length && emptyState(1, 'No courses yet.')}
    {!!data.training.length && <div className="portal-enrolled-grid">{data.training.map(row => <article className="portal-training-card" key={row.id}><PortalIcon index={1} /><h2>{row.title}</h2><span className="portal-course-status">{statusLabel(row.status)}</span><small>{date(row.recorded_on)}</small></article>)}</div>}
    {data.interests.length > 0 && <section className="portal-interest-list"><h2>Registered interest</h2>{data.interests.map(row => <a key={row.id} href={`#levels/${row.selected_level}`}><span className="portal-interest-level">{row.selected_level}</span><span><strong>Level {row.selected_level}</strong><small>Interest registered · {date(row.created_at)}</small></span><span aria-hidden="true">→</span></a>)}</section>}
  </>
  const currentCourse = courses.find(row => row.status === 'attending') ?? courses[0]
  const level = currentCourse?.level ?? 1
  const levelLink = `${window.location.hash.startsWith('#moe/') ? '#moe/levels' : '#levels'}/${level}`
  const lessons = [...(data.lessons ?? [])].filter(lesson => lesson.level === level).sort((a, b) => a.startsAt.localeCompare(b.startsAt))
  const nextLesson = lessons.find(lesson => new Date(lesson.endsAt).getTime() >= Date.now())
  const noteLessons = lessons.filter(lesson => lesson.notes.length).reverse()
  const selectedNote = noteLessons.find(lesson => lesson.id === openNote)
  const joinUrl = meetingLink(nextLesson?.meetingUrl)
  const lessonDate = (value: string, timezone: string, options: Intl.DateTimeFormatOptions) => new Date(value).toLocaleString('en-NZ', { ...options, timeZone: timezone })
  const notesList = <div className="portal-lesson-list">{noteLessons.length ? noteLessons.map((lesson, index) => <button key={lesson.id} onClick={() => { setOpenNote(lesson.id); setTab('Notes') }}><span className="portal-note-icon"><PortalIcon index={6} /></span><span><small>{lessonDate(lesson.startsAt, lesson.timezone, { day: 'numeric', month: 'short' })}{index === 0 ? ' · Latest lesson' : ''}</small><strong>{lesson.title}</strong></span><span className="portal-note-action">Read notes <b aria-hidden="true">→</b></span></button>) : <p className="learning-empty">No class notes yet.</p>}</div>
  const activityTiles = <div className="portal-activity-grid">{[
    { title: 'Sentence practice', href: `${levelLink}?tab=practice`, icon: 7, tone: 'sage' },
    { title: 'Vocabulary', href: `${levelLink}?tab=vocabulary`, icon: 8, tone: 'sand' },
    { title: 'Reading', href: `${levelLink}?tab=stories`, icon: 1, tone: 'blue' },
  ].map(item => <a className={`portal-activity-tile portal-activity-${item.tone}`} key={item.title} href={item.href}><div className="portal-activity-symbol"><PortalIcon index={item.icon} /></div><span>{item.title}<b aria-hidden="true">→</b></span></a>)}</div>
  return <div className="portal-shell">
    <aside className="portal-sidebar"><div className="portal-brand-block"><a href="#moe" className="portal-logo" aria-label="Ka Piki"><KaPikiWordmark /></a>{window.location.hash.startsWith('#moe') && <img className="portal-moe-identity" src={ministryLogo} alt="Te Tāhuhu o te Mātauranga | Ministry of Education" />}</div>
      <nav className="learning-tabs" aria-label="Learning portal">{tabs.map((item, index) => <button key={item} aria-pressed={tab === item} onClick={() => { setTab(item); if (item === 'Notes') setOpenNote(null); document.querySelector('.portal-main')?.scrollTo({ top: 0 }) }}><PortalIcon index={index} /><span>{item === 'Home' ? 'Overview' : item === 'Learning' ? 'Progress' : item === 'Exercises & games' ? 'Practice' : item}</span></button>)}</nav>
      <div className="portal-student"><span className="portal-avatar">{name.slice(0, 1) || 'K'}</span><div><strong>{name || 'My account'}</strong><small>Student</small></div></div>
    </aside>
    <div className="portal-main"><header className="learning-heading"><div><span className="portal-eyebrow">{tab === 'Home' ? 'YOUR LEARNING' : 'KA PIKI'}</span><h1>{tab === 'Home' ? 'Kia ora' + (name ? `, ${name}` : '') : tab === 'Learning' ? 'Progress' : tab === 'Exercises & games' ? 'Practice' : tab}</h1></div>{tab !== 'Courses' && <button className="portal-browse" onClick={() => { setTab('Courses'); setOpenNote(null) }}>My courses →</button>}</header>
    {tab === 'Home' ? <>
      <section className={`portal-focus-card site-card site-card-cover level-course-card-${level}`}>
        <div className="portal-focus-copy"><span className="portal-focus-level">LEVEL {level}</span><h2>{nextLesson?.title ?? currentCourse?.title ?? 'Your next course'}</h2>
          <div className="portal-focus-schedule"><PortalIcon index={2} /><span>{nextLesson ? lessonDate(nextLesson.startsAt, nextLesson.timezone, { weekday: 'long', day: 'numeric', month: 'short' }) : 'Class time to be confirmed'}</span>{nextLesson && <span className="portal-focus-time">{lessonDate(nextLesson.startsAt, nextLesson.timezone, { hour: 'numeric', minute: '2-digit' })} – {lessonDate(nextLesson.endsAt, nextLesson.timezone, { hour: 'numeric', minute: '2-digit' })}</span>}</div>
          <div className="portal-focus-actions">{joinUrl ? <a className="portal-focus-primary" href={joinUrl} target="_blank" rel="noopener noreferrer"><PortalIcon index={9} />Join class <span>↗</span></a> : noteLessons[0] ? <button className="portal-focus-primary" onClick={() => { setOpenNote(noteLessons[0].id); setTab('Notes') }}><PortalIcon index={6} />Open latest notes <span>→</span></button> : <a className="portal-focus-primary" href={`#lessons?level=${level}&lesson=1`}><PortalIcon index={1} />Open lessons <span>→</span></a>}{!joinUrl && <span className="portal-focus-pending"><PortalIcon index={9} />Class link coming soon</span>}</div>
        </div>
      </section>
      <section className="portal-home-practice"><header><h2>Practice</h2><a href={`${levelLink}?tab=practice`}>Open practice →</a></header>{activityTiles}</section>
      <section className="portal-home-notes"><header><h2>Lesson notes</h2><button onClick={() => { setOpenNote(null); setTab('Notes') }}>All notes →</button></header>{notesList}</section>
    </> : <section className={`portal-page portal-page-${tab === 'Exercises & games' ? 'practice' : tab.toLowerCase()}`} aria-label={tab === 'Learning' ? 'Progress' : tab}>
      {tab === 'Notes' && (selectedNote ? <article className="portal-note-reader"><button onClick={() => setOpenNote(null)}>← All lesson notes</button><div className="portal-note-reader-heading"><span className="portal-note-icon"><PortalIcon index={6} /></span><div><p className="portal-eyebrow">{lessonDate(selectedNote.startsAt, selectedNote.timezone, { day: 'numeric', month: 'long', year: 'numeric' })}</p><h2>{selectedNote.title}</h2></div></div>{selectedNote.notes.map(note => <section key={note.title}><h3>{note.title}</h3><p>{note.body}</p></section>)}<a href={`${levelLink}?tab=stories`}>Open course reading →</a></article> : <div className="portal-home-notes portal-notes-library">{notesList}</div>)}
      {tab === 'Courses' && courseList}
      {tab === 'Attendance' && <>{attendance.total > 0 && <div className="portal-attendance-summary"><span className="portal-attendance-ring" style={{ background: `conic-gradient(#477d60 ${attendance.percent ?? 0}%, #e2e8dc 0)` }}><strong>{attendance.percent}%</strong></span><div><strong>{attendance.present} of {attendance.total} classes attended</strong><div className="portal-attendance-key"><span>✓ Present</span><span>− Absent</span><span>· Excused</span></div></div></div>}<div className="portal-session-grid">{data.records.filter(row => row.kind === 'attendance').map(row => <article key={row.id} className={`portal-session-card portal-session-${row.status}`}><span className="portal-session-mark" aria-hidden="true">{row.status === 'present' ? '✓' : row.status === 'absent' ? '−' : '·'}</span><div><small>{date(row.occurred_on)}</small><h2>{row.title}</h2></div><span>{statusLabel(row.status)}</span></article>)}</div>{!data.records.some(row => row.kind === 'attendance') && emptyState(2, 'No attendance yet.')}</>}
      {tab === 'Learning' && <><div className="portal-progress-grid">{learned.map(row => <article key={row.id} className="portal-progress-card"><span className={`portal-progress-icon ${row.status === 'completed' ? 'complete' : ''}`}><PortalIcon index={row.status === 'completed' ? 5 : 7} /></span><div><span className="portal-progress-status">{statusLabel(row.status)}</span><h2>{row.title}</h2>{row.detail && <p>{row.detail}</p>}<small>{date(row.occurred_on)}</small></div></article>)}</div>{!learned.length && emptyState(3, 'No learning added yet.')}{data.assessments.length > 0 && <section className="portal-assessment-list"><h2>Assessments</h2>{data.assessments.map(row => <article key={row.id}><PortalIcon index={5} /><div><strong>{statusLabel(row.outcome)}{row.assessed_level ? ` · Level ${row.assessed_level}` : ''}</strong><p>{row.evidence}</p><small>{date(row.assessed_on)}</small></div></article>)}</section>}</>}
      {tab === 'Exercises & games' && <div className="portal-home-practice portal-practice-library"><div className="portal-context-pill"><PortalIcon index={1} />Level {level}</div>{activityTiles}</div>}
      {tab === 'Scores' && <>{data.records.some(row => row.kind === 'score') ? <div className="portal-score-grid">{data.records.filter(row => row.kind === 'score').map(row => <article key={row.id} className="portal-score-card"><header><PortalIcon index={5} /><span>{date(row.occurred_on)}</span></header><h2>{row.title}</h2><strong>{row.score ?? '—'}{row.total != null ? ` / ${row.total}` : row.score != null ? ' points' : ''}</strong>{row.score != null && row.total != null && <progress value={row.score} max={row.total} aria-label={`${row.title} score`} />}{row.detail && <p>{row.detail}</p>}</article>)}</div> : emptyState(5, 'No scores yet.')}</>}
    </section>}

    </div></div>
}
export default function LearningPortal() {
  if (import.meta.env.DEV) return <main className="learning-portal"><LearningDashboard data={learningPreview} name="Aroha" /></main>
  return <AuthenticatedLearningPortal />
}
function AuthenticatedLearningPortal() {
  const [user, setUser] = useState<User | null>(null)
  const [checking, setChecking] = useState(true)
  const [data, setData] = useState<LearningData | null>(null)
  const [error, setError] = useState('')
  const [profile, setProfile] = useState(false)
  const [revision, setRevision] = useState(0)
  useEffect(() => {
    if (!studentClient) { setChecking(false); return }
    let active = true
    void studentClient.auth.getSession().then(({ data, error }) => { if (active) { setUser(data.session?.user ?? null); setChecking(false); if (error) setError(error.message) } })
    const { data: listener } = studentClient.auth.onAuthStateChange((_event, session) => { setUser(session?.user ?? null); setData(null); setProfile(false); setError(''); setChecking(false) })
    return () => { active = false; listener.subscription.unsubscribe() }
  }, [])
  useEffect(() => {
    if (!user) return
    let active = true
    setError(''); setData(null)
    void loadLearning(user.id).then(result => { if (active) setData(result) }).catch(() => { if (active) setError('We couldn’t load your learning record. Please try again.') })
    return () => { active = false }
  }, [user, revision])
  async function signOut() { const result = await studentClient!.auth.signOut(); if (result.error) setError(result.error.message) }
  return <main className="learning-portal">
    {checking ? <p role="status">Opening your portal…</p> : !user ? <LearningSignIn /> : <><div className="learning-account"><span>{user.email}</span><button onClick={() => setProfile(!profile)}>{profile ? 'Back to my learning' : 'My profile'}</button><button onClick={() => void signOut()}>Sign out</button></div>{profile ? <section className="student-portal learning-profile"><StudentWorkspace user={user} level={1} departmentCode="" onSignOut={signOut} /></section> : data ? <LearningDashboard data={data} name={String(user.user_metadata.name ?? '').split(' ')[0]} /> : !error && <p role="status">Loading your learning record…</p>}</>}
    {error && <p className="portal-error" role="alert">{error} {user && <button onClick={() => setRevision(value => value + 1)}>Try again</button>}</p>}
  </main>
}
