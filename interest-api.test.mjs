import test from 'node:test'
import assert from 'node:assert/strict'
import { Readable } from 'node:stream'
import { createInterestHandler } from './interest-api.mjs'

const valid = { name: 'Test learner', email: 'test@example.invalid', selected_level: 2, goals: 'MOE · Monday 2pm – 3pm', self_ratings: { Speaking: 3 } }
async function run(body, options = {}) {
  const calls = []
  const query = async (...args) => { calls.push(args); if (options.fail) throw Error('Private database information'); return { rowCount: 1, rows:[{id:'11111111-2222-4333-8444-555555555555'}] } }
  const request = Readable.from([typeof body === 'string' ? body : JSON.stringify(body)])
  request.method = options.method || 'POST'
  request.headers = { host: 'kapikiwebsite.vercel.app', origin: 'https://kapikiwebsite.vercel.app', 'content-type': 'application/json', ...options.headers }
  const response = { status: 0, headers: {}, setHeader(key,value) {this.headers[key]=value}, writeHead(code,headers) {this.status=code;Object.assign(this.headers,headers)}, end(body){this.body=JSON.parse(body)} }
  await createInterestHandler(query, options.notify)(request,response)
  return { calls, ...response }
}
test('saves the selected class with parameterized values and no contact data in response', async()=>{
 const r=await run(valid);assert.equal(r.status,201);assert.deepEqual(r.body,{saved:true});assert.deepEqual(r.calls[0][1],['Test learner','test@example.invalid',2,valid.goals,JSON.stringify(valid.self_ratings)])
})
test('requires only name, email and level',async()=>{assert.equal((await run({name:valid.name,email:valid.email,selected_level:6})).status,201)})
test('rejects malformed, oversized and invalid form data before writing',async()=>{
 for(const body of ['{', {...valid,name:' '},{...valid,email:'invalid'},{...valid,selected_level:7},{...valid,goals:'a'.repeat(3001)},{...valid,self_ratings:{Speaking:9}},{...valid,self_ratings:{role:1}}]){const r=await run(body);assert.equal(r.status,400);assert.equal(r.calls.length,0)}
 assert.equal((await run('a'.repeat(20001))).status,413)
})
test('rejects cross-site submissions and GET without exposing registrations',async()=>{
 for(const options of [{method:'GET'},{headers:{origin:'https://other.example'}},{headers:{'sec-fetch-site':'cross-site'}},{headers:{'content-type':'text/plain'}}]){const r=await run(valid,options);assert.ok([403,405,415].includes(r.status));assert.equal(r.calls.length,0)}
})
test('does not claim success or expose database details after a failed write',async()=>{const r=await run(valid,{fail:true});assert.equal(r.status,503);assert.equal(r.body.saved,undefined);assert.ok(!JSON.stringify(r.body).includes('Private'))})
test('mail failure cannot undo a saved signup',async()=>{let called=false;const r=await run(valid,{notify:async()=>{called=true;throw Error('mail failed')}});assert.equal(called,true);assert.equal(r.status,201);assert.deepEqual(r.body,{saved:true})})
test('failed signup never attempts notification',async()=>{let called=false;await run(valid,{fail:true,notify:async()=>{called=true}});assert.equal(called,false)})
