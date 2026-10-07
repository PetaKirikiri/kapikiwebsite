export type AnswerFeedback = { correct: boolean; text: string }

// Lesson-authored response format, not POS inference or factual verification.
export function checkLessonAnswer(promptId: string, answer: string): AnswerFeedback | null {
  const bigWords = promptId === 'level-1-lesson-1-big-words'
  if (!bigWords && promptId !== 'level-1-lesson-1-father') return null
  const text = answer.normalize('NFC').trim().replace(/[.!]$/, '').trim()
  const response = bigWords ? text.replace(/^nō\s+/iu, 'Ko ') : text
  const valid = /^ko\s+[\p{L}][\p{L}\p{M}'’\-]*(?:\s+[\p{L}][\p{L}\p{M}'’\-]*)*$/iu.test(response)
  return valid
    ? { correct: true, text: bigWords ? '✓ Correct answer format.' : '✓ Correct answer format — Ko + name.' }
    : { correct: false, text: bigWords ? 'Try Ko followed by a name, or Nō followed by a place.' : 'Try Ko followed by the name.' }
}

export function recogniseChatAnswer(promptId: string, text: string): AnswerFeedback | null {
  const result = checkLessonAnswer(promptId, text)
  return result?.correct ? result : null
}
