import './SiteIdentity.css'
import './TrainingIdentity.css'
import { useEffect, useRef, useState } from 'react'

export default function TrainingNavigation() {
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  useEffect(() => { const controller = new AbortController(); void fetch('/__training_profile', { signal: controller.signal }).then(async response => { if (!response.ok) throw new Error('Profile unavailable.'); return response.json() }).then(profile => setName(profile.name)).catch(error => { if (!controller.signal.aborted) setError(error.message) }); return () => controller.abort() }, [])
  const [draft, setDraft] = useState(name)
  const [open, setOpen] = useState(false)
  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    if (open) dialog.current?.showModal()
    else dialog.current?.close()
  }, [open])
  return <>
    <nav className="site-card-cover training-topbar" aria-label="Training navigation">
      <a className="training-nav-icon" href="#level-finder" aria-label="Back to website">‹</a>
      <a className="training-app-name" href="#training" aria-label="Ka Piki training">KA PIKI<span>APP</span></a>
      <button className="training-profile-button" aria-label="Open profile" aria-haspopup="dialog" onClick={() => { setDraft(name); setOpen(true) }}>
        {name ? <span>{Array.from(name.trim())[0]?.toLocaleUpperCase()}</span> : <span className="training-person" aria-hidden="true" />}
      </button>
    </nav>
    <dialog className="training-profile-sheet" ref={dialog} onCancel={() => setOpen(false)} onClose={() => setOpen(false)} aria-labelledby="training-profile-title">
      <header className="site-card-cover"><h2 id="training-profile-title">Your profile</h2><button type="button" aria-label="Close profile" onClick={() => setOpen(false)}>×</button></header>
      <a className="training-admin-entry" href="#training-admin" onClick={() => setOpen(false)}>Admin console <span>Content progression →</span></a>
      <form onSubmit={async event => { event.preventDefault(); setSaving(true); setError(''); try {
        const response = await fetch('/__training_profile', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: draft.trim() }) })
        if (!response.ok) throw new Error('Profile not saved. Try again.')
        const profile = await response.json(); setName(profile.name); setOpen(false)
      } catch (error) { setError(error instanceof Error ? error.message : 'Save failed.') } finally { setSaving(false) } }}>
        <label>Your name<input autoComplete="given-name" maxLength={80} value={draft} onChange={event => setDraft(event.target.value)} placeholder="What should we call you?" /></label>
        {error ? <p role="alert">{error}</p> : null}
        <button className="training-profile-save" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Done'}</button>
      </form>
    </dialog>
  </>
}
