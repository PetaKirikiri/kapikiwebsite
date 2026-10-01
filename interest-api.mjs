import pg from 'pg'
import { wordsDatabaseConnection } from './words-database.mjs'
import { deliverSignupNotification } from './signup-mail.mjs'

let pool
const skills = new Set(['Grammar', 'Listening', 'Pronunciation', 'Speaking', 'Vocabulary', 'Reading', 'Writing'])
function readInterest(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid form')
  const { name, email, selected_level: level, goals = '', self_ratings: ratings = {}, department_group: department = null } = value
  if (typeof name !== 'string' || !name.trim() || name.trim().length > 160) throw new Error('Invalid name')
  if (typeof email !== 'string' || email.trim().length > 320 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) throw new Error('Invalid email')
  if (!Number.isInteger(level) || level < 1 || level > 6) throw new Error('Invalid level')
  if (typeof goals !== 'string' || goals.length > 3000) throw new Error('Invalid goals')
  if (!ratings || typeof ratings !== 'object' || Array.isArray(ratings)) throw new Error('Invalid ratings')
  const entries = Object.entries(ratings)
  if (entries.some(([skill, score]) => !skills.has(skill) || !Number.isInteger(score) || score < 1 || score > 5)) throw new Error('Invalid ratings')
  if (department !== null && (typeof department !== 'string' || department.trim().length > 160)) throw new Error('Invalid department')
  return [name.trim(), email.trim(), level, goals, JSON.stringify(ratings), department?.trim() || null]
}

export function createInterestHandler(query, notify = async () => {}) {
  return async function interestHandler(req, res) {
    const json = (status, value) => {
      res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' })
      res.end(JSON.stringify(value))
    }
    if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return json(405, { error: 'POST required.' }) }
    try {
      if (req.headers.origin && new URL(req.headers.origin).host !== req.headers.host || req.headers['sec-fetch-site'] === 'cross-site') {
        return json(403, { error: 'Please use the form on this website.' })
      }
    } catch { return json(403, { error: 'Invalid origin.' }) }
    if (!String(req.headers['content-type'] || '').toLowerCase().startsWith('application/json')) return json(415, { error: 'JSON required.' })
    let values
    try {
      const chunks = []; let size = 0
      for await (const chunk of req) {
        const bytes = Buffer.from(chunk); size += bytes.length
        if (size > 20000) return json(413, { error: 'Please shorten your details.' })
        chunks.push(bytes)
      }
      values = readInterest(JSON.parse(Buffer.concat(chunks).toString('utf8')))
    } catch { return json(400, { error: 'Please check your name, email and selected level.' }) }
    try {
      const saved = await query('insert into public.kp_course_interest (name,email,selected_level,goals,self_ratings,department_group) values ($1,$2,$3,$4,$5::jsonb,$6) returning id', values)
      // Email errors must never make a saved registration appear to have failed.
      try { if (saved.rows?.[0]?.id) await notify(saved.rows[0].id) }
      catch { console.warn('signup_mail: notification queued for follow-up') }
      return json(201, { saved: true })
    } catch {
      return json(503, { error: 'We couldn’t confirm your registration. Please try again.' })
    }
  }
}

export const interestQuery = (...args) => {
  if (!pool) { pool = new pg.Pool({ ...wordsDatabaseConnection(), max: 2, statement_timeout: 15000 }); pool.on('error', () => {}) }
  return pool.query(...args)
}
export const interestApi = createInterestHandler(interestQuery, id => deliverSignupNotification(interestQuery, id))
