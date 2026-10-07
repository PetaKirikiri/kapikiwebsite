import type { LessonStep } from './client'
import { bigWordQuestions } from './bigWordQuestions'

export const WARM_UP_PHASES = [
  { id: 'recall', label: 'Recall' },
  { id: 'together', label: 'Try together' },
  { id: 'check', label: 'Quick check' },
] as const

export type WarmUpPhase = typeof WARM_UP_PHASES[number]['id']
type StepCopy = Pick<LessonStep, 'id' | 'title' | 'prompt_mi' | 'prompt_en'>
export type WarmUpActivity = StepCopy & (
  | { mode: 'presentation'; railClue?: { indices: readonly number[]; label: string } }
  // References the existing question/answer contract; does not create a second checker.
  | { mode: 'chat'; questionId: number }
)
export type WarmUpPlan = {
  duration_minutes: number
  phases: Record<WarmUpPhase, readonly WarmUpActivity[]>
}

const emptyWarmUp: WarmUpPlan = {
  duration_minutes: 10,
  phases: { recall: [], together: [], check: [] },
}

// Lesson content and the word to look for belong here. Its symbol and sentence
// rails always come from the shared engine, never a lesson-specific drawing.
const warmUps: Readonly<Record<string, WarmUpPlan>> = {
  '1:1': {
    duration_minutes: 10,
    phases: {
      recall: [{
        id: 'find-ko', mode: 'presentation', title: 'Find the Big word',
        prompt_mi: bigWordQuestions[0].text, prompt_en: '',
        railClue: { indices: [0], label: 'Ko' },
      }],
      together: [{
        id: 'find-ko-again', mode: 'presentation', title: 'Find the same symbol',
        prompt_mi: bigWordQuestions[1].text, prompt_en: '',
        railClue: { indices: [0], label: 'Ko' },
      }],
      check: [],
    },
  },
}

export function lessonWarmUp(level: number, lesson: number): WarmUpPlan {
  return warmUps[`${level}:${lesson}`] ?? emptyWarmUp
}

export function warmUpQuestion(activity: WarmUpActivity | undefined) {
  return activity?.mode === 'chat' ? bigWordQuestions.find(question => question.id === activity.questionId) : undefined
}
