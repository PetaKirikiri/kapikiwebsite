import { nextTrainingQuestion, trainingCoverage, structureCoverage } from './trainingCoverage.mjs'
import pg from 'pg'
import { wordsDatabaseConnection } from './words-database.mjs'
import { createHash, randomBytes } from 'node:crypto'
let pool
function database() {
 if (!pool) { pool=new pg.Pool({...wordsDatabaseConnection(),max:2}); pool.on('error',()=>{}) }
 return pool
}
export async function trainingApi(req,res) {
 const json=(status,body)=>{res.writeHead(status,{'content-type':'application/json','cache-control':'no-store'});res.end(JSON.stringify(body))}
 try {
  const url=new URL(req.url,'https://app.local'); const route=url.searchParams.get('route') || url.pathname.split('/').pop()
  const host=req.headers.host; const origin=req.headers.origin
  if (origin && new URL(origin).host!==host || req.headers['sec-fetch-site']==='cross-site') return json(403,{error:'Open this action from the app.'})
  const db=database()
  if(route==='__website_preview_data' && req.method==='GET') {
   const [sentences,groups,types,labels,mappings,categories]=await Promise.all([
    db.query('select s.structure_id::int as "structureId",s.sort_order as "sortOrder",s.text_mi as "textMi",s.curriculum_level as "curriculumLevel",f.state from public.sentence_structure s left join public.floor_plan f using(structure_id) order by s.sort_order'),
    db.query('select group_code as "groupCode",display_label as "displayLabel",description,sort_order as "sortOrder" from public.pos_group order by sort_order'),
    db.query('select code as "posCode",label,abbreviation,description,group_code as "groupCode",parent_code as "parentCode" from public.pos_type order by sort_order'),
    db.query('select label_code as "labelCode",raw_label as "rawLabel",display_label as "displayLabel",group_code as "groupCode" from public.dictionary_pos_label order by sort_order'),
    db.query('select label_code as "labelCode",pos_code as "posCode" from public.dictionary_pos_mapping'),
    db.query('select category_code as "categoryCode",label,description from public.word_category order by sort_order')
   ])
   return json(200,{sentences:sentences.rows,catalog:{groups:groups.rows,posTypes:types.rows,dictionaryPosLabels:labels.rows,dictionaryPosMappings:mappings.rows,wordCategories:categories.rows}})
  }
  if(['__connector_shapes','__connector_patterns'].includes(route)) {
   if(req.method!=='POST')return json(405,{error:'POST required.'})
   let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>1000)return json(400,{error:'Read only.'})}
   const body=JSON.parse(raw)
   if(route==='__connector_shapes'){
    if(Object.keys(body).length!==1||!Array.isArray(body.shapes)||body.shapes.length)return json(403,{error:'Read only.'})
    return json(200,{shapes:(await db.query('select shape from public.connector_shape order by id')).rows.map(row=>row.shape)})
   }
   if(Object.keys(body).length!==1||body.operation!=='read')return json(403,{error:'Read only.'})
   const installed=(await db.query("select to_regclass('public.connector_pattern_setting') is not null as installed")).rows[0].installed
   if(!installed)return json(200,{installed:false,rules:[]})
   return json(200,{installed:true,rules:(await db.query('select pattern_key,revision,value from public.connector_pattern_setting order by pattern_key')).rows.map(row=>({key:row.pattern_key,revision:row.revision,...row.value}))})
  }
  if(route==='__training_content' && req.method==='GET') {
   const rows=await db.query(`select c.structure_id::int as "structureId", c.text_mi as "textMi", c.correct, c.alternative, (s.curriculum_level=t.active_level) as active from public.training_content c join public.sentence_structure s on s.structure_id=c.structure_id and s.text_mi=c.text_mi cross join public.training_settings t`)
   const variants=await db.query('select question_id as "questionId",structure_id::int as "structureId",base_text as "baseText",text_mi as "textMi",correct,alternative,skill_key as "skillKey" from public.training_variant order by question_id')
   return json(200,{content:rows.rows.map(row=>({...row,variants:variants.rows.filter(v=>v.structureId===row.structureId&&v.baseText===row.textMi)}))})
  }
  if(route==='__training_recording') {
   const id=url.searchParams.get('id'), text=url.searchParams.get('text')
   if(!/^\d+$/.test(id??'') || !text || text.length>2000) return json(400,{error:'A sentence is required.'})
   if(req.method==='GET') {
    const {rows}=await db.query('select audio,mime_type from public.sentence_recording where structure_id=$1 and text_mi=$2 order by recorded_at desc,recording_id desc limit 1',[id,text]); if(!rows[0]) return json(404,{error:'No recording yet.'})
    res.writeHead(200,{'content-type':rows[0].mime_type,'content-length':rows[0].audio.length,'cache-control':'no-store'});return res.end(rows[0].audio)
   }
   if(req.method!=='POST') return json(405,{error:'Use GET or POST.'})
   const mime=(req.headers['content-type']??'').split(';')[0]
   if(!['audio/webm','audio/mp4','audio/ogg'].includes(mime)) return json(415,{error:'Unsupported recording format.'})
   const chunks=[];let size=0
   for await(const chunk of req){size+=chunk.length;if(size>4000000)return json(413,{error:'Keep recordings under one minute.'});chunks.push(Buffer.from(chunk))}
   if(size<100)return json(400,{error:'No audio captured.'})
   const {rows}=await db.query(`insert into public.sentence_recording(structure_id,text_mi,mime_type,audio) select structure_id,text_mi,$3,$4 from public.sentence_structure where structure_id=$1 and text_mi=$2 returning recorded_at`,[id,text,mime,Buffer.concat(chunks)])
   if(!rows[0])return json(409,{error:'The sentence changed. Reload first.'})
   return json(200,{saved:true,savedAt:rows[0].recorded_at})
  }
  if(!['__training_profile','__training_attempt'].includes(route))return json(404,{error:'Unknown route.'})
  let token=(req.headers.cookie??'').match(/(?:^|;\s*)kp_training=([a-f0-9]{64})(?:;|$)/)?.[1]
  if(!token){token=randomBytes(32).toString('hex');res.setHeader('Set-Cookie',`kp_training=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=31536000${host?.startsWith('localhost')||host?.startsWith('127.0.0.1')?'':'; Secure'}`)}
  const hash=createHash('sha256').update(token).digest('hex')
  await db.query('insert into public.training_profile(token_hash) values($1) on conflict do nothing',[hash])
  let body={}
  if(req.method==='POST'){let raw='';for await(const chunk of req){raw+=chunk.toString();if(raw.length>8000)return json(413,{error:'Request too large.'})}body=JSON.parse(raw)}
  else if(req.method!=='GET')return json(405,{error:'Use GET or POST.'})
  if(route==='__training_profile') {
   if(req.method==='POST'){if(typeof body.name!=='string'||body.name.length>80)return json(400,{error:'Name is too long.'});await db.query('update public.training_profile set name=$2 where token_hash=$1',[hash,body.name.trim()])}
   return json(200,{...(await db.query('select name,position from public.training_profile where token_hash=$1',[hash])).rows[0],questionId:await nextTrainingQuestion(db,hash),vocabulary:(await db.query(`select v.vocabulary_key as key,v.category,v.text_mi as label,v.meaning,s.curriculum_level as level,s.structure_id::int as "structureId",s.text_mi as sentence from training_vocabulary v join training_vocabulary_structure l using(vocabulary_key) join sentence_structure s on s.structure_id=l.structure_id and s.text_mi=l.base_text order by v.sort_order,s.sort_order`)).rows,coverage:await trainingCoverage(db,hash),structureCoverage:await structureCoverage(db,hash)})
  }
  if(req.method!=='POST'||typeof body.answer!=='string'||!Number.isSafeInteger(body.structureId)||!Number.isSafeInteger(body.position)||body.position<0||! /^[a-f0-9-]{36}$/.test(body.id??''))return json(400,{error:'Invalid answer.'})
  const client=await db.connect()
  try {
   await client.query('begin')
   const questionId=body.questionId??`structure:${body.structureId}`
   const {rows}=await client.query(`select c.correct,c.alternative,null::text as skill_key from training_content c join sentence_structure s using(structure_id) where c.structure_id=$1 and $2='structure:'||c.structure_id and c.text_mi=s.text_mi union all select v.correct,v.alternative,v.skill_key from training_variant v join sentence_structure s using(structure_id) where v.structure_id=$1 and v.question_id=$2 and v.base_text=s.text_mi`,[body.structureId,questionId])
   if(!rows[0]||![rows[0].correct,rows[0].alternative].includes(body.answer))throw new Error('Question changed. Reload practice.')
   const saved=await client.query('insert into public.training_attempt(id,token_hash,structure_id,answer,correct,question_id,skill_key,practice_position) values($1,$2,$3,$4,$5,$6,$7,$8) on conflict do nothing returning id',[body.id,hash,body.structureId,body.answer,body.answer===rows[0].correct,questionId,rows[0].skill_key,body.position])
   if(saved.rowCount)await client.query('update public.training_profile set position=$2 where token_hash=$1',[hash,body.position])
   await client.query('commit');return json(200,{saved:true,questionId:await nextTrainingQuestion(db,hash)})
  }catch(e){await client.query('rollback');throw e}finally{client.release()}
 }catch(error){console.error('[training]',error.message);json(500,{error:'Database request failed. Please try again.'})}
}
