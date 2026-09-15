export const LANGUAGE_SKILLS = ['Grammar', 'Listening', 'Pronunciation', 'Speaking', 'Vocabulary', 'Reading', 'Writing'] as const
export type SkillRatings = Partial<Record<(typeof LANGUAGE_SKILLS)[number], number>>

export function readSkillRatings(value: unknown): SkillRatings {
  const result: SkillRatings = {}
  if (!value || typeof value !== 'object') return result
  for (const skill of LANGUAGE_SKILLS) {
    const rating = (value as Record<string, unknown>)[skill]
    if (typeof rating === 'number' && Number.isInteger(rating) && rating >= 1 && rating <= 5) result[skill] = rating
  }
  return result
}

export function emailJoinRequest(form: FormData, ratings: SkillRatings, level: number, code: string, redirect: string) {
  const name = String(form.get('name') ?? '').trim()
  const email = String(form.get('email') ?? '').trim()
  const goals = String(form.get('goals') ?? '').trim()
  if (!name || name.length > 160) throw new Error('Please enter your name.')
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Please enter a valid email address.')
  if (goals.length > 3000) throw new Error('Please keep your learning goals under 3,000 characters.')
  if (!Number.isInteger(level) || level < 1 || level > 6) throw new Error('Please choose a starting level.')
  return { email, options: { emailRedirectTo: redirect, shouldCreateUser: true,
    data: { name, selected_level: level, department_code: code, goals, self_ratings: readSkillRatings(ratings) },
  } }
}

export function interestRequest(form: FormData, ratings: SkillRatings, level: number) {
  const request = emailJoinRequest(form, ratings, level, '', '')
  const { name, selected_level, goals, self_ratings } = request.options.data
  return { name, email: request.email, selected_level, goals, self_ratings }
}
