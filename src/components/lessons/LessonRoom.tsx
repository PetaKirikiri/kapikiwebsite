import SupportedText from '../SupportedText'
import { useEffect, useState } from 'react'
import { errorMessage, studentClient } from '../../lib/studentPortal/client'
import { lessonClient, lessonRpc, previewSteps, safeResource } from '../../lib/lessons/client'
import type { LessonPlan, LessonSession, LessonStep } from '../../lib/lessons/client'
import './LessonRoom.css'
import JitsiClassCall from '../JitsiClassCall'

export function LessonScreen({ step }: { step: LessonStep }) {
 return <section className="lesson-screen" aria-live="polite"><span className="lesson-kind">{step.kind.replace('_', ' ')}{step.duration_minutes ? ` · ${step.duration_minutes} min` : ''}</span><h2>{step.title}</h2>{step.prompt_mi && <p lang="mi" className="lesson-prompt"><SupportedText text={step.prompt_mi} /></p>}{step.prompt_en && <p>{step.prompt_en}</p>}<div className="lesson-items">{step.items.map(item => {
 const url = safeResource(item.resource_url)
 return <article key={item.id} className={`lesson-item lesson-item-${item.kind}`}>
 {item.text_mi && <p lang="mi"><SupportedText text={item.text_mi} /></p>}{item.text_en && <p className="lesson-meaning">{item.text_en}</p>}
 {url && item.kind === 'image' && <img src={url} alt={item.alt_text} />}
 {url && item.kind === 'audio' && <audio controls src={url} aria-label={item.alt_text || item.text_mi || 'Lesson audio'} />}
 {url && item.kind === 'video' && <video controls src={url} aria-label={item.alt_text || 'Lesson video'} />}
 {url && item.kind === 'link' && <a href={url} target="_blank" rel="noopener noreferrer">{item.alt_text || 'Open resource'} ↗</a>}
 </article>
 })}</div></section>
}

export default function LessonRoom() {
 const params = new URLSearchParams(window.location.hash.split('?')[1])
 const sessionId = params.get('session')
 const preview = params.has('preview')
 const [user, setUser] = useState<string | null>(null)
 const [checked, setChecked] = useState(!studentClient)
 const [teacher, setTeacher] = useState(false)
 const [plans, setPlans] = useState<LessonPlan[]>([])
 const [room, setRoom] = useState<LessonSession | null>(null)
 const [error, setError] = useState('')
 const [busy, setBusy] = useState(false)
 const [previewIndex, setPreviewIndex] = useState(0)
 const [revealed, setRevealed] = useState(false)
 const [level, setLevel] = useState(1)
 const [editing, setEditing] = useState<LessonPlan | null>(null)
 useEffect(() => {
  if (!studentClient) return
  const { data } = studentClient.auth.onAuthStateChange((_event, session) => { setUser(session?.user.id ?? null); setChecked(true) })
  void studentClient.auth.getSession().then(({ data, error }) => { if (error) setError(error.message); setUser(data.session?.user.id ?? null); setChecked(true) })
  return () => data.subscription.unsubscribe()
 }, [])
 useEffect(() => {
  if (!user || preview) return
  let cancelled = false
  void lessonRpc<boolean>('kp_is_lesson_teacher').then(async allowed => {
   if (cancelled) return
   setTeacher(allowed)
   if (allowed) {
    const { data, error } = await lessonClient().from('kp_lesson_plans').select('*').order('lesson_number')
    if (error) throw error
    if (!cancelled) setPlans(data ?? [])
   }
  }).catch(error => { if (!cancelled) setError(errorMessage(error)) })
  return () => { cancelled = true }
 }, [user, preview, editing])
 useEffect(() => {
  if (!sessionId || !user || preview) return
  let cancelled = false
  let timer: ReturnType<typeof setTimeout>
  const poll = async () => {
   try { const next = await lessonRpc<LessonSession>('kp_read_lesson_session', { p_session: sessionId }); if (!cancelled) { setRoom(previous => previous && previous.revision > next.revision ? previous : next); setError('') } }
   catch (error) { if (!cancelled) setError(`Connection interrupted. ${errorMessage(error)}`) }
   finally { if (!cancelled) timer = setTimeout(poll, 1000) }
  }
  void poll()
  return () => { cancelled = true; clearTimeout(timer) }
 }, [sessionId, user, preview])
 async function action(work: () => Promise<void>) {
  setBusy(true); setError('')
  try { await work() } catch (error) { setError(errorMessage(error)) } finally { setBusy(false) }
 }
 const go = (id: string) => { window.location.hash = `#lessons?session=${id}` }
 const change = async (index: number, show: boolean, end = false) => {
  if (preview) { setPreviewIndex(index); setRevealed(show); return }
  if (!room) return
  await action(async () => {
   await lessonRpc('kp_advance_lesson', { p_session: room.id, p_revision: room.revision, p_step: index, p_revealed: show, p_end: end })
   setRoom(await lessonRpc<LessonSession>('kp_read_lesson_session', { p_session: room.id }))
  })
 }
 const step = preview ? { ...previewSteps[previewIndex]!, items: previewSteps[previewIndex]!.items.filter(item => revealed || !item.reveal_only) } : room?.step
 const index = preview ? previewIndex : room?.current_step ?? 0
 const count = preview ? previewSteps.length : room?.step_count ?? 0
 const show = preview ? revealed : room?.revealed ?? false
 const controls = preview || room?.is_teacher
 return <main className="lesson-page"><header className="lesson-heading"><a href="#my-learning">← My learning</a><span>{preview ? 'Preview' : room ? room.status === 'ended' ? 'Class ended' : error ? 'Reconnecting…' : 'Live class' : 'Lessons'}</span></header>
 {error && <p className="lesson-error" role="alert">{error}</p>}
 {room?.status !== 'ended' && <JitsiClassCall key={room?.id ?? 'test'} roomId={room?.id} />}
 {editing ? <LessonEditor plan={editing} onClose={() => setEditing(null)} /> : step ? <>
 <div className="lesson-title"><div><small>Level {preview ? 1 : room?.level} · Lesson {preview ? 1 : room?.lesson_number}</small><h1>{preview ? 'Pepeha' : room?.title}</h1></div>{room?.join_code && <div className="lesson-code"><small>Class code</small><strong>{room.join_code}</strong></div>}</div>
 <LessonScreen step={step} />
 <footer className="lesson-controls"><span>Step {index + 1} / {count}</span>{controls && room?.status !== 'ended' ? <><button disabled={busy || !!error || index === 0} onClick={() => void change(index - 1, false)}>← Back</button><button disabled={busy || !!error} aria-pressed={show} onClick={() => void change(index, !show)}>{show ? 'Hide answers' : 'Reveal answers'}</button><button disabled={busy || !!error || index === count - 1} onClick={() => void change(index + 1, false)}>Next →</button>{!preview && <button disabled={busy || !!error} onClick={() => void change(index, show, true)}>End class</button>}</> : <span>{room?.status === 'ended' ? 'Class ended' : 'Following teacher'}</span>}</footer>
 </> : <><h1>Lessons</h1>{!checked ? <p role="status">Loading…</p> : !user ? <p><a href="#my-learning">Sign in</a> to teach or join a class.</p> : sessionId ? <p role="status">Opening class…</p> : <>
 <form className="lesson-join" onSubmit={event => { event.preventDefault(); const code = String(new FormData(event.currentTarget).get('code')); void action(async () => go(await lessonRpc<string>('kp_join_lesson', { p_code: code }))) }}><label>Class code<input name="code" required maxLength={10} autoComplete="off" /></label><button disabled={busy}>Join class</button></form>
 {teacher && <><label className="lesson-level">Level <select value={level} onChange={event => setLevel(Number(event.target.value))}>{[1,2,3,4,5,6].map(n => <option key={n}>{n}</option>)}</select></label><div className="lesson-library">{plans.filter(plan => plan.level === level).map(plan => <article key={plan.id}><small>Lesson {plan.lesson_number} · {plan.status}</small><h2>{plan.title}</h2><button onClick={() => setEditing(plan)}>Edit lesson</button>{plan.status === 'published' && <button disabled={busy} onClick={() => void action(async () => go(await lessonRpc<string>('kp_start_lesson', { p_lesson: plan.id })))}>Start class →</button>}</article>)}</div></>}
 </>}<a className="lesson-preview-link" href="#lessons?preview">View sample lesson →</a></>}
 </main>
}

function LessonEditor({ plan, onClose }: { plan: LessonPlan; onClose: () => void }) {
 const [steps, setSteps] = useState<LessonStep[]>([])
 const [error, setError] = useState('')
 const [busy, setBusy] = useState(false)
 const [ready, setReady] = useState(false)
 const [notes, setNotes] = useState<Record<string, { preparation: string; teaching_notes: string }>>({})
 async function load() {
  const { data, error } = await lessonClient().from('kp_lesson_steps').select('*, items:kp_lesson_items(*)').eq('lesson_id', plan.id).order('position')
  if (error) throw error
  setSteps((data ?? []).map(step => ({ ...step, items: step.items.sort((a: { position: number }, b: { position: number }) => a.position - b.position) })))
  const ids = (data ?? []).map(step => step.id)
  if (ids.length) {
   const result = await lessonClient().from('kp_lesson_teacher_notes').select('*').in('step_id', ids)
   if (result.error) throw result.error
   setNotes(Object.fromEntries((result.data ?? []).map(note => [note.step_id, note])))
  }
  setReady(true)
 }
 // load only updates state after its database requests resolve.
 // eslint-disable-next-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps
 useEffect(() => { void load().catch(error => setError(errorMessage(error))) }, [plan.id])
 async function save(table: string, values: object) {
  const result = await lessonClient().from(table).upsert(values)
  if (result.error) throw result.error
 }
 async function act(work: () => Promise<void>) {
  setBusy(true); setError('')
  try { await work(); await load() } catch (error) { setError(errorMessage(error)) } finally { setBusy(false) }
 }
 return <section className="lesson-editor"><button onClick={onClose}>← All lessons</button><h1>Level {plan.level} · Lesson {plan.lesson_number}</h1>{error && <p role="alert">{error}</p>}
 <form onSubmit={event => { event.preventDefault(); const fields = new FormData(event.currentTarget); void act(async () => save('kp_lesson_plans', { ...plan, title: fields.get('title'), outcomes: String(fields.get('outcomes')).split('\n').map(s => s.trim()).filter(Boolean), status: fields.get('status') })) }}>
 <label>Title<input name="title" defaultValue={plan.title} required maxLength={200} /></label><label>Learning outcomes<textarea name="outcomes" defaultValue={plan.outcomes.join('\n')} /></label><label>Status<select name="status" defaultValue={plan.status}><option value="draft">Draft</option><option value="published" disabled={!steps.length}>Published</option><option value="archived">Archived</option></select></label><button disabled={busy || !ready}>Save lesson</button></form>
 {steps.map(step => <details key={step.id} open><summary>{step.position + 1}. {step.title}</summary><form onSubmit={event => { event.preventDefault(); const f = new FormData(event.currentTarget); void act(async () => {
 await save('kp_lesson_steps', { id: step.id, lesson_id: plan.id, position: step.position, title: f.get('title'), kind: f.get('kind'), prompt_mi: f.get('mi'), prompt_en: f.get('en'), duration_minutes: Number(f.get('minutes')) || null })
 await save('kp_lesson_teacher_notes', { step_id: step.id, preparation: f.get('preparation'), teaching_notes: f.get('notes') })
 }) }}><label>Activity title<input name="title" defaultValue={step.title} required maxLength={200} /></label><label>Activity<select name="kind" defaultValue={step.kind}>{['welcome','review','learn','listen','read','speak','activity','check','wrap_up'].map(kind => <option key={kind} value={kind}>{kind.replace('_',' ')}</option>)}</select></label><label>Māori prompt<textarea name="mi" defaultValue={step.prompt_mi} /></label><label>English prompt<textarea name="en" defaultValue={step.prompt_en} /></label><label>Minutes<input name="minutes" type="number" min="1" defaultValue={step.duration_minutes ?? ''} /></label><label>Preparation · teacher only<textarea name="preparation" defaultValue={notes[step.id]?.preparation} /></label><label>Teaching notes · teacher only<textarea name="notes" defaultValue={notes[step.id]?.teaching_notes} /></label><button disabled={busy}>Save activity</button></form>
 {step.items.map(item => <form key={item.id} onSubmit={event => { event.preventDefault(); const f = new FormData(event.currentTarget); void act(async () => save('kp_lesson_items', { ...item, step_id: step.id, kind: f.get('kind'), text_mi: f.get('mi'), text_en: f.get('en'), resource_url: f.get('url') || null, alt_text: f.get('alt'), reveal_only: f.has('reveal') })) }}><label>Content<select name="kind" defaultValue={item.kind}>{['word','kiwaha','phrase','sentence','reading','image','audio','video','link'].map(kind => <option key={kind}>{kind}</option>)}</select></label><label>Māori<textarea name="mi" defaultValue={item.text_mi} /></label><label>English<textarea name="en" defaultValue={item.text_en} /></label><label>Resource URL<input name="url" type="url" pattern="https://.*" defaultValue={item.resource_url ?? ''} /></label><label>Resource description<input name="alt" defaultValue={item.alt_text} /></label><label className="lesson-checkbox"><input name="reveal" type="checkbox" defaultChecked={item.reveal_only} />Show on reveal</label><button disabled={busy}>Save content</button></form>)}
 <button disabled={busy} onClick={() => void act(async () => save('kp_lesson_items', { step_id: step.id, position: Math.max(-1, ...step.items.map(item => item.position)) + 1, kind: 'sentence' }))}>+ Content</button></details>)}
 <button disabled={busy || !ready} onClick={() => void act(async () => save('kp_lesson_steps', { lesson_id: plan.id, position: Math.max(-1, ...steps.map(step => step.position)) + 1, kind: 'learn', title: 'New activity' }))}>+ Activity</button>
 </section>
}
