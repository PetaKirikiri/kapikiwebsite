import { useEffect, useRef, useState } from 'react'
import { ANSWER_ZONES, answerDestination, answerZoneAt } from './classroomAnswerZones'
import { classroomWalkPose } from './classroomWalkPose'
import ClassroomWhiteboard from './ClassroomWhiteboard'
import ClassroomSentencePuzzle from './ClassroomSentencePuzzle'
import ClassroomVocabulary from './ClassroomVocabulary'
import ClassroomDifferences from './ClassroomDifferences'
import LoungeSprite from './LoungeSprite'
import type { WebsitePreviewData } from './WebsiteView'
import './ClassroomRoom.css'

const COLORS = ['#398aa6', '#ba657f', '#608b48', '#bc8744']
// Presentation role for this local classroom preview, not an account permission.
const TEACHER_INDEX = 0
const playerInitial = (index: number) => index === TEACHER_INDEX ? 'T' : index + 1
const SHIRTS = [...COLORS, '#785ba3', '#53647c']
const SHIRT_NAMES = ['Ocean', 'Rose', 'Fern', 'Ochre', 'Plum', 'Slate']
type CharacterLook = 'male' | 'female'
type Appearance = { look: CharacterLook; color: string }
const APPEARANCE_KEY = 'kapiki-classroom-appearance-v1'
function initialAppearances(): Appearance[] {
  const defaults: Appearance[] = COLORS.map((color, i) => ({ color, look: i % 2 === 0 ? 'male' : 'female' }))
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(APPEARANCE_KEY) ?? 'null')
    if (!Array.isArray(saved) || saved.length !== 4) return defaults
    return defaults.map((fallback, i) => {
      const item = saved[i]
      return item && (item.look === 'male' || item.look === 'female') && SHIRTS.includes(item.color)
        ? { look: item.look, color: item.color } : fallback
    })
  } catch { return defaults }
}
type Player = { x: number; y: number; tx: number; ty: number; walking: boolean; facing: number; direction: 'front' | 'back' | 'side'; speed: number; stride: number }
const STARTS = [[400, 255], [355, 430], [400, 385], [445, 430]]
const initialPlayers = (): Player[] => STARTS.map(([x, y]) => ({ x, y, tx: x, ty: y, walking: false, facing: 1, direction: 'front', speed: 0, stride: 0 }))

// Align the painted frames at their feet, independently of atlas cell margins.
const FRAME_X = [[194, 484, 776, 1073], [204, 500, 791, 1084], [193, 484, 777, 1075], [180, 480, 773, 1068]]
const FRAME_FEET = [320, 616, 902, 1196]
const atlasPromises = new Map<CharacterLook, Promise<HTMLImageElement>>()
function loadAtlas(look: CharacterLook) {
  const cached = atlasPromises.get(look)
  if (cached) return cached
  const promise = new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => { atlasPromises.delete(look); reject(new Error('Character artwork could not load')) }
    image.src = look === 'male' ? '/classroom/student-male-walk-v1.png' : '/classroom/student-walk-v2.png'
  })
  atlasPromises.set(look, promise)
  return promise
}
export function StudentSprite({ player, color, look }: { player: Player; color: string; look: CharacterLook }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const paintedAtlas = useRef<HTMLCanvasElement | null>(null)
  const [atlas, setAtlas] = useState<HTMLImageElement | null>(null)
  const [reducedMotion, setReducedMotion] = useState(false)
  useEffect(() => {
    let active = true
    loadAtlas(look).then(image => { if (active) setAtlas(image) }).catch(() => {})
    const preference = matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReducedMotion(preference.matches)
    update()
    preference.addEventListener('change', update)
    return () => { active = false; preference.removeEventListener('change', update) }
  }, [look])
  useEffect(() => {
    if (!atlas) return
    const painted = document.createElement('canvas')
    painted.width = atlas.width
    painted.height = atlas.height
    const ctx = painted.getContext('2d')
    if (!ctx) return
    ctx.drawImage(atlas, 0, 0)
    const pixels = ctx.getImageData(0, 0, painted.width, painted.height)
    const rgb = [1, 3, 5].map(start => parseInt(color.slice(start, start + 2), 16))
    for (let i = 0; i < pixels.data.length; i += 4) {
      const r = pixels.data[i], g = pixels.data[i + 1], b = pixels.data[i + 2]
      if (pixels.data[i + 3] > 0 && b > r * 1.6 && b > g * 1.25 && b > 45) {
        for (let channel = 0; channel < 3; channel++) pixels.data[i + channel] = Math.min(255, rgb[channel] * b / 190)
      }
    }
    ctx.putImageData(pixels, 0, 0)
    paintedAtlas.current = painted
  }, [atlas, color])
  const row = player.direction === 'front' ? 0 : player.direction === 'back' ? 2 : player.facing > 0 ? 1 : 3
  const phase = reducedMotion ? 0 : player.stride * Math.PI / 2
  const motion = reducedMotion ? 0 : Math.min(1, player.speed / 85)
  useEffect(() => {
    const ctx = canvas.current?.getContext('2d')
    const artwork = paintedAtlas.current
    if (!artwork || !ctx) return
    ctx.clearRect(0, 0, 190, 286)
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    const side = row === 1 || row === 3
    const pose = classroomWalkPose(phase, motion, side)
    const shade = (factor: number) => `rgb(${[1, 3, 5].map(start => Math.round(parseInt(color.slice(start, start + 2), 16) * factor)).join(',')})`
    ctx.save()
    // Mirror the entire rig, keeping near/far limb identities intact.
    if (row === 3) { ctx.translate(190, 0); ctx.scale(-1, 1) }
    const sourceRow = side ? 1 : row
    const drawLimb = (near: boolean, arm: boolean) => {
      const limb = arm ? (near ? pose.near.arm : pose.far.arm) : (near ? pose.near.leg : pose.far.leg)
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.beginPath()
      ctx.moveTo(limb.root.x, limb.root.y)
      ctx.lineTo(limb.joint.x, limb.joint.y)
      ctx.lineTo(limb.end.x, limb.end.y - (arm ? 5 : 6))
      ctx.strokeStyle = '#24282b'
      ctx.lineWidth = arm ? 22 : 26
      ctx.stroke()
      ctx.strokeStyle = arm ? shade(near ? 1 : .68) : near ? '#494a4c' : '#303133'
      ctx.lineWidth = arm ? 17 : 21
      ctx.stroke()
      if (arm) {
        // A cuff stays attached to this hand through the entire swing.
        ctx.beginPath()
        ctx.ellipse(limb.end.x, limb.end.y, 8, 10, 0, 0, Math.PI * 2)
        ctx.fillStyle = near ? '#efb980' : '#c68b59'
        ctx.fill()
        ctx.strokeStyle = '#50352b'
        ctx.lineWidth = 2
        ctx.stroke()
      } else {
        const shoeX = FRAME_X[sourceRow][1] + (side ? 7 : -39)
        ctx.drawImage(artwork, shoeX, FRAME_FEET[sourceRow] - 31, side ? 57 : 38, 31,
          limb.end.x - (side ? 17 : 19), limb.end.y - 19, side ? 47 : 36, 29)
      }
    }
    drawLimb(false, true)
    drawLimb(false, false)
    drawLimb(true, false)
    // The torso contains no baked-in arms or hands.
    const torso = ctx.createLinearGradient(67, 0, 123, 0)
    torso.addColorStop(0, shade(.78))
    torso.addColorStop(.65, color)
    torso.addColorStop(1, shade(.9))
    ctx.beginPath()
    ctx.moveTo(83, 144)
    ctx.quadraticCurveTo(71, 149, 68, 166)
    ctx.lineTo(64, 210)
    ctx.quadraticCurveTo(94, 218, 125, 210)
    ctx.lineTo(118, 162)
    ctx.quadraticCurveTo(113, 148, 106, 144)
    ctx.closePath()
    ctx.fillStyle = torso
    ctx.fill()
    ctx.strokeStyle = '#26333a'
    ctx.lineWidth = 3
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(67, 207)
    ctx.quadraticCurveTo(95, 213, 122, 207)
    ctx.strokeStyle = shade(.65)
    ctx.lineWidth = 3
    ctx.stroke()
    if (!side) drawLimb(false, true)
    drawLimb(true, true)
    // Keep the original illustrated head; nothing below the neck is copied.
    ctx.drawImage(artwork, FRAME_X[sourceRow][1] - 95, FRAME_FEET[sourceRow] - 286,
      190, 147, 0, 0, 190, 147)
    ctx.restore()
  }, [atlas, row, phase, motion, color])
  return <canvas className="room-player-sprite" ref={canvas} width={190} height={286} aria-hidden="true" />
}

export default function ClassroomRoom({ data, error }: { data?: WebsitePreviewData | null; error?: string | null }) {
  const [selected, setSelected] = useState(0)
  const [exercise, setExercise] = useState('normal')
  const [visitorName, setVisitorName] = useState('')
  const [nameDraft, setNameDraft] = useState('')
  const entryDialog = useRef<HTMLDialogElement>(null)
  const playerName = (index: number) => index === 0 ? visitorName || 'You' : `Player ${index + 1}`
  useEffect(() => { entryDialog.current?.showModal() }, [])
  const sentencePuzzle = exercise !== 'yes-no'
  const [appearances, setAppearances] = useState(initialAppearances)
  const [appearanceSaved, setAppearanceSaved] = useState(true)
  const appearanceDialog = useRef<HTMLDialogElement>(null)
  const changeAppearance = (change: Partial<Appearance>) => {
    const next = appearances.map((appearance, i) => i === selected ? { ...appearance, ...change } : appearance)
    setAppearances(next)
    try { localStorage.setItem(APPEARANCE_KEY, JSON.stringify(next)); setAppearanceSaved(true) }
    catch { setAppearanceSaved(false) }
  }
  const [cameraOpen, setCameraOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const [messages, setMessages] = useState<{ id: number; player: number; text: string }[]>([])
  const chatLog = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const log = chatLog.current
    if (log) log.scrollTop = log.scrollHeight
  }, [messages])
  const [players, setPlayers] = useState(initialPlayers)
  const positions = useRef(players)
  const floor = useRef<HTMLDivElement>(null)
  useEffect(() => {
    let frame = 0, previous = performance.now()
    const tick = (now: number) => {
      const dt = Math.min((now - previous) / 1000, .05)
      previous = now
      let changed = false
      positions.current = positions.current.map(previousPlayer => {
        const p = { ...previousPlayer,
          speed: Number.isFinite(previousPlayer.speed) ? previousPlayer.speed : 0,
          stride: Number.isFinite(previousPlayer.stride) ? previousPlayer.stride : 0,
          direction: previousPlayer.direction ?? 'front' as const }
        const dx = p.tx - p.x, dy = p.ty - p.y, distance = Math.hypot(dx, dy)
        if (distance < .1 && !p.walking) return p
        changed = true
        const desiredSpeed = Math.min(110, Math.sqrt(2 * 420 * distance))
        const speed = Math.min(desiredSpeed, (p.speed ?? 0) + 420 * dt)
        const step = Math.min(distance, speed * dt)
        return { ...p, x: distance ? p.x + dx / distance * step : p.tx, y: distance ? p.y + dy / distance * step : p.ty,
          walking: distance > .5, speed: distance > .5 ? speed : 0, stride: (p.stride ?? 0) + step / 24,
          direction: distance < 1 ? p.direction : Math.abs(dy) > Math.abs(dx) * 1.2 ? (dy < 0 ? 'back' : 'front') : 'side',
          facing: Math.abs(dx) > 1 ? Math.sign(dx) : p.facing }
      })
      if (changed) setPlayers([...positions.current])
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [])
  const move = (x: number, y: number) => {
    // Feet stay in the open floor below the whiteboard.
    positions.current = positions.current.map((p, i) => i === selected ? { ...p, walking: true, tx: Math.max(45, Math.min(755, x)), ty: Math.max(245, Math.min(478, y)) } : p)
    setPlayers([...positions.current])
  }
  return <main className="classroom-trial">
    <header className="classroom-topbar">
      <a className="classroom-brand" href="#website-top">Ka Piki</a>
      <nav aria-label="Classroom navigation"><a href="#classroom" aria-current="page" onClick={() => { setExercise('normal'); setSelected(0) }}>Classroom</a><a href="#training-admin">Content</a><a href="#live-class">Live class</a></nav>
      <div className="classroom-top-actions">
      <select aria-label="Classroom exercise" value={exercise} onChange={event => { setExercise(event.target.value); setSelected(0); positions.current = initialPlayers(); setPlayers([...positions.current]) }}><option value="normal">Classroom</option><option value="differences">Spot the difference</option><option value="vocabulary">Vocabulary</option><option value="sentence">Sentence puzzle</option><option value="yes-no">Āe / Kāo</option></select>
      <button className="classroom-look-button" aria-label="Change look" title="Change look" onClick={() => appearanceDialog.current?.showModal()}><svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" aria-hidden="true"><path d="m8 4-5 3 2 5 3-1v9h8v-9l3 1 2-5-5-3c0 4-8 4-8 0Z" /></svg></button>
      <details className="classroom-profile">
        <summary aria-label={`Profile: ${playerName(selected)}`}><span className="classroom-avatar" style={{ background: appearances[selected].color }}>{playerInitial(selected)}</span><span>{playerName(selected)}</span><span aria-hidden="true">⌄</span></summary>
        <div className="classroom-profile-menu">
          <p>Preview profile</p>
          <div className="classroom-players" aria-label="Choose a character">
            {appearances.map(({ color }, i) => exercise === 'normal' && i !== 0 ? null : <button key={i} aria-pressed={selected === i} onClick={event => {
              setSelected(i)
              event.currentTarget.closest('details')?.removeAttribute('open')
            }}><span className="classroom-avatar" style={{ background: color }}>{playerInitial(i)}</span>{playerName(i)}</button>)}
          </div>
        </div>
      </details>
      </div>
    </header>
    <div className="classroom-workspace">
    <section className="classroom-room-panel" aria-label="Living classroom">
      <div className="classroom-stage">
    <div ref={floor} className="classroom-floor" role="application" aria-label="Practice room. Click to walk, or use arrow keys." tabIndex={0}
      onPointerDown={event => {
        if ((event.target as HTMLElement).closest('button, .classroom-whiteboard')) return
        const rect = event.currentTarget.getBoundingClientRect()
        move((event.clientX - rect.left - event.currentTarget.clientLeft) / event.currentTarget.clientWidth * 800,
          (event.clientY - rect.top - event.currentTarget.clientTop) / event.currentTarget.clientHeight * 500)
        event.currentTarget.focus()
      }}
      onKeyDown={event => {
        if (event.target !== event.currentTarget) return
        const delta: Record<string, [number, number]> = { ArrowLeft: [-35, 0], ArrowRight: [35, 0], ArrowUp: [0, -35], ArrowDown: [0, 35] }
        if (!delta[event.key]) return
        event.preventDefault()
        const p = positions.current[selected], [dx, dy] = delta[event.key]
        move(p.tx + dx, p.ty + dy)
      }}>
      <img className="classroom-scenery" src={exercise === 'differences' ? `/classroom/lounge-${selected < 2 ? 'a' : 'b'}-v1.png` : '/classroom/room-whiteboard-v2.png'} alt={exercise === 'differences' ? 'Furnished community lounge with a cabinet, seating and an open timber floor.' : 'Sunlit classroom with a large whiteboard, two lake-facing windows and an open timber floor.'} draggable={false} />
      {exercise === 'normal' ? null : exercise === 'differences' ? <ClassroomDifferences selected={selected} players={players} move={move} /> : exercise === 'vocabulary' ? <ClassroomVocabulary players={players} move={move} onReset={() => { positions.current = initialPlayers(); setPlayers([...positions.current]) }} /> : sentencePuzzle ? <ClassroomSentencePuzzle players={players} move={move} onReset={() => { positions.current = initialPlayers(); setPlayers([...positions.current]) }} /> : <ClassroomWhiteboard data={data} error={error} teacher={selected === TEACHER_INDEX} onStatementChange={() => {
          positions.current = positions.current.map((p, i) => i === TEACHER_INDEX ? p : { ...p, tx: STARTS[i][0], ty: STARTS[i][1], walking: true })
          setPlayers([...positions.current])
      }} />}
      {!sentencePuzzle && ANSWER_ZONES.map(zone => {
        const count = players.filter((p, i) => i !== TEACHER_INDEX && answerZoneAt(p) === zone.id).length
        return <button key={zone.id} className={`classroom-answer-zone classroom-answer-${zone.id}`} aria-label={`Walk to ${zone.label}`} style={{ left: `${zone.left / 8}%`, top: `${zone.top / 5}%`, width: `${(zone.right - zone.left) / 8}%`, height: `${(zone.bottom - zone.top) / 5}%` }} onClick={() => {
          const destination = answerDestination(zone, selected)
          move(destination.x, destination.y)
          floor.current?.focus()
        }}>
          <span className="classroom-answer-label">{zone.label}</span><span className="classroom-answer-count" aria-label={`${count} students`}>{count}</span>
        </button>
      })}
      <span className="classroom-sr-only" role="status">{ANSWER_ZONES.map(zone => `${zone.label}: ${players.filter((p, i) => i !== TEACHER_INDEX && answerZoneAt(p) === zone.id).length}`).join('. ')}</span>
      {players.map((p, i) => exercise === 'normal' && i !== 0 ? null : <button key={i} aria-label={playerName(i)} onClick={() => setSelected(i)}
        className={`room-player room-player-${p.direction} room-player-style-${i}${i === TEACHER_INDEX ? ' room-player-teacher' : ''}${p.walking ? ' room-player-walking' : ''}${selected === i ? ' room-player-selected' : ''}`}
        style={{ left: `${p.x / 8}%`, top: `${p.y / 5}%`, zIndex: Math.round(p.y), '--shirt': appearances[i].color } as React.CSSProperties}>
        <span className="room-player-label">{i === 0 ? visitorName || 'You' : i + 1}</span><span className="room-player-shadow" />
        <LoungeSprite player={p} color={appearances[i].color} look={appearances[i].look} />
      </button>)}
      {players[selected].walking && <span className="room-destination" style={{ left: `${players[selected].tx / 8}%`, top: `${players[selected].ty / 5}%` }} />}
    </div>
      </div>
    </section>
    <aside className="classroom-sidebar" aria-label="Room chat and camera">
      <div className="classroom-chat-heading"><h2>Chat</h2><span className="classroom-preview-label" title="Local preview — messages are visible on this device only" aria-label="Local preview. Messages are visible on this device only.">Preview</span><button className="classroom-camera-toggle" aria-label="Camera" title="Camera area" aria-expanded={cameraOpen} aria-controls="classroom-camera-area" onClick={() => setCameraOpen(open => !open)}>
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><rect x="3" y="6" width="12" height="12" rx="2" /><path d="m15 10 6-3v10l-6-3z" /></svg>
      </button></div>
      {cameraOpen && <section id="classroom-camera-area" className="classroom-camera-area" aria-label="Optional camera area"><span className="classroom-camera-placeholder" aria-hidden="true"><svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="6" width="12" height="12" rx="2" /><path d="m15 10 6-3v10l-6-3z" /></svg></span><strong>Camera space</strong><span>Video isn’t connected yet.</span></section>}
      <div className="classroom-chat-log" ref={chatLog} role="log" aria-label="Messages" aria-live="polite" aria-relevant="additions">
        {messages.map(message => <div className="classroom-message" key={message.id}><span className="classroom-avatar" style={{ background: appearances[message.player].color }}>{playerInitial(message.player)}</span><div><strong>{playerName(message.player)}</strong><p>{message.text}</p></div></div>)}
      </div>
      <form className="classroom-chat-compose" onSubmit={event => {
        event.preventDefault()
        const text = draft.trim()
        if (!text) return
        setMessages(current => [...current, { id: (current.at(-1)?.id ?? 0) + 1, player: selected, text }])
        setDraft('')
      }}>
        <div><input aria-label="Message the room" placeholder="Message…" value={draft} maxLength={1000} onChange={event => setDraft(event.target.value)} /><button type="submit" disabled={!draft.trim()} aria-label="Send message"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="m5 12 14-7-5 14-3-6-6-1Z M11 13l8-8" /></svg></button></div>
      </form>
    </aside>
    </div>
    <dialog className="classroom-look-dialog" ref={entryDialog} aria-labelledby="classroom-entry-title" onCancel={event => event.preventDefault()}>
      <form onSubmit={event => { event.preventDefault(); if (!nameDraft.trim()) return; setVisitorName(nameDraft.trim()); entryDialog.current?.close(); floor.current?.focus() }}>
        <h2 id="classroom-entry-title">Your name</h2>
        <input aria-label="Your name" autoFocus required maxLength={30} autoComplete="given-name" value={nameDraft} onChange={event => setNameDraft(event.target.value)} />
        <footer><button type="submit" disabled={!nameDraft.trim()}>Enter classroom</button></footer>
      </form>
    </dialog>
    <dialog className="classroom-look-dialog" ref={appearanceDialog} aria-labelledby="classroom-look-title">
      <header><h2 id="classroom-look-title">{playerName(selected)}’s look</h2><button aria-label="Close appearance picker" onClick={() => appearanceDialog.current?.close()}>×</button></header>
      <fieldset><legend>Character</legend><div className="classroom-look-options">
        {(['male', 'female'] as const).map(look => <button key={look} aria-pressed={appearances[selected].look === look} onClick={() => changeAppearance({ look })}>
          <span className="classroom-look-preview"><LoungeSprite look={look} color={appearances[selected].color} player={{ ...players[selected], walking: false, direction: 'front' }} /></span>
          {look === 'male' ? 'Male' : 'Female'}
        </button>)}
      </div></fieldset>
      <fieldset><legend>Shirt colour</legend><div className="classroom-shirt-options">
        {SHIRTS.map((color, i) => <button key={color} style={{ background: color }} aria-label={SHIRT_NAMES[i]} aria-pressed={appearances[selected].color === color} onClick={() => changeAppearance({ color })}>{appearances[selected].color === color ? '✓' : ''}</button>)}
      </div></fieldset>
      <footer><small>{appearanceSaved ? 'Saved on this device' : 'Changed for this visit only'}</small><button onClick={() => appearanceDialog.current?.close()}>Done</button></footer>
    </dialog>
  </main>
}
