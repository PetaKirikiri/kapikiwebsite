import assert from 'node:assert/strict'
import * as Y from 'yjs'
const base = process.env.CLASSROOM_TEST_URL ?? 'http://127.0.0.1:5176'
const host = {}, student = {}, stranger = {}
const participants = [host, student]
let room
const encode = bytes => Buffer.from(bytes).toString('base64')
const decode = text => new Uint8Array(Buffer.from(text, 'base64'))
async function call(session, body, expected = 200) {
 const response = await fetch(`${base}/__classroom`, { method:'POST', headers:{'content-type':'application/json', ...(session.cookie ? {cookie:session.cookie} : {})}, body:JSON.stringify(body), signal:AbortSignal.timeout(30000) })
 const cookie = response.headers.get('set-cookie'); if (cookie) session.cookie = cookie.split(';')[0]
 const result = await response.json(); assert.equal(response.status, expected, JSON.stringify(result)); return result
}
const teacherDoc = new Y.Doc(), studentDoc = new Y.Doc()
try {
 const created = await call(host, {action:'create',name:'Whiteboard verification teacher',kind:'lesson'}); room = created.room
 await call(student, {action:'join',room,name:'Whiteboard verification student'})
 await call(stranger, {action:'lesson-board',room,lessonKey:'1:1'},403)
 for (let n=2;n<=20;n++) { const session={}; await call(session, {action:'join',room,name:`Whiteboard verification learner ${n}`}); participants.push(session) }
 const started = Date.now()
 await Promise.all(participants.map(session => call(session,{action:'lesson-board',room,lessonKey:'1:1'})))
 assert(Date.now()-started < 15000, 'Full-class sync exceeded the client timeout')
 teacherDoc.getText('verification').insert(0,'Teacher. ', {bold:true})
 studentDoc.getText('verification').insert(0,'Student. ', {italic:true})
 teacherDoc.getMap('drawing').set('teacher-pen',{color:'#294a63',points:[[100,100],[150,150]]})
 studentDoc.getMap('drawing').set('student-pen',{color:'#347db0',points:[[300,200],[350,220]]})
 const sync = (session,doc,lessonKey='1:1') => call(session, {action:'lesson-board',room,lessonKey,update:encode(Y.encodeStateAsUpdate(doc)),vector:encode(Y.encodeStateVector(doc))})
 await Promise.all([sync(host,teacherDoc),sync(student,studentDoc)])
 const replies = await Promise.all([sync(host,teacherDoc),sync(student,studentDoc)])
 Y.applyUpdate(teacherDoc,decode(replies[0].update));Y.applyUpdate(studentDoc,decode(replies[1].update))
 assert.equal(teacherDoc.getText('verification').toString(),studentDoc.getText('verification').toString())
 assert(teacherDoc.getText('verification').toString().includes('Teacher. '));assert(teacherDoc.getText('verification').toString().includes('Student. '))
 assert.equal(teacherDoc.getMap('drawing').size,2)
 const reopened = new Y.Doc(); const saved = await call(student,{action:'lesson-board',room,lessonKey:'1:1'}); Y.applyUpdate(reopened,decode(saved.update))
 assert.deepEqual(reopened.getText('verification').toDelta(),teacherDoc.getText('verification').toDelta())
 assert.equal(reopened.getMap('drawing').size,2)
 const other = new Y.Doc(); Y.applyUpdate(other,decode((await call(student,{action:'lesson-board',room,lessonKey:'1:2'})).update)); assert.equal(other.getText('verification').length,0); assert.equal(other.getMap('drawing').size,0)
 await call(student,{action:'lesson-board',room,lessonKey:'1:1',update:'invalid'},400)
 await call(student,{action:'lesson-board',room,lessonKey:'__proto__'},400)
 const roster=await call(host,{action:'join',room,name:'Ignored'}); assert.equal(roster.members.length,21); assert(!('lessonBoards' in roster.state))
 console.log('PASS: teacher + 20 students, membership protection, concurrent formatted text and drawings, saved reload, lesson isolation, malformed-update rejection.')
 reopened.destroy();other.destroy()
} finally { teacherDoc.destroy();studentDoc.destroy(); if(room)await call(host,{action:'close',room}); }
