import { studentClient } from './client'

function cleanName(value: unknown): string | undefined {
  return typeof value === 'string' ? value.trim().slice(0, 160) || undefined : undefined
}

/** Share only the display name with the video provider, never email or auth data. */
export async function loadCallDisplayName(): Promise<string> {
  if (!studentClient) return 'Learner'
  let fallback = 'Learner'
  try {
    const { data } = await studentClient.auth.getSession()
    const user = data.session?.user
    if (!user) return fallback
    fallback = cleanName(user.user_metadata?.name) ?? cleanName(user.user_metadata?.full_name) ?? fallback
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 4000)
    try {
      const { data: profile, error } = await studentClient.from('kp_profiles').select('name')
        .eq('user_id', user.id).abortSignal(controller.signal).maybeSingle()
      return error ? fallback : cleanName(profile?.name) ?? fallback
    } finally { clearTimeout(timeout) }
  } catch { return fallback }
}
