import { ownerAccessToken, OWNER_EMAIL } from './signup-mail.mjs'

export function setupNotificationMessage(event) {
  if (!/^[a-f0-9-]{36}$/i.test(event.invitation_id)) throw new Error('Invalid invitation identifier')
  const completed = new Date(event.completed_at).toLocaleString('en-NZ', { timeZone: 'Pacific/Auckland', timeZoneName: 'short' })
  const text = ['Kia ora Peta,', '', 'A student has set their password and saved their details.', '',
    `Name: ${event.student_name}`, `Email: ${event.student_email}`,
    `Confirmed level: ${event.selected_level}`, `Department / group: ${event.department_group}`,
    `Completed: ${completed}`, '', 'Ngā mihi,', 'Ka Piki'].join('\r\n')
  return Buffer.from([`From: Ka Piki <${OWNER_EMAIL}>`, `To: ${OWNER_EMAIL}`,
    `Reply-To: ${OWNER_EMAIL}`, 'Subject: Ka Piki student account setup completed',
    `Message-ID: <account-setup-${event.invitation_id}@kapiki.co.nz>`,
    'MIME-Version: 1.0', 'Content-Type: text/plain; charset=utf-8',
    'Content-Transfer-Encoding: base64', '', Buffer.from(text).toString('base64'),
  ].join('\r\n')).toString('base64url')
}

// Only a committed setup event can notify the fixed owner address.
export async function deliverSetupNotification(query, invitationId, options = {}) {
  const { getToken = ownerAccessToken, send = fetch } = options
  let token
  try { token = await getToken() } catch {
    await query("update public.kp_account_setup_notifications set error_code='owner_authorization_unavailable' where invitation_id=$1 and status='pending'", [invitationId])
    console.warn('setup_mail: owner authorization unavailable; notification remains queued')
    return { status: 'pending' }
  }
  const claim = await query(`update public.kp_account_setup_notifications set status='sending', attempted_at=now(), attempts=attempts+1
    where invitation_id=$1 and status='pending' and available_at<=now()
    returning invitation_id`, [invitationId])
  if (!claim.rows.length) return { status: 'not_claimed' }
  const signup = await query('select * from public.kp_account_setup_notifications where invitation_id=$1', [invitationId])
  if (!signup.rows[0]) throw new Error('Signup no longer available')
  let result
  try {
    const response = await send('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ raw: setupNotificationMessage(signup.rows[0]) }), signal: AbortSignal.timeout(10000),
    })
    if (!response.ok) {
      // Explicit rejections can be retried. Timeouts/5xx are ambiguous: never
      // automatically resend a message that Gmail may already have accepted.
      const status = [400, 401, 403, 404, 429].includes(response.status) ? 'pending' : 'uncertain'
      await query(`update public.kp_account_setup_notifications set status=$2, available_at=now()+interval '15 minutes', error_code=$3 where invitation_id=$1`,
        [invitationId, status, `gmail_http_${response.status}`])
      console.warn(`setup_mail: ${status}; Gmail HTTP ${response.status}`)
      return { status }
    }
    result = await response.json()
    if (!result.id) throw new Error('Missing Gmail receipt')
  } catch {
    await query("update public.kp_account_setup_notifications set status='uncertain', error_code='delivery_unconfirmed' where invitation_id=$1", [invitationId])
    console.warn('setup_mail: delivery unconfirmed; automatic resend blocked')
    return { status: 'uncertain' }
  }
  await query("update public.kp_account_setup_notifications set status='sent', sent_at=now(), gmail_message_id=$2, error_code=null where invitation_id=$1", [invitationId, result.id])
  return { status: 'sent', messageId: result.id }
}

export async function drainSetupNotifications(query, options = {}) {
  // A process interrupted during sending cannot be safely retried blindly.
  await query("update public.kp_account_setup_notifications set status='uncertain', error_code='worker_interrupted' where status='sending' and attempted_at < now()-interval '5 minutes'")
  const pending = await query("select invitation_id from public.kp_account_setup_notifications where status='pending' and available_at<=now() order by created_at limit 3")
  const results = []
  for (const item of pending.rows) results.push(await deliverSetupNotification(query, item.invitation_id, options))
  return results
}
