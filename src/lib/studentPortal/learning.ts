import { studentClient } from './client'
import type { Assessment, Training } from './client'
export type LearningRecord = {
  id: string; kind: 'course' | 'attendance' | 'learning' | 'activity' | 'score';
  title: string; level: number | null; status: string; detail: string;
  occurred_on: string | null; score: number | null; total: number | null;
}
export type Interest = { id: string; selected_level: number; created_at: string }
export type PortalLesson = {
  id: string; title: string; level: number; startsAt: string; endsAt: string;
  timezone: string; meetingUrl?: string; notes: { title: string; body: string }[];
}
export function meetingLink(value?: string) {
  try { const url = new URL(value ?? ''); return url.protocol === 'https:' ? url.href : null } catch { return null }
}
export type LearningData = { lessons?: PortalLesson[]; records: LearningRecord[]; interests: Interest[]; training: Training[]; assessments: Assessment[] }
export async function loadLearning(userId: string): Promise<LearningData> {
  if (!studentClient) throw new Error('Student sign-in is temporarily unavailable.')
  const results = await Promise.all([
    studentClient.from('kp_learning_records').select('*').eq('user_id', userId).order('occurred_on', { ascending: false, nullsFirst: false }),
    studentClient.rpc('kp_my_course_interest'),
    studentClient.from('kp_training').select('*').eq('user_id', userId).order('recorded_on', { ascending: false }),
    studentClient.from('kp_assessments').select('*').eq('user_id', userId).order('assessed_on', { ascending: false }),
  ])
  for (const result of results) if (result.error) throw result.error
  return { records: results[0].data ?? [], interests: results[1].data ?? [], training: results[2].data ?? [], assessments: results[3].data ?? [] }
}
export function attendanceSummary(records: LearningRecord[]) {
  const sessions = records.filter(row => row.kind === 'attendance')
  const counted = sessions.filter(row => row.status !== 'excused')
  const present = counted.filter(row => row.status === 'present').length
  return { present, total: counted.length, percent: counted.length ? Math.round(present / counted.length * 100) : null }
}
export function statusLabel(status: string) {
  return ({ signed_up: 'Signed up', booked: 'Booked', enrolled: 'Enrolled', attending: 'Attending', completed: 'Completed', cancelled: 'Cancelled', present: 'Present', absent: 'Absent', excused: 'Excused', in_progress: 'In progress', met: 'Achieved', developing: 'Developing' } as Record<string, string>)[status] ?? status
}
