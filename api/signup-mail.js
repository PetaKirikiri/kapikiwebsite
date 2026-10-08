import { timingSafeEqual } from 'node:crypto'
import { interestQuery } from '../interest-api.mjs'
import { drainSignupNotifications } from '../signup-mail.mjs'
import { drainSetupNotifications } from '../account-setup-mail.mjs'

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  const actual = Buffer.from(req.headers.authorization || '')
  const expected = Buffer.from(`Bearer ${process.env.CRON_SECRET || ''}`)
  if (!process.env.CRON_SECRET || actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    res.statusCode = 401; return res.end('Unauthorized')
  }
  if (req.method !== 'GET') { res.statusCode = 405; return res.end('GET required') }
  try { const result = [...await drainSignupNotifications(interestQuery), ...await drainSetupNotifications(interestQuery)]; res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({ processed: result.map(r => r.status) })) }
  catch { res.statusCode = 503; res.end('Notification queue needs attention') }
}
