import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readCourseCurriculum, readCourseLesson, checkCourseAnswer } from './courseCurriculum.mjs'
import { validCoursePayload, courseQuestionAnswers } from './courseCurriculumValidation.mjs'
import { readFile } from 'node:fs/promises'

const payload = { sheet: { title: 'Lesson', questions: [{ id: 'one', mi: '', en: 'The bird is Charlie.', direction: 'structure-choice', answer: 'Ko', acceptedAnswers: ['Ko'], options: ['Ko', 'He'] }, { id: 'two', mi: 'Ko Charlie te manu.', en: 'The bird is Charlie.', direction: 'en-mi', retrievalWords: ['manu'], retrievalFrom: 'L1-01', reviewClauses: [{mi: 'Ko Charlie te manu.', en: 'The bird is Charlie.', from: 'L1-01'}], acceptedAnswers: ['Ko Charlie te manu.'] }, { id: 'three', mi: 'Ko Charlie te manu.', en: 'The bird is Charlie.', direction: 'mi-en', acceptedAnswers: ['The bird is Charlie.'] }] }, pacing: { newWords: [] }, timeline: [], entries: [], optionalEntries: [] }
test('public schedule contains no exercises or answer keys', async () => {
  const db = { query: async () => ({ rows: Array.from({ length: 60 }, (_, index) => ({ level: Math.floor(index / 10) + 1, lesson_number: index % 10 + 1, status: 'draft', curriculum_payload: payload })) }) }
  const result = await readCourseCurriculum(db)
  assert.equal(result.source, 'database')
  assert.equal(result.lessons.length, 60)
  assert.equal(JSON.stringify(result).includes('acceptedAnswers'), false)
  assert.equal(JSON.stringify(result).includes('questions'), false)
})
test('published lesson hides answer keys; server checks the addressed answer', async () => {
  const oldFetch = globalThis.fetch
  const oldUrl = process.env.VITE_STUDENT_SUPABASE_URL
  const oldKey = process.env.VITE_STUDENT_SUPABASE_PUBLISHABLE_KEY
  process.env.VITE_STUDENT_SUPABASE_URL = 'https://example.test'
  process.env.VITE_STUDENT_SUPABASE_PUBLISHABLE_KEY = 'test'
  globalThis.fetch = async url => new Response(JSON.stringify(url.includes('/auth/') ? { id: 'student' } : [{ user_id: 'student', name: 'Learner' }]))
  try {
    const db = { query: async () => ({ rows: [{ id: 'lesson', status: 'published', curriculum_payload: payload }] }) }
    const lesson = await readCourseLesson(db, 'Bearer test', 1, 1)
    assert.equal('answer' in lesson.questions[0], false)
    assert.equal('acceptedAnswers' in lesson.questions[0], false)
    assert.equal('mi' in lesson.questions[1], false)
    assert.equal('retrievalWords' in lesson.questions[1], false)
    assert.equal('retrievalFrom' in lesson.questions[1], false)
    assert.equal('reviewClauses' in lesson.questions[1], false)
    assert.equal('en' in lesson.questions[2], false)
    assert.deepEqual(await checkCourseAnswer(db, 'Bearer test', 1, 1, 'one', 'Ko'), { correct: true })
    assert.deepEqual(await checkCourseAnswer(db, 'Bearer test', 1, 1, 'one', 'He'), { correct: false })
    payload.sheet.questions[1].acceptedAnswers = ['']
    assert.deepEqual(await checkCourseAnswer(db, 'Bearer test', 1, 1, 'two', 'Ko Charlie te manu.'), { correct: true })
    assert.deepEqual(await checkCourseAnswer(db, 'Bearer test', 1, 1, 'two', ''), { correct: false })
    await assert.rejects(readCourseLesson(db, undefined, 1, 1), error => error.status === 401)
    const draft = { query: async sql => ({ rows: sql.includes('kp_lesson_teachers') ? [{ allowed: false }] : [{ id: 'lesson', status: 'draft', curriculum_payload: payload }] }) }
    await assert.rejects(readCourseLesson(draft, 'Bearer test', 1, 1), error => error.status === 409)
  } finally {
    globalThis.fetch = oldFetch
    if (oldUrl === undefined) delete process.env.VITE_STUDENT_SUPABASE_URL; else process.env.VITE_STUDENT_SUPABASE_URL = oldUrl
    if (oldKey === undefined) delete process.env.VITE_STUDENT_SUPABASE_PUBLISHABLE_KEY; else process.env.VITE_STUDENT_SUPABASE_PUBLISHABLE_KEY = oldKey
  }
})
test('all reviewed lessons have valid exercises, including translation targets; incomplete payloads cannot publish', async () => {
  const bank = JSON.parse(await readFile(new URL('../docs/curriculum/translation-bank/sheets.json', import.meta.url)))
  const pacing = JSON.parse(await readFile(new URL('../docs/curriculum/translation-bank/vocabulary-pacing.json', import.meta.url)))
  for (const [index, sheet] of bank.sheets.entries()) {
    const full = { version: 1, sheet, pacing: pacing.lessons[index], timeline: [], entries: [], optionalEntries: [], senseIntroductions: [] }
    assert.equal(validCoursePayload(full, sheet.level, sheet.lesson), true, sheet.id)
    assert.ok(sheet.questions.every(question => courseQuestionAnswers(question).length > 0))
    assert.equal(validCoursePayload({ ...full, sheet: { ...sheet, questions: sheet.questions.slice(1) } }, sheet.level, sheet.lesson), false)
    assert.equal(validCoursePayload(full, sheet.level, sheet.lesson + 1), false)
  }
  const sheet = bank.sheets[0]
  const full = { version: 1, sheet, pacing: pacing.lessons[0], timeline: [], entries: [], optionalEntries: [], senseIntroductions: [] }
  const questions = sheet.questions.map((question, index) => index ? question : { ...question, acceptedAnswers: ['invalid'], answer: 'invalid' })
  assert.equal(validCoursePayload({ ...full, sheet: { ...sheet, questions } }, 1, 1), false)
})
