import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_STUDENT_SUPABASE_URL
const key = import.meta.env.VITE_STUDENT_SUPABASE_PUBLISHABLE_KEY
export const studentClient = url && key ? createClient(url, key, {
  auth: { storageKey: 'ka-piki-student-auth', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
}) : null

export type Profile = { user_id: string; name: string; selected_level: number; goals: string; availability: string[]; timezone: string; availability_notes: string }
export type Membership = { department_id: string; user_id: string; role: 'student' | 'coordinator'; status: 'pending' | 'active'; created_at: string }
export type Department = { id: string; name: string; join_code: string }
export type Affiliation = { user_id: string; affiliation: string; share_with_coordinators: boolean }
export type Training = { id: string; department_id: string; user_id: string; title: string; status: 'enrolled' | 'attending' | 'completed'; recorded_on: string }
export type Standard = { id: string; department_id: string; title: string; description: string }
export type Assessment = { id: string; department_id: string; user_id: string; standard_id: string; outcome: 'developing' | 'met'; assessed_level: number | null; evidence: string; assessed_on: string; created_at: string }
export const AVAILABILITY = ['Monday morning', 'Monday afternoon', 'Monday evening', 'Tuesday morning', 'Tuesday afternoon', 'Tuesday evening', 'Wednesday morning', 'Wednesday afternoon', 'Wednesday evening', 'Thursday morning', 'Thursday afternoon', 'Thursday evening', 'Friday morning', 'Friday afternoon', 'Friday evening']
export function latestAssessments(rows: Assessment[]) {
  const latest = new Map<string, Assessment>()
  for (const row of [...rows].sort((a, b) => b.assessed_on.localeCompare(a.assessed_on) || b.created_at.localeCompare(a.created_at) || b.id.localeCompare(a.id))) {
    const key = `${row.user_id}:${row.standard_id}`
    if (!latest.has(key)) latest.set(key, row)
  }
  return [...latest.values()]
}
export function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : typeof error === 'object' && error && 'message' in error ? String(error.message) : 'Something went wrong. Please try again.'
}
