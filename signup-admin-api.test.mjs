import test from 'node:test'
import assert from 'node:assert/strict'
import { createSignupAdminHandler } from './signup-admin-api.mjs'
const owner={id:'verified-user',email:'owner@example.invalid',email_confirmed_at:'2026-09-29T00:00:00Z'}
async function run({token='valid-token',user=owner,allowed=true,method='GET',fail=false}={}) {
 const calls=[]
 const handler=createSignupAdminHandler({getUser:async value=>value==='valid-token'?user:null,query:async(sql,args)=>{calls.push({sql,args});if(fail)throw Error('database password must stay private');return sql.includes('kp_signup_admins')?{rows:allowed?[{exists:1}]:[]}:{rows:[{id:'registration',name:'Sample learner',selected_level:3}]}}})
 const req={method,headers:token?{authorization:`Bearer ${token}`}:{}}
 const res={headers:{},setHeader(k,v){this.headers[k]=v},writeHead(status,headers){this.status=status;Object.assign(this.headers,headers)},end(body){this.body=JSON.parse(body)}}
 await handler(req,res);return{...res,calls}
}
test('anonymous and forged sessions cannot read or query signup data',async()=>{for(const token of ['', 'forged-token']){const r=await run({token});assert.equal(r.status,401);assert.equal(r.calls.length,0);assert.equal(r.body.registrations,undefined)}})
test('unconfirmed email cannot grant access',async()=>{const r=await run({user:{...owner,email_confirmed_at:null}});assert.equal(r.status,401);assert.equal(r.calls.length,0)})
test('signed-in non-admin is denied before reading registrations',async()=>{const r=await run({allowed:false,user:{...owner,user_metadata:{admin:true}}});assert.equal(r.status,403);assert.equal(r.calls.length,1)})
test('verified administrator can read only MOE registrations with no caching',async()=>{const r=await run();assert.equal(r.status,200);assert.deepEqual(r.calls[0].args,[owner.email]);assert.match(r.calls[1].sql,/where goals like 'MOE ·%'/);assert.equal(r.body.registrations.length,1);assert.equal(r.headers['Cache-Control'],'private, no-store')})
test('write methods and database errors disclose no data',async()=>{const denied=await run({method:'POST'});assert.equal(denied.status,405);assert.equal(denied.calls.length,0);const failed=await run({fail:true});assert.equal(failed.status,503);assert.ok(!JSON.stringify(failed.body).includes('password'))})
