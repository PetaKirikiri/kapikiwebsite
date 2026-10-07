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

/** A local preview, not a conference: remote slots stay empty until a media service is connected. */
export default function LessonCameras({ people, children }: { people: ClassPerson[]; children?: ReactNode }) {
  const [selectedPerson, setSelectedPerson] = useState<ClassPerson | null>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const capture = useRef<MediaStream | null>(null)
  const request = useRef(0)
  const video = useRef<HTMLVideoElement>(null)
  const localSeat = people.find(person => person.local)?.id

  useEffect(() => () => {
    request.current++
    capture.current?.getTracks().forEach(track => track.stop())
    capture.current = null
  }, [])

  useEffect(() => {
    const element = video.current
    if (!element || !stream) return
    element.srcObject = stream
    const ended = () => {
      stream.getTracks().forEach(track => track.stop())
      capture.current = null
      setStream(null)
      setError('Camera disconnected. Try again.')
    }
    stream.getVideoTracks().forEach(track => track.addEventListener('ended', ended))
    return () => {
      element.srcObject = null
      stream.getVideoTracks().forEach(track => track.removeEventListener('ended', ended))
    }
  }, [stream, localSeat])

  async function toggleCamera() {
    const attempt = ++request.current
    setError('')
    if (capture.current || pending) {
      capture.current?.getTracks().forEach(track => track.stop())
      capture.current = null
      setStream(null)
      setPending(false)
      return
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Camera access needs a secure browser connection.')
      return
    }
    setPending(true)
    try {
      const next = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { width: { ideal: 640 }, height: { ideal: 360 }, facingMode: 'user' },
      })
      if (attempt !== request.current) {
        next.getTracks().forEach(track => track.stop())
        return
      }
      capture.current = next
      setStream(next)
    } catch (cause) {
      if (attempt === request.current) setError(cameraError(cause))
    } finally {
      if (attempt === request.current) setPending(false)
    }
  }

  const seats = [...new Set([0, 1, 2, 3, ...people.map(person => person.id)])].sort((a, b) => a - b)
  const cameraLabel = stream ? 'Turn off your camera' : pending ? 'Cancel camera preview' : 'Turn on your camera preview'
  return <>
    <div className="lesson-camera-strip" aria-label="Class cameras">
      <div className="lesson-camera-gallery">
        {seats.map(seat => {
          const person = people.find(item => item.id === seat)
          const name = person?.name ?? (seat === 0 ? 'Teacher' : 'Student')
          const className = `lesson-camera-tile${person?.raised ? ' is-hand-raised' : ''}${!person ? ' is-empty' : ''}${person?.local && stream ? ' has-video' : ''}`
          const content = <>
            {person?.local && stream ? <><video ref={video} autoPlay muted playsInline aria-label={`Your camera preview · ${name}`} /><small className="lesson-camera-preview-label">Only you</small></> : <CameraIcon />}
            <span>{name}</span>
            {person?.local && pending && <small className="lesson-camera-preview-label" role="status">Opening…</small>}
            {person?.raised && <b aria-label="Hand raised">✋</b>}
          </>
          return person
            ? <div key={seat} className="lesson-camera-person"><button type="button" className={className} aria-label={`View profile · ${name}`} onClick={() => setSelectedPerson(person)}>{content}</button>
                {person.local && <button type="button" className="lesson-camera-switch" aria-label={cameraLabel} title={cameraLabel} aria-pressed={Boolean(stream)} onClick={() => void toggleCamera()}><CameraIcon off={!stream} /></button>}
              </div>
            : <div key={seat} className={className} aria-label={`${name} · Camera not connected`}>{content}</div>
        })}
      </div>
      {children}
    </div>
    {selectedPerson && <LearnerProfileDialog person={selectedPerson} onClose={() => setSelectedPerson(null)} />}
    {error && <p className="lesson-camera-error" role="alert">{error}</p>}
  </>
}
