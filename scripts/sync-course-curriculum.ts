import { loadEnv } from 'vite'
import pg from 'pg'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { wordsDatabaseConnection } from '../server/wordsDatabase.mjs'
import bank from '../docs/curriculum/translation-bank/sheets.json'
import pacing from '../docs/curriculum/translation-bank/vocabulary-pacing.json'
import { courseVocabularyEntries, optionalPersonalisationEntries } from '../src/lib/courseVocabularyEntries'
import { courseVocabularyTimeline } from '../src/lib/courseVocabularyTimeline'
import type { CurriculumLevel } from '../src/lib/sentenceStructureLevels'

const levels: CurriculumLevel[] = [1, 2, 3, 4, 5, 6]
const entries = levels.flatMap(level => courseVocabularyEntries(level).filter(entry => entry.kind === 'word'))
const timeline = courseVocabularyTimeline(bank.sheets, entries)
const payloads = bank.sheets.map((sheet, index) => ({
  version: 1, sheet, pacing: pacing.lessons[index],
  senseIntroductions: pacing.senseIntroductions.filter(sense => sense.lesson === index + 1),
  timeline: timeline.filter(row => row.firstLesson === index + 1 || (index === 0 && row.firstLesson === null)),
  entries: sheet.lesson === 1 ? courseVocabularyEntries(sheet.level as CurriculumLevel) : [],
  optionalEntries: sheet.lesson === 1 ? optionalPersonalisationEntries(sheet.level as CurriculumLevel) : [],
}))
if (payloads.length !== 60 || payloads.some(p => p.sheet.questions.length !== 50)) throw new Error('Expected 60 lessons with 50 exercises each.')
const fingerprint = createHash('sha256').update(JSON.stringify(payloads)).digest('hex')
const pool = new pg.Pool({ ...wordsDatabaseConnection(loadEnv('development', process.cwd(), '')), max: 1 })
const client = await pool.connect()
try {
  await client.query('begin')
  await client.query("set local lock_timeout='5s'")
  await client.query("set local statement_timeout='30s'")
  const before = (await client.query('select id,level,lesson_number,title,status,outcomes from public.kp_lesson_plans order by level,lesson_number for update')).rows
  if (before.length !== 60 || before.some(row => !payloads.some(p => p.sheet.level === row.level && p.sheet.lesson === row.lesson_number))) throw new Error('Lesson roster does not match the reviewed 60 slots.')
  const hasColumn = (await client.query("select exists(select 1 from information_schema.columns where table_schema='public' and table_name='kp_lesson_plans' and column_name='curriculum_payload') as present")).rows[0].present
  const previous = hasColumn ? (await client.query('select id,curriculum_payload from public.kp_lesson_plans order by level,lesson_number')).rows : before.map(row => ({ id: row.id, curriculum_payload: null }))
  if (process.argv[2] === '--restore') {
    const snapshot = JSON.parse(await readFile(process.argv[3], 'utf8'))
    for (const row of snapshot.payloads) await client.query('update public.kp_lesson_plans set curriculum_payload=$2 where id=$1', [row.id, row.curriculum_payload])
    await client.query('commit')
    console.log(JSON.stringify({ restored: snapshot.payloads.length }))
  } else if (process.argv[2] === '--apply') {
    await mkdir('.local/curriculum-backups', { recursive: true })
    const snapshotPath = `.local/curriculum-backups/before-${Date.now()}.json`
    await writeFile(snapshotPath, JSON.stringify({ roster: before, payloads: previous, fingerprint }, null, 2), { mode: 0o600 })
    await client.query('alter table public.kp_lesson_plans add column if not exists curriculum_payload jsonb')
    for (const payload of payloads) await client.query('update public.kp_lesson_plans set curriculum_payload=$3::jsonb where level=$1 and lesson_number=$2', [payload.sheet.level, payload.sheet.lesson, JSON.stringify(payload)])
    const reread = (await client.query('select id,level,lesson_number,title,status,outcomes,curriculum_payload from public.kp_lesson_plans order by level,lesson_number')).rows
    if (JSON.stringify(reread.map(({ curriculum_payload, ...row }) => row)) !== JSON.stringify(before)) throw new Error('Lesson identities or existing metadata changed.')
    // JSONB changes key order; compare each persisted payload structurally.
    const canonical = (v: any): any => Array.isArray(v) ? v.map(canonical) : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map(k => [k, canonical(v[k])])) : v
    if (JSON.stringify(canonical(reread.map(row => row.curriculum_payload))) !== JSON.stringify(canonical(payloads))) throw new Error('Persisted curriculum differs from reviewed content.')
    await client.query('commit')
    console.log(JSON.stringify({ saved: reread.length, questions: 3000, scheduledNouns: timeline.filter(row => row.type === 'Noun' && row.firstLesson !== null).length, fingerprint, snapshotPath }))
  } else {
    await client.query('rollback')
    console.log(JSON.stringify({ ready: true, lessons: before.length, questions: 3000, fingerprint }))
  }
} catch (error) {
  await client.query('rollback').catch(() => {})
  throw error
} finally { client.release(); await pool.end() }
