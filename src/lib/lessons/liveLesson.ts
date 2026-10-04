import type { AnswerFeedback } from './chatAnswer'
export type LessonMessage = { text: string; senderName?: string; feedback?: AnswerFeedback | null; seat?: number }
export type LessonRoom = {
  room: string; joined: boolean; seat: number
  members: { seat: number; name: string }[]
  state: { lessonChats?: Record<string, { messages: LessonMessage[]; hands: Record<string, boolean> }> }
}
export async function lessonRoomRequest(room: string, action?: string, values: Record<string, unknown> = {}): Promise<LessonRoom> {
  const response = await fetch(action ? '/__classroom' : `/__classroom?room=${encodeURIComponent(room)}`, {
    method: action ? 'POST' : 'GET', credentials: 'same-origin',
    ...(action ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, room, ...values }) } : {}),
  })
  const result = await response.json()
  if (!response.ok) throw new Error(result.error || 'Could not connect. Try again.')
  return result
}
