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
  const [competitionOpen, setCompetitionOpen] = useState(false)
  const competitionDialog = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    if (competitionOpen) competitionDialog.current?.showModal()
    else competitionDialog.current?.close()
  }, [competitionOpen])
  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    if (open) dialog.current?.showModal()
    else dialog.current?.close()
  }, [open])
  return <>
    <nav className="site-card-cover training-topbar" aria-label="Training navigation">
      <a className="training-nav-icon" href="#level-finder" aria-label="Back to website">‹</a>
      <a className="training-app-name" href="#training" aria-label="Ka Piki training">KA PIKI<span>APP</span></a>
      <div className="training-header-actions">
      <button type="button" className="training-competition-icon" aria-label="Open leaderboard" aria-haspopup="dialog" onClick={() => setCompetitionOpen(true)}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M8 3h8v6a4 4 0 0 1-8 0V3Z" /><path d="M8 5H4v2a4 4 0 0 0 4 4m8-6h4v2a4 4 0 0 1-4 4M12 13v5m-4 3h8m-7 0v-3h6v3" />
        </svg>
      </button>
      <button className="training-profile-button" aria-label="Open profile" aria-haspopup="dialog" onClick={() => { setDraft(name); setOpen(true) }}>
        {name ? <span>{Array.from(name.trim())[0]?.toLocaleUpperCase()}</span> : <span className="training-person" aria-hidden="true" />}
      </button>
      </div>
    </nav>
    <dialog className="training-profile-sheet training-leaderboard" ref={competitionDialog} onCancel={() => setCompetitionOpen(false)} onClose={() => setCompetitionOpen(false)} aria-labelledby="training-leaderboard-title">
      <header className="site-card-cover"><h2 id="training-leaderboard-title">Leaderboard</h2><button type="button" aria-label="Close leaderboard" onClick={() => setCompetitionOpen(false)}>×</button></header>
      <div className="training-leaderboard-empty" role="status">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M8 3h8v6a4 4 0 0 1-8 0V3Z" /><path d="M8 5H4v2a4 4 0 0 0 4 4m8-6h4v2a4 4 0 0 1-4 4M12 13v5m-4 3h8m-7 0v-3h6v3" /></svg>
        <span>Not connected</span>
      </div>
    </dialog>
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
