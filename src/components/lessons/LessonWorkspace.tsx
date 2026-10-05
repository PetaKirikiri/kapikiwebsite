import { studentClient } from '../../lib/studentPortal/client'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import LessonQuestion from './LessonQuestion'
import { recogniseChatAnswer } from '../../lib/lessons/chatAnswer'
import { lessonRoomRequest, type LessonRoom, type LessonMessage } from '../../lib/lessons/liveLesson'
import KaPikiWordmark from '../KaPikiWordmark'
import JitsiClassCall from '../JitsiClassCall'
import '../SiteIdentity.css'
import './LessonWorkspace.css'

const levels = [1, 2, 3, 4, 5, 6]
const lessons = Array.from({ length: 10 }, (_, index) => index + 1)

type ChatMessage = LessonMessage
type ClassPerson = { id: number; name: string; raised: boolean }

function LessonChat({ lessonKey, prompt, sectionTitle, onPeople }: { lessonKey: string; prompt?: string; sectionTitle: string; onPeople: (people: ClassPerson[]) => void }) {
  const storageKey = `ka-piki:lesson-chat:${lessonKey}`
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved: unknown = JSON.parse(sessionStorage.getItem(storageKey) ?? '[]')
      return Array.isArray(saved) ? saved.flatMap(item => typeof item === 'string' ? [{ text: item }] : item && typeof item.text === 'string' ? [{ text: item.text, senderName: typeof item.senderName === 'string' ? item.senderName : undefined, feedback: item.feedback && typeof item.feedback.correct === 'boolean' && typeof item.feedback.text === 'string' ? item.feedback : null }] : []).slice(-100) : []
    } catch { return [] }
  })
  const [localName, setLocalName] = useState(() => {
    try { return sessionStorage.getItem('ka-piki:lesson-name') ?? '' } catch { return '' }
  })
  useEffect(() => {
    try { sessionStorage.setItem('ka-piki:lesson-name', localName) } catch { /* Keep chat usable. */ }
  }, [localName])
  useEffect(() => {
    if (!studentClient) return
    let active = true
    const loadName = async () => {
      const { data } = await studentClient!.auth.getUser()
      if (!data.user) return
      const { data: profile } = await studentClient!.from('kp_profiles').select('name').eq('user_id', data.user.id).maybeSingle()
      if (active && profile?.name) setLocalName(profile.name)
    }
    void loadName().catch(() => { /* A local name remains available if profile loading fails. */ })
    const { data: subscription } = studentClient.auth.onAuthStateChange(() => { void loadName().catch(() => { /* A local name remains available if profile loading fails. */ }) })
    return () => { active = false; subscription.subscription.unsubscribe() }
  }, [])
  const [draft, setDraft] = useState('')
  const [localHandRaised, setHandRaised] = useState(false)
  const [roomId] = useState(() => new URLSearchParams(window.location.hash.split('?')[1]).get('room') ?? '')
  const [room, setRoom] = useState<LessonRoom | null>(null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const revision = useRef(0)
  const activity = room?.state.lessonChats?.[lessonKey]
  const handRaised = room?.joined ? Boolean(activity?.hands[room.seat]) : localHandRaised
  useEffect(() => {
    onPeople(room?.joined ? room.members.map(member => ({ id: member.seat, name: member.name, raised: Boolean(activity?.hands[member.seat]) })) : [{ id: 1, name: localName.trim() || 'You', raised: localHandRaised }])
  }, [room, activity, localHandRaised, localName, onPeople])
  const shownMessages = room?.joined ? activity?.messages ?? [] : messages
  useEffect(() => {
    if (!roomId) return
    let stopped = false
    let timer: ReturnType<typeof setTimeout>
    const poll = async () => {
      const version = revision.current
      try {
        const next = await lessonRoomRequest(roomId)
        if (!stopped && version === revision.current) { setRoom(next); setError('') }
      } catch (e) { if (!stopped) setError(e instanceof Error ? e.message : 'Could not connect.') }
      if (!stopped) timer = setTimeout(poll, 1200)
    }
    void poll()
    return () => { stopped = true; clearTimeout(timer) }
  }, [roomId])
  const act = async (action: string, values: Record<string, unknown> = {}) => {
    revision.current++
    setPending(true)
    try {
      const next = await lessonRoomRequest(roomId, action, { lessonKey, ...values })
      revision.current++
      setRoom(next); setError('')
      return true
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not send. Try again.'); return false }
    finally { setPending(false) }
  }
  const log = useRef<HTMLDivElement>(null)
  const input = useRef<HTMLInputElement>(null)
  useEffect(() => {
    try { sessionStorage.setItem(storageKey, JSON.stringify(messages)) } catch { /* Keep the chat usable when browser storage is unavailable. */ }
    if (log.current) log.current.scrollTop = log.current.scrollHeight
  }, [messages, storageKey, activity?.messages.length])
  const send = async (event: FormEvent) => {
    event.preventDefault()
    const answer = draft.trim()
    if (!answer || (!room?.joined && !localName.trim()) || pending || (roomId && !room?.joined)) return
    if (room?.joined) {
      if (!await act('lesson-chat', { text: answer, mode: 'auto' })) return
    } else {
    const feedback = prompt ? recogniseChatAnswer('level-1-lesson-1-father', answer) : null
    setMessages(previous => [...previous, { text: answer, senderName: localName.trim(), feedback }].slice(-100))
    }
    setDraft('')
    input.current?.focus()
  }
  return <aside className="lesson-workspace-chat" aria-label="Class chat">
    <h2 className="lesson-chat-section-title">{sectionTitle}</h2>
    {error && <p role="alert" className="lesson-chat-feedback">{error}</p>}
    <div ref={log} className="lesson-workspace-messages" role="log" aria-label="Class messages" aria-live="polite">
      {prompt && <p className="lesson-chat-prompt"><small>Lesson</small><span lang="mi">{prompt}</span></p>}
      {shownMessages.map((message, index) => <div key={index}><p className="lesson-chat-answer"><small>{message.senderName || (room?.joined ? room.members.find(member => member.seat === message.seat)?.name || 'Student' : 'You')}</small>{message.text}{message.feedback?.correct && <span className="lesson-answer-tick" aria-label="Correct answer format" title="Correct answer format">✓</span>}</p></div>)}
    </div>
    <div className="lesson-chat-input-area">
    {!room?.joined && !localName.trim() && <input aria-label="Your chat name" placeholder="Your name" maxLength={60} onBlur={event => setLocalName(event.target.value.trim())} onKeyDown={event => { if (event.key === 'Enter') { setLocalName(event.currentTarget.value.trim()); input.current?.focus() } }} />}
    {prompt && <p id="lesson-answer-hint" className="lesson-answer-hint">Write Ko followed by your father’s name. <span className="lesson-answer-example">e.g. Ko Barry</span></p>}
    <div className="lesson-chat-input-controls">
    <div className="lesson-chat-tools"><button type="button" aria-label={handRaised ? 'Lower hand' : 'Raise hand'} title={handRaised ? 'Lower hand' : 'Raise hand'} aria-pressed={handRaised} disabled={pending || Boolean(roomId && !room?.joined)} onClick={() => { if (room?.joined) void act('lesson-hand', { raised: !handRaised }); else setHandRaised(value => !value) }}><span aria-hidden="true">✋</span></button></div>
    <form className="lesson-workspace-compose" onSubmit={event => void send(event)}>
      <input ref={input} aria-label="Message the class" aria-describedby={prompt ? 'lesson-answer-hint' : undefined} placeholder="Message…" value={draft} maxLength={1000} onChange={event => setDraft(event.target.value)} />
      <button type="submit" aria-label="Send message" disabled={pending || !draft.trim() || (!room?.joined && !localName.trim()) || Boolean(roomId && !room?.joined)}>↑</button>
    </form>
    </div>
    </div>
  </aside>
}

export default function LessonWorkspace() {
  const [people, setPeople] = useState<ClassPerson[]>([{ id: 1, name: 'You', raised: false }])
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    try { return sessionStorage.getItem('ka-piki:lesson-sidebar') !== 'closed' } catch { return true }
  })
  useEffect(() => {
    try { sessionStorage.setItem('ka-piki:lesson-sidebar', sidebarOpen ? 'open' : 'closed') } catch { /* Keep navigation usable without storage. */ }
  }, [sidebarOpen])
  const params = new URLSearchParams(window.location.hash.split('?')[1])
  const requestedLevel = Number(params.get('level'))
  const requestedLesson = Number(params.get('lesson'))
  const level = levels.includes(requestedLevel) ? requestedLevel : 1
  const lesson = lessons.includes(requestedLesson) ? requestedLesson : 1
  const roomParam = params.get('room')
  const title = `Level ${level} Lesson ${lesson}`
  const section = level === 1 && lesson === 1 ? { title: 'Your father', prompt: 'Ko wai tō matua?' } : null
  const route = window.location.hash.startsWith('#moe/') ? '#moe/lessons' : '#lessons'

  return <main className={`lesson-workspace${sidebarOpen ? '' : ' is-sidebar-collapsed'}`}>
    <aside id="lesson-navigation" className="lesson-workspace-sidebar" aria-hidden={!sidebarOpen}>
      <div className="lesson-sidebar-brand-row"><a className="lesson-workspace-brand" href="#my-learning" aria-label="Ka Piki · My learning"><KaPikiWordmark /></a><button className="lesson-sidebar-toggle" type="button" aria-label={sidebarOpen ? 'Hide sidebar' : 'Show sidebar'} title={sidebarOpen ? 'Hide lessons' : 'Show lessons'} aria-expanded={sidebarOpen} aria-controls="lesson-navigation" onClick={() => setSidebarOpen(open => !open)}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16"/><path d={sidebarOpen ? 'm16 9-3 3 3 3' : 'm13 9 3 3-3 3'}/></svg></button></div>
      <nav aria-label="Lessons">{levels.map(number => <details key={number} open={number === level}>
        <summary>Level {number}<span aria-hidden="true">⌄</span></summary>
        <div>{lessons.map(item => <a key={item} href={`${route}?level=${number}&lesson=${item}${roomParam ? `&room=${encodeURIComponent(roomParam)}` : ''}`} aria-current={number === level && item === lesson ? 'page' : undefined}>Lesson {item}</a>)}</div>
      </details>)}</nav>
      <a className="lesson-workspace-back" href={route === '#moe/lessons' ? '#moe' : '#my-learning?tab=courses'}>{route === '#moe/lessons' ? '← MOE offer' : '← Courses'}</a>
    </aside>
    <section className="lesson-workspace-classroom" aria-label={title}>
      {!sidebarOpen && <button className="lesson-sidebar-toggle" type="button" aria-label={sidebarOpen ? 'Hide sidebar' : 'Show sidebar'} title={sidebarOpen ? 'Hide lessons' : 'Show lessons'} aria-expanded={sidebarOpen} aria-controls="lesson-navigation" onClick={() => setSidebarOpen(open => !open)}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16"/><path d={sidebarOpen ? 'm16 9-3 3 3 3' : 'm13 9 3 3-3 3'}/></svg></button>}

      <div className="lesson-jitsi-panel"><JitsiClassCall roomId={roomParam || undefined} renderTrigger={open => <div className="lesson-camera-strip" aria-label="Class cameras">
        {[0, 1, 2, 3].map(seat => {
          const person = people.find(item => item.id === seat)
return <button type="button" onClick={open} key={seat} className={`lesson-camera-tile${person?.raised ? ' is-hand-raised' : ''}${!person ? ' is-empty' : ''}`} aria-label={`Open cameras and mic · ${person?.name ?? (seat === 0 ? 'Teacher' : 'Student')}`}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><rect x="3" y="6" width="12" height="12" rx="2"/><path d="m15 10 6-3v10l-6-3M3 3l18 18"/></svg>
            <span>{person?.name ?? (seat === 0 ? 'Teacher' : 'Student')}</span>
            {person?.raised && <b aria-label="Hand raised">✋</b>}
          </button>
        })}
      </div>} /></div>
      <div className="lesson-workspace-surface">
        <div className="lesson-workspace-canvas" aria-label="Lesson screen">{section && <LessonQuestion text={section.prompt} />}</div>
        <LessonChat onPeople={setPeople} key={`${level}:${lesson}`} lessonKey={`${level}:${lesson}`} sectionTitle={section?.title ?? title} prompt={section?.prompt} />
      </div>
    </section>
  </main>
}
