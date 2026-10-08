import { studentClient } from '../studentPortal/client'
export type LessonItem = { id: string; position: number; kind: string; text_mi: string; text_en: string; resource_url: string | null; alt_text: string; reveal_only: boolean }
export type LessonStep = { id: string; position: number; kind: string; title: string; prompt_mi: string; prompt_en: string; duration_minutes: number | null; items: LessonItem[] }
export type LessonPlan = { id: string; level: number; lesson_number: number; title: string; status: string; outcomes: string[]; curriculum_payload?: unknown }
export type LessonSession = { id: string; title: string; level: number; lesson_number: number; outcomes: string[]; step: LessonStep; current_step: number; step_count: number; revealed: boolean; revision: number; status: string; is_teacher: boolean; join_code: string | null }
export function lessonClient() {
 if (!studentClient) throw new Error('Lesson access is temporarily unavailable.')
 return studentClient
}
export async function lessonRpc<T>(name: string, args: Record<string, unknown> = {}): Promise<T> {
 const { data, error } = await lessonClient().rpc(name, args)
 if (error) throw error
 return data as T
}
export function safeResource(value: string | null) {
 try { const url = new URL(value ?? ''); return url.protocol === 'https:' ? url.href : undefined } catch { return undefined }
}
export const previewSteps: LessonStep[] = [
 { id: 'welcome', position: 0, kind: 'welcome', title: 'Kia ora', prompt_mi: '', prompt_en: 'Introduce yourself and describe your world.', duration_minutes: null, items: [] },
 { id: 'words', position: 1, kind: 'learn', title: 'Tūrangawaewae', prompt_mi: '', prompt_en: 'Where you’re from and the places you belong.', duration_minutes: null, items: [
  { id: 'maunga', position: 0, kind: 'word', text_mi: 'maunga', text_en: 'Mountain', resource_url: null, alt_text: '', reveal_only: false },
  { id: 'awa', position: 1, kind: 'word', text_mi: 'awa', text_en: 'River', resource_url: null, alt_text: '', reveal_only: false },
  { id: 'whenua', position: 2, kind: 'word', text_mi: 'whenua', text_en: 'Land; homeland', resource_url: null, alt_text: '', reveal_only: true },
 ] },
 { id: 'share', position: 2, kind: 'speak', title: 'Pepeha', prompt_mi: '', prompt_en: 'Say your pepeha.', duration_minutes: null, items: [] },
]
