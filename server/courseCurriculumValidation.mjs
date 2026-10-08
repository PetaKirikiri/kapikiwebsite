const text = value => typeof value === 'string' && value.trim().length > 0

export function courseQuestionAnswers(question) {
  const explicit = Array.isArray(question.acceptedAnswers) ? question.acceptedAnswers.filter(text) : []
  const target = question.direction === 'en-mi' ? question.mi : question.direction === 'mi-en' ? question.en : question.answer
  return [...new Set([...explicit, ...(text(target) ? [target] : [])])]
}

export function validCoursePayload(payload, level, lesson) {
  if (!payload || payload.version !== 1 || !payload.sheet || !payload.pacing) return false
  const sheet = payload.sheet
  if (sheet.level !== level || sheet.lesson !== lesson || !text(sheet.title) || !text(sheet.pattern)) return false
  if (payload.pacing.level !== level || payload.pacing.lesson !== lesson) return false
  if (!['timeline', 'entries', 'optionalEntries', 'senseIntroductions'].every(key => Array.isArray(payload[key]))) return false
  if (!Array.isArray(sheet.questions) || sheet.questions.length !== 50) return false
  const ids = new Set()
  return sheet.questions.every(question => {
    if (!text(question.id) || ids.has(question.id) || !['structure-choice', 'en-mi', 'mi-en'].includes(question.direction)) return false
    ids.add(question.id)
    const answers = courseQuestionAnswers(question)
    if (!answers.length) return false
    if (question.direction === 'structure-choice') return text(question.en) && Array.isArray(question.options) && question.options.length > 1 && question.options.every(text) && answers.every(answer => question.options.includes(answer))
    return text(question.mi) && text(question.en)
  })
}
