import test from 'node:test'
import assert from 'node:assert/strict'
import { notificationMessage, deliverSignupNotification, OWNER_EMAIL } from './signup-mail.mjs'
const id = '11111111-2222-4333-8444-555555555555'
const signup = { id, name:'Test\r\nBcc: attacker@example.com', email:'student@example.invalid', selected_level:1, goals:'Test only' }
test('notification recipient is fixed to the owner; student fields cannot inject headers', () => {
  const raw = Buffer.from(notificationMessage(signup),'base64url').toString()
  const [headers, body] = raw.split('\r\n\r\n')
  assert.ok(headers.includes(`To: ${OWNER_EMAIL}`))
  assert.ok(!headers.includes('student@example.invalid'))
  assert.ok(!headers.includes('Bcc:'))
  assert.ok(Buffer.from(body,'base64').toString().includes(signup.email))
})
function harness({ claimed=true, tokenFails=false, code=200, throws=false }={}) {
  const calls=[]; let sends=0
  const query=async(sql,values)=>{ calls.push([sql,values]); return {rows:sql.startsWith('select id')?[signup]:sql.includes('returning signup_id')?(claimed?[{signup_id:id}]:[]):[]} }
  const options={ getToken:async()=>{if(tokenFails)throw Error();return 'private-token'}, send:async()=>{sends++;if(throws)throw Error();return {ok:code===200,status:code,json:async()=>({id:'gmail-receipt'})}} }
  return {query,options,calls,get sends(){return sends}}
}
test('successful delivery stores Gmail receipt',async()=>{const h=harness();assert.equal((await deliverSignupNotification(h.query,id,h.options)).status,'sent');assert.equal(h.sends,1);assert.ok(h.calls.some(([sql])=>sql.includes("status='sent'")))})
test('already claimed or sent notifications are not resent',async()=>{const h=harness({claimed:false});assert.equal((await deliverSignupNotification(h.query,id,h.options)).status,'not_claimed');assert.equal(h.sends,0)})
test('missing authorization leaves message pending without claim or send',async()=>{const h=harness({tokenFails:true});assert.equal((await deliverSignupNotification(h.query,id,h.options)).status,'pending');assert.equal(h.calls.length,0);assert.equal(h.sends,0)})
test('explicit Gmail rejection remains pending',async()=>{const h=harness({code:429});assert.equal((await deliverSignupNotification(h.query,id,h.options)).status,'pending');assert.equal(h.sends,1)})
test('ambiguous Gmail errors block automatic retries',async()=>{for(const opts of [{code:500},{throws:true}]){const h=harness(opts);assert.equal((await deliverSignupNotification(h.query,id,h.options)).status,'uncertain');assert.equal(h.sends,1)}})
