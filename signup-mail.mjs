import { OAuth2Client } from 'google-auth-library'

export const OWNER_EMAIL = 'peta@kapiki.co.nz'

export function notificationMessage(signup) {
  if (!/^[a-f0-9-]{36}$/i.test(signup.id)) throw new Error('Invalid signup identifier')
  const text = [
    'Kia ora Peta,', '', 'A new student has registered interest in Ka Piki.', '',
    `Name: ${signup.name}`, `Email: ${signup.email}`, `Level: ${signup.selected_level}`,
    `Class details: ${signup.goals || 'Not specified'}`, '',
    `Registration reference: ${signup.id}`, '',
    'This notification is only for you. No email or calendar invitation has been sent to the student.',
  ].join('\r\n')
  return Buffer.from([
    `From: Ka Piki <${OWNER_EMAIL}>`, `To: ${OWNER_EMAIL}`,
    'Subject: New Ka Piki student signup',
    `Message-ID: <signup-${signup.id}@kapiki.co.nz>`,
    'MIME-Version: 1.0', 'Content-Type: text/plain; charset=utf-8',
    'Content-Transfer-Encoding: base64', '', Buffer.from(text).toString('base64'),
  ].join('\r\n')).toString('base64url')
}

export async function ownerAccessToken(env = process.env) {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET || !env.GOOGLE_REFRESH_TOKEN) throw new Error('Owner Gmail connection is not configured')
  const client = new OAuth2Client({ clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET,
    transporterOptions: { timeout: 8000, retry: false } })
  client.setCredentials({ refresh_token: env.GOOGLE_REFRESH_TOKEN })
  const { token } = await client.getAccessToken()
  if (!token) throw new Error('Owner Gmail connection needs attention')
  return token
}

// A saved signup is the only source of a notification. Neither recipients nor
// message headers are accepted from an HTTP caller. No student sender exists.
export async function deliverSignupNotification(query, signupId, options = {}) {
  const { getToken = ownerAccessToken, send = fetch } = options
  let token
  try { token = await getToken() } catch {
    console.warn('signup_mail: owner authorization unavailable; notification remains queued')
    return { status: 'pending' }
  }
  const claim = await query(`update public.kp_signup_notifications set status='sending', attempted_at=now(), attempts=attempts+1
    where signup_id=$1 and status='pending' and available_at<=now()
    returning signup_id`, [signupId])
  if (!claim.rows.length) return { status: 'not_claimed' }
  const signup = await query('select id,name,email,selected_level,goals from public.kp_course_interest where id=$1', [signupId])
  if (!signup.rows[0]) throw new Error('Signup no longer available')
  let result
  try {
    const response = await send('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ raw: notificationMessage(signup.rows[0]) }), signal: AbortSignal.timeout(10000),
    })
    if (!response.ok) {
      // Explicit rejections can be retried. Timeouts/5xx are ambiguous: never
      // automatically resend a message that Gmail may already have accepted.
      const status = [400, 401, 403, 404, 429].includes(response.status) ? 'pending' : 'uncertain'
      await query(`update public.kp_signup_notifications set status=$2, available_at=now()+interval '15 minutes', error_code=$3 where signup_id=$1`,
        [signupId, status, `gmail_http_${response.status}`])
      console.warn(`signup_mail: ${status}; Gmail HTTP ${response.status}`)
      return { status }
    }
    result = await response.json()
    if (!result.id) throw new Error('Missing Gmail receipt')
  } catch {
    await query("update public.kp_signup_notifications set status='uncertain', error_code='delivery_unconfirmed' where signup_id=$1", [signupId])
    console.warn('signup_mail: delivery unconfirmed; automatic resend blocked')
    return { status: 'uncertain' }
  }
  await query("update public.kp_signup_notifications set status='sent', sent_at=now(), gmail_message_id=$2, error_code=null where signup_id=$1", [signupId, result.id])
  return { status: 'sent', messageId: result.id }
}

export async function drainSignupNotifications(query, options = {}) {
  // A process interrupted during sending cannot be safely retried blindly.
  await query("update public.kp_signup_notifications set status='uncertain', error_code='worker_interrupted' where status='sending' and attempted_at < now()-interval '5 minutes'")
  const pending = await query("select signup_id from public.kp_signup_notifications where status='pending' and available_at<=now() order by created_at limit 3")
  const results = []
  for (const item of pending.rows) results.push(await deliverSignupNotification(query, item.signup_id, options))
  return results
}
