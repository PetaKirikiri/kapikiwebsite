import { studentClient } from './client'
import type { interestRequest } from './join'

// Public deployments can use their same-origin handler; local previews retain
// the existing Supabase path. Neither path requires a student account.
const endpoint = import.meta.env.VITE_COURSE_INTEREST_ENDPOINT
export const interestRegistrationAvailable = Boolean(endpoint || studentClient)

export async function submitCourseInterest(request: ReturnType<typeof interestRequest>) {
  if (endpoint) {
    const response = await fetch(endpoint, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    })
    if (!response.ok) throw new Error('Interest registration failed')
    const result: unknown = await response.json()
    if (!result || typeof result !== 'object' || !('saved' in result) || result.saved !== true) {
      throw new Error('Interest registration was not confirmed')
    }
    return
  }
  if (!studentClient) throw new Error('Interest registration is unavailable')
  const { error } = await studentClient.from('kp_course_interest').insert(request)
  if (error) throw error
}
