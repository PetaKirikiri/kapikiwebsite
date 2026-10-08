import { createHash } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import pg from 'pg'
import { wordsDatabaseConnection } from './words-database.mjs'

export function createAccountInvitationHandler({ query, generateLink, allowedOrigin }) {
  return async (req, res) => {
    const json = (status, data) => {
      res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'private, no-store',
        'X-Robots-Tag': 'noindex, nofollow', 'X-Content-Type-Options': 'nosniff' })
      res.end(JSON.stringify(data))
    }
    if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return json(405, { error: 'POST required.' }) }
    if (req.headers['sec-fetch-site'] === 'cross-site' || (req.headers.origin && req.headers.origin !== allowedOrigin)) {
      return json(403, { error: 'Open your personal link on the Ka Piki website.' })
    }
    if (!String(req.headers['content-type'] || '').toLowerCase().startsWith('application/json')) return json(415, { error: 'JSON required.' })
    let token
    try {
      let body = req.body
      if (body === undefined) {
        const chunks = []; let size = 0
        for await (const chunk of req) {
          const bytes = Buffer.from(chunk); size += bytes.length
          if (size > 1024) return json(413, { error: 'Request too large.' })
          chunks.push(bytes)
        }
        body = Buffer.concat(chunks).toString('utf8')
      }
      if (Buffer.byteLength(typeof body === 'string' ? body : JSON.stringify(body)) > 1024) return json(413, { error: 'Request too large.' })
      if (typeof body === 'string') body = JSON.parse(body)
      if (!body || Object.keys(body).length !== 1 || !/^[a-f0-9]{64}$/.test(body.token)) throw new Error('Invalid request')
      token = body.token
    } catch { return json(400, { error: 'This setup link is no longer available.' }) }
    try {
      // Identity is always loaded from the invitation, never from request data.
      const digest = createHash('sha256').update(token).digest('hex')
      const valid = await query(`select i.id,i.user_id,i.email from public.kp_account_invitations i
        join auth.users u on u.id=i.user_id and lower(btrim(u.email))=i.email
        where i.token_digest=$1 and i.token_type='setup' and (i.expires_at is null or i.expires_at>now())
          and i.revoked_at is null and i.completed_at is null
          and exists(select 1 from public.kp_course_interest r where r.id=any(i.interest_ids)
            and lower(btrim(r.email))=i.email and r.removed_at is null)`, [digest])
      const invitation = valid.rows[0]
      if (!invitation) return json(400, { error: 'This setup link is no longer available.' })
      const claim = await query(`update public.kp_account_invitations set exchange_count=exchange_count+1,last_exchange_at=now()
        where id=$1 and (expires_at is null or expires_at>now()) and revoked_at is null and completed_at is null
          and exchange_count<30 and (last_exchange_at is null or last_exchange_at<now()-interval '10 seconds') returning id`, [invitation.id])
      if (!claim.rows.length) return json(429, { error: 'Please wait a moment, then try again.' })
      // This generates a credential only; it never sends an email.
      const generated = await generateLink({ type: 'magiclink', email: invitation.email })
      const data = generated.data
      if (generated.error || data?.user?.id !== invitation.user_id || data.user.email?.toLowerCase() !== invitation.email || !data.properties?.hashed_token) {
        return json(503, { error: 'We couldn’t open your account. Please try again shortly.' })
      }
      // Recheck after the provider call in case another request completed or revoked it.
      const active = await query(`select id from public.kp_account_invitations where id=$1
        and (expires_at is null or expires_at>now()) and revoked_at is null and completed_at is null`, [invitation.id])
      if (!active.rows.length) return json(400, { error: 'This setup link is no longer available.' })
      return json(200, { tokenHash: data.properties.hashed_token, type: 'magiclink' })
    } catch {
      console.warn('account_setup: exchange unavailable')
      return json(503, { error: 'Account setup is temporarily unavailable. Please try again shortly.' })
    }
  }
}

export function accountInvitationRuntime(env = process.env, { origin } = {}) {
  const pool = new pg.Pool({ ...wordsDatabaseConnection(env), max: 2, statement_timeout: 10000 })
  pool.on('error', () => {})
  const admin = createClient(env.WORDS_SUPABASE_URL, env.STUDENT_SUPABASE_SECRET_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (url, options) => fetch(url, { ...options, signal: AbortSignal.timeout(10000) }) },
  })
  return { close: () => pool.end(), handler: createAccountInvitationHandler({
    query: (...args) => pool.query(...args), generateLink: params => admin.auth.admin.generateLink(params),
    allowedOrigin: origin || env.KA_PIKI_SITE_URL || 'https://kapikiwebsite.vercel.app',
  }) }
}
