import { useEffect, useRef, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { studentClient } from './client'

export function useVerifiedStudentUser(onAuthChange?: () => void) {
  const [user, setUser] = useState<User | null>(null)
  const [checking, setChecking] = useState(Boolean(studentClient))
  const [error, setError] = useState('')
  const changed = useRef(onAuthChange)
  changed.current = onAuthChange
  useEffect(() => {
    const client = studentClient
    if (!client) return
    let active = true
    let identityRequest = 0
    let timer: ReturnType<typeof setTimeout> | undefined
    const verifyUser = async (request: number) => {
      try {
        const result = await client.auth.getUser()
        if (!active || request !== identityRequest) return
        setUser(result.error ? null : result.data.user)
        if (result.error && result.error.name !== 'AuthSessionMissingError') setError('We couldn’t verify your account. Please sign in again.')
      } catch {
        if (!active || request !== identityRequest) return
        setUser(null); setError('We couldn’t verify your account. Please sign in again.')
      }
      if (active && request === identityRequest) setChecking(false)
    }
    // Read current onboarding metadata, not the older cached session copy.
    void verifyUser(++identityRequest)
    const { data: listener } = client.auth.onAuthStateChange((event, session) => {
      if (!active || event === 'INITIAL_SESSION') return
      const request = ++identityRequest
      clearTimeout(timer)
      setUser(null); setError(''); changed.current?.()
      if (!session?.user) { setChecking(false); return }
      setChecking(true)
      // Auth callbacks hold the SDK lock; verify after the callback returns.
      timer = setTimeout(() => { void verifyUser(request) }, 0)
    })
    return () => { active = false; clearTimeout(timer); listener.subscription.unsubscribe() }
  }, [])
  return { user, setUser, checking, error }
}
