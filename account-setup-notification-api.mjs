export function createSetupNotificationHandler({ query, verifyUser, deliver }) {
  return async (req, res) => {
    res.setHeader('Cache-Control', 'no-store')
    const respond = (status, body) => { res.statusCode = status; res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(body)) }
    if (req.method !== 'POST') return respond(405, { error: 'POST required.' })
    if (req.headers['sec-fetch-site'] === 'cross-site') return respond(403, { error: 'Use the course website.' })
    const match = /^Bearer ([^\s]+)$/.exec(req.headers.authorization || '')
    if (!match) return respond(401, { error: 'Sign in required.' })
    try {
      const user = await verifyUser(match[1])
      if (!user) return respond(401, { error: 'Sign in required.' })
      const pending = await query("select invitation_id from public.kp_account_setup_notifications where user_id=$1 and status='pending' and available_at<=now() order by created_at limit 1", [user.id])
      // Caller cannot supply recipient, event, or message content.
      if (pending.rows.length) await deliver(query, pending.rows[0].invitation_id)
      return respond(202, { queued: true })
    } catch { return respond(503, { error: 'Notification remains queued.' }) }
  }
}
