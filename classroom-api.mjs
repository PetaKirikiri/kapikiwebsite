import pg from 'pg'
import {createKitchen,joinKitchen,advanceKitchen,commandKitchen} from './src/lib/kitchen/engine.mjs'
import { randomBytes, createHash } from 'node:crypto'
let pool
function database() {
 if (!pool) {
  const ref = new URL(process.env.WORDS_SUPABASE_URL).hostname.split('.')[0]
  pool = new pg.Pool({ host:'aws-1-ap-south-1.pooler.supabase.com',port:6543,user:`postgres.${ref}`,password:process.env.WORDS_DB_PASSWORD,database:'postgres',ssl:{rejectUnauthorized:false},connectionTimeoutMillis:10000,max:3 })
  pool.on('error',()=>{})
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
   let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>5000)throw bad('Request too large.',413)}
   try {body=JSON.parse(raw)}catch{throw bad('Invalid request.')}
  }
  let token=(req.headers.cookie??'').match(/(?:^|;\s*)kp_classroom=([a-f0-9]{64})(?:;|$)/)?.[1]
  if(!token){token=randomBytes(32).toString('hex');res.setHeader('Set-Cookie',`kp_classroom=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=604800${/^(localhost|127\.0\.0\.1)(:|$)/.test(req.headers.host??'')?'':'; Secure'}`)}
  const hash=createHash('sha256').update(token).digest('hex')
  const action=req.method==='GET'?'poll':body.action
  let id=body.room??url.searchParams.get('room')
  const db=database()
  if(action==='create') {
   const name=typeof body.name==='string'?body.name.trim():''
   if(!name||name.length>60)throw bad('Enter your name.')
   const recent=await db.query("select count(*)::int as n from classroom_live_member m join classroom_live_room r on r.id=m.room_id where m.token_hash=$1 and m.seat=0 and r.created_at>now()-interval '24 hours'",[hash])
   if(recent.rows[0].n>=10)throw bad('Use an existing class for today.',429)
   id=randomBytes(12).toString('hex')
   client=await db.connect();await client.query('begin')
   await client.query('insert into classroom_live_room(id) values($1)',[id])
   await client.query("insert into classroom_live_member(room_id,token_hash,seat,name,x,y,look,color) values($1,$2,0,$3,400,255,'male',$4)",[id,hash,name,colors[0]])
   await client.query('commit');client.release();client=null
  }
  if(!/^[a-f0-9]{24}$/.test(id??''))throw bad('This class link is not valid.',404)
  client=await db.connect()
  await client.query('begin')
  const room=(await client.query('select * from classroom_live_room where id=$1 for update',[id])).rows[0]
  if(!room)throw bad('Class not found.',404)
  if(room.closed||new Date(room.expires_at)<new Date())throw bad('This class has ended.',410)
  let member=(await client.query('select * from classroom_live_member where room_id=$1 and token_hash=$2',[id,hash])).rows[0]
  if(!member && action==='join') {
   const name=typeof body.name==='string'?body.name.trim():''
   if(!name||name.length>60)throw bad('Enter your name.')
   const used=(await client.query('select seat from classroom_live_member where room_id=$1',[id])).rows.map(m=>m.seat)
   const seat=[1,2,3].find(s=>!used.includes(s))
   if(seat===undefined)throw bad('This class is full.',409)
   member=(await client.query('insert into classroom_live_member(room_id,token_hash,seat,name,x,y,color) values($1,$2,$3,$4,$5,$6,$7) returning *',[id,hash,seat,name,...starts[seat],colors[seat]])).rows[0]
  }
  if(!member) {
   if(action!=='poll')throw bad('Join the class first.',403)
   await client.query('commit');return json(200,{room:id,joined:false,seat:-1,state:{round:0,chosen:false,revealed:false},members:[],messages:[]})
  }
  await client.query('update classroom_live_member set last_seen=now() where room_id=$1 and token_hash=$2',[id,hash])
  if(['target','eliminate','guess','reveal','new-round'].includes(action)&&body.round!==room.state.round)throw bad('The round has changed. Try again.',409)
  if(action==='kitchen') {
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
   if(!['room','whiteboard'].includes(body.surface))throw bad('Unknown activity.')
   room.state={...room.state,surface:body.surface}
   await client.query('update classroom_live_room set state=$2::jsonb where id=$1',[id,JSON.stringify(room.state)])
  } else if(action==='whiteboard') {
   if(member.seat!==0)throw bad('Only the teacher can edit the whiteboard.',403)
   const board=room.state.whiteboard??{revision:0,blocks:[]}
   if(body.boardRevision!==board.revision)throw bad('The whiteboard changed. Try again.',409)
   let blocks=[...board.blocks]
   const validId=value=>typeof value==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(value)
   const validPosition=(x,y)=>Number.isFinite(x)&&Number.isFinite(y)&&x>=0&&x<=780&&y>=0&&y<=500
   if(body.op==='add') {
    const block=body.block
    if(!block||!validId(block.id)||!['predicate','subject'].includes(block.kind)||!validPosition(block.x,block.y))throw bad('Invalid block.')
    if(blocks.length>=32)throw bad('The whiteboard is full.')
    if(blocks.some(b=>b.id===block.id))throw bad('This block already exists.',409)
    blocks.push({id:block.id,kind:block.kind,x:block.x,y:block.y})
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
     const word=text.toLocaleLowerCase('mi-NZ')
     const learned=word?(await client.query('select conditions from public.learned_maori_word where word=$1',[word])).rows[0]:null
     let possibilities=[],source=''
     if(learned) {
      const codes=[...new Set(learned.conditions.map(c=>c.local?.ours).filter(Boolean))]
      possibilities=(await client.query('select code,group_code from public.pos_type where code=any($1::text[])',[codes])).rows
      source='learned'
     } else if(word) {
      possibilities=(await client.query(`select distinct p.code,p.group_code from public.lexeme l
       join public.dictionary_entry e on e.lexeme_id=l.lexeme_id and e.source_code='te_aka'
       join public.dictionary_sense s on s.entry_id=e.entry_id
       join public.dictionary_pos_mapping m on m.label_code=s.pos_label_code
       join public.pos_type p on p.code=m.pos_code
       where l.language_code='mi' and (lower(l.lemma)=$1 or exists(select 1 from public.lexeme_alias a where a.lexeme_id=l.lexeme_id and lower(a.alias)=$1))`,[word])).rows
      source='dictionary'
     }
     const match=possibilities.find(p=>block.kind==='predicate'?['nominal_predicate','nominal_marker'].includes(p.code):p.group_code==='noun')
     // A teacher may explicitly demonstrate an unlearned usage on this board.
     // This never confirms a Floor or creates learned vocabulary.
     const confirmed=body.confirm===true&&Boolean(word)
     const posCode=match?.code??(confirmed?(block.kind==='predicate'?'nominal_predicate':'noun'):null)
     blocks=blocks.map(b=>b.id===block.id?{...b,text,posCode,matchSource:match?source:confirmed?'teacher':null,
      matchStatus:!word?'empty':posCode?'matched':possibilities.length?'mismatch':'unknown',
      growthId:posCode?randomBytes(12).toString('hex'):null,grownAt:posCode?Date.now():null}:b)
    }
   } else if(body.op==='clear')blocks=[]
   else throw bad('Unknown whiteboard action.')
   room.state={...room.state,whiteboard:{revision:board.revision+1,blocks}}
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
  const visibleMembers=members.map(m=>member.seat===0||m.seat===member.seat||room.state.revealed?m:{...m,eliminated:[],guess:null,correct:null})
  json(200,{room:id,joined:true,seat:member.seat,serverNow:Date.now(),state:visibleState,members:visibleMembers,messages})
 }catch(error){if(client)await client.query('rollback').catch(()=>{});if(!error.status)console.error('[classroom]',error.message);json(error.status??500,{error:error.status?error.message:'Classroom connection failed. Reconnecting…'})}
 finally{client?.release()}
}
