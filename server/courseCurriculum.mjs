import { lessonIdentity } from './lessonIdentity.mjs'
import { courseQuestionAnswers } from './courseCurriculumValidation.mjs'

export async function readCourseCurriculum(db) {
  const { rows } = await db.query('select level,lesson_number,status,curriculum_payload from public.kp_lesson_plans where curriculum_payload is not null order by level,lesson_number')
  if (rows.length !== 60) throw Object.assign(new Error('Course curriculum unavailable.'), { status: 503 })
  return { source: 'database', lessons: rows.map(row => {
    const p = row.curriculum_payload
    return { level: row.level, lesson: row.lesson_number, status: row.status, title: p.sheet.title,
      pacing: p.pacing, timeline: p.timeline, entries: p.entries, optionalEntries: p.optionalEntries }
  }) }
}

export async function readCourseLesson(db, authorization, level, lesson) {
  const identity = await lessonIdentity(authorization)
  const { rows } = await db.query('select id,status,curriculum_payload from public.kp_lesson_plans where level=$1 and lesson_number=$2', [level, lesson])
  const row = rows[0]
  if (!row?.curriculum_payload) throw Object.assign(new Error('Lesson unavailable.'), { status: 404 })
  if (row.status !== 'published') {
    const teacher = (await db.query('select exists(select 1 from public.kp_lesson_teachers where user_id=$1) as allowed', [identity.id])).rows[0].allowed
    if (!teacher) throw Object.assign(new Error('This lesson is awaiting publication.'), { status: 409 })
  }
  // Answer keys remain on the server; the checker accepts one addressed attempt.
  const { questions, id, title, pattern } = row.curriculum_payload.sheet
  const sheet = { id, level, lesson, title, pattern }
  return { source: 'database', id: row.id, status: row.status, sheet,
    questions: questions.map(({ acceptedAnswers, answer, ...question }) => {
      if (question.direction === 'en-mi') delete question.mi
      if (question.direction === 'mi-en') delete question.en
      return question
    }) }
}

export async function checkCourseAnswer(db, authorization, level, lesson, questionId, answer) {
  await readCourseLesson(db, authorization, level, lesson)
  const { rows } = await db.query('select curriculum_payload from public.kp_lesson_plans where level=$1 and lesson_number=$2', [level, lesson])
  const question = rows[0].curriculum_payload.sheet.questions.find(q => q.id === questionId)
  if (!question) throw Object.assign(new Error('Question unavailable.'), { status: 404 })
  const normalize = value => value.normalize('NFC').trim().toLocaleLowerCase('mi').replace(/[.!?]+$/u, '').trim()
  return { correct: courseQuestionAnswers(question).some(value => normalize(value) === normalize(answer)) }
}
