import { useEffect, useRef, useState, type ReactNode } from 'react'
import { loadCallDisplayName } from '../lib/studentPortal/callIdentity'
import './JitsiClassCall.css'

type JitsiApi = { dispose: () => void; addListener: (event: string, callback: () => void) => void }
type JitsiConstructor = new (domain: string, options: Record<string, unknown>) => JitsiApi
declare global { interface Window { JitsiMeetExternalAPI?: JitsiConstructor } }
let scriptPromise: Promise<JitsiConstructor> | undefined
export function loadJitsi(): Promise<JitsiConstructor> {
  if (window.JitsiMeetExternalAPI) return Promise.resolve(window.JitsiMeetExternalAPI)
  if (scriptPromise) return scriptPromise
  scriptPromise = new Promise<JitsiConstructor>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://meet.jit.si/external_api.js'; script.async = true
    const timeout = window.setTimeout(fail, 20000)
    function fail() { clearTimeout(timeout); script.remove(); reject(new Error('Jitsi could not load. Check your connection and try again.')) }
    script.onerror = fail
    script.onload = () => { clearTimeout(timeout); if (window.JitsiMeetExternalAPI) resolve(window.JitsiMeetExternalAPI); else fail() }
    document.head.appendChild(script)
  }).catch(error => { scriptPromise = undefined; throw error })
  return scriptPromise
}

export function testCallId() {
  const url = new URL(window.location.href)
  const existing = url.searchParams.get('call')
  if (existing && /^[a-f0-9-]{36}$/i.test(existing)) return existing
  const id = crypto.randomUUID()
  url.searchParams.set('call', id)
  window.history.replaceState(window.history.state, '', url)
  return id
}

export default function JitsiClassCall({ roomId, renderTrigger }: { roomId?: string; renderTrigger?: (open: () => void) => ReactNode }) {
  const [call, setCall] = useState<string | null>(null)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const host = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!call) return
    let cancelled = false
    let api: JitsiApi | undefined
    const timeout = window.setTimeout(() => { if (!cancelled) setError('Jitsi is taking too long. Close and retry, or open Jitsi directly.') }, 30000)
    void Promise.all([loadJitsi(), loadCallDisplayName()]).then(([API, displayName]) => {
      if (cancelled || !host.current) return
      api = new API('meet.jit.si', {
        roomName: call, parentNode: host.current, width: '100%', height: '100%',
        userInfo: { displayName },
        configOverwrite: {
          startWithAudioMuted: false, startWithVideoMuted: false,
          prejoinConfig: { enabled: false }, disableDeepLinking: true,
          toolbarButtons: ['microphone', 'camera', 'desktop', 'tileview', 'settings', 'hangup'],
        },
        onload: () => { if (!cancelled) { clearTimeout(timeout); setStatus('Connecting…'); setError('') } },
      })
      api.addListener('videoConferenceJoined', () => { if (!cancelled) { setStatus('Connected'); setError('') } })
      api.addListener('readyToClose', () => { if (!cancelled) setCall(null) })
      api.addListener('cameraError', () => { if (!cancelled) setError('Camera unavailable. Check browser permissions and Jitsi device settings.') })
      api.addListener('micError', () => { if (!cancelled) setError('Microphone unavailable. Check browser permissions and Jitsi device settings.') })
    }).catch(error => { if (!cancelled) { clearTimeout(timeout); setError(error.message) } })
    return () => { cancelled = true; clearTimeout(timeout); api?.dispose() }
  }, [call])
  function open() {
    setError(''); setCopied(false); setStatus('Connecting…')
    try {
      setCall(`KaPikiTest-${roomId ? encodeURIComponent(roomId) : testCallId()}`)
    } catch (cause) {
      setStatus('')
      setError(cause instanceof Error ? `Could not open the call: ${cause.message}` : 'Could not open the call. Try again.')
    }
  }
  async function copy() {
    try { await navigator.clipboard.writeText(window.location.href); setCopied(true) }
    catch { setError('Copy this page’s address to share the test call.') }
  }
  return <>{renderTrigger?.(open)}<section hidden={Boolean(renderTrigger && !call && !error)} className="jitsi-class-call" aria-label="Class cameras and microphones">
    <header><strong>Cameras &amp; mic</strong><div>{call ? <><button onClick={() => void copy()}>{copied ? 'Copied' : 'Copy call link'}</button><button onClick={() => setCall(null)}>Close call</button></> : <button onClick={open}>Open cameras &amp; mic</button>}</div></header>
    {call && <><span className="jitsi-call-status" role="status">{status}</span><div ref={host} className="jitsi-call-frame" /><a href={`https://meet.jit.si/${call}#config.startWithAudioMuted=true&config.startWithVideoMuted=true`} target="_blank" rel="noopener noreferrer">Open in Jitsi ↗</a></>}
    {error && <p role="alert">{error}</p>}
  </section></>
}
