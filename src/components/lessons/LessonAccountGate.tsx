import { useEffect, useState, type ReactNode } from 'react'
import type { User } from '@supabase/supabase-js'
import { studentClient } from '../../lib/studentPortal/client'
import LearningSignIn from '../studentPortal/LearningSignIn'
import PasswordSetup, { needsPasswordSetup } from '../studentPortal/PasswordSetup'

export default function LessonAccountGate({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [checking, setChecking] = useState(Boolean(studentClient))
  const [profileId, setProfileId] = useState('')
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)
  useEffect(() => {
    if (!studentClient) return
    let active = true
    void studentClient.auth.getSession().then(({ data }) => { if (active) { setUser(data.session?.user ?? null); setChecking(false) } })
    const { data } = studentClient.auth.onAuthStateChange((_event, session) => {
      if (active) { setUser(session?.user ?? null); setChecking(false); setError('') }
    })
    return () => { active = false; data.subscription.unsubscribe() }
  }, [])
  const userId = user?.id
  useEffect(() => {
    if (!userId || !studentClient) return
    let active = true
    void studentClient.from('kp_profiles').select('name').eq('user_id', userId).maybeSingle().then(({ data, error }) => {
      if (!active) return
      if (error) setError('Your profile could not load.')
      else if (!data?.name?.trim()) setError('Add your name in My profile before joining.')
      else { setProfileId(userId); setError('') }
    }, () => { if (active) setError('Your profile could not load.') })
    return () => { active = false }
  }, [userId, retry])
  if (checking) return <p role="status">Signing in…</p>
  if (!user) return <LearningSignIn />
  if (needsPasswordSetup(user)) return <PasswordSetup user={user} onComplete={setUser} onSignOut={() => { void studentClient?.auth.signOut() }} />
  if (error) return <section className="learning-login site-card"><p role="alert">{error}</p><a href="#my-learning">My profile</a><button onClick={() => { setError(''); setProfileId(''); setRetry(n => n + 1) }}>Retry</button><button onClick={() => void studentClient?.auth.signOut()}>Sign out</button></section>
  if (profileId !== user.id) return <p role="status">Loading your profile…</p>
  return <div key={user.id}>{children}</div>
}
