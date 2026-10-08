import test from 'node:test'
import assert from 'node:assert/strict'
import { setupNotificationMessage, deliverSetupNotification } from './account-setup-mail.mjs'
const OWNER_EMAIL='peta@kapiki.co.nz'
const id = '11111111-2222-4333-8444-555555555555'
const signup = { invitation_id:id, student_name:'Test\r\nBcc: attacker@example.com', student_email:'student@example.invalid', selected_level:1, department_group:'Policy', completed_at:'2026-10-09T00:00:00Z' }
test('notification recipient is fixed to the owner; student fields cannot inject headers', () => {
  const raw = Buffer.from(setupNotificationMessage(signup),'base64url').toString()
  const [headers, body] = raw.split('\r\n\r\n')
  assert.ok(headers.includes(`To: ${OWNER_EMAIL}`))
  assert.ok(!headers.includes('student@example.invalid'))
  assert.ok(!headers.includes('Bcc:'))
  assert.ok(Buffer.from(body,'base64').toString().includes(signup.student_email))
})
function harness({ claimed=true, tokenFails=false, code=200, throws=false }={}) {
  const calls=[]; let sends=0
  const query=async(sql,values)=>{ calls.push([sql,values]); return {rows:sql.startsWith('select *')?[signup]:sql.includes('returning invitation_id')?(claimed?[{invitation_id:id}]:[]):[]} }
  const options={ getToken:async()=>{if(tokenFails)throw Error();return 'private-token'}, send:async()=>{sends++;if(throws)throw Error();return {ok:code===200,status:code,json:async()=>({id:'gmail-receipt'})}} }
  return {query,options,calls,get sends(){return sends}}
}
test('successful delivery stores Gmail receipt',async()=>{const h=harness();assert.equal((await deliverSetupNotification(h.query,id,h.options)).status,'sent');assert.equal(h.sends,1);assert.ok(h.calls.some(([sql])=>sql.includes("status='sent'")))})
test('already claimed or sent notifications are not resent',async()=>{const h=harness({claimed:false});assert.equal((await deliverSetupNotification(h.query,id,h.options)).status,'not_claimed');assert.equal(h.sends,0)})
test('missing authorization leaves message pending without claim or send',async()=>{const h=harness({tokenFails:true});assert.equal((await deliverSetupNotification(h.query,id,h.options)).status,'pending');assert.ok(h.calls.some(([sql])=>sql.includes("owner_authorization_unavailable")));assert.equal(h.sends,0)})
test('explicit Gmail rejection remains pending',async()=>{const h=harness({code:429});assert.equal((await deliverSetupNotification(h.query,id,h.options)).status,'pending');assert.equal(h.sends,1)})
test('ambiguous Gmail errors block automatic retries',async()=>{for(const opts of [{code:500},{throws:true}]){const h=harness(opts);assert.equal((await deliverSetupNotification(h.query,id,h.options)).status,'uncertain');assert.equal(h.sends,1)}})

test('owner preview preserves student HTML and plain text but cannot override recipient or inject headers',()=>{
 const preview={subject:'A subject\r\nBcc: attacker@example.com',text:'Student message',html:'<p>Student <strong>message</strong></p>',to:'attacker@example.com'}
 const raw=Buffer.from(setupNotificationMessage({...signup,owner_preview:preview}),'base64url').toString()
 const headers=raw.split('\r\n\r\n')[0]
 assert.ok(headers.includes(`To: ${OWNER_EMAIL}`));assert.ok(!headers.includes('Bcc:'))
 assert.ok(raw.includes(Buffer.from(preview.html).toString('base64')))
 assert.ok(raw.includes(Buffer.from(preview.text).toString('base64')))
})
