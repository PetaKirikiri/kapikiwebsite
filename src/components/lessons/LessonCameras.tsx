import { ClassVideo } from '../../lib/lessons/classVideo'
import LearnerProfileDialog from './LearnerProfileDialog'
import { useEffect, useRef, useState, type ReactNode } from 'react'

export type ClassPerson = { id: number; userId?: string; name: string; raised: boolean; local: boolean }

function cameraError(cause: unknown) {
  const name = cause instanceof Error ? cause.name : ''
  if (name === 'NotAllowedError' || name === 'SecurityError') return 'Allow camera access in your browser, then try again.'
  if (name === 'NotFoundError') return 'No camera found. Connect a camera and try again.'
  if (name === 'NotReadableError') return 'Camera unavailable. Close any other app using it and try again.'
  return 'Could not start the camera. Try again.'
}

function CameraIcon({ off = true }: { off?: boolean }) {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><rect x="3" y="6" width="12" height="12" rx="2" /><path d="m15 10 6-3v10l-6-3" />{off && <path d="M3 3l18 18" />}</svg>
}

function Video({ stream, local, name }: { stream: MediaStream; local: boolean; name: string }) {
  const ref = useRef<HTMLVideoElement>(null)
  const [blocked, setBlocked] = useState(false)
  useEffect(() => {
    const element = ref.current
    if (!element) return
    element.srcObject = stream
    void element.play().catch(() => setBlocked(true))
    return () => { element.srcObject = null }
  }, [stream])
  return <><video ref={ref} autoPlay muted={local} playsInline data-local={local} aria-label={`${name} · Camera`} />
    {blocked && <span role="button" tabIndex={0} className="lesson-camera-preview-label" onClick={event => { event.stopPropagation(); void ref.current?.play().then(()=>setBlocked(false)) }} onKeyDown={event => { if(event.key==='Enter'){event.stopPropagation();void ref.current?.play().then(()=>setBlocked(false))} }}>Play audio</span>}</>
}

export default function LessonCameras({ people, roomId, children }: { people: ClassPerson[]; roomId: string | null; children?: ReactNode }) {
  const [selectedPerson, setSelectedPerson] = useState<ClassPerson | null>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [remote, setRemote] = useState<Record<number, MediaStream>>({})
  const [pending, setPending] = useState(false)
  const [muted, setMuted] = useState(true)
  const [cameraOn, setCameraOn] = useState(true)
  const [error, setError] = useState('')
  const capture = useRef<MediaStream | null>(null)
  const call = useRef<ClassVideo | null>(null)
  const request = useRef(0)

  useEffect(() => () => {
    request.current++
    call.current?.stop(); call.current = null
    capture.current?.getTracks().forEach(track => track.stop()); capture.current = null
  }, [roomId])

  function stop() {
    request.current++; call.current?.stop(); call.current = null
    capture.current?.getTracks().forEach(track=>track.stop()); capture.current=null
    setStream(null);setRemote({});setPending(false)
  }
  async function join() {
    if (!roomId) { setError('Join the class using its shared link first.'); return }
    const attempt = ++request.current
    setError('');setPending(true)
    try {
      const next = await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true},video:{width:{ideal:640},height:{ideal:360},frameRate:{ideal:20,max:24},facingMode:'user'}})
      if (attempt !== request.current) { next.getTracks().forEach(t=>t.stop()); return }
      next.getAudioTracks().forEach(t=>{t.enabled=false})
      next.getTracks().forEach(track=>track.addEventListener('ended',()=>{if(attempt===request.current){stop();setError('Camera or microphone disconnected. Rejoin the call.')}},{once:true}))
      capture.current=next;setMuted(true);setCameraOn(true);setStream(next)
      const connection = new ClassVideo(roomId,next,(seat,value)=>{
        if(attempt!==request.current)return
        setRemote(previous=>{const updated={...previous};if(value)updated[seat]=value;else delete updated[seat];return updated})
      },message=>{if(attempt===request.current){stop();setError(message)}})
      call.current=connection
      await connection.start()
    } catch (cause) {
      if(attempt===request.current){stop();setError(cause instanceof Error && cause.name==='Error'?cause.message:cameraError(cause))}
    } finally {if(attempt===request.current)setPending(false)}
  }
  function toggleMicrophone(){capture.current?.getAudioTracks().forEach(t=>{t.enabled=muted});setMuted(!muted)}
  function toggleCamera(){capture.current?.getVideoTracks().forEach(t=>{t.enabled=!cameraOn});setCameraOn(!cameraOn)}
  const seats = [...new Set([0, 1, 2, 3, ...people.map(person => person.id)])].sort((a, b) => a - b)
  const cameraLabel = cameraOn ? 'Turn off camera' : 'Turn on camera'
  return <>
    <div className="lesson-camera-strip" aria-label="Class cameras">
      <div className="lesson-camera-gallery">
        {seats.map(seat => {
          const person = people.find(item => item.id === seat)
          const name = person?.name ?? (seat === 0 ? 'Teacher' : 'Student')
          const seatStream = person?.local ? stream : remote[seat]
          const className = `lesson-camera-tile${person?.raised ? ' is-hand-raised' : ''}${!person ? ' is-empty' : ''}${seatStream ? ' has-video' : ''}`
          const content = <>
            {seatStream ? <Video stream={seatStream} local={Boolean(person?.local)} name={name} /> : <CameraIcon />}
            <span>{name}</span>
            {person?.local && pending && <small className="lesson-camera-preview-label" role="status">Opening…</small>}
            {person?.raised && <b aria-label="Hand raised">✋</b>}
          </>
          return person
            ? <div key={seat} className="lesson-camera-person"><button type="button" className={className} aria-label={`View profile · ${name}`} onClick={() => setSelectedPerson(person)}>{content}</button>
                {person.local && stream && <button type="button" className="lesson-camera-switch" aria-label={cameraLabel} title={cameraLabel} aria-pressed={cameraOn} onClick={toggleCamera}><CameraIcon off={!cameraOn} /></button>}
              </div>
            : <div key={seat} className={className} aria-label={`${name} · Camera not connected`}>{content}</div>
        })}
      </div>
      <div className="lesson-call-controls">
        {stream && <button type="button" className="lesson-chat-toggle" onClick={toggleMicrophone} aria-pressed={!muted} aria-label={muted?'Unmute microphone':'Mute microphone'}>{muted?'Unmute':'Mute'}</button>}
        <button type="button" className="lesson-chat-toggle" onClick={()=>stream||pending?stop():void join()}>{pending?'Cancel':stream?'Leave call':'Join call'}</button>
      </div>
      {children}
    </div>
    {selectedPerson && <LearnerProfileDialog person={selectedPerson} onClose={() => setSelectedPerson(null)} />}
    {error && <p className="lesson-camera-error" role="alert">{error}</p>}
  </>
}
