import pg from 'pg'
import { wordsDatabaseConnection } from './words-database.mjs'

export function createSignupAdminHandler({ query }) {
  return async (req, res) => {
    const json = (status, data) => {
      res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'private, no-store', 'X-Robots-Tag': 'noindex, nofollow', 'X-Content-Type-Options': 'nosniff' })
      res.end(JSON.stringify(data))
    }
    if (!['GET', 'PATCH'].includes(req.method)) { res.setHeader('Allow', 'GET, PATCH'); return json(405, { error: 'GET or PATCH required.' }) }
    if (req.method === 'GET') {
      const removed = new URL(req.url || '/', 'http://local').searchParams.get('removed') === 'true'
      try {
        const rows = await query(`select id, name, email, selected_level, created_at
          from public.kp_course_interest where goals like 'MOE ·%' and removed_at is ${removed ? 'not null' : 'null'}
          order by created_at desc, id desc`)
        return json(200, { registrations: rows.rows })
      } catch { return json(503, { error: 'Registrations could not be loaded. Please try again.' }) }
    }
    try {
      if (req.headers['sec-fetch-site'] === 'cross-site' || (req.headers.origin && new URL(req.headers.origin).host !== req.headers.host)) {
        return json(403, { error: 'Please use the signup page on this website.' })
      }
    } catch { return json(403, { error: 'Invalid origin.' }) }
    if (!String(req.headers['content-type'] || '').toLowerCase().startsWith('application/json')) return json(415, { error: 'JSON required.' })
    let body
    try {
      if (req.body !== undefined) {
        if (Buffer.byteLength(typeof req.body === 'string' ? req.body : JSON.stringify(req.body)) > 1024) return json(413, { error: 'Request too large.' })
        body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
      } else {
        const chunks = []; let size = 0
        for await (const chunk of req) {
          const bytes = Buffer.from(chunk); size += bytes.length
          if (size > 1024) return json(413, { error: 'Request too large.' })
          chunks.push(bytes)
        }
        body = JSON.parse(Buffer.concat(chunks).toString('utf8'))
      }
      if (!body || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.id) || !['remove', 'restore'].includes(body.action)) throw Error('Invalid request')
    } catch { return json(400, { error: 'Choose a valid signup and action.' }) }
    try {
      const result = await query(`update public.kp_course_interest
        set removed_at = ${body.action === 'remove' ? 'coalesce(removed_at, now())' : 'null'}
        where id = $1::uuid and goals like 'MOE ·%' returning id`, [body.id])
      if (!result.rows.length) return json(404, { error: 'This signup could not be found. Refresh the list.' })
      return json(200, { saved: true })
    } catch { return json(503, { error: 'The change could not be saved. Please try again.' }) }
  }
}
let pool
export const signupAdminApi = createSignupAdminHandler({
  query: (...args) => {
    if (!pool) { pool = new pg.Pool({ ...wordsDatabaseConnection(), max: 2, statement_timeout: 15000 }); pool.on('error', () => {}) }
    return pool.query(...args)
  },
})
