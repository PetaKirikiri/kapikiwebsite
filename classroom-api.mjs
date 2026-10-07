import { bigWordQuestions } from './src/lib/lessons/bigWordQuestions.ts'
import { analyseSentence } from './server/courseSentence.mjs'
import pg from 'pg'
import { checkLessonAnswer, recogniseChatAnswer } from './src/lib/lessons/chatAnswer.ts'
import { wordsDatabaseConnection } from './words-database.mjs'
import { createKitchen, joinKitchen, advanceKitchen, commandKitchen } from './src/lib/kitchen/engine.mjs'
import { randomBytes, createHash } from 'node:crypto'
import { lessonWhiteboardRequest } from './server/lessonWhiteboard.mjs'
let pool
function database() {
 if (!pool) {
  pool = new pg.Pool({ ...wordsDatabaseConnection(), max:3 })
  pool.on('error',()=>{})
  // Checked-out clients can emit socket errors between queries as well as reject queries.
  pool.on('connect',client=>client.on('error',()=>{}))
 }
 return pool
}
const colors = ['#398aa6','#ba657f','#608b48','#bc8744','#785ba3','#53647c']
const starts = [[400,255],[355,430],[445,430],[400,385]]
const bad = (message, status=400) => Object.assign(new Error(message),{status})
export async function classroomApi(req,res) {
 const json=(status,body)=>{res.writeHead(status,{'content-type':'application/json','cache-control':'no-store'});res.end(JSON.stringify(body))}
 let client
 try {
  if (!['GET','POST'].includes(req.method)) throw bad('Use GET or POST.',405)
  if ((req.headers.origin && new URL(req.headers.origin).host !== req.headers.host) || req.headers['sec-fetch-site']==='cross-site') throw bad('Open the classroom on this site.',403)
  const url=new URL(req.url,'https://class.local')
  let body={}
  if(req.method==='POST') {
   if(!(req.headers['content-type']??'').startsWith('application/json')) throw bad('JSON required.',415)
   let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>2_800_000)throw bad('Request too large.',413)}
   try {body=JSON.parse(raw)}catch{throw bad('Invalid request.')}
  }
  let token=(req.headers.cookie??'').match(/(?:^|;\s*)kp_classroom=([a-f0-9]{64})(?:;|$)/)?.[1]
  if(!token){token=randomBytes(32).toString('hex');res.setHeader('Set-Cookie',`kp_classroom=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=604800${/^(localhost|127\.0\.0\.1)(:|$)/.test(req.headers.host??'')?'':'; Secure'}`)}
  const hash=createHash('sha256').update(token).digest('hex')
  const action=req.method==='GET'?'poll':body.action
  let accountId
  if(action==='lesson-identity') {
   const bearer=req.headers.authorization
   if(!bearer?.startsWith('Bearer '))throw bad('Sign in to link your profile.',401)
   const authUrl=process.env.VITE_STUDENT_SUPABASE_URL
   const authKey=process.env.VITE_STUDENT_SUPABASE_PUBLISHABLE_KEY
   if(!authUrl||!authKey)throw bad('Account connection unavailable.',503)
   const response=await fetch(`${authUrl}/auth/v1/user`,{headers:{apikey:authKey,Authorization:bearer},signal:AbortSignal.timeout(5000)})
   if(!response.ok)throw bad('Sign in again to link your profile.',401)
   accountId=(await response.json()).id
   if(!accountId)throw bad('Sign in again.',401)
  }
  let id=body.room??url.searchParams.get('room')
  const db=database()
  if(action==='create') {
   const name=typeof body.name==='string'?body.name.trim():''
   if(!name||name.length>60)throw bad('Enter your name.')
   const recent=await db.query("select count(*)::int as n from classroom_live_member m join classroom_live_room r on r.id=m.room_id where m.token_hash=$1 and m.seat=0 and r.created_at>now()-interval '24 hours'",[hash])
   if(recent.rows[0].n>=10)throw bad('Use an existing class for today.',429)
   id=randomBytes(12).toString('hex')
   client=await db.connect();await client.query('begin');await client.query("set local idle_in_transaction_session_timeout='10s'; set local lock_timeout='5s'; set local statement_timeout='10s'")
   await client.query("insert into classroom_live_room(id,state) values($1,$2::jsonb)",[id,JSON.stringify({exercise:'guess-who',round:0,completed:0,statement:null,reset:0,...(body.kind==='lesson'?{kind:'lesson'}:{})})])
   await client.query("insert into classroom_live_member(room_id,token_hash,seat,name,x,y,look,color) values($1,$2,0,$3,400,255,'male',$4)",[id,hash,name,colors[0]])
   await client.query('commit');client.release();client=null
  }
  if(!/^[a-f0-9]{24}$/.test(id??''))throw bad('This class link is not valid.',404)
  if(action==='lesson-board') return json(200,await lessonWhiteboardRequest(db,id,hash,body))
  client=await db.connect()
  await client.query('begin');await client.query("set local idle_in_transaction_session_timeout='10s'; set local lock_timeout='5s'; set local statement_timeout='10s'")
  const room=(await client.query('select * from classroom_live_room where id=$1 for update',[id])).rows[0]
  if(!room)throw bad('Class not found.',404)
  if(room.closed||(room.state.kind!=='lesson'&&new Date(room.expires_at)<new Date()))throw bad('This class has ended.',410)
  let member=(await client.query('select * from classroom_live_member where room_id=$1 and token_hash=$2',[id,hash])).rows[0]
  if(!member && action==='join') {
   const name=typeof body.name==='string'?body.name.trim():''
   if(!name||name.length>60)throw bad('Enter your name.')
   const used=(await client.query('select seat from classroom_live_member where room_id=$1',[id])).rows.map(m=>m.seat)
   const seat=Array.from({length:room.state.kind==='lesson'?31:3},(_,i)=>i+1).find(s=>!used.includes(s))
   if(seat===undefined)throw bad('This class is full.',409)
   member=(await client.query('insert into classroom_live_member(room_id,token_hash,seat,name,x,y,color) values($1,$2,$3,$4,$5,$6,$7) returning *',[id,hash,seat,name,...starts[seat%starts.length],colors[seat%colors.length]])).rows[0]
  }
  if(!member) {
   if(action!=='poll')throw bad('Join the class first.',403)
   await client.query('commit');return json(200,{room:id,joined:false,seat:-1,state:{round:0,chosen:false,revealed:false},members:[],messages:[]})
  }
  await client.query('update classroom_live_member set last_seen=now() where room_id=$1 and token_hash=$2',[id,hash])
  if(['target','eliminate','guess','reveal','new-round'].includes(action)&&body.round!==room.state.round)throw bad('The round has changed. Try again.',409)
  if(action==='lesson-identity') {
   room.state.lessonAccounts={...room.state.lessonAccounts,[member.seat]:accountId}
   await client.query('update classroom_live_room set state=$2::jsonb where id=$1',[id,JSON.stringify(room.state)])
  } else if(action==='kitchen') {
   const now=Date.now()
   if(body.op==='reset'&&member.seat!==0)throw bad('Only the host can reset the kitchen.',403)
   if(!room.state.kitchen||body.op==='reset') {
    const seats=Object.keys(room.state.kitchen?.players??{})
    room.state.kitchen=createKitchen(now)
    for(const seat of seats)joinKitchen(room.state.kitchen,Number(seat))
   }
   try {commandKitchen(room.state.kitchen,member.seat,body.op==='reset'?{op:'enter'}:body,now)}
   catch(error){throw bad(error.message)}
   await client.query('update classroom_live_room set state=$2::jsonb where id=$1',[id,JSON.stringify(room.state)])
  } else if(action==='move') {
   if(!Number.isFinite(body.x)||!Number.isFinite(body.y))throw bad('Invalid position.')
   await client.query('update classroom_live_member set x=$3,y=$4,movement=movement+1 where room_id=$1 and token_hash=$2',[id,hash,Math.max(45,Math.min(2355,body.x)),Math.max(245,Math.min(478,body.y))])
  } else if(action==='appearance') {
   if(!['male','female'].includes(body.look)||!colors.includes(body.color))throw bad('Invalid appearance.')
   await client.query('update classroom_live_member set look=$3,color=$4 where room_id=$1 and token_hash=$2',[id,hash,body.look,body.color])
  } else if(action==='chat') {
   if(typeof body.text!=='string'||!body.text.trim()||body.text.length>1000||! /^[a-f0-9-]{36}$/.test(body.id??''))throw bad('Enter a message.')
   await client.query('insert into classroom_live_message(id,room_id,seat,text) values($1,$2,$3,$4) on conflict(id) do nothing',[body.id,id,member.seat,body.text.trim()])
  } else if(action==='lesson-chat'||action==='lesson-hand') {
   if(typeof body.lessonKey!=='string'||! /^[1-6]:(?:[1-9]|10)$/.test(body.lessonKey))throw bad('Choose a lesson.')
   const chats={...(room.state.lessonChats??{})}
   const activity=chats[body.lessonKey]??{messages:[],hands:{}}
   if(action==='lesson-hand') {
    if(typeof body.raised!=='boolean')throw bad('Choose a hand status.')
    activity.hands={...activity.hands,[member.seat]:body.raised}
   } else {
    if(typeof body.text!=='string'||!body.text.trim()||body.text.length>1000||!['answer','chat','auto'].includes(body.mode))throw bad('Enter a message.')
    const feedback=body.lessonKey==='1:1' && (body.questionIndex??0)<4 ? (body.mode==='auto' ? recogniseChatAnswer('level-1-lesson-1-big-words',body.text) : body.mode==='answer' ? checkLessonAnswer('level-1-lesson-1-big-words',body.text) : null) : null
    if(body.questionIndex!==undefined&&(!Number.isInteger(body.questionIndex)||body.questionIndex<0||!bigWordQuestions.some(question=>question.id===body.questionIndex)))throw bad('Choose a question.')
    activity.messages=[...activity.messages,{questionIndex:body.questionIndex??0,seat:member.seat,senderName:member.name,text:body.text.trim(),feedback}].slice(-100)
   }
   chats[body.lessonKey]=activity
   room.state={...room.state,lessonChats:chats}
   await client.query('update classroom_live_room set state=$2::jsonb where id=$1',[id,JSON.stringify(room.state)])
  } else if(action==='mark') {
   if(!Number.isInteger(body.index)||body.index<0||body.index>2||typeof body.marked!=='boolean')throw bad('Invalid area.')
   const marks=member.marks.filter(n=>n!==body.index);if(body.marked)marks.push(body.index)
   await client.query('update classroom_live_member set marks=$3::jsonb where room_id=$1 and token_hash=$2',[id,hash,JSON.stringify(marks)])
  } else if(action==='target') {
   if(member.seat!==0)throw bad('Only the teacher chooses the character.',403)
   if(!Number.isInteger(body.index)||body.index<0||body.index>11)throw bad('Choose a character.')
   if(room.state.target!==undefined&&room.state.target!==null)throw bad('Start a new round to change the character.',409)
   room.state={...room.state,target:body.index,revealed:false}
   await client.query('update classroom_live_room set state=$2::jsonb where id=$1',[id,JSON.stringify(room.state)])
  } else if(action==='eliminate') {
   if(!Array.isArray(body.indices)||body.indices.length>12||!body.indices.every(i=>Number.isInteger(i)&&i>=0&&i<12))throw bad('Invalid selection.')
   await client.query('update classroom_live_member set eliminated=$3::jsonb where room_id=$1 and token_hash=$2',[id,hash,JSON.stringify([...new Set(body.indices)])])
  } else if(action==='guess') {
   if(member.seat===0)throw bad('The teacher knows the answer.',403)
   if(!Number.isInteger(body.index)||body.index<0||body.index>11)throw bad('Choose a character.')
   if(room.state.target===undefined||room.state.target===null)throw bad('Wait for the teacher to choose a character.',409)
   if(room.state.revealed)throw bad('Wait for the next round.',409)
   if(member.guess!==null)throw bad('You have already guessed this round.',409)
   await client.query('update classroom_live_member set guess=$3,correct=$4 where room_id=$1 and token_hash=$2',[id,hash,body.index,body.index===room.state.target])
  } else if(action==='reveal'||action==='new-round') {
   if(member.seat!==0)throw bad('Only the teacher can change the round.',403)
   if(action==='new-round') {
    room.state={...room.state,round:room.state.round+1,target:null,revealed:false}
    await client.query("update classroom_live_member set eliminated='[]'::jsonb,guess=null,correct=null where room_id=$1",[id])
   } else room.state={...room.state,revealed:true}
   await client.query('update classroom_live_room set state=$2::jsonb where id=$1',[id,JSON.stringify(room.state)])
  } else if(action==='surface') {
   if(member.seat!==0)throw bad('Only the teacher can change the activity.',403)
   if(!['room','whiteboard','kitchen'].includes(body.surface))throw bad('Unknown activity.')
   room.state={...room.state,surface:body.surface}
   await client.query('update classroom_live_room set state=$2::jsonb where id=$1',[id,JSON.stringify(room.state)])
  } else if(action==='whiteboard') {
   if(member.seat!==0)throw bad('Only the teacher can edit the whiteboard.',403)
   const board=room.state.whiteboard??{revision:0,blocks:[]}
   if(body.boardRevision!==board.revision)throw bad('The whiteboard changed. Try again.',409)
   let blocks=[...board.blocks]
   const validId=value=>typeof value==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(value)
   const validPosition=(x,y)=>Number.isFinite(x)&&Number.isFinite(y)&&x>=0&&x<=780&&y>=0&&y<=500
   if(body.op==='example') {
    if(!Number.isSafeInteger(body.structureId)||body.structureId<1)throw bad('Choose a saved sentence.')
    const example=(await client.query('select s.structure_id,s.text_mi,f.state from public.sentence_structure s join public.floor_plan f using(structure_id) where s.structure_id=$1',[body.structureId])).rows[0]
    if(!example)throw bad('Saved sentence not found.',404)
    const posTypes=(await client.query('select code as "posCode",group_code as "groupCode" from public.pos_type')).rows
    board.example={structureId:Number(example.structure_id),textMi:example.text_mi,state:example.state,posTypes}
    delete board.analysis
    blocks=[]
   } else if(body.op==='add') {
    const block=body.block
    if(!block||!validId(block.id)||!['predicate','subject','name','determiner'].includes(block.kind)||!validPosition(block.x,block.y))throw bad('Invalid block.')
    if(blocks.length>=32)throw bad('The whiteboard is full.')
    if(blocks.some(b=>b.id===block.id))throw bad('This block already exists.',409)
    let exampleFields={}
    if(block.structureId!==undefined) {
     if(!Number.isSafeInteger(block.structureId)||!Number.isSafeInteger(block.tokenIndex))throw bad('Invalid sentence example.')
     const example=(await client.query('select state from public.floor_plan where structure_id=$1',[block.structureId])).rows[0]
     const token=example?.state?.tokens?.[block.tokenIndex]
     if(!token || block.structureId !== board.example?.structureId)throw bad('Shape does not match this saved example.')
     exampleFields={structureId:block.structureId,tokenIndex:block.tokenIndex}
    }
    blocks.push({id:block.id,kind:block.kind,x:block.x,y:block.y,...exampleFields})
   } else if(body.op==='move'||body.op==='delete') {
    if(!validId(body.blockId)||!blocks.some(b=>b.id===body.blockId))throw bad('Block not found.',404)
    if(body.op==='move') {
     if(!validPosition(body.x,body.y))throw bad('Invalid block position.')
     blocks=blocks.map(b=>b.id===body.blockId?{...b,x:body.x,y:body.y}:b)
    } else blocks=blocks.filter(b=>b.id!==body.blockId)
   } else if(body.op==='word'||body.op==='grow') {
    const block=blocks.find(b=>b.id===body.blockId)
    if(!validId(body.blockId)||!block)throw bad('Block not found.',404)
    if(body.op==='grow') {
     if(!block.posCode)throw bad('Choose a matching word first.')
     blocks=blocks.map(b=>b.id===block.id?{...b,growthId:randomBytes(12).toString('hex'),grownAt:Date.now()}:b)
    } else {
     if(typeof body.text!=='string'||body.text.length>60)throw bad('Use one word, up to 60 characters.')
     const text=body.text.normalize('NFC').trim()
     if(text&&!/^[\p{L}\p{M}’'‐-]+$/u.test(text))throw bad('Use one word in each shape.')
     const example = board.example
     const tokenIndex = block.tokenIndex
     if (!example?.state?.tokens?.[tokenIndex]) throw bad('Choose a sentence example first.')
     // The shape is an exercise target. New words are analysed in the complete
     // sentence by the same engine as the reader, never by a local POS lookup.
     const tokens = example.state.tokens.map(token => {
      const placed = blocks.find(item => item.tokenIndex === token.tokenIndex && item.text)
      return token.tokenIndex === tokenIndex ? (text || token.surfaceText) : (placed?.text || token.surfaceText)
     })
     const textMi = tokens.join(' ')
     await client.query("set local idle_in_transaction_session_timeout='60s'")
     const analysis = (await analyseSentence(textMi)).floor.state
     board.analysis={textMi,state:analysis}
     blocks=blocks.map(b=> {
      const value=b.id===block.id?text:(b.text??'')
      const expected=example.state.tokens[b.tokenIndex]?.acceptedPosCode
      const proposed=analysis.tokens[b.tokenIndex]?.acceptedPosCode??null
      const matched=Boolean(value && proposed && proposed===expected)
      return {...b,text:value,posCode:matched?proposed:null,matchSource:matched?'sentence-engine':null,
       matchStatus:!value?'empty':matched?'matched':proposed?'mismatch':'unknown',
       growthId:matched?(b.id===block.id?randomBytes(12).toString('hex'):b.growthId):null,
       grownAt:matched?(b.id===block.id?Date.now():b.grownAt):null}
     })

    }
   } else if(body.op==='clear')blocks=[]
   else throw bad('Unknown whiteboard action.')
   room.state={...room.state,whiteboard:{...board,revision:board.revision+1,blocks}}
   await client.query('update classroom_live_room set state=$2::jsonb where id=$1',[id,JSON.stringify(room.state)])
  } else if(action==='control') {
   if(member.seat!==0)throw bad('Only the teacher can change the activity.',403)
   const state={...room.state}
   if(body.exercise!==undefined){if(!['vocabulary','differences','sentence','yes-no'].includes(body.exercise))throw bad('Unknown activity.');state.exercise=body.exercise}
   for(const key of ['round','completed','statement'])if(body[key]!==undefined){if(!Number.isSafeInteger(body[key])||body[key]<0||body[key]>100000)throw bad('Invalid activity.');state[key]=body[key]}
   if(body.reset){state.reset++;await client.query('update classroom_live_member set x=case seat when 0 then 400 when 1 then 355 when 2 then 445 else 400 end,y=case seat when 0 then 255 when 3 then 385 else 430 end,movement=movement+1,marks=\'[]\'::jsonb where room_id=$1',[id])}
   await client.query('update classroom_live_room set state=$2::jsonb where id=$1',[id,JSON.stringify(state)])
   room.state=state
  } else if(action==='close') {
   if(member.seat!==0)throw bad('Only the teacher can end the class.',403)
   await client.query('update classroom_live_room set closed=true where id=$1',[id])
   await client.query('commit');return json(200,{ended:true})
  } else if(!['poll','join','create'].includes(action))throw bad('Unknown action.')
  if(room.state.kitchen) {
   const before=JSON.stringify(room.state.kitchen)
   advanceKitchen(room.state.kitchen)
   if(before!==JSON.stringify(room.state.kitchen))await client.query('update classroom_live_room set state=$2::jsonb where id=$1',[id,JSON.stringify(room.state)])
  }
  const members=(await client.query('select seat,name,x,y,movement,look,color,marks,eliminated,guess,correct,last_seen as "lastSeen" from classroom_live_member where room_id=$1 order by seat',[id])).rows
  const messages=(await client.query('select * from (select id,seat,text,created_at as "createdAt" from classroom_live_message where room_id=$1 order by created_at desc,id desc limit 100) m order by "createdAt",id',[id])).rows
  await client.query('commit')
  const visibleState={...room.state,chosen:room.state.target!==undefined&&room.state.target!==null}
  if(member.seat!==0&&!room.state.revealed)delete visibleState.target
  for(const person of members)person.userId=room.state.lessonAccounts?.[person.seat]
  delete visibleState.lessonAccounts
  delete visibleState.lessonBoards
  const visibleMembers=members.map(m=>member.seat===0||m.seat===member.seat||room.state.revealed?m:{...m,eliminated:[],guess:null,correct:null})
  json(200,{room:id,joined:true,seat:member.seat,serverNow:Date.now(),state:visibleState,members:visibleMembers,messages})
 }catch(error){if(client)await client.query('rollback').catch(()=>{});if(!error.status)console.error('[classroom]',error.message);json(error.status??500,{error:error.status?error.message:'Classroom connection failed. Reconnecting…'})}
 finally{client?.release()}
}
