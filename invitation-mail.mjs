import { createHmac, timingSafeEqual } from 'node:crypto'
import { ownerAccessToken, OWNER_EMAIL } from './signup-mail.mjs'
export function authorizedInvitationSend(headers, id, secret, now = Date.now()) {
  const timestamp = headers['x-send-timestamp'], signature = headers['x-send-signature']
  if (!secret || !/^[a-f0-9-]{36}$/i.test(id || '') || !/^\d{13}$/.test(timestamp || '') || Math.abs(now - Number(timestamp)) > 300000 || !/^[a-f0-9]{64}$/.test(signature || '')) return false
  const expected = createHmac('sha256', secret).update(`invitation-send:${timestamp}:${id}`).digest()
  return timingSafeEqual(expected, Buffer.from(signature, 'hex'))
}
export function invitationMessage(row) {
  if (!/^[a-f0-9-]{36}$/i.test(row.invitation_id) || !/^[^\s<>@,;]+@[^\s<>@,;]+\.[^\s<>@,;]+$/.test(row.recipient)) throw Error('Invalid recipient')
  if (![row.subject,row.text,row.html].every(v => typeof v === 'string' && v.length)) throw Error('Invalid message')
  const boundary = `invitation-${row.invitation_id}`
  const encode = value => Buffer.from(value).toString('base64').match(/.{1,76}/g).join('\r\n')
  return Buffer.from([`From: Ka Piki <${OWNER_EMAIL}>`, `To: ${row.recipient}`, `Reply-To: ${OWNER_EMAIL}`,
    `Subject: =?UTF-8?B?${Buffer.from(row.subject).toString('base64')}?=`,
    `Message-ID: <invitation-${row.invitation_id}@kapiki.co.nz>`, 'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`, '',
    `--${boundary}`, 'Content-Type: text/plain; charset=utf-8', 'Content-Transfer-Encoding: base64','',encode(row.text),
    `--${boundary}`, 'Content-Type: text/html; charset=utf-8', 'Content-Transfer-Encoding: base64','',encode(row.html),`--${boundary}--`
  ].join('\r\n')).toString('base64url')
}
export async function deliverInvitation(query, id, {getToken = ownerAccessToken, send = fetch} = {}) {
  const token = await getToken()
  const claim = await query(`update public.kp_invitation_mail m set status='sending', attempted_at=now(), attempts=attempts+1
    from public.kp_account_invitations i where m.invitation_id=$1 and m.status='pending' and i.id=m.invitation_id
    and i.email=m.recipient and i.revoked_at is null and i.completed_at is null and (i.expires_at is null or i.expires_at>now()) returning m.*`,[id])
  if (!claim.rows.length) return {status:'not_claimed'}
  let result
  try {
    const response = await send('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({raw:invitationMessage(claim.rows[0])}),signal:AbortSignal.timeout(15000)})
    if (!response.ok) throw Error(`gmail_http_${response.status}`)
    result = await response.json()
    if (!result.id) throw Error('Missing receipt')
  } catch {
    await query("update public.kp_invitation_mail set status='uncertain',error_code='delivery_unconfirmed' where invitation_id=$1",[id])
    return {status:'uncertain'}
  }
  await query("update public.kp_invitation_mail set status='sent',sent_at=now(),gmail_message_id=$2 where invitation_id=$1",[id,result.id])
  return {status:'sent'}
}
