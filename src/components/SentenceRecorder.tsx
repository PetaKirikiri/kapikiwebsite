import { useEffect, useRef, useState } from 'react'
import type { WebsitePreviewSentence } from './WebsiteView'

export default function SentenceRecorder({ sentence, onClose, onSaved }: { sentence: WebsitePreviewSentence; onClose: () => void; onSaved: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const recorder = useRef<MediaRecorder | null>(null)
  const stream = useRef<MediaStream | null>(null)
  const timer = useRef<number | undefined>(undefined)
  const alive = useRef(true)
  const [recording, setRecording] = useState(false)
  const [busy, setBusy] = useState(false)
  const [draft, setDraft] = useState<Blob | null>(null)
  const [audio, setAudio] = useState<Blob | null>(null)
  const audioElement = useRef<HTMLAudioElement>(null)
  const [message, setMessage] = useState('')
  const endpoint = `/__training_recording?id=${sentence.structureId}&text=${encodeURIComponent(sentence.textMi)}`
  useEffect(() => {
    alive.current = true; dialog.current?.showModal()
    const controller = new AbortController()
    void fetch(endpoint, { signal: controller.signal }).then(async response => {
      if (response.status === 404) return
      if (!response.ok) throw new Error('Could not load the saved recording.')
      const blob = await response.blob()
      if (!controller.signal.aborted) { setAudio(blob); setMessage('Saved recording') }
    }).catch(error => { if (!controller.signal.aborted) setMessage(error.message) })
    return () => { alive.current = false; controller.abort(); window.clearTimeout(timer.current); if (recorder.current?.state === 'recording') recorder.current.stop(); stream.current?.getTracks().forEach(track => track.stop()) }
  }, [endpoint])
  useEffect(() => { if (!audio) return; const value = URL.createObjectURL(audio); if (audioElement.current) audioElement.current.src = value; return () => URL.revokeObjectURL(value) }, [audio])
  async function start() {
    setBusy(true); setMessage('')
    try {
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') throw new Error('This browser does not support microphone recording.')
      const input = await navigator.mediaDevices.getUserMedia({ audio: true })
      if (!alive.current) { input.getTracks().forEach(track => track.stop()); return }
      stream.current = input
      const mimeType = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/ogg;codecs=opus'].find(type => MediaRecorder.isTypeSupported(type))
      const next = new MediaRecorder(input, mimeType ? { mimeType } : undefined)
      recorder.current = next
      const chunks: BlobPart[] = []
      next.ondataavailable = event => { if (event.data.size) chunks.push(event.data) }
      next.onstop = () => {
        input.getTracks().forEach(track => track.stop()); window.clearTimeout(timer.current)
        if (!alive.current) return
        const blob = new Blob(chunks, { type: next.mimeType })
        setRecording(false)
        if (blob.size < 100) { setMessage('No audio captured. Try again.'); return }
        setDraft(blob); setAudio(blob); setMessage('Ready to save')
      }
      next.onerror = () => { input.getTracks().forEach(track => track.stop()); if (alive.current) { setRecording(false); setMessage('Recording failed. Please try again.') } }
      next.start(); setRecording(true)
      timer.current = window.setTimeout(() => { if (next.state === 'recording') next.stop() }, 60000)
    } catch (error) { stream.current?.getTracks().forEach(track => track.stop()); if (alive.current) setMessage(error instanceof Error ? error.message : 'Microphone unavailable.') }
    finally { if (alive.current) setBusy(false) }
  }
  async function save() {
    if (!draft) return
    setBusy(true); setMessage('Saving…')
    try {
      const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': draft.type }, body: draft })
      const result = await response.json()
      if (!response.ok || !result.saved) throw new Error(result.error ?? 'Save failed.')
      const readback = await fetch(endpoint)
      if (!readback.ok) throw new Error('Saved, but playback could not reload. Please reopen this recording.')
      const saved = await readback.blob()
      if (alive.current) { setAudio(saved); setDraft(null); setMessage('Saved to database'); onSaved() }
    } catch (error) { if (alive.current) setMessage(error instanceof Error ? error.message : 'Save failed. Your take is still here.') }
    finally { if (alive.current) setBusy(false) }
  }
  return <dialog ref={dialog} className="training-profile-sheet sentence-recorder" onCancel={onClose} aria-labelledby="record-sentence">
    <header><h2 id="record-sentence" lang="mi">{sentence.textMi}</h2><button aria-label="Close recording" disabled={busy} onClick={onClose}>×</button></header>
    <audio ref={audioElement} controls hidden={!audio || recording} />
    <div className="recorder-actions"><button disabled={busy} onClick={() => { if (recording) recorder.current?.stop(); else void start() }}>{recording ? '● Stop' : audio ? 'Record again' : '● Record'}</button><button disabled={!draft || recording || busy} onClick={() => void save()}>Save</button></div>
    <p role="status">{recording ? 'Recording…' : message}</p>
  </dialog>
}
