import test from 'node:test'
import assert from 'node:assert/strict'
import { createSetupNotificationHandler } from './account-setup-notification-api.mjs'
function harness() {
 const calls=[];const sends=[];let status;let body
 const query=async(sql,args)=>{calls.push(args);return {rows:[{invitation_id:'owned-event'}]}}
 const handler=createSetupNotificationHandler({query,verifyUser:async token=>token==='valid'?{id:'owner-user'}:null,deliver:async(q,id)=>sends.push(id)})
 const res={setHeader(){},set statusCode(v){status=v},end(v){body=JSON.parse(v)}}
 return {calls,sends,run:async req=>{await handler(req,res);return {status,body}}}
}
 test('unauthenticated and cross-site requests cannot send',async()=>{
  for(const headers of [{},{authorization:'Bearer invalid'},{authorization:'Bearer valid','sec-fetch-site':'cross-site'}]) {
   const h=harness();const r=await h.run({method:'POST',headers});assert.ok([401,403].includes(r.status));assert.equal(h.sends.length,0)
  }
 })
 test('only committed events belonging to the authenticated student can be sent',async()=>{
  const h=harness();const r=await h.run({method:'POST',headers:{authorization:'Bearer valid'},body:{user_id:'another',to:'attacker@example.com',invitation_id:'another-event'}})
  assert.equal(r.status,202);assert.deepEqual(h.calls,[['owner-user']]);assert.deepEqual(h.sends,['owned-event'])
 })
