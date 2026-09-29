import pg from 'pg'
import { wordsDatabaseConnection } from './words-database.mjs'

export function createSignupAdminHandler({ query }) {
  return async (req, res) => {
    const json = (status, data) => {
      res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'private, no-store', 'X-Robots-Tag': 'noindex, nofollow', 'X-Content-Type-Options': 'nosniff' })
      res.end(JSON.stringify(data))
    }
    if (req.method !== 'GET') { res.setHeader('Allow', 'GET'); return json(405, { error: 'GET required.' }) }
    try {
      const rows = await query(`select id, name, email, selected_level, created_at
        from public.kp_course_interest where goals like 'MOE ·%'
        order by created_at desc, id desc`)
      return json(200, { registrations: rows.rows })
    } catch { return json(503, { error: 'Registrations could not be loaded. Please try again.' }) }
  }
}
let pool
export const signupAdminApi = createSignupAdminHandler({
  query: (...args) => {
    if (!pool) { pool = new pg.Pool({ ...wordsDatabaseConnection(), max: 2, statement_timeout: 15000 }); pool.on('error', () => {}) }
    return pool.query(...args)
  },
})
