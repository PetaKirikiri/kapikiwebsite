import { useCallback, useEffect, useRef, useState } from 'react'
import LoungeSprite from './LoungeSprite'
import ClassWhiteboard, { type BoardState } from './ClassWhiteboard'
import './ClassroomRoom.css'
import './LiveClassroom.css'
import './LiveHouse.css'

type Member = { seat: number; name: string; x: number; y: number; movement: number; look: 'male' | 'female'; color: string; lastSeen: string; eliminated: number[]; guess: number | null; correct: boolean | null }
type Room = { room: string; joined: boolean; seat: number; state: { round: number; chosen: boolean; revealed: boolean; target?: number | null; surface?: 'room' | 'whiteboard'; whiteboard?: BoardState }; members: Member[]; messages: { id: string; seat: number; text: string }[]; ended?: boolean }
type Motion = { x: number; y: number; tx: number; ty: number; walking: boolean; stride: number; facing: number; direction: 'front' | 'back' | 'side' }
const cards = [
  { name: 'Charlie', look: 'male', color: '#398aa6' }, { name: 'Hana', look: 'female', color: '#ba657f' },
  { name: 'Hemi', look: 'male', color: '#608b48' }, { name: 'Ana', look: 'female', color: '#398aa6' },
  { name: 'Wiremu', look: 'male', color: '#ba657f' }, { name: 'Moana', look: 'female', color: '#608b48' },
] as const
const idle = { walking: false, stride: 0, facing: 1, direction: 'front' as const }
const houseRooms = [
  { name: 'Classroom', art: 'room-whiteboard-v2.png' },
  { name: 'Lounge', art: 'lounge-a-v1.png' },
  { name: 'Activity room', art: 'room-v1.png' },
]
const roomId = () => new URLSearchParams(window.location.hash.split('?')[1] ?? '').get('room') ?? ''
async function request(body?: Record<string, unknown>, room?: string): Promise<Room> {
  const response = await fetch(body ? '/__classroom' : `/__classroom?room=${encodeURIComponent(room ?? '')}`, {
    method: body ? 'POST' : 'GET', credentials: 'same-origin',
    ...(body ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}),
  })
  const result = await response.json()
  if (!response.ok) throw Object.assign(new Error(result.error ?? 'Unable to connect to the classroom.'), { status: response.status })
  return result
}
export default function LiveClassroom() {
  const [id, setId] = useState(roomId)
  const [room, setRoom] = useState<Room | null>(null)
  const [name, setName] = useState('')
  const [draft, setDraft] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  const [copied, setCopied] = useState(false)
  const [showChat, setShowChat] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  const workspace = useRef<HTMLElement>(null)
  useEffect(() => { const update = () => setFullscreen(Boolean(document.fullscreenElement)); document.addEventListener('fullscreenchange', update); return () => document.removeEventListener('fullscreenchange', update) }, [])
  const [ended, setEnded] = useState(false)
  const [motions, setMotions] = useState<Record<number, Motion>>({})
  const movement = useRef<Record<number, Motion>>({})
  const versions = useRef<Record<number, number>>({})
  const roomRef = useRef(room)
  roomRef.current = room
  const serial = useRef<Promise<unknown>>(Promise.resolve())
  const revision = useRef(0)
  const chat = useRef<HTMLDivElement>(null)
  const apply = useCallback((next: Room) => {
    if (next.ended) { setRoom(null); setId(''); window.location.hash = '#live-class'; return }
    if (roomRef.current?.room !== next.room) { movement.current = {}; versions.current = {} }
    setRoom(next)
    for (const member of next.members ?? []) {
      const current = movement.current[member.seat]
      if (!current) movement.current[member.seat] = { x: member.x, y: member.y, tx: member.x, ty: member.y, ...idle }
      else if (versions.current[member.seat] !== member.movement) {
        current.tx = member.x; current.ty = member.y
      }
      versions.current[member.seat] = member.movement
    }
    setMotions({ ...movement.current })
  }, [])
  const act = useCallback((action: string, values: Record<string, unknown> = {}) => {
    revision.current++
    const run = serial.current.catch(() => {}).then(async () => {
      setPending(true)
      try {
        const next = await request({ action, room: id, round: roomRef.current?.state?.round, boardRevision: roomRef.current?.state?.whiteboard?.revision ?? 0, ...values })
        apply(next); setError('')
        if (action === 'create') { setId(next.room); window.location.hash = `#live-class?room=${next.room}` }
        return true
      } catch (e) { setError(e instanceof Error ? e.message : 'Connection failed.'); return false }
      finally { setPending(false) }
    })
    serial.current = run
    return run
  }, [id, apply])
  useEffect(() => {
    if (!id || ended) return
    let cancelled = false, timer = 0
    const poll = async () => {
      await serial.current.catch(() => {})
      if (cancelled) return
      const atRevision = revision.current
      try {
        const next = await request(undefined, id)
        if (!cancelled && atRevision === revision.current) { apply(next); setError('') }
      } catch(e) { if (!cancelled) { setError(e instanceof Error ? e.message : 'Reconnecting…'); if ((e as { status?: number }).status === 410) { setEnded(true); setRoom(null) } } }
      if (!cancelled) timer = window.setTimeout(poll, 850)
    }
    void poll()
    return () => { cancelled = true; clearTimeout(timer) }
  }, [id, ended, apply])
  useEffect(() => {
    let frame = 0, previous = performance.now()
    const tick = (now: number) => {
      const dt = Math.min((now - previous) / 1000, .05); previous = now
      let changed = false
      for (const p of Object.values(movement.current)) {
        const dx = p.tx - p.x, dy = p.ty - p.y, distance = Math.hypot(dx, dy)
        if (distance < .2) { if (p.walking) changed = true; p.walking = false; continue }
        const step = Math.min(distance, 115 * dt)
        p.x += dx / distance * step; p.y += dy / distance * step
        p.stride += step / 24; p.walking = true
        p.direction = Math.abs(dy) > Math.abs(dx) * 1.2 ? dy < 0 ? 'back' : 'front' : 'side'
        if (Math.abs(dx) > 1) p.facing = Math.sign(dx)
        changed = true
      }
      if (changed) setMotions({ ...movement.current })
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [Boolean(room?.joined)])
  useEffect(() => { if(chat.current) chat.current.scrollTop = chat.current.scrollHeight }, [room?.messages?.length])
  const move = (x: number, y: number) => {
    if (!room?.joined || pending) return
    x = Math.max(45, Math.min(2355, x)); y = Math.max(245, Math.min(478, y))
    const current = movement.current[room.seat]
    if (current) { current.tx = x; current.ty = y }
    void act('move', { x, y })
  }
  const joined = room?.joined
  const me = room?.members?.find(member => member.seat === room.seat)
  const teacher = room?.seat === 0
  const chosen = room?.state?.chosen
  const myMotion = room ? motions[room.seat] : undefined
  const cameraX = Math.max(0, Math.min(1600, (myMotion?.x ?? 400) - 400))
  const currentRoom = Math.min(2, Math.max(0, Math.floor((myMotion?.x ?? 400) / 800)))
  const share = async () => {
    try { await navigator.clipboard.writeText(window.location.href); setCopied(true); setTimeout(() => setCopied(false), 2500) }
    catch { setError('Copy the class link from the address bar.') }
  }
  const boardMode = joined && room.state.surface === 'whiteboard'
  const toggleFullscreen = async () => { try { if (document.fullscreenElement) await document.exitFullscreen(); else await workspace.current?.requestFullscreen() } catch { setError('Use your browser’s full-screen control.') } }
  return <main ref={workspace} className={`live-class${boardMode ? ' live-board-workspace' : ''}${showChat ? ' is-chat-open' : ''}`}>
    <header className="classroom-topbar"><a className="classroom-brand" href="#website-top">Ka Piki</a><strong>{boardMode ? 'Whiteboard' : 'Live class'}</strong>{boardMode && teacher && <button className="board-back" disabled={pending} onClick={() => void act('surface', { surface: 'room' })}>← Room</button>}
      <div className="classroom-top-actions">{joined && <>{boardMode && <><button aria-label="Toggle class chat" aria-pressed={showChat} onClick={() => setShowChat(!showChat)}>Chat</button><button aria-label={fullscreen ? 'Exit full screen' : 'Full screen'} title={fullscreen ? 'Exit full screen' : 'Full screen'} onClick={() => void toggleFullscreen()}>⛶</button></>}<button onClick={() => void share()}>{copied ? 'Copied' : 'Copy class link'}</button><span>{me?.name}</span></>}</div>
    </header>
    {error && <p className="live-error" role="alert">{error}</p>}
    {ended ? <section className="live-join"><h1>Class ended</h1><a href="#website-top">Back to Ka Piki</a></section> : !joined ? <form className="live-join" onSubmit={event => { event.preventDefault(); void act(id ? 'join' : 'create', { name }) }}>
      <h1>{id ? 'Join class' : 'Start a class'}</h1>
      <label>Your name<input autoComplete="given-name" maxLength={60} required value={name} onChange={event => setName(event.target.value)} /></label>
      <button disabled={pending || !name.trim()}>{pending ? 'Connecting…' : id ? 'Join class' : 'Start class'}</button>
    </form> : <div className="live-layout">
      <div className="live-main">
        <nav className="live-surfaces" aria-label="Class activity">{teacher ? <>{(['room', 'whiteboard'] as const).map(surface => <button key={surface} disabled={pending} aria-pressed={(room.state.surface ?? 'room') === surface} onClick={() => void act('surface', { surface })}>{surface === 'room' ? 'Room' : 'Whiteboard'}</button>)}</> : <span className="live-surface-name">{room.state.surface === 'whiteboard' ? 'Whiteboard' : 'Room'}</span>}</nav>
        {room.state.surface === 'whiteboard' ? <ClassWhiteboard board={room.state.whiteboard ?? { revision: 0, blocks: [] }} teacher={teacher} pending={pending} onChange={change => act('whiteboard', change)} /> : <>

        <div className="classroom-floor live-floor" role="application" aria-label="Shared house. Click to walk, or use WASD or arrow keys." tabIndex={0}
          onPointerDown={event => { if((event.target as HTMLElement).closest('button'))return;const rect=event.currentTarget.getBoundingClientRect();move(cameraX+(event.clientX-rect.left)/rect.width*800,(event.clientY-rect.top)/rect.height*500);event.currentTarget.focus() }}
          onKeyDown={event => { if(event.target!==event.currentTarget)return; const delta: Record<string, [number, number]> = { ArrowLeft: [-35,0], ArrowRight:[35,0], ArrowUp:[0,-35], ArrowDown:[0,35], a:[-35,0], d:[35,0], w:[0,-35], s:[0,35] }; const d=delta[event.key.length===1?event.key.toLowerCase():event.key];const p=movement.current[room.seat];if(d&&p){event.preventDefault();move(p.tx+d[0],p.ty+d[1])} }}>
          <div className="live-house-label" aria-live="polite">{houseRooms[currentRoom].name}</div>
          <div className="live-house-world" style={{transform:`translateX(-${cameraX/24}%)`}}>
          {houseRooms.map((area,index)=><div className="live-house-room" key={area.name} style={{left:`${index*100/3}%`}}>
            <img className="classroom-scenery" src={`/classroom/${area.art}`} alt={area.name} draggable={false}/>
            {index>0&&<button className="live-house-door live-house-door-left" aria-label={`Walk to ${houseRooms[index-1].name}`} onClick={()=>move(index*800-160,365)}>←</button>}
            {index<2&&<button className="live-house-door live-house-door-right" aria-label={`Walk to ${houseRooms[index+1].name}`} onClick={()=>move((index+1)*800+160,365)}>→</button>}
          </div>)}
          <div className="live-house-board-wrap">
          <section className="classroom-whiteboard live-room-board"><strong>Guess who</strong><span>{room.state.revealed && room.state.target != null ? cards[room.state.target].name : !chosen ? 'Waiting for a character' : 'Ask a question'}</span></section>
          </div>
          {room.members.map(member => { const p=motions[member.seat] ?? movement.current[member.seat];if(!p)return null;return <div key={member.seat} aria-label={`${member.name}'s character`} className={`room-player${room.seat===member.seat?' room-player-selected':''}`} style={{left:`${p.x/24}%`,top:`${p.y/5}%`,zIndex:Math.round(p.y),'--shirt':member.color} as React.CSSProperties}>
            <span className="room-player-label">{member.name}</span><span className="room-player-shadow"/><LoungeSprite player={p} look={member.look} color={member.color}/>
          </div> })}
          </div>
        </div>
        <section className="live-game" aria-label="Guess who">
          <header><h1>Guess who</h1>{teacher ? <div><button disabled={pending || !chosen || room.state.revealed} onClick={() => void act('reveal')}>Reveal</button><button disabled={pending} onClick={() => void act('new-round')}>New round</button></div> : <span role="status">{me?.guess != null ? me.correct ? 'Correct!' : 'Not this time' : chosen ? 'Cross out · Make a guess' : 'Waiting for the teacher'}</span>}</header>
          {teacher && !chosen && <p className="live-game-status">Choose the secret character.</p>}
          <div className="live-cards">{cards.map((card,index) => {
            const eliminated=me?.eliminated.includes(index), target=room.state.target===index
            return <article key={card.name} className={`live-card${eliminated?' is-eliminated':''}${target?' is-target':''}`}>
              <button className="live-character" aria-label={teacher ? `Choose ${card.name}` : `${eliminated?'Restore':'Cross out'} ${card.name}`} aria-pressed={teacher?target:eliminated} disabled={pending || (teacher ? Boolean(chosen) : !chosen || room.state.revealed || me?.guess != null)} onClick={() => void act(teacher?'target':'eliminate',teacher?{index}:{indices:eliminated?me!.eliminated.filter(i=>i!==index):[...(me?.eliminated??[]),index]})}>
                <span className="live-portrait"><LoungeSprite player={idle} look={card.look} color={card.color}/></span><strong>{card.name}</strong>{target && <span className="live-secret">{teacher&&!room.state.revealed?'Secret':'Answer'}</span>}
              </button>
              {!teacher && <button className="live-guess" aria-label={`Guess ${card.name}`} disabled={pending||!chosen||room.state.revealed||me?.guess!=null||eliminated} onClick={() => void act('guess',{index})}>{me?.guess===index ? me.correct?'✓':'×' : 'Guess'}</button>}
            </article>
          })}</div>
        </section>
        </>}
      </div>
      <aside className="live-sidebar">
        <section className="live-people" aria-label="People in class">{room.members.map(member=><div key={member.seat}><span className="classroom-avatar" style={{background:member.color}}>{member.name.slice(0,1)}</span><strong>{member.name}</strong><span>{teacher&&member.guess!=null?(member.correct?'✓':'↻'):Date.now()-Date.parse(member.lastSeen)>15000?'Offline':'●'}</span></div>)}</section>
        <div className="live-look"><button aria-label="Change character" onClick={()=>void act('appearance',{look:me?.look==='male'?'female':'male',color:me!.color})} disabled={pending}>Change character</button></div>
        <h2>Chat</h2><div className="live-chat" role="log" aria-label="Class messages" ref={chat}>{room.messages.map(message=><p key={message.id}><strong>{room.members.find(m=>m.seat===message.seat)?.name}</strong><span>{message.text}</span></p>)}</div>
        <form className="live-compose" onSubmit={async event=>{event.preventDefault();if(await act('chat',{text:draft,id:crypto.randomUUID()}))setDraft('')}}><input aria-label="Message the class" placeholder="Message…" maxLength={1000} value={draft} onChange={event=>setDraft(event.target.value)}/><button aria-label="Send message" disabled={pending||!draft.trim()}>↑</button></form>
        {teacher&&<button className="live-end" onClick={()=>void act('close')} disabled={pending}>End class</button>}
      </aside>
    </div>}
  </main>
}
