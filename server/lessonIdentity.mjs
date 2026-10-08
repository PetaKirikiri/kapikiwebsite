import { createHash } from 'node:crypto'
const fail = (message, status) => Object.assign(new Error(message), { status })
export async function lessonIdentity(authorization, request = fetch, env = process.env) {
  if (!authorization?.startsWith('Bearer ')) throw fail('Sign in to join your class.', 401)
  const url = env.VITE_STUDENT_SUPABASE_URL
  const key = env.VITE_STUDENT_SUPABASE_PUBLISHABLE_KEY
  if (!url || !key) throw fail('Account connection unavailable.', 503)
  const headers = { apikey: key, Authorization: authorization }
  const userResponse = await request(`${url}/auth/v1/user`, { headers, signal: AbortSignal.timeout(5000) })
  if (!userResponse.ok) throw fail('Sign in again to join your class.', 401)
  const user = await userResponse.json()
  if (!user.id) throw fail('Sign in again to join your class.', 401)
  const response = await request(`${url}/rest/v1/kp_profiles?user_id=eq.${encodeURIComponent(user.id)}&select=user_id,name`, { headers, signal: AbortSignal.timeout(5000) })
  if (!response.ok) throw fail('Your profile could not load. Try again.', 503)
  const profiles = await response.json()
  const profile = profiles.find(item => item.user_id === user.id)
  if (!profile?.name?.trim()) throw fail('Add your name in My profile before joining.', 403)
  return { id: user.id, name: profile.name.trim().slice(0, 60) }
}
// An account switch in the same browser must never inherit another person's seat.
export function lessonMemberHash(cookie, accountId) {
  return createHash('sha256').update(`lesson:${accountId}:${cookie}`).digest('hex')
}
