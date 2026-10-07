import { studentClient } from '../studentPortal/client'
import type { AnswerFeedback } from './chatAnswer'
export type LessonMessage = { text: string; questionIndex?: number; senderName?: string; feedback?: AnswerFeedback | null; seat?: number }
export type LessonRoom = {
  room: string; joined: boolean; seat: number
  members: { seat: number; name: string; userId?: string }[]
  state: { lessonChats?: Record<string, { messages: LessonMessage[]; hands: Record<string, boolean> }> }
}
export async function lessonRoomRequest(room: string, action?: string, values: Record<string, unknown> = {}): Promise<LessonRoom> {
  const token = action === 'lesson-identity' ? (await studentClient?.auth.getSession())?.data.session?.access_token : undefined
  const response = await fetch(action ? '/__classroom' : `/__classroom?room=${encodeURIComponent(room)}`, {
    method: action ? 'POST' : 'GET', credentials: 'same-origin',
    ...(action ? { headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ action, room, ...values }) } : {}),
  })
  const result = await response.json()
  if (!response.ok) throw new Error(result.error || 'Could not connect. Try again.')
  return result
}
