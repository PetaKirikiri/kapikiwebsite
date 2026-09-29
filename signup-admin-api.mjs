import pg from 'pg'
import { createClient } from '@supabase/supabase-js'
import { wordsDatabaseConnection } from './words-database.mjs'
import authConfig from './signup-auth-config.json' with { type: 'json' }

export function createSignupAdminHandler({ query, getUser }) {
  return async (req, res) => {
    const json = (status, data) => {
      res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'private, no-store', 'Vary': 'Authorization', 'X-Content-Type-Options': 'nosniff' })
      res.end(JSON.stringify(data))
    }
    if (req.method !== 'GET') { res.setHeader('Allow', 'GET'); return json(405, { error: 'GET required.' }) }
    const token = /^Bearer (\S+)$/i.exec(req.headers.authorization || '')?.[1]
    if (!token || token.length > 10000) return json(401, { error: 'Sign in to view registrations.' })
    try {
      const user = await getUser(token)
      if (!user?.id || !user.email || !user.email_confirmed_at) return json(401, { error: 'Please sign in again.' })
      // Only server-managed access entries count, never editable profile metadata.
      const access = await query('select 1 from public.kp_signup_admins where email = lower($1)', [user.email])
      if (!access.rows.length) return json(403, { error: 'This account does not have signup admin access.' })
      const rows = await query(`select id, name, email, selected_level, created_at, goals, self_ratings
        from public.kp_course_interest where goals like 'MOE ·%'
        order by created_at desc, id desc`)
      return json(200, { registrations: rows.rows })
    } catch { return json(503, { error: 'Registrations could not be loaded. Please try again.' }) }
  }
}
let pool
const auth = createClient(authConfig.url, authConfig.publishableKey, { auth: { persistSession: false, autoRefreshToken: false } })
export const signupAdminApi = createSignupAdminHandler({
  query: (...args) => {
    if (!pool) { pool = new pg.Pool({ ...wordsDatabaseConnection(), max: 2, statement_timeout: 15000 }); pool.on('error', () => {}) }
    return pool.query(...args)
  },
  getUser: async token => { const { data, error } = await auth.auth.getUser(token); return error ? null : data.user },
})
