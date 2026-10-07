import { test } from 'node:test'
import assert from 'node:assert/strict'
import { lessonMediaRequest } from './lessonMedia.mjs'
const provider={configured:true, request:()=>assert.fail('Unauthorized provider call')}
const member={seat:1,closed:false,kind:'lesson'}
function database(results){return {query:async()=>({rows:results.shift()??[]})}}
test('non-members cannot allocate video',async()=>{
 await assert.rejects(lessonMediaRequest(database([[]]),'room','other',{op:'publish'},provider),{status:403})
})
test('closed and non-lesson rooms cannot allocate video',async()=>{
 for(const state of [{...member,closed:true},{...member,kind:'game'}])await assert.rejects(lessonMediaRequest(database([[state]]),'room','owner',{op:'publish'},provider),{status:410})
})
test('subscribers cannot reach publishers outside their room',async()=>{
 const queries=[];const results=[[member],[{n:0}],[]]
 const db={query:async(sql,args)=>{queries.push({sql,args});return {rows:results.shift()}}}
 await assert.rejects(lessonMediaRequest(db,'my-room','owner',{op:'subscribe',publisherId:'other-room-session'},provider),{status:404})
 assert.match(queries[2].sql,/room_id=\$2/);assert.deepEqual(queries[2].args,['other-room-session','my-room'])
})
test('session control is scoped to room and owner',async()=>{
 const queries=[];const results=[[member],[]]
 const db={query:async(sql,args)=>{queries.push({sql,args});return {rows:results.shift()}}}
 await assert.rejects(lessonMediaRequest(db,'room','owner',{op:'answer',sessionId:'victim'},provider),{status:403})
 assert.match(queries[1].sql,/token_hash=\$3/);assert.deepEqual(queries[1].args,['victim','room','owner'])
})
test('rapid session allocation is limited',async()=>{
 await assert.rejects(lessonMediaRequest(database([[member],[{n:40}]]),'room','owner',{op:'subscribe'},provider),{status:429})
})
