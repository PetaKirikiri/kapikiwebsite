import { useCompanionReaction } from '../livingWorld/companionContext'
import ForestScene from '../livingWorld/ForestScene'
import ClayIcon from '../livingWorld/ClayIcon'
import LessonResourceIcon from './LessonResourceIcon'
import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { studentClient } from '../../lib/studentPortal/client'
import { useVerifiedStudentUser } from '../../lib/studentPortal/useVerifiedStudentUser'
import LearningSignIn from './LearningSignIn'
import PasswordSetup, { needsPasswordSetup } from './PasswordSetup'
import { loadLearning, meetingLink } from '../../lib/studentPortal/learning'
import type { LearningData } from '../../lib/studentPortal/learning'
import StudentWorkspace from './StudentWorkspace'
import '../SiteIdentity.css'
import { LEVEL_PRESENTATION } from '../../lib/coursePresentation'
import type { CurriculumLevel } from '../../lib/sentenceStructureLevels'
import './StudentPortal.css'
import './LearningPortal.css'
import './PortalHome.css'
import './PortalIdentity.css'
import { moeLessonSchedule } from '../../lib/moeOffer'

type LearningContent = { renderContent?: (level: CurriculumLevel, tab: 'practice' | 'vocabulary' | 'structures' | 'stories') => ReactNode }
export function LearningDashboard({ data, renderContent, account }: { data: LearningData; name?: string; account?: ReactNode } & LearningContent) {
  const react = useCompanionReaction()
  const [section, setSection] = useState<'lessons' | 'practice' | 'vocabulary' | 'structures'>('lessons')
  const [openNotes, setOpenNotes] = useState<number | null>(null)
  const [attendanceIntent, setAttendanceIntent] = useState<string[]>(() => {
    try { const saved: unknown = JSON.parse(sessionStorage.getItem('ka-piki:attendance-intent') ?? '[]'); return Array.isArray(saved) ? saved.filter((item): item is string => typeof item === 'string') : [] } catch { return [] }
  })
  function toggleAttendance(key: string) {
    if (!attendanceIntent.includes(key)) react('celebrate')
    setAttendanceIntent(current => {
      const next = current.includes(key) ? current.filter(item => item !== key) : [...current, key]
      try { sessionStorage.setItem('ka-piki:attendance-intent', JSON.stringify(next)) } catch { /* Keep the control usable when storage is unavailable. */ }
      return next
    })
  }
  const course = data.records.find(row => row.kind === 'course' && row.status === 'attending')
    ?? data.records.find(row => row.kind === 'course')
  const level = course?.level ?? data.interests[0]?.selected_level ?? (import.meta.env.DEV ? 1 : null)
  const prefix = window.location.hash.startsWith('#moe/') ? '#moe' : '#'
  if (!level) return <section className="learning-course-home">{account}<h1>My Learning</h1><p>No course assigned yet.</p></section>
  const title = LEVEL_PRESENTATION[level as keyof typeof LEVEL_PRESENTATION]?.title ?? course?.title
  const lessonLink = `${prefix === '#' ? '#' : `${prefix}/`}lessons`
  return <div className="student-learning-shell">
    <nav className="learning-stable-tabs" aria-label="My Learning">
      {([['lessons', 'Lessons'], ['practice', 'Practice'], ['vocabulary', 'Words'], ['structures', 'Sentence structures']] as const).map(([id, label]) => <button key={id} type="button" aria-pressed={section === id} onClick={() => { setSection(id); react('look-left') }}><ClayIcon kind={id}/><span>{label}</span></button>)}
      {account}
    </nav>
    <section className="learning-course-home">
    <header className="learning-page-heading site-card site-card-cover"><ForestScene /><div className="ka-heading-copy"><p><span className="learning-level-badge">Level {level}</span><span>{title}</span></p><h1>{section === 'lessons' ? 'Lessons' : section === 'practice' ? 'Practice' : section === 'vocabulary' ? 'Words' : 'Sentence structures'}</h1></div></header>
    <section hidden={section !== 'lessons'} aria-label="Lessons"><div className="learning-course-lessons site-card">
      {Array.from({ length: 10 }, (_, index) => index + 1).map(number => {
        const lesson = data.lessons?.find(item => item.level === level && item.lessonNumber === number)
        const attendanceKey = lesson?.id ?? `preview:${level}:${number}`
        const attending = attendanceIntent.includes(attendanceKey)
        const schedule = lesson ?? (prefix === '#moe' ? moeLessonSchedule(level, number) : null)
        const start = schedule ? new Date(schedule.startsAt) : null
        const end = schedule ? new Date(schedule.endsAt) : null
        const scheduled = start && end && Number.isFinite(start.getTime()) && Number.isFinite(end.getTime())
        const dateLabel = scheduled ? start.toLocaleDateString('en-NZ', { weekday: 'short', day: 'numeric', month: 'short', timeZone: schedule!.timezone }) : null
        const timeLabel = scheduled ? `${start.toLocaleTimeString('en-NZ', { hour: 'numeric', minute: '2-digit', timeZone: schedule!.timezone })} – ${end.toLocaleTimeString('en-NZ', { hour: 'numeric', minute: '2-digit', timeZoneName: 'short', timeZone: schedule!.timezone })}` : null
        const video = meetingLink(lesson?.videoUrl)
        const training = lesson?.trainingUrl?.startsWith('#') ? lesson.trainingUrl : meetingLink(lesson?.trainingUrl)
        const notes = lesson?.notes ?? []
        return <article className="learning-lesson-row" key={number} onPointerEnter={() => react(number % 2 ? 'look-left' : 'look-right')} onFocusCapture={() => react(number % 2 ? 'look-left' : 'look-right')}>
          <div className="learning-lesson-main">
            <a className="learning-lesson-open" href={`${lessonLink}?level=${level}&lesson=${number}`}><span className="learning-lesson-number" aria-hidden="true">{String(number).padStart(2, '0')}</span><span className="learning-lesson-copy"><span className="learning-lesson-label">Lesson {number}</span><span className="learning-lesson-schedule">{dateLabel ? <><time dateTime={schedule!.startsAt}>{dateLabel}</time><span>{timeLabel}</span></> : 'Date & time to be confirmed'}</span></span></a>
            <div className="learning-lesson-actions" aria-label={`Lesson ${number} resources`}>
              <button className={attending ? 'is-available' : 'lesson-attend'} aria-pressed={attending} aria-label={`${attending ? 'Cancel attendance confirmation for' : 'Confirm attendance for'} Lesson ${number}`} onClick={() => toggleAttendance(attendanceKey)}>{attending && <LessonResourceIcon kind="attend" />}{attending ? 'Attending' : "I’ll attend"}</button>
              {video ? <a className="is-available" href={video} target="_blank" rel="noopener noreferrer" aria-label={`Watch Lesson ${number} video`}><LessonResourceIcon kind="video" />Video</a> : <button disabled title="Video not available yet"><LessonResourceIcon kind="video" />Video</button>}
              <button className={notes.length ? 'is-available' : ''} disabled={!notes.length} aria-expanded={openNotes === number} onClick={() => setOpenNotes(openNotes === number ? null : number)}><LessonResourceIcon kind="notes" />Notes</button>
              {training ? <a className="is-available" href={training} aria-label={`Practise Lesson ${number}`}><LessonResourceIcon kind="practice" />Practice</a> : <button disabled title="Lesson exercises not available yet"><LessonResourceIcon kind="practice" />Practice</button>}
            </div>
          </div>
          {openNotes === number && notes.length > 0 && <div className="learning-lesson-notes">{notes.map((note, index) => <section key={index}><h3>{note.title}</h3><p>{note.body}</p></section>)}</div>}
        </article>
      })}
    </div></section>
    {section !== 'lessons' && <section aria-label={section}>{renderContent?.(level as CurriculumLevel, section)}</section>}
  </section></div>

}
export default function LearningPortal({ renderContent }: LearningContent) {
  if (import.meta.env.DEV) return <main className="learning-portal"><LearningDashboard renderContent={renderContent} data={{ records: [], training: [], interests: [], assessments: [], lessons: [] }} /></main>
  return <AuthenticatedLearningPortal renderContent={renderContent} />
}
export function AuthenticatedLearningPortal({ renderContent }: LearningContent) {
  const [data, setData] = useState<LearningData | null>(null)
  const [error, setError] = useState('')
  const [profile, setProfile] = useState(false)
  const [revision, setRevision] = useState(0)
  const { user, setUser, checking, error: authError } = useVerifiedStudentUser(() => { setData(null); setProfile(false); setError('') })
  useEffect(() => {
    if (!user || needsPasswordSetup(user)) return
    let active = true
    setError(''); setData(null)
    void loadLearning(user.id).then(result => { if (active) setData(result) }).catch(() => { if (active) setError('We couldn’t load your learning record. Please try again.') })
    return () => { active = false }
  }, [user, revision])
  async function signOut() { const result = await studentClient!.auth.signOut(); if (result.error) setError(result.error.message) }
  return <main className="learning-portal">
    {checking ? <p role="status">Opening your portal…</p> : !user ? <LearningSignIn /> : needsPasswordSetup(user) ? <PasswordSetup user={user} onComplete={setUser} onSignOut={() => void signOut()} /> : <>{profile ? <section className="student-portal learning-profile"><button onClick={() => setProfile(false)}>← My learning</button><StudentWorkspace user={user} level={1} departmentCode="" onSignOut={signOut} /></section> : data ? <LearningDashboard account={<details className="learning-account-menu"><summary aria-label="Account"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 22v-2a8 8 0 0 1 16 0v2"/></svg></summary><div><span>{user.email}</span><button onClick={() => setProfile(true)}>My profile</button><button onClick={() => void signOut()}>Sign out</button></div></details>} renderContent={renderContent} data={data} name={String(user.user_metadata.name ?? '').split(' ')[0]} /> : !error && <p role="status">Loading your learning record…</p>}</>}
    {(error || authError) && <p className="portal-error" role="alert">{error || authError} {user && <button onClick={() => setRevision(value => value + 1)}>Try again</button>}</p>}
  </main>
}
