import { useWordSupport } from '../useWordSupport'
import { wordSupportTarget } from '../../lib/connectorPresentation/wordSupport'
import SupportedText from '../SupportedText'
import TwilightCursor from '../livingWorld/TwilightCursor'
import ForestScene from '../livingWorld/ForestScene'
import { LessonStages, LessonStagePanel, LessonWrapUp } from './LessonStages'
import LessonEmblem, { stageIdentityStyle } from './LessonEmblem'
import { moeLessonSchedule } from '../../lib/moeOffer'
import { bigWordQuestions, bigWordQuestionGroups } from '../../lib/lessons/bigWordQuestions'
import { savePepehaAnswer } from '../../lib/studentPortal/pepeha'
import { studentClient } from '../../lib/studentPortal/client'
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import LessonQuestion from './LessonQuestion'
import LessonBigWords from './LessonBigWords'
import LessonWarmUp, { type WarmUpPosition } from './LessonWarmUp'
import { lessonWarmUp, warmUpQuestion } from '../../lib/lessons/warmUp'
import LessonBreakout from './LessonBreakout'
import { recogniseChatAnswer } from '../../lib/lessons/chatAnswer'
import { lessonRoomRequest, type LessonRoom, type LessonMessage } from '../../lib/lessons/liveLesson'
import KaPikiWordmark from '../KaPikiWordmark'
import LessonCameras, { type ClassPerson } from './LessonCameras'
import LessonWhiteboard from './LessonWhiteboard'
import '../SiteIdentity.css'
import './LessonWorkspace.css'
import './ClassroomIdentity.css'
import './TeachingStage.css'
import './ClassroomDepth.css'
import './LessonOverview.css'
import './LessonStageIdentity.css'
import './ClassroomCoastal.css'
import './LessonCameras.css'
import './LessonContent.css'
import './LessonSoftClay.css'
import '../livingWorld/TwilightCursor.css'

const levels = [1, 2, 3, 4, 5, 6]
const lessons = Array.from({ length: 10 }, (_, index) => index + 1)



type ChatMessage = LessonMessage

function LessonChat({ lessonKey, prompts, questionIndex, onPeople }: { lessonKey: string; prompts?: readonly { id: number; text: string }[]; questionIndex: number; onPeople: (people: ClassPerson[]) => void }) {
  const storageKey = `ka-piki:lesson-chat:${lessonKey}`
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved: unknown = JSON.parse(sessionStorage.getItem(storageKey) ?? '[]')
      return Array.isArray(saved) ? saved.flatMap(item => typeof item === 'string' ? [{ text: item }] : item && typeof item.text === 'string' ? [{ text: item.text, questionIndex: Number.isInteger(item.questionIndex) ? item.questionIndex : 0, senderName: typeof item.senderName === 'string' ? item.senderName : undefined, feedback: item.feedback && typeof item.feedback.correct === 'boolean' && typeof item.feedback.text === 'string' ? item.feedback : null }] : []).slice(-100) : []
    } catch { return [] }
  })
  const [localName, setLocalName] = useState('')
  const [localUserId, setLocalUserId] = useState<string>()
  const [identityStatus, setIdentityStatus] = useState<'loading' | 'ready' | 'error'>(studentClient ? 'loading' : 'error')
  const [identityRetry, setIdentityRetry] = useState(0)
  useEffect(() => {
    if (!studentClient) return
    const client = studentClient
    let active = true
    let version = 0
    let timer: ReturnType<typeof setTimeout> | undefined
    const loadName = async () => {
      const request = ++version
      setLocalUserId(undefined)
      setLocalName('')
      setIdentityStatus('loading')
      try {
        const { data, error: authError } = await client.auth.getUser()
        if (authError || !data.user) throw new Error('Sign in required')
        const { data: profile, error: profileError } = await client.from('kp_profiles').select('name').eq('user_id', data.user.id).maybeSingle()
        if (profileError || !profile?.name?.trim()) throw new Error('Profile unavailable')
        if (active && request === version) { setLocalUserId(data.user.id); setLocalName(profile.name.trim()); setIdentityStatus('ready') }
      } catch {
        if (active && request === version) setIdentityStatus('error')
      }
    }
    void loadName()
    const { data: subscription } = client.auth.onAuthStateChange(() => {
      // Run profile requests outside the auth callback's lock.
      version++
      setLocalUserId(undefined)
      setLocalName('')
      setIdentityStatus('loading')
      clearTimeout(timer)
      timer = setTimeout(() => { void loadName() }, 0)
    })
    return () => { active = false; clearTimeout(timer); subscription.subscription.unsubscribe() }
  }, [identityRetry])
  const [draft, setDraft] = useState('')
  const [pepehaStatus, setPepehaStatus] = useState('')
  const [localHandRaised, setHandRaised] = useState(false)
  const [roomId] = useState(() => new URLSearchParams(window.location.hash.split('?')[1]).get('room') ?? '')
  const [room, setRoom] = useState<LessonRoom | null>(null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const revision = useRef(0)
  const activity = room?.state.lessonChats?.[lessonKey]
  const handRaised = room?.joined ? Boolean(activity?.hands[room.seat]) : localHandRaised
  useEffect(() => {
    onPeople(room?.joined ? room.members.map(member => ({ id: member.seat, userId: member.userId, name: member.name, raised: Boolean(activity?.hands[member.seat]), local: member.seat === room.seat })) : [{ id: 1, userId: localUserId, name: localName.trim() || 'You', raised: localHandRaised, local: true }])
  }, [room, activity, localHandRaised, localName, localUserId, onPeople])
  useEffect(() => {
    if (!room?.joined || !localUserId) return
    let active = true
    void lessonRoomRequest(roomId, 'lesson-identity').then(next => { if (active) setRoom(next) }).catch(() => { /* Unlinked profiles remain unavailable. */ })
    return () => { active = false }
  }, [roomId, room?.joined, localUserId])
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
  }, [messages, storageKey, activity?.messages.length, prompts?.length])
  const send = async (event: FormEvent) => {
    event.preventDefault()
    const answer = draft.trim()
    if (!answer || (!room?.joined && !localName.trim()) || pending || (roomId && !room?.joined)) return
    if (room?.joined) {
      if (!await act('lesson-chat', { text: answer, mode: 'auto', questionIndex })) return
    } else {
    const feedback = prompts?.length && questionIndex < 4 ? recogniseChatAnswer('level-1-lesson-1-big-words', answer) : null
    setMessages(previous => [...previous, { text: answer, questionIndex, senderName: localName.trim(), feedback }].slice(-100))
    }
    if (lessonKey === '1:1' && prompts?.length) {
      try {
        setPending(true)
        const saved = await savePepehaAnswer(questionIndex, answer, localName)
        if (saved) setPepehaStatus(saved === 'account' ? 'Saved to your pepeha' : 'Pepeha saved on this device')
      } catch { setPepehaStatus('Pepeha could not save. Send your answer again to retry.') }
      finally { setPending(false) }
    }
    setDraft('')
    input.current?.focus()
  }
  return <aside className="lesson-workspace-chat" aria-label="Class chat">
    {error && <p role="alert" className="lesson-chat-feedback">{error}</p>}
    <div ref={log} className="lesson-workspace-messages" role="log" aria-label="Class messages" aria-live="polite">
      {(prompts ?? [{ id: -1, text: '' }]).map(prompt => <div key={prompt.id}>
        {prompt.text && <p className="lesson-chat-prompt"><small>Lesson</small><span lang="mi"><SupportedText text={prompt.text} /></span></p>}
        {shownMessages.filter(message => !prompts || (message.questionIndex ?? 0) === prompt.id).map((message, i) => <p key={i} className="lesson-chat-answer"><small>{message.senderName || (room?.joined ? room.members.find(member => member.seat === message.seat)?.name || 'Student' : 'You')}</small>{message.text}{message.feedback?.correct && <span className="lesson-answer-tick" aria-label="Correct answer format">✓</span>}</p>)}
      </div>)}
    </div>
    <div className="lesson-chat-input-area">
    {!room?.joined && identityStatus === 'loading' && <small role="status">Loading your profile…</small>}
    {!room?.joined && identityStatus === 'error' && <p role="alert" className="lesson-chat-feedback">Your profile couldn’t load. <button type="button" onClick={() => setIdentityRetry(value => value + 1)}>Retry</button></p>}
    {Boolean(prompts?.length) && questionIndex < 4 && <p id="lesson-answer-hint" className="lesson-answer-hint">{prompts?.find(prompt => prompt.id === questionIndex)?.text.startsWith('Nō') ? <><SupportedText text="Nō" /> + place</> : <><SupportedText text="Ko" /> + name</>}</p>}
    {pepehaStatus && <p className="lesson-answer-hint" role="status">{pepehaStatus}</p>}
    <div className="lesson-chat-input-controls">
    <div className="lesson-chat-tools"><button type="button" aria-label={handRaised ? 'Lower hand' : 'Raise hand'} title={handRaised ? 'Lower hand' : 'Raise hand'} aria-pressed={handRaised} disabled={pending || Boolean(roomId && !room?.joined)} onClick={() => { if (room?.joined) void act('lesson-hand', { raised: !handRaised }); else setHandRaised(value => !value) }}><span aria-hidden="true">✋</span></button></div>
    <form className="lesson-workspace-compose" onSubmit={event => void send(event)}>
      <input ref={input} aria-label="Message the class" aria-describedby={prompts?.length && questionIndex < 4 ? 'lesson-answer-hint' : undefined} placeholder="Message…" value={draft} maxLength={1000} onChange={event => setDraft(event.target.value)} />
      <button type="submit" aria-label="Send message" disabled={pending || !draft.trim() || (!room?.joined && !localName.trim()) || Boolean(roomId && !room?.joined)}>↑</button>
    </form>
    </div>
    </div>
  </aside>
}

export default function LessonWorkspace() {
  const [boardOpen, setBoardOpen] = useState(() => new URLSearchParams(window.location.hash.split('?')[1]).get('board') === '1')
  const [boardVisited, setBoardVisited] = useState(boardOpen)
  const [presentationVisited, setPresentationVisited] = useState(!boardOpen)
  const [chatOpen, setChatOpen] = useState(() => window.innerWidth >= 1100)
  const [people, setPeople] = useState<ClassPerson[]>([{ id: 1, name: 'You', raised: false, local: true }])
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (window.innerWidth <= 650) return false
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
  const section = level === 1 && lesson === 1 ? { title: 'Big words', prompts: bigWordQuestions } : null
  const [sectionSelection, setSectionSelection] = useState({ lesson: '', index: 0 })
  const lessonKey = `${level}:${lesson}`
  const warmUpPlan = lessonWarmUp(level, lesson)
  const [warmUpSelection, setWarmUpSelection] = useState<{ lesson: string; position: WarmUpPosition }>({ lesson: '', position: { phase: 'recall', index: 0 } })
  const warmUpPosition = warmUpSelection.lesson === lessonKey ? warmUpSelection.position : { phase: 'recall' as const, index: 0 }
  const warmUpPrompt = warmUpQuestion(warmUpPlan.phases[warmUpPosition.phase][warmUpPosition.index])
  const [exercise, setExercise] = useState<{ lesson: string; group: string; revealed: number[] }>({ lesson: '', group: 'Ko', revealed: [0] })
  const exerciseGroup = exercise.lesson === lessonKey ? exercise.group : 'Ko'
  const revealed = exercise.lesson === lessonKey ? exercise.revealed : [0]
  const groupQuestions = bigWordQuestions.filter(question => question.group === exerciseGroup)
  const visibleQuestions = groupQuestions.filter(question => revealed.includes(question.id))
  const questionIndex = visibleQuestions.at(-1)?.id ?? groupQuestions[0].id
  const nextQuestion = groupQuestions.find(question => !revealed.includes(question.id))
  const selectExerciseGroup = (group: string) => {
    const first = bigWordQuestions.find(question => question.group === group)!
    setExercise({ lesson: lessonKey, group, revealed: [...new Set([...revealed, first.id])] })
  }
  const activeSection = sectionSelection.lesson === lessonKey ? sectionSelection.index : 0
  const schedule = moeLessonSchedule(level, lesson)
  const wrapUpTime = schedule ? new Date(new Date(schedule.endsAt).getTime() - 5 * 60_000).toLocaleTimeString('en-NZ', { hour: 'numeric', minute: '2-digit', timeZone: schedule.timezone }) : undefined
  const closeBoard = () => { setPresentationVisited(true); setBoardOpen(false) }
  const selectSection = (index: number) => { closeBoard(); setSectionSelection({ lesson: lessonKey, index }) }
  const route = window.location.hash.startsWith('#moe/') ? '#moe/lessons' : '#lessons'
  const openSharedBoard = useCallback((room: string) => {
    const [path, query] = window.location.hash.split('?')
    const next = new URLSearchParams(query)
    next.set('room', room)
    next.set('board', '1')
    window.location.replace(`${path}?${next}`)
  }, [])

  const wordHelp = useWordSupport()
  return <main style={stageIdentityStyle(activeSection)} className={`lesson-workspace classroom-identity soft-clay${chatOpen ? '' : ' is-chat-collapsed'}${sidebarOpen ? '' : ' is-sidebar-collapsed'}`}>
    <TwilightCursor />{wordHelp.modal}
    <aside id="lesson-navigation" className="lesson-workspace-sidebar" aria-hidden={!sidebarOpen}>
      <div className="lesson-sidebar-brand-row"><a className="lesson-workspace-brand" href="#my-learning" aria-label="Ka Piki · My learning"><KaPikiWordmark /></a><button className="lesson-sidebar-toggle" type="button" aria-label={sidebarOpen ? 'Hide sidebar' : 'Show sidebar'} title={sidebarOpen ? 'Hide lessons' : 'Show lessons'} aria-expanded={sidebarOpen} aria-controls="lesson-navigation" onClick={() => setSidebarOpen(open => !open)}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16"/><path d={sidebarOpen ? 'm16 9-3 3 3 3' : 'm13 9 3 3-3 3'}/></svg></button></div>
      <nav aria-label="Lessons">{levels.map(number => <details key={number} open={number === level}>
        <summary>Level {number}<span aria-hidden="true">⌄</span></summary>
        <div>{lessons.map(item => <a key={item} href={`${route}?level=${number}&lesson=${item}${roomParam ? `&room=${encodeURIComponent(roomParam)}` : ''}`} aria-current={number === level && item === lesson ? 'page' : undefined}>Lesson {item}</a>)}</div>
      </details>)}</nav>
      <a className="lesson-workspace-back" href={route === '#moe/lessons' ? '#moe/my-learning' : '#my-learning'}>← My Learning</a>
    </aside>
    <section className="lesson-workspace-classroom" aria-label={title}>
      {!sidebarOpen && <button className="lesson-sidebar-toggle" type="button" aria-label={sidebarOpen ? 'Hide sidebar' : 'Show sidebar'} title={sidebarOpen ? 'Hide lessons' : 'Show lessons'} aria-expanded={sidebarOpen} aria-controls="lesson-navigation" onClick={() => setSidebarOpen(open => !open)}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16"/><path d={sidebarOpen ? 'm16 9-3 3 3 3' : 'm13 9 3 3-3 3'}/></svg></button>}

      <div className="lesson-jitsi-panel"><LessonCameras people={people}>
        <button type="button" className="lesson-chat-toggle" aria-expanded={chatOpen} aria-controls="class-chat-panel" onClick={() => setChatOpen(open => !open)}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M4 4h16v12H9l-5 4V4Z"/><path d="M8 8h8M8 12h5"/></svg>Chat</button>
      </LessonCameras></div>
      <div className="lesson-workspace-surface">
        <div className="lesson-workspace-canvas" aria-label="Lesson screen">
          <LessonStages active={activeSection} onSelect={selectSection} wrapUpTime={wrapUpTime} whiteboard={{ active: boardOpen, onSelect: () => { setBoardVisited(true); setBoardOpen(true) } }} />
          {boardVisited && <div className="lesson-whiteboard-host" hidden={!boardOpen}><LessonWhiteboard key={`${lessonKey}:${roomParam ?? 'local'}`} lessonKey={lessonKey} roomId={roomParam} name={people.find(person => person.local)?.name ?? ''} onRoomReady={openSharedBoard} /></div>}
          {presentationVisited && <div className="lesson-presentation-host" hidden={boardOpen}>
          <LessonStagePanel active={activeSection}>
            <div className="lesson-overview" hidden={activeSection !== 0}>
              <header className="lesson-overview-header">
                <ForestScene />
                <p className="lesson-overview-number">{title}</p>
                <h1>{section ? 'Introducing Big words' : 'Lesson overview'}</h1>
              </header>
              {section ? <>
                <div className="lesson-overview-body">
                  <section className="lesson-preview">
                    <h2>Today</h2>
                    <ol className="lesson-preview-path">
                      {[
                        { stage: 2, label: 'Meet the Big words' },
                        { stage: 3, label: 'Try them together' },
                        { stage: 4, label: 'Play a game' },
                      ].map(({ stage, label }) => <li key={stage}><button style={stageIdentityStyle(stage)} type="button" onClick={() => selectSection(stage)}><span className="lesson-preview-symbol"><LessonEmblem stage={stage} /></span><span>{label}</span></button></li>)}
                    </ol>
                  </section>
                  <section className="lesson-takeaway">
                    <h2>By the end</h2>
                    <p>Say a little about your <strong><SupportedText text="whānau" />.</strong></p>
                  </section>
                </div>
                <footer className="lesson-overview-footer">
                  <p>No need to remember it all today.</p>
                  <button type="button" onClick={() => selectSection(5)}>Questions <span>· {wrapUpTime}</span></button>
                </footer>
              </> : <div className="lesson-overview-sections"><p>This lesson’s sections are not available yet.</p></div>}

            </div>
            {section && <section className="lesson-teaching-card" hidden={activeSection !== 2}>
              <h1>Meet the Big words</h1>
              <LessonBigWords explore />
            </section>}
            <div hidden={activeSection !== 1}><LessonWarmUp plan={warmUpPlan} position={warmUpPosition} active={activeSection === 1} onChange={position => setWarmUpSelection({ lesson: lessonKey, position })} onFinish={() => selectSection(2)} onOpenChat={() => setChatOpen(true)} /></div>
            {section && <div hidden={activeSection !== 4}><LessonBreakout /></div>}
            {section && <div hidden={activeSection !== 3}>
              <div className="lesson-section-tabs lesson-exercise-tabs" role="tablist" aria-label="Big word questions">{bigWordQuestionGroups.map(group => <button {...wordHelp.hover(wordSupportTarget(group, null))} key={group} role="tab" id={`exercise-tab-${group}`} aria-selected={exerciseGroup === group} aria-controls="exercise-questions" onClick={() => selectExerciseGroup(group)}>{group}</button>)}</div>
              <div id="exercise-questions" role="tabpanel" aria-labelledby={`exercise-tab-${exerciseGroup}`} className="lesson-big-words-list">
                {section.prompts.map(prompt => <div key={`${lessonKey}:${prompt.id}`} hidden={prompt.group !== exerciseGroup || !revealed.includes(prompt.id)}><LessonQuestion text={prompt.text} active={activeSection === 3 && prompt.group === exerciseGroup && revealed.includes(prompt.id)} /></div>)}
                {nextQuestion && <div className="lesson-question-navigation"><button aria-label="Next question" onClick={() => setExercise({ lesson: lessonKey, group: exerciseGroup, revealed: [...revealed, nextQuestion.id] })}>Next question ↓</button></div>}
              </div>
            </div>}

            {activeSection === 5 && <LessonWrapUp />}
          </LessonStagePanel>
          </div>}
        </div>
        <div id="class-chat-panel" className="lesson-chat-panel" hidden={!chatOpen}><LessonChat onPeople={setPeople} key={`${level}:${lesson}`} lessonKey={`${level}:${lesson}`} questionIndex={activeSection === 1 && warmUpPrompt ? warmUpPrompt.id : questionIndex} prompts={activeSection === 1 && warmUpPrompt ? [warmUpPrompt] : activeSection === 3 ? bigWordQuestions.filter(question => revealed.includes(question.id)) : undefined} /></div>
      </div>
    </section>
  </main>
}
