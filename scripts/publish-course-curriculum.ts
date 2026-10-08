import { loadEnv } from 'vite'
import pg from 'pg'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { wordsDatabaseConnection } from '../server/wordsDatabase.mjs'
import { validCoursePayload } from '../server/courseCurriculumValidation.mjs'
import bank from '../docs/curriculum/translation-bank/sheets.json'
import pacing from '../docs/curriculum/translation-bank/vocabulary-pacing.json'
import { courseVocabularyEntries, optionalPersonalisationEntries } from '../src/lib/courseVocabularyEntries'
import { courseVocabularyTimeline } from '../src/lib/courseVocabularyTimeline'
import type { CurriculumLevel } from '../src/lib/sentenceStructureLevels'

const levels: CurriculumLevel[] = [1, 2, 3, 4, 5, 6]
const entries = levels.flatMap(level => courseVocabularyEntries(level).filter(entry => entry.kind === 'word'))
const timeline = courseVocabularyTimeline(bank.sheets, entries)
const expected = bank.sheets.map((sheet, index) => ({
  version: 1, sheet, pacing: pacing.lessons[index],
  senseIntroductions: pacing.senseIntroductions.filter(sense => sense.lesson === index + 1),
  timeline: timeline.filter(row => row.firstLesson === index + 1 || (index === 0 && row.firstLesson === null)),
  entries: sheet.lesson === 1 ? courseVocabularyEntries(sheet.level as CurriculumLevel) : [],
  optionalEntries: sheet.lesson === 1 ? optionalPersonalisationEntries(sheet.level as CurriculumLevel) : [],
}))
const canonical = (value: any): any => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value
const fingerprint = (value: unknown) => createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex')
const pool = new pg.Pool({ ...wordsDatabaseConnection(loadEnv('development', process.cwd(), '')), max: 1 })
const client = await pool.connect()
try {
  await client.query('begin')
  await client.query("set local lock_timeout='5s'")
  await client.query("set local statement_timeout='30s'")
  const before = (await client.query('select id,level,lesson_number,title,status,outcomes,curriculum_payload from public.kp_lesson_plans order by level,lesson_number for update')).rows
  if (before.length !== 60 || expected.length !== 60) throw new Error('Expected the reviewed 60 lessons.')
  for (const [index, row] of before.entries()) {
    if (!validCoursePayload(row.curriculum_payload, row.level, row.lesson_number)) throw new Error(`Incomplete lesson ${row.level}:${row.lesson_number}.`)
    if (fingerprint(row.curriculum_payload) !== fingerprint(expected[index])) throw new Error(`Stored lesson ${row.level}:${row.lesson_number} differs from the reviewed source.`)
  }
  if (process.argv[2] === '--apply') {
    await mkdir('.local/curriculum-backups', { recursive: true })
    const snapshotPath = `.local/curriculum-backups/status-before-${Date.now()}.json`
    await writeFile(snapshotPath, JSON.stringify(before.map(row => ({ id: row.id, status: row.status, fingerprint: fingerprint(row.curriculum_payload) })), null, 2), { mode: 0o600, flag: 'wx' })
    await client.query("update public.kp_lesson_plans set status='published' where id=any($1::uuid[])", [before.map(row => row.id)])
    const after = (await client.query('select id,level,lesson_number,title,status,outcomes,curriculum_payload from public.kp_lesson_plans order by level,lesson_number')).rows
    if (fingerprint(after) !== fingerprint(before.map(row => ({ ...row, status: 'published' })))) throw new Error('Publication changed unrelated lesson data.')
    await client.query('commit')
    console.log(JSON.stringify({ published: after.length, questions: 3000, snapshotPath }))
  } else if (process.argv[2] === '--restore-status') {
    const snapshot = JSON.parse(await readFile(process.argv[3], 'utf8'))
    if (snapshot.length !== 60 || snapshot.some((saved: any) => !['draft', 'published', 'archived'].includes(saved.status) || !before.some(row => row.id === saved.id && row.status === 'published' && fingerprint(row.curriculum_payload) === saved.fingerprint))) throw new Error('Lesson state changed since publication; refusing restore.')
    for (const saved of snapshot) await client.query('update public.kp_lesson_plans set status=$2 where id=$1', [saved.id, saved.status])
    await client.query('commit')
    console.log(JSON.stringify({ restored: snapshot.length }))
  } else {
    await client.query('rollback')
    console.log(JSON.stringify({ validated: before.length, questions: 3000, ready: true }))
  }
} catch (error) {
  await client.query('rollback').catch(() => {})
  throw error
} finally { client.release(); await pool.end() }
