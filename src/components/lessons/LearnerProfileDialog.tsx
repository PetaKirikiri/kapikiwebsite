import { useEffect, useRef, useState } from 'react'
import { studentClient, type Profile } from '../../lib/studentPortal/client'
import type { ClassPerson } from './LessonCameras'
import './LearnerProfileDialog.css'

export default function LearnerProfileDialog({ person, onClose }: { person: ClassPerson; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [status, setStatus] = useState('Loading profile…')
  const [retry, setRetry] = useState(0)
  useEffect(() => {
    const element = dialog.current!
    const previous = document.activeElement as HTMLElement | null
    element.showModal()
    return () => { element.close(); previous?.focus() }
  }, [])
  useEffect(() => {
    let active = true
    setProfile(null)
    if (!person.userId || !studentClient) { setStatus('This participant is not linked to a learning profile yet.'); return }
    setStatus('Loading profile…')
    // The signed-in client's RLS permits self or an authorised department coordinator.
    void studentClient.from('kp_profiles').select('user_id,name,selected_level,goals,timezone,availability,availability_notes')
      .eq('user_id', person.userId).maybeSingle().then(({ data, error }) => {
        if (!active) return
        if (error) setStatus('Profile could not load.')
        else if (!data) setStatus('This profile is not available to your account.')
        else { setProfile(data); setStatus('') }
      }, () => { if (active) setStatus('Profile could not load.') })
    return () => { active = false }
  }, [person.userId, retry])
  return <dialog ref={dialog} className="learner-profile-dialog" aria-labelledby="learner-profile-title" onCancel={onClose} onClick={event => { if (event.target === event.currentTarget) { const box = event.currentTarget.getBoundingClientRect(); if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) onClose() } }}>
    <header><h2 id="learner-profile-title">{profile?.name || person.name}</h2><button type="button" aria-label="Close profile" onClick={onClose}>×</button></header>
    {status && <p role="status">{status}</p>}
    {status === 'Profile could not load.' && <button type="button" onClick={() => setRetry(value => value + 1)}>Retry</button>}
    {profile && <dl>
      <div><dt>Learning level</dt><dd>Level {profile.selected_level}</dd></div>
      <div><dt>About their learning</dt><dd>{profile.goals || 'Not added yet'}</dd></div>
      {profile.timezone && <div><dt>Time zone</dt><dd>{profile.timezone}</dd></div>}
    </dl>}
  </dialog>
}
