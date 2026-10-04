export type AnswerFeedback = { correct: boolean; text: string }

// Lesson-authored response format, not POS inference or factual verification.
export function checkLessonAnswer(promptId: string, answer: string): AnswerFeedback | null {
  if (promptId !== 'level-1-lesson-1-father') return null
  const text = answer.normalize('NFC').trim().replace(/[.!]$/, '').trim()
  const valid = /^ko\s+[\p{L}][\p{L}\p{M}'’\-]*(?:\s+[\p{L}][\p{L}\p{M}'’\-]*)*$/iu.test(text)
  return valid
    ? { correct: true, text: '✓ Correct answer format — Ko + name.' }
    : { correct: false, text: 'Try Ko followed by the name.' }
}

export function recogniseChatAnswer(promptId: string, text: string): AnswerFeedback | null {
  const result = checkLessonAnswer(promptId, text)
  return result?.correct ? result : null
}
